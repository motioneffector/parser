# Entity Resolution

Entity resolution is how the parser connects words to things in your game. When a player types "get the red ball", the parser extracts "red" (adjective) and "ball" (noun), then calls your resolver function to find matching entities. You return what you find from your game state.

## How It Works

```
Player input: "get the red ball from the chest"
                    ↓
Parser extracts: noun="ball", adjectives=["red"]
                    ↓
Your resolver: Look up in current room/inventory
                    ↓
Return: [{ id: 'ball-red', name: 'red ball' }]
                    ↓
Parser builds: { subject: { id: 'ball-red', noun: 'ball', adjectives: ['red'] } }
```

The resolver receives three things:
- **noun** - The noun word (always the last word of a noun phrase)
- **adjectives** - Any adjectives before the noun (can be empty)
- **scope** - Context you provide (current room, inventory, etc.)

You return an array of matching entities:
- **One match** → Success, parser uses this entity
- **Multiple matches** → Ambiguous result, player must disambiguate
- **Empty array** → Unknown noun result

## Basic Usage

```typescript
import { createParser } from '@motioneffector/parser'
import type { ResolvedEntity, ResolverScope } from '@motioneffector/parser'

// Your game's entity type
interface GameItem {
  id: string
  name: string
  adjectives: string[]
  location: string
}

// Your game state
const items: GameItem[] = [
  { id: 'ball-red', name: 'ball', adjectives: ['red'], location: 'room-1' },
  { id: 'ball-blue', name: 'ball', adjectives: ['blue'], location: 'room-1' },
  { id: 'lamp-1', name: 'lamp', adjectives: ['brass'], location: 'room-1' },
]

// Resolver connects parser to game state
function resolver(
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] {
  const room = scope.room as string

  // Find items matching noun in current room
  let matches = items.filter(
    item => item.name === noun && item.location === room
  )

  // Filter by adjectives if provided
  if (adjectives.length > 0) {
    matches = matches.filter(item =>
      adjectives.every(adj => item.adjectives.includes(adj))
    )
  }

  return matches
}

const parser = createParser({ resolver })
```

## Key Points

- **You control entity lookup** - The parser doesn't know about your game; your resolver bridges the gap
- **Scope carries context** - Pass the current room, inventory, or any data your resolver needs
- **Adjectives narrow matches** - Use them to distinguish "red ball" from "blue ball"
- **Return value determines outcome** - One match = success, many = ambiguous, none = unknown

## Examples

### Simple Name Matching

```typescript
function resolver(noun: string): ResolvedEntity[] {
  const items = { lamp: { id: 'lamp-1' }, key: { id: 'key-1' } }
  const item = items[noun as keyof typeof items]
  return item ? [item] : []
}
```

### With Adjective Filtering

```typescript
function resolver(
  noun: string,
  adjectives: string[]
): ResolvedEntity[] {
  // All balls in the game
  const balls = [
    { id: 'ball-red', name: 'ball', color: 'red' },
    { id: 'ball-blue', name: 'ball', color: 'blue' },
  ]

  let matches = balls.filter(b => b.name === noun)

  // "red ball" filters to just the red one
  if (adjectives.includes('red')) {
    matches = matches.filter(b => b.color === 'red')
  }
  if (adjectives.includes('blue')) {
    matches = matches.filter(b => b.color === 'blue')
  }

  return matches
}
```

### With Scope

```typescript
function resolver(
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] {
  const currentRoom = scope.room as Room
  const inventory = scope.inventory as Item[]

  // Search current room and inventory
  const visible = [...currentRoom.items, ...inventory]
  return visible.filter(item => item.name === noun)
}

// Pass scope when parsing
parser.parse('get lamp', {
  scope: {
    room: currentRoom,
    inventory: playerInventory
  }
})
```

### Triggering Disambiguation

```typescript
function resolver(noun: string): ResolvedEntity[] {
  if (noun === 'ball') {
    // Multiple matches trigger disambiguation
    return [
      { id: 'ball-red', name: 'red ball' },
      { id: 'ball-blue', name: 'blue ball' },
    ]
  }
  return []
}

parser.parse('get ball')
// { type: 'ambiguous', candidates: [...], original: 'ball' }
```

## Related

- **[Parse Results](Concept-Parse-Results)** - Understanding what the parser returns
- **[Handling Disambiguation](Guide-Handling-Disambiguation)** - What to do when multiple entities match
- **[Entity Resolution API](API-Entity-Resolution)** - Full type definitions
