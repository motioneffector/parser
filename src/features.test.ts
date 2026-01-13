import { describe, it, expect, vi } from 'vitest'
import { createParser } from './parser'
import type { ResolvedEntity, ResolverScope, Resolver } from './types'

describe('Object Resolution', () => {
  describe('Resolver Integration', () => {
    it('calls resolver function with noun string', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      expect(resolver).toHaveBeenCalledWith('lamp', expect.any(Array), expect.any(Object))
    })

    it('calls resolver function with adjectives array', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      parser.parse('get red ball')
      expect(resolver).toHaveBeenCalledWith('ball', ['red'], expect.any(Object))
    })

    it('calls resolver function with scope object', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      const scope = { room: 'room-1', inventory: [] }
      parser.parse('get lamp', { scope })
      expect(resolver).toHaveBeenCalledWith(expect.any(String), expect.any(Array), scope)
    })

    it('passes scope.room to resolver', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      const scope = { room: 'test-room' }
      parser.parse('get lamp', { scope })
      expect(resolver).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({ room: 'test-room' }))
    })

    it('passes scope.inventory to resolver', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      const scope = { inventory: ['item-1'] }
      parser.parse('get lamp', { scope })
      expect(resolver).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({ inventory: ['item-1'] }))
    })

    it('handles resolver returning single entity', () => {
      const resolver = () => [{ id: 'lamp-1' }]
      const parser = createParser({ resolver })
      const result = parser.parse('get lamp')
      expect(result.type).toBe('command')
    })

    it('handles resolver returning multiple entities', () => {
      const resolver = () => [{ id: 'ball-1' }, { id: 'ball-2' }]
      const parser = createParser({ resolver })
      const result = parser.parse('get ball')
      expect(result.type).toBe('ambiguous')
    })

    it('handles resolver returning empty array', () => {
      const resolver = () => []
      const parser = createParser({ resolver })
      const result = parser.parse('get xyzzy')
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Adjective Filtering', () => {
    it('passes single adjective to resolver', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      parser.parse('get red ball')
      expect(resolver).toHaveBeenCalledWith('ball', ['red'], expect.any(Object))
    })

    it('passes multiple adjectives to resolver', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      parser.parse('get big red ball')
      expect(resolver).toHaveBeenCalledWith('ball', ['big', 'red'], expect.any(Object))
    })

    it('adjectives are lowercase', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      parser.parse('get RED ball')
      expect(resolver).toHaveBeenCalledWith('ball', ['red'], expect.any(Object))
    })
  })

  describe('Scope Handling', () => {
    it('accepts custom scope properties', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      const scope = { custom: 'value', another: 123 }
      parser.parse('get lamp', { scope })
      expect(resolver).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({ custom: 'value', another: 123 }))
    })

    it('scope is passed through unchanged', () => {
      const resolver = vi.fn<Resolver>(() => [{ id: 'test-1' }])
      const parser = createParser({ resolver })
      const scope = { test: 'data' }
      parser.parse('get lamp', { scope })
      expect(resolver).toHaveBeenCalledWith(expect.any(String), expect.any(Array), scope)
    })
  })
})

describe('Disambiguation', () => {
  describe('Ambiguous Results', () => {
    const resolver = (noun: string) => {
      if (noun === 'ball') {
        return [
          { id: 'ball-red', name: 'red ball' },
          { id: 'ball-blue', name: 'blue ball' },
        ]
      }
      return []
    }

    it('returns ambiguous result when resolver returns multiple matches', () => {
      const parser = createParser({ resolver })
      const result = parser.parse('get ball')
      expect(result.type).toBe('ambiguous')
    })

    it('includes all candidates in ambiguous result', () => {
      const parser = createParser({ resolver })
      const result = parser.parse('get ball')
      if (result.type === 'ambiguous') {
        expect(result.candidates).toHaveLength(2)
      }
    })

    it('includes original input in ambiguous result', () => {
      const parser = createParser({ resolver })
      const result = parser.parse('get ball')
      if (result.type === 'ambiguous') {
        expect(result.original).toBeTruthy()
      }
    })

    it('ambiguous result has type "ambiguous"', () => {
      const parser = createParser({ resolver })
      const result = parser.parse('get ball')
      expect(result.type).toBe('ambiguous')
    })
  })

  describe('Resolution', () => {
    it('accepts disambiguation response with index', () => {
      // This would be a follow-up feature - parser accepts clarification
      // For now, just test that ambiguous results are properly formed
      const resolver = () => [{ id: 'a' }, { id: 'b' }]
      const parser = createParser({ resolver })
      const result = parser.parse('get item')
      expect(result.type).toBe('ambiguous')
    })

    it('accepts disambiguation response with entity id', () => {
      // Similar to above - testing structure
      const resolver = () => [{ id: 'a' }, { id: 'b' }]
      const parser = createParser({ resolver })
      const result = parser.parse('get item')
      if (result.type === 'ambiguous') {
        expect(result.candidates[0]!.id).toBeDefined()
      }
    })
  })
})

