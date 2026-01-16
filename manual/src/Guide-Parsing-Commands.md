# Parsing Commands

This guide walks through integrating the parser into a game loop. You'll set up a resolver connected to your game state, parse player input, and execute commands based on the results.

## Prerequisites

Before starting, you should:

- [Have the parser installed](Installation)
- [Understand parse results](Concept-Parse-Results)

## Overview

We'll build a working game loop by:

1. Defining your game state structure
2. Creating a resolver that queries game state
3. Setting up the parser with scope
4. Handling each result type
5. Executing commands

## Step 1: Define Game State

Your game needs entities that the parser can resolve. At minimum, each entity needs an `id` and a way to match by name.

```typescript
interface GameItem {
  id: string
  name: string
  adjectives: string[]
}

interface Room {
  id: string
  name: string
  items: GameItem[]
  exits: Record<string, string>  // direction → room id
}

interface GameState {
  currentRoom: Room
  inventory: GameItem[]
}

const gameState: GameState = {
  currentRoom: {
    id: 'room-1',
    name: 'Living Room',
    items: [
      { id: 'lamp-1', name: 'lamp', adjectives: ['brass'] },
      { id: 'key-1', name: 'key', adjectives: ['rusty'] },
    ],
    exits: { north: 'room-2' }
  },
  inventory: []
}
```

## Step 2: Create the Resolver

The resolver searches your game state for matching entities. It receives the noun, adjectives, and scope you provide.

```typescript
import type { ResolvedEntity, ResolverScope } from '@motioneffector/parser'

function resolver(
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] {
  const room = scope.room as Room
  const inventory = scope.inventory as GameItem[]

  // Search both room and inventory
  const visible = [...room.items, ...inventory]

  // Filter by noun
  let matches = visible.filter(item => item.name === noun)

  // Narrow by adjectives if provided
  if (adjectives.length > 0) {
    matches = matches.filter(item =>
      adjectives.every(adj => item.adjectives.includes(adj))
    )
  }

  return matches
}
```

## Step 3: Set Up the Parser

Create the parser once and reuse it. Pass scope with each parse call to give the resolver current context.

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({ resolver })

function parseInput(input: string) {
  return parser.parse(input, {
    scope: {
      room: gameState.currentRoom,
      inventory: gameState.inventory
    }
  })
}
```

## Step 4: Handle Results

Process each result type appropriately:

```typescript
function handleCommand(input: string): string {
  const result = parseInput(input)

  switch (result.type) {
    case 'command':
      return executeCommand(result.command)

    case 'ambiguous':
      const options = result.candidates
        .map((c, i) => `${i + 1}) ${c.name || c.id}`)
        .join('\n')
      return `Which ${result.original}?\n${options}`

    case 'unknown_verb':
      return `I don't know how to "${result.verb}".`

    case 'unknown_noun':
      return `I don't see any "${result.noun}" here.`

    case 'parse_error':
      return result.message
  }
}
```

## Step 5: Execute Commands

Dispatch based on the verb and operate on your game state:

```typescript
import type { Command } from '@motioneffector/parser'

function executeCommand(cmd: Command): string {
  switch (cmd.verb) {
    case 'LOOK':
      return describeRoom(gameState.currentRoom)

    case 'INVENTORY':
      if (gameState.inventory.length === 0) {
        return "You're not carrying anything."
      }
      return "You have: " + gameState.inventory.map(i => i.name).join(', ')

    case 'GET': {
      const item = findItemInRoom(cmd.subject!.id)
      if (!item) return "It's not here."
      removeFromRoom(item)
      gameState.inventory.push(item)
      return `You take the ${item.name}.`
    }

    case 'DROP': {
      const item = findInInventory(cmd.subject!.id)
      if (!item) return "You don't have that."
      removeFromInventory(item)
      gameState.currentRoom.items.push(item)
      return `You drop the ${item.name}.`
    }

    case 'GO': {
      const nextRoomId = gameState.currentRoom.exits[cmd.direction!.toLowerCase()]
      if (!nextRoomId) return "You can't go that way."
      gameState.currentRoom = getRoomById(nextRoomId)
      return describeRoom(gameState.currentRoom)
    }

    default:
      return `You ${cmd.verb.toLowerCase()} the ${cmd.subject?.noun || 'air'}.`
  }
}
```

## Complete Example

```typescript
import { createParser } from '@motioneffector/parser'
import type { Command, ResolvedEntity, ResolverScope } from '@motioneffector/parser'

