/**
 * Type definitions for @motioneffector/parser
 */

// ============================================================================
// Vocabulary Types
// ============================================================================

/**
 * Pattern that defines what arguments a verb expects
 */
export type VerbPattern = 'none' | 'subject' | 'subject_object' | 'direction' | 'text'

/**
 * Definition of a verb with its canonical form, synonyms, and expected pattern
 */
export interface VerbDefinition {
  /** Canonical form of the verb (uppercase, e.g., "GET") */
  canonical: string
  /** List of synonyms including the canonical form in lowercase */
  synonyms: string[]
  /** Pattern defining what arguments this verb expects */
  pattern: VerbPattern
}

/**
 * Definition of a direction with its canonical form and shortcuts
 */
export interface DirectionDefinition {
  /** Canonical direction name (uppercase, e.g., "NORTH") */
  canonical: string
  /** List of ways to refer to this direction (e.g., ["north", "n"]) */
  aliases: string[]
}

/**
 * Complete vocabulary defining all recognized words
 */
export interface Vocabulary {
  /** All verb definitions */
  verbs: VerbDefinition[]
  /** All direction definitions */
  directions: DirectionDefinition[]
  /** Recognized prepositions */
  prepositions: string[]
  /** Recognized articles (stripped from input) */
  articles: string[]
}

// ============================================================================
// Parser Configuration Types
// ============================================================================

/**
 * Options for configuring the parser
 */
export interface ParserOptions {
  /** Custom vocabulary (extends or replaces default) */
  vocabulary?: Partial<Vocabulary> & { extend?: boolean }
  /** Resolver function for looking up game entities */
  resolver: Resolver
  /** Enable partial word matching (default: true) */
  partialMatch?: boolean
  /** Minimum length for partial matches (default: 3) */
  minPartialLength?: number
}

/**
 * Scope information passed to resolver for entity lookup
 */
export interface ResolverScope {
  /** Current room or location */
  room?: unknown
  /** Player's inventory */
  inventory?: unknown
  /** Any additional scope data the consumer provides */
  [key: string]: unknown
}

/**
 * Entity resolved by the resolver function
 */
export interface ResolvedEntity {
  /** Unique identifier for this entity */
  id: string
  /** Any additional data the consumer includes */
  [key: string]: unknown
}

/**
 * Function that resolves noun + adjectives to game entities
 */
export type Resolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
) => ResolvedEntity[]

// ============================================================================
// Token Types
// ============================================================================

/**
 * Type of token produced by the tokenizer
 */
export type TokenType =
  | 'WORD'
  | 'QUOTED_STRING'
  | 'NUMBER'
  | 'PUNCTUATION'
  | 'WHITESPACE'

/**
 * A single token from the input string
 */
export interface Token {
  /** Type of this token */
  type: TokenType
  /** The actual text value */
  value: string
  /** Original text before normalization */
  original: string
  /** Start position in original input */
  start: number
  /** End position in original input */
  end: number
}

// ============================================================================
// Parse Result Types
// ============================================================================

/**
 * Reference to a resolved entity in the command
 */
export interface EntityRef {
  /** Resolved entity ID */
  id: string
  /** The noun that was used */
  noun: string
  /** The adjectives that were used (if any) */
  adjectives: string[]
}

/**
 * A successfully parsed command
 */
export interface Command {
  /** The canonical verb (uppercase) */
  verb: string
  /** Primary object of the command */
  subject?: EntityRef
  /** Secondary object (for two-object commands) */
  object?: EntityRef
  /** Preposition connecting subject and object */
  preposition?: string
  /** Direction (for movement commands) */
  direction?: string
  /** Text content (for "say" and similar commands) */
  text?: string
  /** Original input string */
  raw: string
}

/**
 * Result when multiple entities match and disambiguation is needed
 */
export interface AmbiguousResult {
  type: 'ambiguous'
  /** The entities that matched */
  candidates: ResolvedEntity[]
  /** The original input that caused ambiguity */
  original: string
  /** Whether this is for the subject or object */
  role: 'subject' | 'object'
}

/**
 * Result when an unknown verb is encountered
 */
export interface UnknownVerbResult {
  type: 'unknown_verb'
  /** The verb that wasn't recognized */
  verb: string
}

/**
 * Result when an unknown noun is encountered
 */
export interface UnknownNounResult {
  type: 'unknown_noun'
  /** The noun that wasn't recognized */
  noun: string
  /** Position in the input where the noun appeared */
  position: number
}

/**
 * Result when the input cannot be parsed
 */
export interface ParseErrorResult {
  type: 'parse_error'
  /** Description of what went wrong */
  message: string
  /** Position in the input where the error occurred */
  position: number
}

/**
 * Successful command result
 */
export interface CommandResult {
  type: 'command'
  /** The parsed command */
  command: Command
}

/**
 * Union of all possible parse results
 */
export type ParseResult =
  | CommandResult
  | AmbiguousResult
  | UnknownVerbResult
  | UnknownNounResult
  | ParseErrorResult

// ============================================================================
// Parser API Types
// ============================================================================

/**
 * Options for a parse operation
 */
export interface ParseOptions {
  /** Scope information for entity resolution */
  scope?: ResolverScope
}

/**
 * The parser instance returned by createParser
 */
export interface Parser {
  /** Parse a command string */
  parse(input: string, options?: ParseOptions): ParseResult

  /** Add a custom verb definition */
  addVerb(definition: VerbDefinition): void

  /** Add a custom direction definition */
  addDirection(definition: DirectionDefinition): void

  /** Clear the pronoun reference (for "it") */
  clearPronoun(): void
}
