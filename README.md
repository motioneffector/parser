# @motioneffector/parser

A natural language command parser for text adventures and interactive fiction.

[![npm version](https://img.shields.io/npm/v/@motioneffector/parser.svg)](https://www.npmjs.com/package/@motioneffector/parser)
[![license](https://img.shields.io/npm/l/@motioneffector/parser.svg)](https://github.com/motioneffector/parser/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/parser/)**

## Features

- **Natural Language Parsing** - Understands common text adventure commands
- **Default Vocabulary** - Ships with 30+ verbs and directions
- **Custom Vocabulary** - Extend or replace with game-specific commands
- **Smart Resolution** - Pluggable resolver connects to your game state
- **Disambiguation** - Handles multiple matching objects gracefully
- **Pronoun Tracking** - Automatic "it" reference management
- **Partial Matching** - "exa lamp" matches "examine lamp"
- **Position Tracking** - Token positions for error reporting

[Read the full manual →](https://motioneffector.github.io/parser/manual/)

## Quick Start

```typescript
import { createParser } from '@motioneffector/parser'

// Create parser with entity resolver
const parser = createParser({
  resolver: (noun, adjectives, scope) => {
    // Look up entities from your game state
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

## Testing & Validation

- **Comprehensive test suite** - 371 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
