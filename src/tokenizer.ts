/**
 * Tokenizer for parser input
 */

import type { Token } from './types'

/**
 * Tokenizes input string into an array of tokens.
 *
 * @param input - The input string to tokenize
 * @returns Array of tokens with position information
 *
 * @example
 * ```typescript
 * const tokens = tokenize('get the lamp')
 * // Returns: [
 * //   { type: 'WORD', value: 'get', original: 'get', start: 0, end: 3 },
 * //   { type: 'WORD', value: 'the', original: 'the', start: 4, end: 7 },
 * //   { type: 'WORD', value: 'lamp', original: 'lamp', start: 8, end: 12 }
 * // ]
 * ```
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let position = 0

  while (position < input.length) {
    const char = input[position]

    // Skip whitespace
    if (char && /\s/.test(char)) {
      position++
      continue
    }

    // Handle quoted strings (double or single quotes)
    if (char === '"' || char === "'") {
      const quoteChar = char
      const start = position
      position++ // Skip opening quote
      let value = ''
      let foundClosing = false

      while (position < input.length) {
        const current = input[position]
        if (!current) break

        if (current === '\\' && position + 1 < input.length) {
          // Handle escape sequences
          const next = input[position + 1]
          if (next === quoteChar || next === '\\') {
            value += next
            position += 2
            continue
          }
        }

        if (current === quoteChar) {
          foundClosing = true
          position++ // Skip closing quote
          break
        }

        value += current
        position++
      }

      // If no closing quote found, consume rest as is
      if (!foundClosing) {
        value = input.slice(start + 1)
        position = input.length
      }

      tokens.push({
        type: 'QUOTED_STRING',
        value,
        original: input.slice(start, position),
        start,
        end: position,
      })
      continue
    }

    // Handle regular words and numbers
    if (char && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(char)) {
      const start = position
      let value = ''

      while (position < input.length) {
        const current = input[position]
        if (current && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(current)) {
          value += current
          position++
        } else {
          break
        }
      }

      // Strip trailing punctuation
      let strippedValue = value
      while (strippedValue.length > 0) {
        const lastChar = strippedValue[strippedValue.length - 1]
        if (lastChar && /[.,!?;:]/.test(lastChar)) {
          strippedValue = strippedValue.slice(0, -1)
          position--
        } else {
          break
        }
      }

      // Skip any trailing punctuation
      while (position < input.length) {
        const char = input[position]
        if (char && /[.,!?;:]/.test(char)) {
          position++
        } else {
          break
        }
      }

      const original = input.slice(start, start + value.length)
      tokens.push({
        type: 'WORD',
        value: strippedValue.toLowerCase(),
        original,
        start,
        end: start + value.length,
      })
      continue
    }

    // Skip any other character (punctuation, etc.)
    position++
  }

  return tokens
}
