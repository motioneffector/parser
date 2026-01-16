# Custom Vocabulary

Add game-specific verbs and directions, or replace the default vocabulary entirely. This guide covers runtime additions and configuration-time customization.

## Prerequisites

Before starting, you should:

- [Understand vocabulary](Concept-Vocabulary)
- [Understand verb patterns](Concept-Verb-Patterns)

## Overview

We'll customize vocabulary by:

1. Adding verbs at runtime with `addVerb()`
2. Adding directions at runtime with `addDirection()`
3. Extending defaults at configuration time
4. Replacing defaults entirely

## Step 1: Add Verbs at Runtime

Use `addVerb()` to add verbs after parser creation:

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun) => [{ id: noun }]
})

// Add a magic verb
parser.addVerb({
  canonical: 'CAST',
  synonyms: ['cast', 'invoke', 'conjure'],
  pattern: 'subject'
})

// Now it works
const result = parser.parse('cast fireball')
if (result.type === 'command') {
  result.command.verb  // 'CAST'
}
```

## Step 2: Add Directions at Runtime

Use `addDirection()` for custom movement:

```typescript
// Add teleportation
parser.addDirection({
  canonical: 'PORTAL',
  aliases: ['portal', 'p', 'teleport']
})

// Works as standalone or with GO
parser.parse('portal')      // { verb: 'GO', direction: 'PORTAL' }
parser.parse('go portal')   // { verb: 'GO', direction: 'PORTAL' }
parser.parse('p')           // { verb: 'GO', direction: 'PORTAL' }
```

## Step 3: Extend at Configuration Time

Pass vocabulary options when creating the parser:

```typescript
const parser = createParser({
  resolver: myResolver,
  vocabulary: {
    extend: true,  // Keep all defaults, add these
    verbs: [
      { canonical: 'CAST', synonyms: ['cast'], pattern: 'subject' },
      { canonical: 'PRAY', synonyms: ['pray', 'worship'], pattern: 'none' },
    ],
    directions: [
      { canonical: 'PORTAL', aliases: ['portal', 'p'] },
    ]
  }
})

// All default verbs still work
parser.parse('look')        // Works
parser.parse('get lamp')    // Works

// Plus custom ones
parser.parse('cast spell')  // Works
parser.parse('portal')      // Works
```

## Step 4: Replace Defaults Entirely

For minimal or specialized parsers:

```typescript
const parser = createParser({
  resolver: myResolver,
  vocabulary: {
    extend: false,  // Ignore defaults completely
    verbs: [
      { canonical: 'SAY', synonyms: ['say'], pattern: 'text' },
      { canonical: 'LOOK', synonyms: ['look', 'l'], pattern: 'none' },
    ],
    directions: [
      { canonical: 'NEXT', aliases: ['next', 'n'] },
      { canonical: 'BACK', aliases: ['back', 'b'] },
    ],
    prepositions: ['to', 'at'],
    articles: ['the']
  }
})

// Only recognizes what you defined
parser.parse('look')       // Works
parser.parse('get lamp')   // unknown_verb (GET not defined)
parser.parse('north')      // unknown_verb (no cardinal directions)
```

## Complete Example

```typescript
import { createParser } from '@motioneffector/parser'
import type { VerbDefinition, DirectionDefinition } from '@motioneffector/parser'

// Define custom vocabulary
const magicVerbs: VerbDefinition[] = [
  { canonical: 'CAST', synonyms: ['cast', 'invoke'], pattern: 'subject' },
  { canonical: 'ENCHANT', synonyms: ['enchant', 'imbue'], pattern: 'subject_object' },
  { canonical: 'MEDITATE', synonyms: ['meditate', 'focus'], pattern: 'none' },
  { canonical: 'CHANT', synonyms: ['chant', 'incant'], pattern: 'text' },
]

const magicDirections: DirectionDefinition[] = [
  { canonical: 'ASTRAL', aliases: ['astral', 'spirit'] },
  { canonical: 'ETHEREAL', aliases: ['ethereal', 'phase'] },
]

// Create parser with magic vocabulary
const parser = createParser({
  resolver: (noun) => [{ id: noun }],
  vocabulary: {
    extend: true,
    verbs: magicVerbs,
    directions: magicDirections,
  }
})

// Test it
function test(input: string): void {
  const result = parser.parse(input)
  if (result.type === 'command') {
    console.log(`${input} → ${result.command.verb}`)
  } else {
    console.log(`${input} → ${result.type}`)
  }
}

test('cast fireball')           // CAST
test('invoke lightning')        // CAST (synonym)
test('enchant sword with fire') // ENCHANT
test('meditate')                // MEDITATE
test('chant om mani padme hum') // CHANT (text captured)
test('astral')                  // GO + ASTRAL
test('north')                   // GO + NORTH (default still works)
test('get lamp')                // GET (default still works)
```

## Variations

### Pattern Selection Guide

Choose the right pattern for your verb:

| If the verb... | Use pattern |
|----------------|-------------|
| Needs no arguments | `none` |
| Acts on one thing | `subject` |
| Transfers between things | `subject_object` |
| Is movement-related | `direction` |
| Takes free-form input | `text` |

### Flexible subject Verbs

The `subject` pattern also accepts optional preposition + object:

```typescript
parser.addVerb({
  canonical: 'ATTACK',
  synonyms: ['attack', 'hit', 'strike'],
  pattern: 'subject'  // Not subject_object
})

// Both work:
parser.parse('attack goblin')
// { verb: 'ATTACK', subject: { noun: 'goblin' } }

parser.parse('attack goblin with sword')
// { verb: 'ATTACK', subject: { noun: 'goblin' }, preposition: 'with', object: { noun: 'sword' } }
```

### Adding Prepositions

If you need custom prepositions:

```typescript
const parser = createParser({
  resolver: myResolver,
  vocabulary: {
    extend: true,
    prepositions: ['using', 'toward', 'against'],  // Added to defaults
  }
})

parser.parse('attack dragon using sword')
// { subject: 'dragon', preposition: 'using', object: 'sword' }
```

## Troubleshooting

### Custom Verb Not Recognized

**Symptom:** Returns unknown_verb for custom verb

**Cause:** Synonym not in lowercase, or addVerb() called on wrong instance

**Solution:** Ensure all synonyms are lowercase strings, and you're parsing with the same instance

### Verb Conflicts

**Symptom:** Wrong verb recognized

**Cause:** Multiple verbs share a synonym

**Solution:** Verbs are checked in order; first match wins. Add more specific verbs first.

## See Also

- **[Vocabulary](Concept-Vocabulary)** - How vocabulary works
- **[Verb Patterns](Concept-Verb-Patterns)** - Pattern details
- **[Parser Configuration API](API-Parser-Configuration)** - Full type definitions
