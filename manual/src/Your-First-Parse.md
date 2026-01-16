# Your First Parse

Parse a player command and get a structured result you can execute.

By the end of this guide, you'll have a working parser that handles commands like "get lamp" and "look".

## What We're Building

A minimal parser setup that:
- Recognizes the default vocabulary (30+ verbs, 12 directions)
- Resolves nouns against a simple item list
- Returns structured command objects you can switch on

```
Input:  "get lamp"
Output: { type: 'command', command: { verb: 'GET', subject: { id: 'lamp-1', noun: 'lamp' } } }
```

## Step 1: Import and Create a Resolver

The resolver is a function you provide that looks up entities in your game. The parser calls it with a noun, any adjectives, and scope information.

```typescript
import { createParser } from '@motioneffector/parser'
import type { ResolvedEntity, ResolverScope } from '@motioneffector/parser'

// Simple in-memory game state
const gameItems = [
  { id: 'lamp-1', name: 'lamp' },
  { id: 'key-1', name: 'key' },
  { id: 'door-1', name: 'door' },
]

// Resolver: given a noun, return matching entities
function resolver(
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] {
  return gameItems.filter(item => item.name === noun)
}
```

The resolver returns an array of matches. One match means success. Multiple matches trigger disambiguation. Empty means the noun wasn't found.

## Step 2: Create the Parser

Pass your resolver to `createParser()`. That's the only required option.

```typescript
const parser = createParser({ resolver })
```

The parser is now ready. It includes the default vocabulary with verbs like GET, LOOK, OPEN, and directions like NORTH, SOUTH, UP.

## Step 3: Parse a Command

Call `parse()` with the player's input string.

```typescript
const result = parser.parse('get lamp')
```

The result is a discriminated union. Check the `type` field to determine what happened.

## Step 4: Handle the Result

Use a switch or if-chain on `result.type` to handle each case:

```typescript
switch (result.type) {
  case 'command':
    // Success! Execute the command
    console.log(`Verb: ${result.command.verb}`)
    console.log(`Subject: ${result.command.subject?.id}`)
    break

  case 'unknown_verb':
    console.log(`I don't understand "${result.verb}"`)
    break

  case 'unknown_noun':
    console.log(`I don't see any "${result.noun}" here`)
    break

  case 'ambiguous':
    console.log(`Which ${result.original}?`)
    result.candidates.forEach((c, i) => console.log(`  ${i + 1}) ${c.id}`))
    break

  case 'parse_error':
    console.log(result.message)
    break
}
```

## The Complete Code

Here's everything together:

```typescript
import { createParser } from '@motioneffector/parser'
import type { ResolvedEntity, ResolverScope } from '@motioneffector/parser'

// Game state
const gameItems = [
  { id: 'lamp-1', name: 'lamp' },
  { id: 'key-1', name: 'key' },
  { id: 'door-1', name: 'door' },
]

// Resolver
function resolver(
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] {
  return gameItems.filter(item => item.name === noun)
}

// Create parser
const parser = createParser({ resolver })

// Parse and handle commands
function handleInput(input: string): void {
  const result = parser.parse(input)

  switch (result.type) {
    case 'command':
      console.log(`Executing: ${result.command.verb}`)
      if (result.command.subject) {
        console.log(`  on: ${result.command.subject.id}`)
      }
      if (result.command.direction) {
        console.log(`  direction: ${result.command.direction}`)
      }
      break

    case 'unknown_verb':
      console.log(`I don't understand "${result.verb}"`)
      break

    case 'unknown_noun':
      console.log(`I don't see any "${result.noun}" here`)
      break

    case 'ambiguous':
      console.log(`Which ${result.original}?`)
      break

    case 'parse_error':
      console.log(result.message)
      break
  }
}

// Try it out
handleInput('look')           // Executing: LOOK
handleInput('get lamp')       // Executing: GET, on: lamp-1
handleInput('north')          // Executing: GO, direction: NORTH
handleInput('get unicorn')    // I don't see any "unicorn" here
handleInput('dance')          // I don't understand "dance"
```

## What's Next?

Now that you have the basics:

- **[Understand Vocabulary](Concept-Vocabulary)** - Learn about verbs, patterns, and directions
- **[Parsing Commands](Guide-Parsing-Commands)** - Full guide to integrating with your game loop
- **[Custom Vocabulary](Guide-Custom-Vocabulary)** - Add game-specific verbs and directions
- **[API Reference](API-Parser-Configuration)** - Full reference when you need details
