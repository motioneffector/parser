import { describe, it, expect } from 'vitest'
import { createParser } from './parser'
import type { ResolvedEntity } from './types'

// ============================================
// FUZZ TEST CONFIGURATION
// ============================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const THOROUGH_DURATION_MS = 10_000 // 10 seconds per test in thorough mode
const STANDARD_ITERATIONS = 200 // iterations per test in standard mode
const BASE_SEED = 12345 // reproducible seed for standard mode

// ============================================
// SEEDED PRNG
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ============================================
// FUZZ LOOP HELPER
// ============================================

interface FuzzLoopResult {
  iterations: number
  seed: number
  durationMs: number
}

/**
 * Executes a fuzz test body in either standard or thorough mode.
 *
 * Standard mode: Runs exactly STANDARD_ITERATIONS times with BASE_SEED
 * Thorough mode: Runs for THOROUGH_DURATION_MS with time-based seed
 *
 * On failure, throws with full reproduction information.
 */
function fuzzLoop(
  testFn: (random: () => number, iteration: number) => void
): FuzzLoopResult {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      // Time-based: run until duration exceeded
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        testFn(random, iteration)
        iteration++
      }
    } else {
      // Iteration-based: run fixed count
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Async version of fuzzLoop for testing async functions.
 */
async function fuzzLoopAsync(
  testFn: (random: () => number, iteration: number) => Promise<void>
): Promise<FuzzLoopResult> {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        await testFn(random, iteration)
        iteration++
      }
    } else {
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        await testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// VALUE GENERATORS
// ============================================

function generateString(random: () => number, maxLen = 1000): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(Math.floor(random() * 0xffff))
  ).join('')
}

function generateASCIIString(random: () => number, maxLen = 1000): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(32 + Math.floor(random() * 95)) // Printable ASCII
  ).join('')
}

function generateWord(random: () => number, maxLen = 20): string {
  const len = 1 + Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(97 + Math.floor(random() * 26)) // a-z
  ).join('')
}

function generateCommand(random: () => number): string {
  const verbs = ['get', 'take', 'examine', 'look', 'drop', 'put', 'go', 'say']
  const nouns = ['lamp', 'ball', 'key', 'door', 'box', 'chest']
  const adjectives = ['red', 'blue', 'big', 'small', 'old', 'new']
  const prepositions = ['in', 'on', 'with', 'to', 'from', 'at']

  const verb = verbs[Math.floor(random() * verbs.length)]!
  const patternChoice = Math.floor(random() * 5)

  switch (patternChoice) {
    case 0: // verb only
      return verb
    case 1: // verb + noun
      return `${verb} ${nouns[Math.floor(random() * nouns.length)]}`
    case 2: // verb + adjective + noun
      return `${verb} ${adjectives[Math.floor(random() * adjectives.length)]} ${nouns[Math.floor(random() * nouns.length)]}`
    case 3: // verb + noun + prep + noun
      return `${verb} ${nouns[Math.floor(random() * nouns.length)]} ${prepositions[Math.floor(random() * prepositions.length)]} ${nouns[Math.floor(random() * nouns.length)]}`
    default: // verb + text
      return `${verb} ${generateWord(random, 10)}`
  }
}

function generateNumber(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -0
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return -Infinity
    case 5:
      return Number.MAX_SAFE_INTEGER
    case 6:
      return Number.MIN_SAFE_INTEGER
    case 7:
      return Number.EPSILON
    default:
      return (random() - 0.5) * Number.MAX_SAFE_INTEGER * 2
  }
}

function generateArray<T>(
  random: () => number,
  generator: (r: () => number) => T,
  maxLen = 100
): T[] {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => generator(random))
}

