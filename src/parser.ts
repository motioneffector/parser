/**
 * Main parser implementation
 */

import { ValidationError } from './errors'
import { tokenize } from './tokenizer'
import { DEFAULT_VOCABULARY } from './default-vocabulary'
import type {
  Parser,
  ParserOptions,
  ParseResult,
  ParseOptions,
  Vocabulary,
  VerbDefinition,
  DirectionDefinition,
  Token,
  EntityRef,
  Command,
  ResolvedEntity,
} from './types'

/**
 * Creates a parser instance for text adventure commands.
 *
 * @param options - Parser configuration options
 * @returns A parser instance
 *
 * @example
 * ```typescript
 * const parser = createParser({
 *   resolver: (noun, adjectives, scope) => {
 *     // Return matching entities from game state
 *     return []
 *   }
 * })
 *
 * const result = parser.parse('get lamp')
 * ```
 */
export function createParser(options: ParserOptions): Parser {
  // Validate options
  if (!options.resolver || typeof options.resolver !== 'function') {
    throw new ValidationError('Resolver must be a function', 'resolver')
  }

  // Build vocabulary
  const vocabulary = buildVocabulary(options.vocabulary)
  const partialMatch = options.partialMatch ?? true
  const minPartialLength = options.minPartialLength ?? 3

  // State for pronoun tracking
  let lastReferent: EntityRef | null = null
  let lastScope: unknown = null

  /**
   * Find a verb definition by synonym
   */
  function findVerb(word: string): VerbDefinition | null {
    // Try exact match first
    for (const verb of vocabulary.verbs) {
      if (verb.synonyms.includes(word)) {
        return verb
      }
    }

    // Try partial match if enabled
    if (partialMatch && word.length >= minPartialLength) {
      for (const verb of vocabulary.verbs) {
        for (const synonym of verb.synonyms) {
          if (synonym.startsWith(word)) {
            return verb
          }
        }
      }
    }

    return null
  }

  /**
   * Find a direction by alias
   */
  function findDirection(word: string): string | null {
    for (const dir of vocabulary.directions) {
      if (dir.aliases.includes(word)) {
        return dir.canonical
      }
    }
    return null
  }

  /**
   * Check if a word is an article
   */
  function isArticle(word: string): boolean {
    return vocabulary.articles.includes(word)
  }

  /**
   * Check if a word is a preposition
   */
  function isPreposition(word: string): boolean {
    return vocabulary.prepositions.includes(word)
  }

  /**
   * Parse an entity reference (adjectives + noun)
   */
  function parseEntity(
    tokens: Token[],
    startIndex: number,
    scope: ParseOptions['scope']
  ): { entity: EntityRef | null; consumed: number; error?: ParseResult } {
    let index = startIndex
    const adjectives: string[] = []
    let noun: string | null = null

    // Skip articles
    while (index < tokens.length && isArticle(tokens[index]!.value)) {
      index++
    }

    // Check for pronoun "it"
    if (index < tokens.length && tokens[index]!.value === 'it') {
      if (lastReferent) {
        return { entity: lastReferent, consumed: index - startIndex + 1 }
      } else {
        return {
          entity: null,
          consumed: index - startIndex + 1,
          error: {
            type: 'parse_error',
            message: 'Cannot use "it" without a previous referent',
            position: tokens[index]!.start,
          },
        }
      }
    }

    // Collect words until we hit a preposition or end
    const words: string[] = []
    while (
      index < tokens.length &&
      !isPreposition(tokens[index]!.value) &&
      !findDirection(tokens[index]!.value)
    ) {
      if (!isArticle(tokens[index]!.value)) {
        words.push(tokens[index]!.value)
      }
      index++
    }

    if (words.length === 0) {
      return { entity: null, consumed: 0 }
    }

    // Last word is the noun, rest are adjectives
    noun = words[words.length - 1]!
    if (words.length > 1) {
      adjectives.push(...words.slice(0, -1))
    }

    // Resolve entity
    const entities = options.resolver(noun, adjectives, scope ?? {})

    if (entities.length === 0) {
      return {
        entity: null,
        consumed: index - startIndex,
        error: {
          type: 'unknown_noun',
          noun,
          position: tokens[startIndex]!.start,
        },
      }
    }

    if (entities.length > 1) {
      return {
        entity: null,
        consumed: index - startIndex,
        error: {
          type: 'ambiguous',
          candidates: entities,
          original: words.join(' '),
          role: 'subject',
        },
      }
    }

    const entityRef: EntityRef = {
      id: entities[0]!.id,
      noun,
      adjectives,
    }

    return { entity: entityRef, consumed: index - startIndex }
  }

  /**
   * Parse a command
   */
  function parse(input: string, parseOptions?: ParseOptions): ParseResult {
    const raw = input
    const scope = parseOptions?.scope

    // Check for scope change (room change) to clear pronoun
    if (scope && scope.room !== lastScope) {
      lastReferent = null
      lastScope = scope.room
    }

    // Tokenize
    const tokens = tokenize(input)

    if (tokens.length === 0) {
      return {
        type: 'parse_error',
        message: 'Empty input',
        position: 0,
      }
    }

    // Check if first token is a direction
    const direction = findDirection(tokens[0]!.value)
    if (direction) {
      const command: Command = {
        verb: 'GO',
        direction,
        raw,
      }
      return { type: 'command', command }
    }

    // Check if first token is a verb
    const verb = findVerb(tokens[0]!.value)
    if (!verb) {
      return {
        type: 'unknown_verb',
        verb: tokens[0]!.value,
      }
    }

    const command: Command = {
      verb: verb.canonical,
      raw,
    }

    // Handle different verb patterns
    if (verb.pattern === 'none') {
      // No arguments needed
      return { type: 'command', command }
    }

    if (verb.pattern === 'direction') {
      // Expects a direction
      if (tokens.length < 2) {
        return {
          type: 'parse_error',
          message: `Expected direction after "${verb.canonical}"`,
          position: tokens[tokens.length - 1]!.end,
        }
      }

      const dir = findDirection(tokens[1]!.value)
      if (!dir) {
        return {
          type: 'parse_error',
          message: `Expected direction, got "${tokens[1]!.value}"`,
          position: tokens[1]!.start,
        }
      }

      command.direction = dir
      return { type: 'command', command }
    }

    if (verb.pattern === 'text') {
      // Rest of input is text
      if (tokens.length < 2) {
        return {
          type: 'parse_error',
          message: `Expected text after "${verb.canonical}"`,
          position: tokens[tokens.length - 1]!.end,
        }
      }

      // Reconstruct text from original input
      const textStart = tokens[1]!.start
      command.text = raw.slice(textStart).trim()
      return { type: 'command', command }
    }

    if (verb.pattern === 'subject') {
      // Expects a subject (noun phrase)
      // But may also have optional preposition + object (e.g., "hit barrel with hammer")
      if (tokens.length < 2) {
        return {
          type: 'parse_error',
          message: `Expected object after "${verb.canonical}"`,
          position: tokens[tokens.length - 1]!.end,
        }
      }

      const { entity, consumed, error } = parseEntity(tokens, 1, scope)
      if (error) {
        return error
      }
      if (!entity) {
        return {
          type: 'parse_error',
          message: `Expected object after "${verb.canonical}"`,
          position: tokens[1]!.start,
        }
      }

      command.subject = entity
      const nextIndex = 1 + consumed

      // Check if there's a preposition following (optional object)
      if (nextIndex < tokens.length) {
        const prepToken = tokens[nextIndex]
        if (prepToken && isPreposition(prepToken.value)) {
          // Parse as subject_object pattern
          command.preposition = prepToken.value

          if (nextIndex + 1 >= tokens.length) {
            return {
              type: 'parse_error',
              message: `Expected target after "${prepToken.value}"`,
              position: prepToken.end,
            }
          }

          const {
            entity: object,
            consumed: objectConsumed,
            error: objectError,
          } = parseEntity(tokens, nextIndex + 1, scope)
          if (objectError) {
            if (objectError.type === 'ambiguous') {
              return { ...objectError, role: 'object' }
            }
            return objectError
          }
          if (!object) {
            return {
              type: 'parse_error',
              message: `Expected target after "${prepToken.value}"`,
              position: tokens[nextIndex + 1]!.start,
            }
          }

          command.object = object
        }
      }

      lastReferent = entity
      return { type: 'command', command }
    }

    if (verb.pattern === 'subject_object') {
      // Expects subject + preposition + object
      if (tokens.length < 2) {
        return {
          type: 'parse_error',
          message: `Expected object after "${verb.canonical}"`,
          position: tokens[tokens.length - 1]!.end,
        }
      }

      // Parse subject
      const { entity: subject, consumed: subjectConsumed, error: subjectError } = parseEntity(
        tokens,
        1,
        scope
      )
      if (subjectError) {
        return subjectError
      }
      if (!subject) {
        return {
          type: 'parse_error',
          message: `Expected object after "${verb.canonical}"`,
          position: tokens[1]!.start,
        }
      }

      command.subject = subject
      const nextIndex = 1 + subjectConsumed

      // Look for preposition
      if (nextIndex >= tokens.length) {
        return {
          type: 'parse_error',
          message: `Expected preposition and target`,
          position: tokens[tokens.length - 1]!.end,
        }
      }

      const prepToken = tokens[nextIndex]
      if (!prepToken || !isPreposition(prepToken.value)) {
        return {
          type: 'parse_error',
          message: `Expected preposition, got "${prepToken?.value ?? 'nothing'}"`,
          position: prepToken?.start ?? tokens[tokens.length - 1]!.end,
        }
      }

      command.preposition = prepToken.value

      // Parse object
      if (nextIndex + 1 >= tokens.length) {
        return {
          type: 'parse_error',
          message: `Expected target after "${prepToken.value}"`,
          position: prepToken.end,
        }
      }

      const {
        entity: object,
        consumed: objectConsumed,
        error: objectError,
      } = parseEntity(tokens, nextIndex + 1, scope)
      if (objectError) {
        // Update role to object
        if (objectError.type === 'ambiguous') {
          return { ...objectError, role: 'object' }
        }
        return objectError
      }
      if (!object) {
        return {
          type: 'parse_error',
          message: `Expected target after "${prepToken.value}"`,
          position: tokens[nextIndex + 1]!.start,
        }
      }

      command.object = object
      lastReferent = subject // Subject is the primary referent
      return { type: 'command', command }
    }

    return {
      type: 'parse_error',
      message: 'Unrecognized command pattern',
      position: 0,
    }
  }

  /**
   * Add a custom verb
   */
  function addVerb(definition: VerbDefinition): void {
    vocabulary.verbs.push(definition)
  }

  /**
   * Add a custom direction
   */
  function addDirection(definition: DirectionDefinition): void {
    vocabulary.directions.push(definition)
  }

  /**
   * Clear pronoun reference
   */
  function clearPronoun(): void {
    lastReferent = null
  }

  return {
    parse,
    addVerb,
    addDirection,
    clearPronoun,
  }
}

/**
 * Build vocabulary from options
 */
function buildVocabulary(vocabOptions?: ParserOptions['vocabulary']): Vocabulary {
  if (!vocabOptions) {
    return { ...DEFAULT_VOCABULARY }
  }

  const extend = vocabOptions.extend ?? true

  if (!extend) {
    // Replace defaults entirely
    return {
      verbs: vocabOptions.verbs ?? [],
      directions: vocabOptions.directions ?? [],
      prepositions: vocabOptions.prepositions ?? [],
      articles: vocabOptions.articles ?? [],
    }
  }

  // Extend defaults
  return {
    verbs: [...DEFAULT_VOCABULARY.verbs, ...(vocabOptions.verbs ?? [])],
    directions: [...DEFAULT_VOCABULARY.directions, ...(vocabOptions.directions ?? [])],
    prepositions: [...DEFAULT_VOCABULARY.prepositions, ...(vocabOptions.prepositions ?? [])],
    articles: [...DEFAULT_VOCABULARY.articles, ...(vocabOptions.articles ?? [])],
  }
}
