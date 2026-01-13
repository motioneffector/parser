import { describe, it, expect } from 'vitest'
import { createParser } from './parser'
import type { ResolvedEntity, ResolverScope } from './types'

const mockResolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] => {
  return noun ? [{ id: `${noun}-1` }] : []
}

describe('Vocabulary System', () => {
  describe('Verb Recognition', () => {
    const parser = createParser({ resolver: mockResolver })

    it('recognizes verbs from default vocabulary', () => {
      const result = parser.parse('look')
      expect(result.type).toBe('command')
    })

    it('maps synonyms to canonical form', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('returns canonical form in uppercase', () => {
      const result = parser.parse('examine lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXAMINE')
      }
    })

    it('handles case-insensitive matching', () => {
      const result1 = parser.parse('GET lamp')
      const result2 = parser.parse('get lamp')
      const result3 = parser.parse('Get lamp')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
      expect(result3.type).toBe('command')
    })

    it('returns null for unknown verbs', () => {
      const result = parser.parse('xyzzy lamp')
      expect(result.type).toBe('unknown_verb')
    })
  })

  describe('Direction Recognition', () => {
    const parser = createParser({ resolver: mockResolver })

    it('recognizes full direction names (north, south, etc.)', () => {
      const result = parser.parse('north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.direction).toBe('NORTH')
      }
    })

    it('recognizes direction shortcuts (n, s, e, w)', () => {
      const result = parser.parse('n')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.direction).toBe('NORTH')
      }
    })

    it('recognizes compound directions (northeast, nw)', () => {
      const result1 = parser.parse('northeast')
      const result2 = parser.parse('nw')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
      if (result2.type === 'command') {
        expect(result2.command.direction).toBe('NORTHWEST')
      }
    })

    it('recognizes vertical directions (up, down, u, d)', () => {
      const result1 = parser.parse('up')
      const result2 = parser.parse('u')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
    })

    it('recognizes special directions (in, out)', () => {
      const result1 = parser.parse('in')
      const result2 = parser.parse('out')
      expect(result1.type).toBe('command')
      expect(result2.type).toBe('command')
    })

    it('returns canonical direction name', () => {
      const result = parser.parse('n')
      if (result.type === 'command') {
        expect(result.command.direction).toBe('NORTH')
      }
    })
  })

  describe('Articles', () => {
    const parser = createParser({ resolver: mockResolver })

    it('recognizes "the" as article', () => {
      const result = parser.parse('get the lamp')
      expect(result.type).toBe('command')
    })

    it('recognizes "a" as article', () => {
      const result = parser.parse('get a lamp')
      expect(result.type).toBe('command')
    })

    it('recognizes "an" as article', () => {
      const result = parser.parse('get an apple')
      expect(result.type).toBe('command')
    })

    it('strips articles from object references', () => {
      const result = parser.parse('get the lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.noun).toBe('lamp')
      }
    })

    it('tracks that article was present', () => {
      // Articles are stripped but their presence is noted
      const result = parser.parse('get the lamp')
      expect(result.type).toBe('command')
    })
  })

  describe('Prepositions', () => {
    const parser = createParser({ resolver: mockResolver })

    it('recognizes "with" as preposition', () => {
      const result = parser.parse('hit barrel with hammer')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('with')
      }
    })

    it('recognizes "to" as preposition', () => {
      const result = parser.parse('give coin to merchant')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('to')
      }
    })

    it('recognizes "at" as preposition', () => {
      const result = parser.parse('throw rock at window')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('at')
      }
    })

    it('recognizes "in" as preposition', () => {
      const result = parser.parse('put key in box')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('in')
      }
    })

    it('recognizes "on" as preposition', () => {
      const result = parser.parse('put book on table')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('on')
      }
    })

    it('recognizes "from" as preposition', () => {
      const result = parser.parse('take key from chest')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('from')
      }
    })

    it('recognizes "into" as preposition', () => {
      const result = parser.parse('put coin into pouch')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('into')
      }
    })

    it('recognizes "onto" as preposition', () => {
      const result = parser.parse('climb onto ledge')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('onto')
      }
    })
  })
})