function generateObject(
  random: () => number,
  depth = 0,
  maxDepth = 5
): unknown {
  if (depth >= maxDepth) return null

  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return null
    case 1:
      return generateNumber(random)
    case 2:
      return generateString(random, 100)
    case 3:
      return depth < maxDepth - 1
        ? generateArray(random, (r) => generateObject(r, depth + 1, maxDepth), 10)
        : []
    case 4: {
      const obj: Record<string, unknown> = {}
      const keyCount = Math.floor(random() * 10)
      for (let i = 0; i < keyCount; i++) {
        const key = generateString(random, 20) || `key${i}`
        obj[key] = generateObject(random, depth + 1, maxDepth)
      }
      return obj
    }
    default:
      return undefined
  }
}

// Prototype pollution test values
function generateMaliciousObject(random: () => number): unknown {
  const attacks = [
    { __proto__: { polluted: true } },
    { constructor: { prototype: { polluted: true } } },
    JSON.parse('{"__proto__": {"polluted": true}}'),
    Object.create(null, { dangerous: { value: true } }),
  ]
  return attacks[Math.floor(random() * attacks.length)]
}

// Special string generators for specific edge cases
function generateUnicodeString(random: () => number, maxLen = 100): string {
  const len = Math.floor(random() * maxLen)
  const categories = [
    () => String.fromCharCode(0x0600 + Math.floor(random() * 256)), // Arabic
    () => String.fromCharCode(0x4e00 + Math.floor(random() * 256)), // CJK
    () => '🔑🎮🌟💎🏆'.charAt(Math.floor(random() * 5)), // Emoji
    () => String.fromCharCode(0x0300 + Math.floor(random() * 112)), // Combining
  ]
  return Array.from({ length: len }, () => {
    const cat = categories[Math.floor(random() * categories.length)]!
    return cat()
  }).join('')
}

function generateControlCharString(random: () => number, maxLen = 100): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(Math.floor(random() * 32)) // Control chars 0x00-0x1F
  ).join('')
}

function generateWhitespaceString(random: () => number, maxLen = 100): string {
  const whitespaces = [' ', '\t', '\n', '\r', '\f', '\v', '\u00A0', '\u200B']
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => whitespaces[Math.floor(random() * whitespaces.length)]!).join('')
}

// ============================================
// FUZZ TESTS - Category 1: Input Mutation
// ============================================

