# @motioneffector/parser

Text adventure command parser for natural language game input.

[![npm version](https://img.shields.io/npm/v/@motioneffector/parser.svg)](https://www.npmjs.com/package/@motioneffector/parser)
[![license](https://img.shields.io/npm/l/@motioneffector/parser.svg)](https://github.com/motioneffector/parser/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Installation

```bash
npm install @motioneffector/parser
```

## Quick Start

```typescript
import { createParser } from '@motioneffector/parser'

// Create a parser with a resolver function
const parser = createParser({
  resolver: (noun, adjectives, scope) => {
    // Look up entities from your game state
    // Return matching entities based on noun and adjectives
    return [{ id: 'lamp-1', name: 'brass lamp' }]
  }
})

// Parse player input
const result = parser.parse('get lamp')

if (result.type === 'command') {
  console.log(`Verb: ${result.command.verb}`) // "GET"
  console.log(`Subject: ${result.command.subject?.id}`) // "lamp-1"
}
```

## Features

- **Natural Language Parsing** - Understands common text adventure commands
- **Default Vocabulary** - Ships with 30+ common verbs and directions
- **Custom Vocabulary** - Add game-specific verbs and directions
- **Object Resolution** - Pluggable resolver for looking up game entities
- **Disambiguation** - Handles multiple matching objects gracefully
- **Pronoun Support** - Tracks "it" references automatically
- **Partial Matching** - "exa lamp" matches "examine lamp" (configurable)
- **Position Tracking** - Token positions for error reporting
- **TypeScript First** - Full type definitions included

## Command Patterns

The parser supports these common text adventure patterns:

```typescript
// Verb only
parser.parse('look') // { verb: 'LOOK' }
parser.parse('inventory') // { verb: 'INVENTORY' }

// Directions
parser.parse('north') // { verb: 'GO', direction: 'NORTH' }
parser.parse('go n') // { verb: 'GO', direction: 'NORTH' }

// Verb + Subject
parser.parse('get lamp') // { verb: 'GET', subject: {...} }
parser.parse('examine door') // { verb: 'EXAMINE', subject: {...} }

// Verb + Adjective + Subject
parser.parse('get red ball') // subject has adjectives: ['red']

// Verb + Subject + Preposition + Object
parser.parse('put key in box')
// { verb: 'PUT', subject: {key}, preposition: 'in', object: {box} }

// Text capture
parser.parse('say hello world')
// { verb: 'SAY', text: 'hello world' }
```

## API Reference

### `createParser(options)`

Creates a parser instance.

**Options:**

- `resolver` (required): Function that resolves nouns to game entities
- `vocabulary` (optional): Custom vocabulary to extend or replace defaults
- `partialMatch` (optional): Enable partial word matching (default: true)
- `minPartialLength` (optional): Minimum chars for partial match (default: 3)

```typescript
const parser = createParser({
  resolver: (noun, adjectives, scope) => {
    // Return array of matching entities
    return [{ id: 'entity-1' }]
  },
  partialMatch: true,
  minPartialLength: 3
})
```

### `parser.parse(input, options?)`

Parses a command string.

**Parameters:**

- `input`: The command string to parse
- `options.scope` (optional): Context for entity resolution (room, inventory, etc.)

**Returns:** `ParseResult` - One of:

- `CommandResult` - Successfully parsed command
- `AmbiguousResult` - Multiple entities matched
- `UnknownVerbResult` - Verb not recognized
- `UnknownNounResult` - Entity not found
- `ParseErrorResult` - Syntax error

```typescript
const result = parser.parse('get lamp', {
  scope: {
    room: currentRoom,
    inventory: playerInventory
  }
})

switch (result.type) {
  case 'command':
    // Execute the command
    executeCommand(result.command)
    break
  case 'ambiguous':
    // Ask player to clarify
    showDisambiguation(result.candidates)
    break
  case 'unknown_verb':
    console.log(`I don't understand "${result.verb}"`)
    break
  case 'unknown_noun':
    console.log(`I don't see any "${result.noun}" here`)
    break
  case 'parse_error':
    console.log(result.message)
    break
}
```

### `parser.addVerb(definition)`

Add a custom verb at runtime.

```typescript
parser.addVerb({
  canonical: 'CAST',
  synonyms: ['cast', 'invoke', 'channel'],
  pattern: 'subject' // or 'none', 'subject_object', 'direction', 'text'
})

parser.parse('cast spell') // Works!
```

### `parser.addDirection(definition)`

Add a custom direction.

```typescript
parser.addDirection({
  canonical: 'PORTAL',
  aliases: ['portal', 'p']
})

parser.parse('portal') // Works!
```

### `parser.clearPronoun()`

Clear the "it" reference (call when room changes).

```typescript
parser.clearPronoun()
```

## Resolver Function

The resolver function is how you connect the parser to your game state:

```typescript
type Resolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
) => ResolvedEntity[]

// Example implementation
const resolver = (noun, adjectives, scope) => {
  const entities = []

  // Check inventory
  for (const item of scope.inventory) {
    if (item.noun === noun) {
      // Check adjectives match
      if (adjectives.every(adj => item.adjectives.includes(adj))) {
        entities.push({ id: item.id })
      }
    }
  }

  // Check room
  for (const obj of scope.room.objects) {
    if (obj.noun === noun) {
      if (adjectives.every(adj => obj.adjectives.includes(adj))) {
        entities.push({ id: obj.id })
      }
    }
  }

  return entities // Return all matches
}
```

## Default Vocabulary

The parser ships with these verbs:

**Movement:** go, walk, run, enter, exit, leave, climb
**Interaction:** get, take, drop, put, give, throw, open, close, lock, unlock
**Examination:** look, examine (x), inspect, search, read
**Communication:** say, talk, ask, tell, shout
**Combat:** attack, hit, strike, kill, fight
**Meta:** inventory (i, inv), score, save, load, quit, help

**Directions:** north (n), south (s), east (e), west (w), northeast (ne), northwest (nw), southeast (se), southwest (sw), up (u), down (d), in, out

## Custom Vocabulary

Extend or replace the default vocabulary:

```typescript
// Extend defaults
const parser = createParser({
  resolver,
  vocabulary: {
    extend: true, // default
    verbs: [
      { canonical: 'PRAY', synonyms: ['pray'], pattern: 'none' }
    ]
  }
})

// Replace defaults entirely
const parser = createParser({
  resolver,
  vocabulary: {
    extend: false,
    verbs: [/* only these verbs */],
    directions: [/* only these directions */],
    prepositions: ['with', 'to'],
    articles: ['the']
  }
})
```

## Pronoun Support

The parser tracks "it" references automatically:

```typescript
parser.parse('get lamp') // Returns: { subject: { id: 'lamp-1' } }
parser.parse('examine it') // "it" resolves to lamp-1

// Clear on room change
parser.clearPronoun()
parser.parse('examine it') // Error: no referent
```

## Disambiguation

When multiple entities match, the parser returns them for disambiguation:

```typescript
// Two balls in room
const result = parser.parse('get ball')

if (result.type === 'ambiguous') {
  console.log('Which ball?')
  result.candidates.forEach((entity, i) => {
    console.log(`${i + 1}. ${entity.name}`)
  })
  // Player can then be more specific: "get red ball"
}
```

## Error Handling

The parser provides helpful error messages:

```typescript
const result = parser.parse('xyzzy lamp')

if (result.type === 'unknown_verb') {
  console.log(`Unknown verb: ${result.verb}`)
}

if (result.type === 'unknown_noun') {
  console.log(`Unknown object: ${result.noun}`)
  console.log(`Position: ${result.position}`)
}

if (result.type === 'parse_error') {
  console.log(`Parse error: ${result.message}`)
}
```

## TypeScript Support

Full type definitions included:

```typescript
import type {
  Parser,
  ParseResult,
  Command,
  EntityRef,
  Resolver,
  VerbDefinition,
  DirectionDefinition
} from '@motioneffector/parser'
```

## Demo

[Try the interactive demo](https://motioneffector.github.io/parser/index.html)

## Browser Support

Works in all modern browsers (ES2022+). For older browsers, use a transpiler.

## License

MIT © [motioneffector](https://github.com/motioneffector)