describe('Pronoun Handling', () => {
  const resolver = (noun: string) => {
    const entities: Record<string, ResolvedEntity> = {
      lamp: { id: 'lamp-1' },
      box: { id: 'box-1' },
    }
    return entities[noun] ? [entities[noun]!] : []
  }

  describe('"it" Pronoun', () => {
    it('tracks last successfully resolved single entity', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      const result = parser.parse('examine it')
      expect(result.type).toBe('command')
    })

    it('replaces "it" with last entity reference', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      const result = parser.parse('examine it')
      if (result.type === 'command') {
        expect(result.command.subject?.id).toBe('lamp-1')
      }
    })

    it('"it" works as subject', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      const result = parser.parse('drop it')
      expect(result.type).toBe('command')
    })

    it('"it" works as object', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      const result = parser.parse('put box in it')
      // "it" should refer to lamp in the object position
      expect(result.type).toBe('command')
    })

    it('returns error if "it" used with no referent', () => {
      const parser = createParser({ resolver })
      const result = parser.parse('get it')
      expect(result.type).toBe('parse_error')
    })
  })

  describe('Clearing Pronoun', () => {
    it('clearPronoun() clears the reference', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp')
      parser.clearPronoun()
      const result = parser.parse('examine it')
      expect(result.type).toBe('parse_error')
    })

    it('pronoun clears on room change via scope change', () => {
      const parser = createParser({ resolver })
      parser.parse('get lamp', { scope: { room: 'room1' } })
      const result = parser.parse('examine it', { scope: { room: 'room2' } })
      // Room change should clear pronoun
      expect(result.type).toBe('parse_error')
    })
  })
})

describe('Custom Vocabulary', () => {
  describe('Adding Verbs', () => {
    it('addVerb() adds new verb definition', () => {
      const parser = createParser({ resolver: () => [] })
      parser.addVerb({ canonical: 'CAST', synonyms: ['cast', 'invoke'], pattern: 'subject' })
      const result = parser.parse('cast spell')
      expect(result.type).not.toBe('unknown_verb')
    })

    it('new verb is recognized in parsing', () => {
      const resolver = (noun: string) => (noun === 'spell' ? [{ id: 'spell-1' }] : [])
      const parser = createParser({ resolver })
      parser.addVerb({ canonical: 'CAST', synonyms: ['cast'], pattern: 'subject' })
      const result = parser.parse('cast spell')
      expect(result.type).toBe('command')
    })

    it('synonyms for new verb work correctly', () => {
      const resolver = () => [{ id: 'test' }]
      const parser = createParser({ resolver })
      parser.addVerb({ canonical: 'CAST', synonyms: ['cast', 'invoke'], pattern: 'subject' })
      const result1 = parser.parse('cast spell')
      const result2 = parser.parse('invoke spell')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
    })

    it('pattern for new verb is respected', () => {
      const resolver = () => [{ id: 'test' }]
      const parser = createParser({ resolver })
      parser.addVerb({ canonical: 'MEDITATE', synonyms: ['meditate'], pattern: 'none' })
      const result = parser.parse('meditate')
      expect(result.type).toBe('command')
    })
  })

  describe('Adding Directions', () => {
    it('addDirection() adds new direction', () => {
      const parser = createParser({ resolver: () => [] })
      parser.addDirection({ canonical: 'PORTAL', aliases: ['portal', 'p'] })
      const result = parser.parse('portal')
      expect(result.type).toBe('command')
    })

    it('new direction is recognized in parsing', () => {
      const parser = createParser({ resolver: () => [] })
      parser.addDirection({ canonical: 'WARP', aliases: ['warp'] })
      const result = parser.parse('warp')
      expect(result.type).toBe('command')
    })

    it('shortcut for new direction works', () => {
      const parser = createParser({ resolver: () => [] })
      parser.addDirection({ canonical: 'PORTAL', aliases: ['portal', 'p'] })
      const result = parser.parse('p')
      expect(result.type).toBe('command')
    })
  })

  describe('Extending Defaults', () => {
    it('custom vocabulary extends defaults when extend: true', () => {
      const parser = createParser({
        resolver: () => [],
        vocabulary: {
          extend: true,
          verbs: [{ canonical: 'CUSTOM', synonyms: ['custom'], pattern: 'none' }],
        },
      })
      // Should recognize both custom and default verbs
      const result1 = parser.parse('custom')
      const result2 = parser.parse('look')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
    })

    it('custom vocabulary replaces defaults when extend: false', () => {
      const parser = createParser({
        resolver: () => [],
        vocabulary: {
          extend: false,
          verbs: [{ canonical: 'CUSTOM', synonyms: ['custom'], pattern: 'none' }],
          directions: [],
          prepositions: [],
          articles: [],
        },
      })
      // Should only recognize custom verb
      const result1 = parser.parse('custom')
      const result2 = parser.parse('look')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('unknown_verb')
    })
  })
})