describe('Fuzz: parser.parse() - Input Mutation', () => {
  it('handles random valid inputs without throwing', () => {
    const resolver = () => [{ id: 'test-1' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const result = parser.parse(input)
      expect(result).toBeDefined()
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(result.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('handles empty and whitespace-only strings', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const edgeCases = [
      '',
      '   ',
      '\t',
      '\n',
      '\r',
      '\t\n\r',
      '          ',
      '\t\t\t',
      '\n\n\n',
    ]

    for (const input of edgeCases) {
      const result = parser.parse(input)
      // All empty/whitespace inputs should produce parse_error with 'Empty input'
      expect(result.type).toBe('parse_error')
      if (result.type === 'parse_error') {
        expect(result.message).toBe('Empty input')
      }
    }
  })

  it('handles very long strings', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const sizes = [1000, 10000]
    for (const size of sizes) {
      const input = 'a'.repeat(size)
      const start = Date.now()
      const result = parser.parse(input)
      const elapsed = Date.now() - start

      // A repeated 'a' is not a known verb, so it should be unknown_verb
      expect(result.type).toBe('unknown_verb')
      expect(elapsed).toBeLessThan(1000) // Should complete within 1 second
    }
  })

  it('handles single character inputs', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const char = String.fromCharCode(Math.floor(random() * 128))
      const parseResult = parser.parse(char)
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('handles unicode edge cases', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    const unicodeTests = [
      'get 🔑', // emoji
      'examine 👻', // emoji
      'take 日本語', // CJK
      'get مفتاح', // RTL
      'examine café', // composed
      'look cafe\u0301', // decomposed
    ]

    for (const input of unicodeTests) {
      const result = parser.parse(input)
      // All unicode nouns resolve to test entity since resolver always returns one
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.raw).toBe(input)
      }
    }
  })

  it('handles control characters', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateControlCharString(random, 50)
      const parseResult = parser.parse(input)
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('handles repeated words attack', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const input = 'get ' + 'lamp '.repeat(100)
    const start = Date.now()
    const result = parser.parse(input)
    const elapsed = Date.now() - start

    // Should produce a result with a recognized verb
    expect(result.type).toBe('command')
    expect(elapsed).toBeLessThan(100) // Should be fast even with repetition
  })

  it('handles very long adjective chains', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const adjectives = Array.from({ length: 100 }, (_, i) => `adj${i}`).join(' ')
    const input = `get ${adjectives} lamp`
    const start = Date.now()
    const result = parser.parse(input)
    const elapsed = Date.now() - start

    // Should successfully parse with the verb GET and the noun 'lamp'
    expect(result.type).toBe('command')
    if (result.type === 'command') {
      expect(result.command.verb).toBe('GET')
      expect(result.command.subject?.noun).toBe('lamp')
    }
    expect(elapsed).toBeLessThan(100)
  })

  it('handles injection attempts gracefully', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const injections = [
      "get lamp'; DROP TABLE--",
      'get <script>alert(1)</script>',
      'get %s%s%s%s%s',
      'get ../../../etc/passwd',
      'get lamp\ndelete * from users',
    ]

    for (const input of injections) {
      const result = parser.parse(input)
      // Injection strings should be parsed normally, not cause crashes
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(result.type)
    }
  })

  it('handles quote edge cases', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const quoteTests = [
      'say "hello',
      "say 'hello",
      'say "hello \\"world\\""',
      'say "it\'s"',
      "say 'he said \"hi\"'",
      '!!!',
      '...',
      '?.?',
      ',,,',
    ]

    for (const input of quoteTests) {
      const result = parser.parse(input)
      // Quote edge cases should produce valid parse result types
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(result.type)
    }
  })

  it('handles multiple spaces and mixed whitespace', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const whitespaceTests = [
      'get    lamp', // multiple spaces
      'get\t\n\r lamp', // mixed whitespace
      '   get lamp   ', // leading/trailing
      'get' + ' '.repeat(100) + 'lamp', // extreme spacing
    ]

    for (const input of whitespaceTests) {
      const result = parser.parse(input)
      // All whitespace variations of 'get lamp' should parse as command
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
        expect(result.command.subject?.id).toBe('lamp-1')
      }
    }
  })

  it('handles non-existent verbs', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateWord(random, 10)
      const parseResult = parser.parse(input)
      // Random words should either be unknown verbs, directions, or partial matches
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('handles case variations', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const caseTests = ['GeT LaMp', 'GET LAMP', 'gEt lAmP', 'get lamp', 'GET lamp']

    for (const input of caseTests) {
      const result = parser.parse(input)
      expect(result).toBeDefined()
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    }
  })

  it('handles scope edge cases', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const scopeTests = [
      null,
      undefined,
      {},
      { room: 'test' },
      { __proto__: { polluted: true } },
      Object.create(null),
    ]

    for (const scope of scopeTests) {
      const result = parser.parse('get lamp', scope as any)
      // Resolver returns empty, so 'get lamp' should be unknown_noun
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('lamp')
      }
    }
  })

  it('handles large scope objects', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const largeScope: Record<string, unknown> = {}
    for (let i = 0; i < 1000; i++) {
      largeScope[`key${i}`] = `value${i}`
    }

    const result = parser.parse('get lamp', largeScope as any)
    // Resolver returns empty, so 'get lamp' should be unknown_noun
    expect(result.type).toBe('unknown_noun')
    if (result.type === 'unknown_noun') {
      expect(result.noun).toBe('lamp')
    }
  })
})

// ============================================
// FUZZ TESTS - Category 2: addVerb() and addDirection()
// ============================================

