# Using Partial Matching

Partial matching lets players abbreviate commands. "exa lamp" works like "examine lamp", and "n" works for "north". This guide covers how it works and how to configure it.

## Prerequisites

Before starting, you should:

- [Have basic parser setup](Your-First-Parse)

## Overview

We'll configure partial matching by:

1. Understanding default behavior
2. Adjusting the minimum length
3. Disabling it entirely
4. Handling partial matching in your resolver

## Step 1: Understand Default Behavior

Partial matching is enabled by default with a minimum of 3 characters:

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun) => [{ id: noun }]
})

// These all work (3+ characters)
parser.parse('exa lamp')    // EXAMINE
parser.parse('inv')         // INVENTORY
parser.parse('loo')         // LOOK

// These don't work (< 3 characters)
parser.parse('ex lamp')     // unknown_verb
parser.parse('in')          // Direction IN, not INVENTORY
parser.parse('lo')          // unknown_verb
```

The parser matches the first verb whose synonym starts with the input.

## Step 2: Adjust Minimum Length

Lower the minimum for more aggressive matching:

```typescript
const parser = createParser({
  resolver: myResolver,
  minPartialLength: 2
})

// Now 2 characters work
parser.parse('ex lamp')   // EXAMINE
parser.parse('ge lamp')   // GET
parser.parse('lo')        // LOOK
```

Raise it for stricter matching:

```typescript
const parser = createParser({
  resolver: myResolver,
  minPartialLength: 4
})

// Now need 4+ characters
parser.parse('exam lamp')  // EXAMINE
parser.parse('exa lamp')   // unknown_verb
```

## Step 3: Disable Partial Matching

For exact-match-only parsing:

```typescript
const parser = createParser({
  resolver: myResolver,
  partialMatch: false
})

// Only full words work
parser.parse('examine lamp')  // EXAMINE
parser.parse('exa lamp')      // unknown_verb
parser.parse('x lamp')        // EXAMINE (x is a full synonym)
```

## Step 4: Partial Matching in Resolver

The parser handles partial matching for verbs. For nouns, implement it in your resolver:

```typescript
function resolver(
  noun: string,
  adjectives: string[]
): ResolvedEntity[] {
  const items = [
    { id: 'lamp-1', name: 'lamp' },
    { id: 'lantern-1', name: 'lantern' },
    { id: 'key-1', name: 'key' },
  ]

  // Exact match first
  const exact = items.filter(item => item.name === noun)
  if (exact.length > 0) return exact

  // Partial match (if 3+ characters)
  if (noun.length >= 3) {
    const partial = items.filter(item => item.name.startsWith(noun))
    return partial
  }

  return []
}

const parser = createParser({ resolver })

parser.parse('get lamp')     // Exact: lamp-1
parser.parse('get lam')      // Partial: lamp-1
parser.parse('get lan')      // Partial: lantern-1
parser.parse('get la')       // Too short: unknown_noun
parser.parse('get l')        // Too short: unknown_noun
```

## Complete Example

```typescript
import { createParser } from '@motioneffector/parser'
import type { ResolvedEntity } from '@motioneffector/parser'

// Game items
const items = [
  { id: 'lamp-1', name: 'lamp', aliases: ['light'] },
  { id: 'lantern-1', name: 'lantern', aliases: [] },
  { id: 'sword-1', name: 'sword', aliases: ['blade'] },
  { id: 'shield-1', name: 'shield', aliases: [] },
]

// Resolver with partial matching for nouns
function resolver(noun: string, adjectives: string[]): ResolvedEntity[] {
  const minLength = 3

  // Check exact matches first (including aliases)
  for (const item of items) {
    if (item.name === noun || item.aliases.includes(noun)) {
      return [item]
    }
  }

  // Check partial matches (primary name only)
  if (noun.length >= minLength) {
    const matches = items.filter(item => item.name.startsWith(noun))
    if (matches.length === 1) {
      return matches
    }
    if (matches.length > 1) {
      return matches  // Will trigger disambiguation
    }
  }

  return []
}

// Parser with partial matching for verbs
const parser = createParser({
  resolver,
  partialMatch: true,
  minPartialLength: 3
})

// Test
function test(input: string): void {
  const result = parser.parse(input)
  if (result.type === 'command') {
    console.log(`${input} → ${result.command.verb} ${result.command.subject?.id || ''}`)
  } else if (result.type === 'ambiguous') {
    console.log(`${input} → ambiguous: ${result.candidates.map(c => c.id).join(', ')}`)
  } else {
    console.log(`${input} → ${result.type}`)
  }
}

// Verb partial matching
test('examine lamp')     // EXAMINE lamp-1
test('exa lamp')         // EXAMINE lamp-1
test('ex lamp')          // unknown_verb (< 3 chars)

// Noun partial matching (in resolver)
test('get lamp')         // GET lamp-1
test('get lam')          // GET lamp-1
test('get lan')          // GET lantern-1
test('get la')           // unknown_noun (< 3 chars)

// Ambiguity from partials
test('get sw')           // unknown_noun (< 3 chars)
test('get swo')          // GET sword-1
test('get s')            // unknown_noun

// Note: "sh" matching both sword and shield requires minLength 2
```

## Variations

### Fuzzy Matching

For typo tolerance, implement fuzzy matching in your resolver:

```typescript
function resolver(noun: string): ResolvedEntity[] {
  const items = [
    { id: 'lamp-1', name: 'lamp' },
    { id: 'sword-1', name: 'sword' },
  ]

  // Exact match
  const exact = items.filter(i => i.name === noun)
  if (exact.length > 0) return exact

  // Fuzzy match (Levenshtein distance <= 2)
  const fuzzy = items.filter(i =>
    levenshteinDistance(i.name, noun) <= 2
  )
  return fuzzy
}

// Now handles typos
parser.parse('get lampp')   // lamp-1 (1 char off)
parser.parse('get swrod')   // sword-1 (1 char transposed)
```

### Case Sensitivity

The parser lowercases all input. If you need case-sensitive nouns:

```typescript
function resolver(noun: string): ResolvedEntity[] {
  // noun is already lowercase from tokenizer
  // Match against lowercase item names
  return items.filter(i => i.name.toLowerCase() === noun)
}
```

## Troubleshooting

### Wrong Verb Matched

**Symptom:** "lo" matches LOCK instead of LOOK

**Cause:** Verbs are checked in order; LOCK comes before LOOK in default vocabulary

**Solution:** Increase minPartialLength or ensure unique prefixes

### Partial Noun Not Working

**Symptom:** "get lam" returns unknown_noun

**Cause:** Partial matching for nouns must be in your resolver

**Solution:** Implement startsWith logic in resolver as shown above

### Too Many Ambiguous Results

**Symptom:** Partials often trigger disambiguation

**Cause:** Multiple items share prefix

**Solution:** Increase minimum length or improve item naming

## See Also

- **[Vocabulary](Concept-Vocabulary)** - How verbs and synonyms work
- **[Entity Resolution](Concept-Entity-Resolution)** - Resolver implementation
- **[Parser Configuration API](API-Parser-Configuration)** - partialMatch options
