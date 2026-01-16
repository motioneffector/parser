# Verb Patterns

Every verb has a pattern that tells the parser what arguments to expect after it. When you type "get lamp", the parser knows GET expects a subject, so it looks for an entity. When you type "look", it knows LOOK expects nothing, so parsing stops there.

## How It Works

There are five patterns:

| Pattern | Expects | Example |
|---------|---------|---------|
| `none` | Nothing | look, inventory, quit |
| `subject` | One entity | get lamp, open door |
| `subject_object` | Two entities + preposition | put key in chest |
| `direction` | A direction | go north |
| `text` | Everything as raw text | say hello world |

The parser uses the pattern to know when it's done parsing and what to look for next.

```
Input: "put the red key in the old chest"

Pattern: subject_object

Parsing:
  verb:        PUT
  subject:     "red key" → resolver → { id: 'key-red' }
  preposition: "in"
  object:      "old chest" → resolver → { id: 'chest-old' }
```

## Basic Usage

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun) => [{ id: noun }]
})

// Pattern: none
const r1 = parser.parse('look')
// { verb: 'LOOK' }

// Pattern: subject
const r2 = parser.parse('get lamp')
// { verb: 'GET', subject: { id: 'lamp', noun: 'lamp' } }

// Pattern: subject_object
const r3 = parser.parse('put key in chest')
// { verb: 'PUT', subject: {...}, preposition: 'in', object: {...} }

// Pattern: direction
const r4 = parser.parse('go north')
// { verb: 'GO', direction: 'NORTH' }

// Pattern: text
const r5 = parser.parse('say hello world')
// { verb: 'SAY', text: 'hello world' }
```

## Key Points

- **Pattern determines parsing behavior** - The parser stops looking for arguments once the pattern is satisfied
- **subject pattern can have optional object** - "unlock door" and "unlock door with key" both work with a `subject` pattern verb
- **text captures everything** - Everything after a `text` verb becomes the `text` property, no resolution
- **direction pattern requires a direction** - "go lamp" is a parse error, not an unknown noun

## Examples

### None Pattern

Standalone commands with no arguments:

```typescript
parser.addVerb({
  canonical: 'MEDITATE',
  synonyms: ['meditate', 'om'],
  pattern: 'none'
})

parser.parse('meditate')
// { verb: 'MEDITATE' }
```

### Subject Pattern

Commands that act on one thing:

```typescript
parser.addVerb({
  canonical: 'CAST',
  synonyms: ['cast', 'invoke'],
  pattern: 'subject'
})

parser.parse('cast fireball')
// { verb: 'CAST', subject: { noun: 'fireball', ... } }
```

### Subject with Optional Object

The `subject` pattern also accepts an optional preposition + object:

```typescript
// UNLOCK has pattern 'subject'
parser.parse('unlock door')
// { verb: 'UNLOCK', subject: { noun: 'door' } }

parser.parse('unlock door with key')
// { verb: 'UNLOCK', subject: { noun: 'door' }, preposition: 'with', object: { noun: 'key' } }
```

### Subject-Object Pattern

Commands that require two things:

```typescript
// PUT has pattern 'subject_object'
parser.parse('put key in chest')
// { verb: 'PUT', subject: {...}, preposition: 'in', object: {...} }

parser.parse('put key')
// parse_error: "Expected preposition and target"
```

### Direction Pattern

Movement commands:

```typescript
// GO has pattern 'direction'
parser.parse('go north')
// { verb: 'GO', direction: 'NORTH' }

parser.parse('go lamp')
// parse_error: "Expected direction, got 'lamp'"
```

### Text Pattern

Free-form text capture:

```typescript
// SAY has pattern 'text'
parser.parse('say hello world')
// { verb: 'SAY', text: 'hello world' }

parser.parse('say "Hello!" she shouted')
// { verb: 'SAY', text: '"Hello!" she shouted' }
```

## Related

- **[Vocabulary](Concept-Vocabulary)** - The full vocabulary system including verbs
- **[Custom Vocabulary](Guide-Custom-Vocabulary)** - Adding verbs with custom patterns
- **[Parser Configuration API](API-Parser-Configuration)** - VerbPattern type definition