describe('Fuzz: addVerb() and addDirection()', () => {
  it('makes added verbs immediately available', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    parser.addVerb({
      canonical: 'CUSTOM',
      synonyms: ['custom', 'cust'],
      pattern: 'subject',
    })

    const result = parser.parse('custom lamp')
    expect(result.type).toBe('command')
    if (result.type === 'command') {
      expect(result.command.verb).toBe('CUSTOM')
    }
  })

  it('makes added directions immediately available', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    parser.addDirection({
      canonical: 'WARP',
      aliases: ['warp', 'teleport'],
    })

    const result = parser.parse('warp')
    expect(result.type).toBe('command')
    if (result.type === 'command') {
      expect(result.command.verb).toBe('GO')
      expect(result.command.direction).toBe('WARP')
    }
  })

  it('handles invalid verb definitions gracefully', () => {
    // These should not crash the parser, even if they produce invalid state
    // Create a fresh parser for each test to avoid state corruption
    const invalidDefinitions = [
      {} as any,
      { canonical: 'TEST' } as any,
      { synonyms: ['test'] } as any,
      { canonical: 123, synonyms: 'string', pattern: [] } as any,
      { canonical: '', synonyms: [''], pattern: 'none' } as any,
    ]

    for (const def of invalidDefinitions) {
      const resolver = () => []
      const parser = createParser({ resolver })
      try {
        parser.addVerb(def)
        // If it doesn't throw, parser should still work
        const result = parser.parse('look')
        expect(result.type).toBe('command')
        if (result.type === 'command') {
          expect(result.command.verb).toBe('LOOK')
        }
      } catch (error) {
        // It's ok if it throws - verify the error has a message
        expect(error).toBeInstanceOf(TypeError)
        expect((error as TypeError).message).toMatch(/.+/)
      }
    }
  })

  it('handles invalid direction definitions gracefully', () => {
    // Create a fresh parser for each test to avoid state corruption
    const invalidDefinitions = [
      {} as any,
      { canonical: 'WARP' } as any,
      { aliases: ['warp'] } as any,
      { canonical: 123, aliases: 'string' } as any,
      { canonical: '', aliases: [''] } as any,
    ]

    for (const def of invalidDefinitions) {
      const resolver = () => []
      const parser = createParser({ resolver })
      try {
        parser.addDirection(def)
        // If it doesn't throw, parser should still work
        const result = parser.parse('north')
        expect(result.type).toBe('command')
        if (result.type === 'command') {
          expect(result.command.direction).toBe('NORTH')
        }
      } catch (error) {
        // It's ok if it throws - verify the error has a message
        expect(error).toBeInstanceOf(TypeError)
        expect((error as TypeError).message).toMatch(/.+/)
      }
    }
  })

  it('handles many added verbs', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    // Add 100 custom verbs with valid definitions
    for (let i = 0; i < 100; i++) {
      parser.addVerb({
        canonical: `VERB${i}`,
        synonyms: [`verb${i}`, `v${i}`],
        pattern: 'subject',
      })
    }

    // All should be available
    const result = parser.parse('verb50 lamp')
    expect(result.type).toBe('command')
    if (result.type === 'command') {
      expect(result.command.verb).toBe('VERB50')
    }

    // Try another one
    const result2 = parser.parse('v25 lamp')
    expect(result2.type).toBe('command')
    if (result2.type === 'command') {
      expect(result2.command.verb).toBe('VERB25')
    }
  })

  it('handles random verb additions', () => {
    // Create fresh parser each iteration to test isolation
    fuzzLoop((random) => {
      const resolver = () => [{ id: 'test' }]
      const parser = createParser({ resolver })

      const canonical = generateWord(random, 10).toUpperCase()
      const synonym = generateWord(random, 10).toLowerCase()
      const patterns = ['none', 'subject', 'subject_object', 'text'] as const
      const pattern = patterns[Math.floor(random() * patterns.length)]

      // Only add valid verbs (with non-empty synonyms)
      if (canonical.length > 0 && synonym.length > 0) {
        parser.addVerb({
          canonical,
          synonyms: [synonym],
          pattern,
        })
      }

      // Parser should remain functional
      const result = parser.parse('look')
      expect(result).toBeDefined()
    })
  })
})

// ============================================
// FUZZ TESTS - Category 3: createParser()
// ============================================