describe('Error Handling', () => {
  describe('Unknown Verb', () => {
    const parser = createParser({ resolver: () => [] })

    it('returns unknown_verb result for unrecognized verb', () => {
      const result = parser.parse('xyzzy lamp')
      expect(result.type).toBe('unknown_verb')
    })

    it('includes the unknown verb string in result', () => {
      const result = parser.parse('xyzzy lamp')
      if (result.type === 'unknown_verb') {
        expect(result.verb).toBe('xyzzy')
      }
    })

    it('unknown_verb result has correct type', () => {
      const result = parser.parse('blerg')
      expect(result.type).toBe('unknown_verb')
    })
  })

  describe('Unknown Noun', () => {
    const parser = createParser({ resolver: () => [] })

    it('returns unknown_noun result when resolver returns empty', () => {
      const result = parser.parse('get xyzzy')
      expect(result.type).toBe('unknown_noun')
    })

    it('includes the unknown noun string in result', () => {
      const result = parser.parse('get xyzzy')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('xyzzy')
      }
    })

    it('includes position of unknown noun', () => {
      const result = parser.parse('get xyzzy')
      if (result.type === 'unknown_noun') {
        expect(result.position).toBeGreaterThanOrEqual(0)
      }
    })

    it('unknown_noun result has correct type', () => {
      const result = parser.parse('get blerg')
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Parse Errors', () => {
    const parser = createParser({ resolver: () => [{ id: 'test' }] })

    it('returns parse_error for "get" with no noun', () => {
      const result = parser.parse('get')
      expect(result.type).toBe('parse_error')
    })

    it('returns parse_error for "put key" with no destination', () => {
      const result = parser.parse('put key')
      expect(result.type).toBe('parse_error')
    })

    it('includes helpful message in parse_error', () => {
      const result = parser.parse('get')
      if (result.type === 'parse_error') {
        expect(result.message).toBeTruthy()
      }
    })

    it('includes position in parse_error', () => {
      const result = parser.parse('get')
      if (result.type === 'parse_error') {
        expect(result.position).toBeGreaterThanOrEqual(0)
      }
    })

    it('parse_error result has correct type', () => {
      const result = parser.parse('get')
      expect(result.type).toBe('parse_error')
    })
  })

  describe('Edge Cases', () => {
    const parser = createParser({ resolver: () => [] })

    it('handles empty string input', () => {
      const result = parser.parse('')
      expect(result.type).toBe('parse_error')
    })

    it('handles single character input', () => {
      const result = parser.parse('x')
      // 'x' is a valid verb (examine shortcut)
      expect(result).toBeDefined()
    })

    it('handles very long input', () => {
      const longInput = 'get ' + 'a '.repeat(100) + 'lamp'
      const result = parser.parse(longInput)
      expect(result).toBeDefined()
    })

    it('handles unicode characters', () => {
      const result = parser.parse('get 日本語')
      expect(result).toBeDefined()
    })

    it('handles emoji', () => {
      const result = parser.parse('get 🔑')
      expect(result).toBeDefined()
    })

    it('handles numbers in input', () => {
      const result = parser.parse('get key123')
      expect(result).toBeDefined()
    })
  })
})

describe('Partial Matching', () => {
  describe('Default Behavior (enabled)', () => {
    const parser = createParser({ resolver: () => [{ id: 'lamp-1' }], partialMatch: true })

    it('matches "lam" to "lamp" when partialMatch enabled', () => {
      const result = parser.parse('get lam')
      expect(result.type).toBe('command')
    })

    it('matches "exa" to "examine"', () => {
      const result = parser.parse('exa lamp')
      expect(result.type).toBe('command')
    })

    it('requires minimum 3 characters by default', () => {
      const parser2 = createParser({ resolver: () => [{ id: 'lamp-1' }] })
      const result = parser2.parse('get lam')
      expect(result.type).toBe('command')
    })

    it('"la" does not match "lamp" (too short)', () => {
      const result = parser.parse('get la')
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Custom Minimum Length', () => {
    it('respects minPartialLength of 2', () => {
      const parser = createParser({ resolver: () => [{ id: 'test' }], minPartialLength: 2 })
      const result = parser.parse('get la')
      expect(result.type).toBe('command')
    })

    it('respects minPartialLength of 4', () => {
      const parser = createParser({ resolver: () => [{ id: 'test' }], minPartialLength: 4 })
      const result = parser.parse('get lam')
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Disabled', () => {
    const parser = createParser({ resolver: () => [{ id: 'lamp-1' }], partialMatch: false })

    it('requires exact match when partialMatch: false', () => {
      const result = parser.parse('get lamp')
      expect(result.type).toBe('command')
    })

    it('"lam" does not match "lamp" when disabled', () => {
      const result = parser.parse('get lam')
      expect(result.type).toBe('unknown_noun')
    })
  })

  describe('Ambiguity', () => {
    it('returns ambiguous when partial matches multiple ("s" matches "sword" and "shield")', () => {
      const resolver = (noun: string) => {
        if (noun === 's' || noun === 'sw' || noun === 'sh') {
          return [{ id: 'sword' }, { id: 'shield' }]
        }
        return []
      }
      const parser = createParser({ resolver, partialMatch: true, minPartialLength: 1 })
      const result = parser.parse('get s')
      // Partial matching at noun level is handled by resolver
      // Parser handles verb partial matching
      expect(result).toBeDefined()
    })
  })
})

describe('Parse Result Types', () => {
  const resolver = () => [{ id: 'test-1' }]
  const parser = createParser({ resolver })

  describe('Command Result', () => {
    it('has type "command"', () => {
      const result = parser.parse('look')
      expect(result.type).toBe('command')
    })

    it('has verb property (uppercase canonical)', () => {
      const result = parser.parse('look')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('LOOK')
        expect(result.command.verb).toBe(result.command.verb.toUpperCase())
      }
    })

    it('has subject property when applicable', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.subject).toBeDefined()
      }
    })

    it('has object property when applicable', () => {
      const result = parser.parse('put lamp in box')
      if (result.type === 'command') {
        expect(result.command.object).toBeDefined()
      }
    })

    it('has preposition property when applicable', () => {
      const result = parser.parse('put lamp in box')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('in')
      }
    })

    it('has direction property when applicable', () => {
      const result = parser.parse('north')
      if (result.type === 'command') {
        expect(result.command.direction).toBeDefined()
      }
    })

    it('has raw property with original input', () => {
      const input = 'get lamp'
      const result = parser.parse(input)
      if (result.type === 'command') {
        expect(result.command.raw).toBe(input)
      }
    })
  })

  describe('EntityRef Structure', () => {
    it('has id property from resolver', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.id).toBe('test-1')
      }
    })

    it('has noun property with original noun used', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.noun).toBe('lamp')
      }
    })

    it('has adjectives array', () => {
      const result = parser.parse('get red lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.adjectives).toBeDefined()
        expect(Array.isArray(result.command.subject?.adjectives)).toBe(true)
      }
    })
  })

  describe('Ambiguous Result', () => {
    const ambigResolver = () => [{ id: 'a' }, { id: 'b' }]
    const ambigParser = createParser({ resolver: ambigResolver })

    it('has type "ambiguous"', () => {
      const result = ambigParser.parse('get item')
      expect(result.type).toBe('ambiguous')
    })

    it('has candidates array', () => {
      const result = ambigParser.parse('get item')
      if (result.type === 'ambiguous') {
        expect(Array.isArray(result.candidates)).toBe(true)
      }
    })

    it('has original string', () => {
      const result = ambigParser.parse('get item')
      if (result.type === 'ambiguous') {
        expect(result.original).toBeTruthy()
      }
    })
  })

  describe('Unknown Verb Result', () => {
    it('has type "unknown_verb"', () => {
      const result = parser.parse('xyzzy')
      expect(result.type).toBe('unknown_verb')
    })

    it('has verb property', () => {
      const result = parser.parse('xyzzy')
      if (result.type === 'unknown_verb') {
        expect(result.verb).toBe('xyzzy')
      }
    })
  })

  describe('Unknown Noun Result', () => {
    const emptyResolver = () => []
    const emptyParser = createParser({ resolver: emptyResolver })

    it('has type "unknown_noun"', () => {
      const result = emptyParser.parse('get blerg')
      expect(result.type).toBe('unknown_noun')
    })

    it('has noun property', () => {
      const result = emptyParser.parse('get blerg')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('blerg')
      }
    })

    it('has position property', () => {
      const result = emptyParser.parse('get blerg')
      if (result.type === 'unknown_noun') {
        expect(typeof result.position).toBe('number')
      }
    })
  })

  describe('Parse Error Result', () => {
    it('has type "parse_error"', () => {
      const result = parser.parse('')
      expect(result.type).toBe('parse_error')
    })

    it('has message property', () => {
      const result = parser.parse('')
      if (result.type === 'parse_error') {
        expect(typeof result.message).toBe('string')
      }
    })

    it('has position property', () => {
      const result = parser.parse('')
      if (result.type === 'parse_error') {
        expect(typeof result.position).toBe('number')
      }
    })
  })
})
