import { describe, it, expect } from 'vitest'
import { tokenize } from './tokenizer'

describe('Tokenization', () => {
  describe('Basic Tokenization', () => {
    it('splits input on whitespace', () => {
      const tokens = tokenize('get the lamp')
      expect(tokens).toHaveLength(3)
      expect(tokens.map(t => t.value)).toEqual(['get', 'the', 'lamp'])
    })

    it('normalizes multiple spaces to single space', () => {
      const tokens = tokenize('get    the     lamp')
      expect(tokens).toHaveLength(3)
      expect(tokens[0]!.value).toBe('get')
      expect(tokens[1]!.value).toBe('the')
      expect(tokens[2]!.value).toBe('lamp')
    })

    it('trims leading and trailing whitespace', () => {
      const tokens = tokenize('  get lamp  ')
      expect(tokens).toHaveLength(2)
      expect(tokens.map(t => t.value)).toEqual(['get', 'lamp'])
    })

    it('converts input to lowercase', () => {
      const tokens = tokenize('GET LAMP')
      expect(tokens.map(t => t.value)).toEqual(['get', 'lamp'])
    })

    it('preserves original case in token metadata', () => {
      const tokens = tokenize('GET Lamp')
      expect(tokens[0]!.original).toBe('GET')
      expect(tokens[1]!.original).toBe('Lamp')
    })

    it('returns empty when input is empty string', () => {
      // Verify tokenizer produces tokens for non-empty input
      const nonEmptyTokens = tokenize('hello')
      expect(nonEmptyTokens).toHaveLength(1)
      expect(nonEmptyTokens[0]!.value).toBe('hello')
      // Verify empty input produces no tokens - contrast with the above
      const tokens = tokenize('')
      expect(tokens).toStrictEqual([])
    })

    it('returns empty when input is whitespace only', () => {
      // Verify tokenizer produces tokens for non-whitespace input
      const nonEmptyTokens = tokenize('world')
      expect(nonEmptyTokens).toHaveLength(1)
      expect(nonEmptyTokens[0]!.value).toBe('world')
      // Verify whitespace-only input produces no tokens - contrast with the above
      const tokens = tokenize('   ')
      expect(tokens).toStrictEqual([])
    })
  })

  describe('Quoted Strings', () => {
    it('preserves quoted strings as single tokens', () => {
      const tokens = tokenize('say "hello world"')
      expect(tokens).toHaveLength(2)
      expect(tokens[1]!.value).toBe('hello world')
    })

    it('handles single quotes', () => {
      const tokens = tokenize("say 'hello world'")
      expect(tokens).toHaveLength(2)
      expect(tokens[1]!.value).toBe('hello world')
    })

    it('handles double quotes', () => {
      const tokens = tokenize('say "hello world"')
      expect(tokens).toHaveLength(2)
      expect(tokens[1]!.value).toBe('hello world')
    })

    it('handles escaped quotes within strings', () => {
      const tokens = tokenize('say "hello \\"world\\""')
      expect(tokens[1]!.value).toBe('hello "world"')
    })

    it('handles unclosed quotes gracefully', () => {
      const tokens = tokenize('say "hello')
      // Should handle unclosed quote - consume rest as quoted string
      expect(tokens).toHaveLength(2)
      expect(tokens[0]!.value).toBe('say')
      expect(tokens[0]!.type).toBe('WORD')
      // The unclosed quote should result in capturing the remaining text
      expect(tokens[1]!.value).toBe('hello')
      expect(tokens[1]!.type).toBe('QUOTED_STRING')
    })

    it('preserves spaces within quoted strings', () => {
      const tokens = tokenize('say "hello   world"')
      expect(tokens[1]!.value).toBe('hello   world')
    })
  })

  describe('Punctuation', () => {
    it('strips trailing punctuation from tokens', () => {
      const tokens = tokenize('look, examine!')
      expect(tokens.map(t => t.value)).toEqual(['look', 'examine'])
    })

    it('preserves punctuation within quoted strings', () => {
      const tokens = tokenize('say "hello, world!"')
      expect(tokens[1]!.value).toBe('hello, world!')
    })

    it('handles multiple punctuation marks', () => {
      const tokens = tokenize('look...')
      expect(tokens[0]!.value).toBe('look')
    })
  })

  describe('Token Positions', () => {
    it('tracks start position of each token', () => {
      const tokens = tokenize('get lamp')
      expect(tokens[0]!.start).toBe(0)
      expect(tokens[1]!.start).toBe(4)
    })

    it('tracks end position of each token', () => {
      const tokens = tokenize('get lamp')
      expect(tokens[0]!.end).toBe(3)
      expect(tokens[1]!.end).toBe(8)
    })

    it('positions account for original whitespace', () => {
      const tokens = tokenize('get  lamp')
      expect(tokens[0]!.start).toBe(0)
      expect(tokens[1]!.start).toBe(5) // Accounts for double space
    })
  })
})