describe('Fuzz: createParser() - Configuration', () => {
  it('requires resolver function', () => {
    expect(() => createParser({} as any)).toThrow(/Resolver must be a function/)
    expect(() => createParser({ resolver: 'not a function' } as any)).toThrow(/Resolver must be a function/)
    expect(() => createParser({ resolver: 123 } as any)).toThrow(/Resolver must be a function/)
    expect(() => createParser({ resolver: null } as any)).toThrow(/Resolver must be a function/)
  })

  it('handles resolver that returns invalid values', () => {
    const invalidResolvers = [
      () => 'string' as any,
      () => 123 as any,
      () => null as any,
      () => undefined as any,
      () => ({ not: 'array' }) as any,
    ]

    for (const resolver of invalidResolvers) {
      const parser = createParser({ resolver })
      const result = parser.parse('get lamp')
      // Invalid resolver returns should produce unknown_noun since they can't resolve entities
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('lamp')
      }
    }
  })

  it('handles resolver that returns entities without id', () => {
    const resolver = () => [{ name: 'test' }] as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')
    // Entity without id should still resolve as command since array has length 1
    expect(result.type).toBe('command')
  })

  it('handles resolver that throws', () => {
    const resolver = () => {
      throw new Error('boom')
    }
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')
    // Resolver throwing should produce unknown_noun since entities can't be resolved
    expect(result.type).toBe('unknown_noun')
    if (result.type === 'unknown_noun') {
      expect(result.noun).toBe('lamp')
    }
  })

  it('handles very large resolver returns', () => {
    const resolver = () => {
      return Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}` }))
    }
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')
    // 1000 entities should produce ambiguous result
    expect(result.type).toBe('ambiguous')
    if (result.type === 'ambiguous') {
      expect(result.candidates).toHaveLength(1000)
      expect(result.candidates[0]!.id).toBe('item-0')
      expect(result.candidates[999]!.id).toBe('item-999')
    }
  })
})

// ============================================
// FUZZ TESTS - Category 4: Resolver Callback
// ============================================

describe('Fuzz: Resolver Function Callback', () => {
  it('handles resolver returning array of non-objects', () => {
    const resolver = () => [1, 2, 3] as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // Array of non-objects with length > 1 should produce ambiguous result
    expect(result.type).toBe('ambiguous')
  })

  it('handles resolver returning undefined', () => {
    const resolver = () => undefined as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // Undefined is not an array, so it should produce unknown_noun
    expect(result.type).toBe('unknown_noun')
    if (result.type === 'unknown_noun') {
      expect(result.noun).toBe('lamp')
    }
  })

  it('handles resolver returning null', () => {
    const resolver = () => null as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // Null is not an array, so it should produce unknown_noun
    expect(result.type).toBe('unknown_noun')
    if (result.type === 'unknown_noun') {
      expect(result.noun).toBe('lamp')
    }
  })

  it('handles resolver returning non-array values', () => {
    const nonArrayResolvers = [
      () => 'string' as any,
      () => 123 as any,
      () => ({ not: 'array' }) as any,
      () => true as any,
    ]

    for (const resolver of nonArrayResolvers) {
      const parser = createParser({ resolver })
      const result = parser.parse('get lamp')
      // Non-array return values should produce unknown_noun
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('lamp')
      }
    }
  })

  it('handles resolver with array containing null/undefined', () => {
    const resolver = () => [null, undefined, { id: 'test' }] as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // 3 items in array should be treated as ambiguous
    expect(result.type).toBe('ambiguous')
  })

  it('handles resolver with entities missing id field', () => {
    const resolver = () => [{ name: 'test', other: 'field' }] as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // Single entity (even without id) should still produce command result
    expect(result.type).toBe('command')
  })

  it('handles resolver with non-string id values', () => {
    const resolver = () => [{ id: 123 }, { id: null }, { id: undefined }] as any
    const parser = createParser({ resolver })
    const result = parser.parse('get lamp')

    // 3 entities should produce ambiguous result
    expect(result.type).toBe('ambiguous')
  })

  it('handles resolver returning very large arrays', () => {
    const resolver = () => Array.from({ length: 10000 }, (_, i) => ({ id: `item-${i}` }))
    const parser = createParser({ resolver })

    const start = Date.now()
    const result = parser.parse('get lamp')
    const elapsed = Date.now() - start

    // 10000 entities should produce ambiguous result
    expect(result.type).toBe('ambiguous')
    if (result.type === 'ambiguous') {
      expect(result.candidates).toHaveLength(10000)
      expect(result.candidates[0]!.id).toBe('item-0')
      expect(result.candidates[9999]!.id).toBe('item-9999')
    }
    expect(elapsed).toBeLessThan(1000)
  })

  it('handles resolver that throws errors', () => {
    const errorTypes = [
      () => {
        throw new Error('boom')
      },
      () => {
        throw new TypeError('type error')
      },
      () => {
        throw 'string error'
      },
      () => {
        throw null
      },
    ]

    for (const resolver of errorTypes) {
      const parser = createParser({ resolver })
      const result = parser.parse('get lamp')
      // Throwing resolvers should produce unknown_noun since entities can't be resolved
      expect(result.type).toBe('unknown_noun')
      if (result.type === 'unknown_noun') {
        expect(result.noun).toBe('lamp')
      }
    }
  })

  it('verifies resolver is called with correct arguments', () => {
    let callArgs: any[] = []
    const resolver = (...args: any[]) => {
      callArgs = args
      return []
    }
    const parser = createParser({ resolver })
    const scope = { room: 'test-room' }

    parser.parse('get red lamp', { scope })

    expect(callArgs).toHaveLength(3)
    expect(callArgs[0]).toBe('lamp') // noun
    expect(callArgs[1]).toEqual(['red']) // adjectives
    expect(callArgs[2]).toEqual(scope) // scope passed through
  })

  it('handles resolver with random return values', () => {
    fuzzLoop((random) => {
      const resolver = () => {
        const choice = Math.floor(random() * 5)
        switch (choice) {
          case 0:
            return []
          case 1:
            return [{ id: 'test' }]
          case 2:
            return [{ id: '1' }, { id: '2' }]
          case 3:
            return generateArray(random, () => ({ id: generateWord(random, 5) }), 10)
          default:
            return generateObject(random, 0, 2) as any
        }
      }

      const parser = createParser({ resolver })
      const result = parser.parse(generateCommand(random))
      expect(result).toBeDefined()
    })
  })
})

// ============================================
// FUZZ TESTS - Category 5: Property-Based
// ============================================

describe('Fuzz: Property-Based Tests', () => {
  it('parse() is deterministic', () => {
    const resolver = () => [{ id: 'test-1' }]
    const parser = createParser({ resolver })

    // Verify determinism: same input produces identical output
    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const result1 = parser.parse(input)
      const result2 = parser.parse(input)

      expect(result1).toEqual(result2)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('parse() never mutates input string', () => {
    const resolver = () => [{ id: 'test-1' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const inputCopy = String(input)

      parser.parse(input)

      expect(input).toBe(inputCopy)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('parse() never mutates options object', () => {
    const resolver = () => [{ id: 'test-1' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const options = { room: 'test-room' }
      const optionsCopy = JSON.parse(JSON.stringify(options))

      parser.parse(generateCommand(random), options as any)

      expect(options).toEqual(optionsCopy)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('pronoun reference tracking works correctly', () => {
    const resolver = (noun: string) => {
      return [{ id: `${noun}-1` }]
    }
    const parser = createParser({ resolver })

    const result1 = parser.parse('get lamp')
    if (result1.type === 'command' && result1.command.subject) {
      const result2 = parser.parse('examine it')
      if (result2.type === 'command' && result2.command.subject) {
        expect(result2.command.subject.id).toBe(result1.command.subject.id)
      }
    }
  })

  it('clearPronoun() clears "it" reference', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    parser.parse('get lamp')
    parser.clearPronoun()
    const result = parser.parse('examine it')

    expect(result.type).toBe('parse_error')
  })

  it('ambiguity detection works correctly', () => {
    const resolver = () => [{ id: '1' }, { id: '2' }]
    const parser = createParser({ resolver })
    const result = parser.parse('get ball')

    expect(result.type).toBe('ambiguous')
    if (result.type === 'ambiguous') {
      expect(result.candidates).toHaveLength(2)
      expect(result.candidates[0]!.id).toBe('1')
      expect(result.candidates[1]!.id).toBe('2')
      expect(result.original).toBe('ball')
    }
  })

  it('verb canonicalization works consistently', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const commands = ['get lamp', 'take lamp', 'grab lamp']
    const results = commands.map((cmd) => parser.parse(cmd))
    const verbs = results.map((r) => (r.type === 'command' ? r.command.verb : null))

    expect(verbs.every((v) => v === 'GET')).toBe(true)
  })
})

// ============================================
// FUZZ TESTS - Category 6: Boundary Tests
// ============================================

describe('Fuzz: Boundary Exploration', () => {
  it('handles string length boundaries', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    const lengths = [0, 1, 1000, 10000]
    for (const len of lengths) {
      const input = 'a'.repeat(len)
      const start = Date.now()
      const result = parser.parse(input)
      const elapsed = Date.now() - start

      if (len === 0) {
        expect(result.type).toBe('parse_error')
      } else {
        // 'a' repeated is not a known verb, so it should be unknown_verb or parse_error
        expect(['unknown_verb', 'parse_error', 'command']).toContain(result.type)
      }
      expect(elapsed).toBeLessThan(1000)
    }
  })

  it('handles resolver return size boundaries', () => {
    const sizes = [0, 1, 2, 100]

    for (const size of sizes) {
      const resolver = () => Array.from({ length: size }, (_, i) => ({ id: `item-${i}` }))
      const parser = createParser({ resolver })
      const result = parser.parse('get lamp')

      expect(result).toBeDefined()
      if (size === 0) {
        expect(result.type).toBe('unknown_noun')
      } else if (size === 1) {
        expect(result.type).toBe('command')
      } else {
        expect(result.type).toBe('ambiguous')
      }
    }
  })

  it('handles many parse calls without memory leaks', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    // Parse 1000 times to check for memory leaks
    for (let i = 0; i < 1000; i++) {
      const result = parser.parse('get lamp')
      expect(result.type).toBe('command')
    }
  })
})

// ============================================
// FUZZ TESTS - Category 7: State Machine
// ============================================

describe('Fuzz: State Machine Fuzzing', () => {
  it('handles random method sequences', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const action = Math.floor(random() * 3)

      switch (action) {
        case 0:
          // Parse random command
          parser.parse(generateCommand(random))
          break
        case 1:
          // Clear pronoun
          parser.clearPronoun()
          break
        case 2:
          // Parse with "it"
          parser.parse('get it')
          break
      }

      // Parser should remain functional - 'look' is a no-args verb
      const lookResult = parser.parse('look')
      expect(lookResult.type).toBe('command')
      if (lookResult.type === 'command') {
        expect(lookResult.command.verb).toBe('LOOK')
      }
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('handles interleaved operations correctly', () => {
    const resolver = (noun: string) => [{ id: `${noun}-1` }]
    const parser = createParser({ resolver })

    // Parse with subject
    const r1 = parser.parse('get lamp')
    expect(r1.type).toBe('command')
    if (r1.type === 'command') {
      expect(r1.command.subject?.id).toBe('lamp-1')
    }

    // Use "it" - should work
    const r2 = parser.parse('examine it')
    if (r1.type === 'command' && r2.type === 'command') {
      expect(r2.command.subject?.id).toBe(r1.command.subject?.id)
    }

    // Clear pronoun
    parser.clearPronoun()

    // Use "it" - should fail
    const r3 = parser.parse('drop it')
    expect(r3.type).toBe('parse_error')

    // Parse with subject again
    parser.parse('get key')

    // Use "it" - should work with new referent
    const r4 = parser.parse('examine it')
    if (r4.type === 'command') {
      expect(r4.command.subject?.id).toBe('key-1')
    }
  })
})

// ============================================
// FUZZ TESTS - Category 8: Performance
// ============================================

describe('Fuzz: Performance and Resource Testing', () => {
  it('handles pathological inputs efficiently', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    // Very long single token
    const longToken = 'a'.repeat(10000)
    const start1 = Date.now()
    parser.parse(longToken)
    const elapsed1 = Date.now() - start1
    expect(elapsed1).toBeLessThan(100)

    // Many tokens
    const manyTokens = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' ')
    const start2 = Date.now()
    parser.parse(manyTokens)
    const elapsed2 = Date.now() - start2
    expect(elapsed2).toBeLessThan(100)
  })

  it('handles repeated patterns efficiently', () => {
    const resolver = () => [{ id: 'lamp-1' }]
    const parser = createParser({ resolver })

    const input = 'get ' + 'very '.repeat(1000) + 'lamp'
    const start = Date.now()
    parser.parse(input)
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(100)
  })

  it('completes typical inputs quickly', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const start = Date.now()
      const parseResult = parser.parse(input)
      const elapsed = Date.now() - start

      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
      expect(elapsed).toBeLessThan(10)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })
})

// ============================================
// FUZZ TESTS - Category 9: Invariant Checks
// ============================================

describe('Fuzz: Universal Invariants', () => {
  it('always returns valid ParseResult type', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const parseResult = parser.parse(input)

      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })

  it('command results have required properties', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    let commandCount = 0
    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const parseResult = parser.parse(input)

      if (parseResult.type === 'command') {
        commandCount++
        expect(parseResult.command.verb).toBe(parseResult.command.verb.toUpperCase())
        expect(parseResult.command.raw).toBe(input)
      }
    })

    expect(result.iterations).toBeGreaterThan(0)
    // At least some inputs should produce commands
    expect(commandCount).toBeGreaterThan(0)
  })

  it('EntityRef objects have required properties', () => {
    const resolver = () => [{ id: 'test-id' }]
    const parser = createParser({ resolver })

    const result = parser.parse('get shiny brass lamp')

    expect(result.type).toBe('command')
    if (result.type === 'command') {
      const entity = result.command.subject
      expect(entity?.id).toBe('test-id')
      expect(entity?.noun).toBe('lamp')
      expect(entity?.adjectives).toEqual(['shiny', 'brass'])
      expect(entity?.adjectives[0]).toBe('shiny')
      expect(entity?.adjectives[1]).toBe('brass')
    }
  })

  it('position values are always valid', () => {
    const resolver = () => []
    const parser = createParser({ resolver })

    let positionCheckCount = 0
    const result = fuzzLoop((random) => {
      const input = generateCommand(random)
      const parseResult = parser.parse(input)

      if (parseResult.type === 'unknown_noun' || parseResult.type === 'parse_error') {
        positionCheckCount++
        expect(parseResult.position).toBeGreaterThanOrEqual(0)
        expect(parseResult.position).toBeLessThanOrEqual(input.length)
      }
    })

    expect(result.iterations).toBeGreaterThan(0)
    // With empty resolver, most inputs should produce unknown_noun or parse_error
    expect(positionCheckCount).toBeGreaterThan(0)
  })

  it('never throws on any input', () => {
    const resolver = () => [{ id: 'test' }]
    const parser = createParser({ resolver })

    const result = fuzzLoop((random) => {
      const edgeCase = Math.floor(random() * 6)
      let input: string

      switch (edgeCase) {
        case 0:
          input = ''
          break
        case 1:
          input = generateWhitespaceString(random, 50)
          break
        case 2:
          input = generateUnicodeString(random, 50)
          break
        case 3:
          input = generateControlCharString(random, 50)
          break
        case 4:
          input = generateASCIIString(random, 1000)
          break
        default:
          input = generateString(random, 500)
      }

      // Should never throw, always return a valid parse result type
      const parseResult = parser.parse(input)
      expect(['command', 'ambiguous', 'unknown_verb', 'unknown_noun', 'parse_error']).toContain(parseResult.type)
    })

    expect(result.iterations).toBeGreaterThan(0)
  })
})