// Types
interface GameItem {
  id: string
  name: string
  adjectives: string[]
}

interface Room {
  id: string
  name: string
  description: string
  items: GameItem[]
  exits: Record<string, string>
}

// State
const rooms: Record<string, Room> = {
  'room-1': {
    id: 'room-1',
    name: 'Living Room',
    description: 'A cozy room with a fireplace.',
    items: [{ id: 'lamp-1', name: 'lamp', adjectives: ['brass'] }],
    exits: { north: 'room-2' }
  },
  'room-2': {
    id: 'room-2',
    name: 'Kitchen',
    description: 'A small kitchen.',
    items: [{ id: 'key-1', name: 'key', adjectives: ['rusty'] }],
    exits: { south: 'room-1' }
  }
}

let currentRoom = rooms['room-1']!
const inventory: GameItem[] = []

// Resolver
function resolver(noun: string, adjectives: string[], scope: ResolverScope): ResolvedEntity[] {
  const room = scope.room as Room
  const inv = scope.inventory as GameItem[]
  const visible = [...room.items, ...inv]
  let matches = visible.filter(item => item.name === noun)
  if (adjectives.length > 0) {
    matches = matches.filter(item => adjectives.every(adj => item.adjectives.includes(adj)))
  }
  return matches
}

// Parser
const parser = createParser({ resolver })

// Game loop
function play(input: string): string {
  const result = parser.parse(input, {
    scope: { room: currentRoom, inventory }
  })

  if (result.type !== 'command') {
    if (result.type === 'unknown_verb') return `I don't understand "${result.verb}".`
    if (result.type === 'unknown_noun') return `I don't see any "${result.noun}" here.`
    if (result.type === 'ambiguous') return `Which ${result.original}?`
    return result.message
  }

  const cmd = result.command

  switch (cmd.verb) {
    case 'LOOK':
      return `${currentRoom.name}\n${currentRoom.description}`
    case 'GO': {
      const dir = cmd.direction!.toLowerCase()
      const nextId = currentRoom.exits[dir]
      if (!nextId) return "You can't go that way."
      currentRoom = rooms[nextId]!
      return `${currentRoom.name}\n${currentRoom.description}`
    }
    default:
      return `You ${cmd.verb.toLowerCase()}.`
  }
}
```

## Variations

### Async Resolver

If your game state is in a database:

```typescript
// Note: The parser expects a synchronous resolver.
// Load data before parsing, not inside the resolver.

async function handleInput(input: string) {
  // Load current state
  const room = await db.getRoom(currentRoomId)
  const inventory = await db.getInventory(playerId)

  const result = parser.parse(input, {
    scope: { room, inventory }
  })

  // Handle result...
}
```

### Multiple Parser Instances

For multiplayer or testing:

```typescript
// Each player can have their own parser instance
const player1Parser = createParser({ resolver })
const player2Parser = createParser({ resolver })

// Pronoun tracking is per-instance
player1Parser.parse('get lamp')
player1Parser.parse('examine it')  // lamp
player2Parser.parse('examine it')  // error - no referent
```

## Troubleshooting

### Pronoun "it" Not Working

**Symptom:** "examine it" returns parse error

**Cause:** No previous entity was resolved, or room changed

**Solution:** Ensure a command with a subject succeeded first, and that scope.room hasn't changed

### Items Not Found

**Symptom:** "get lamp" returns unknown_noun even though lamp exists

**Cause:** Resolver isn't finding the item

**Solution:** Check that scope is being passed correctly and resolver logic matches item names

## See Also

- **[Error Handling](Guide-Error-Handling)** - Better error messages
- **[Handling Disambiguation](Guide-Handling-Disambiguation)** - When multiple items match
- **[Parse Results](Concept-Parse-Results)** - All result types explained
