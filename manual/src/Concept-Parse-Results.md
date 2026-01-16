# Parse Results

Every call to `parse()` returns a discriminated union—a value where the `type` field tells you exactly what happened. Check the type first, then access the appropriate properties. This pattern ensures type safety and forces you to handle every case.

## How It Works

```
parser.parse(input)
        ↓
┌───────────────────────────────────────────────────────┐
│                    ParseResult                        │
├───────────────────────────────────────────────────────┤
│  type: 'command'      → CommandResult                 │
│  type: 'ambiguous'    → AmbiguousResult               │
│  type: 'unknown_verb' → UnknownVerbResult             │
│  type: 'unknown_noun' → UnknownNounResult             │
│  type: 'parse_error'  → ParseErrorResult              │
└───────────────────────────────────────────────────────┘
```

TypeScript narrows the type when you check `result.type`:

```typescript
const result = parser.parse('get lamp')

if (result.type === 'command') {
  // TypeScript knows: result is CommandResult
  // Safe to access: result.command.verb, result.command.subject, etc.
}
```

## Basic Usage

```typescript
import { createParser, ParseResult } from '@motioneffector/parser'

const parser = createParser({ resolver: myResolver })
const result = parser.parse(playerInput)

switch (result.type) {
  case 'command':
    executeCommand(result.command)
    break

  case 'ambiguous':
    askPlayer(`Which ${result.original}?`, result.candidates)
    break

  case 'unknown_verb':
    say(`I don't know how to "${result.verb}"`)
    break

  case 'unknown_noun':
    say(`I don't see any "${result.noun}" here`)
    break

  case 'parse_error':
    say(result.message)
    break
}
```

## Key Points

- **Always check type first** - Each result type has different properties
- **Command is the success case** - Contains the fully parsed and resolved command
- **Ambiguous needs player input** - Multiple entities matched; player must choose
- **Unknown verb/noun are user errors** - The word wasn't recognized
- **Parse error is structural** - Grammar problem like missing arguments

## Examples

### CommandResult

Successful parse with all resolved entities:

```typescript
const result = parser.parse('put the red key in the chest')

if (result.type === 'command') {
  const cmd = result.command
  cmd.verb        // 'PUT'
  cmd.subject     // { id: 'key-red', noun: 'key', adjectives: ['red'] }
  cmd.preposition // 'in'
  cmd.object      // { id: 'chest-1', noun: 'chest', adjectives: [] }
  cmd.raw         // 'put the red key in the chest'
}
```

### AmbiguousResult

Multiple entities matched the noun phrase:

```typescript
const result = parser.parse('get ball')  // Red ball? Blue ball?

if (result.type === 'ambiguous') {
  result.candidates  // [{ id: 'ball-red' }, { id: 'ball-blue' }]
  result.original    // 'ball'
  result.role        // 'subject' or 'object'
}
```

### UnknownVerbResult

First word not recognized as a verb or direction:

```typescript
const result = parser.parse('dance around')

if (result.type === 'unknown_verb') {
  result.verb  // 'dance'
}
```

### UnknownNounResult

Resolver returned empty array for the noun:

```typescript
const result = parser.parse('get unicorn')

if (result.type === 'unknown_noun') {
  result.noun     // 'unicorn'
  result.position // Character position in input
}
```

### ParseErrorResult

Structural problem with the input:

```typescript
const result = parser.parse('put key')  // Missing destination

if (result.type === 'parse_error') {
  result.message  // 'Expected preposition and target'
  result.position // Character position where error occurred
}
```

### Direction Commands

Directions can be used alone or with GO:

```typescript
parser.parse('north')
// { type: 'command', command: { verb: 'GO', direction: 'NORTH' } }

parser.parse('go north')
// { type: 'command', command: { verb: 'GO', direction: 'NORTH' } }
```

### Text Commands

SAY and similar verbs capture raw text:

```typescript
parser.parse('say Hello, world!')
// { type: 'command', command: { verb: 'SAY', text: 'Hello, world!' } }
```

## Related

- **[Error Handling](Guide-Error-Handling)** - Responding to each result type
- **[Handling Disambiguation](Guide-Handling-Disambiguation)** - Working with ambiguous results
- **[Parse Results API](API-Parse-Results)** - Full interface definitions
