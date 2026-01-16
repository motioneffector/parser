# Entity Resolution API

Types for the resolver function that connects the parser to your game state.

---

## `Resolver`

Function type for resolving noun phrases to game entities.

**Signature:**

```typescript
type Resolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
) => ResolvedEntity[]
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `noun` | `string` | The noun word (last word of noun phrase, lowercase) |
| `adjectives` | `string[]` | Adjectives before the noun (lowercase, may be empty) |
| `scope` | `ResolverScope` | Context from ParseOptions (room, inventory, custom) |

**Returns:** `ResolvedEntity[]` — Array of matching entities:
- One element: Success, parser uses this entity
- Multiple elements: Ambiguous result, player must disambiguate
- Empty array: Unknown noun result

**Example:**

```typescript
import type { Resolver, ResolvedEntity, ResolverScope } from '@motioneffector/parser'

const resolver: Resolver = (noun, adjectives, scope) => {
  const room = scope.room as { items: GameItem[] }
  const inventory = scope.inventory as GameItem[]

  const visible = [...room.items, ...inventory]

  let matches = visible.filter(item => item.name === noun)

  if (adjectives.length > 0) {
    matches = matches.filter(item =>
      adjectives.every(adj => item.adjectives.includes(adj))
    )
  }

  return matches.map(item => ({ id: item.id, name: item.name }))
}
```

---

## Types

### `ResolvedEntity`

Entity returned by the resolver function.

```typescript
interface ResolvedEntity {
  id: string
  [key: string]: unknown
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this entity |
| `[key]` | `unknown` | No | Any additional properties (name, description, etc.) |

**Example:**

```typescript
// Minimal
const entity: ResolvedEntity = { id: 'lamp-1' }

// With extra data
const entity: ResolvedEntity = {
  id: 'lamp-1',
  name: 'brass lamp',
  description: 'An old brass lamp.',
  weight: 2
}
```

**Notes:**

- The `id` is used in the resulting `EntityRef`
- Extra properties are included in `AmbiguousResult.candidates`
- The parser doesn't interpret extra properties; they're for your use

---

### `ResolverScope`

Context passed to the resolver from `ParseOptions.scope`.

```typescript
interface ResolverScope {
  room?: unknown
  inventory?: unknown
  [key: string]: unknown
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `room` | `unknown` | No | Current room/location. Change triggers pronoun clear. |
| `inventory` | `unknown` | No | Player's inventory |
| `[key]` | `unknown` | No | Any custom scope data |

**Example:**

```typescript
// When parsing
parser.parse('get lamp', {
  scope: {
    room: currentRoom,
    inventory: player.items,
    visibility: 'dark',
    activeQuest: quest
  }
})

// In resolver
const resolver: Resolver = (noun, adjectives, scope) => {
  const room = scope.room as Room
  const visibility = scope.visibility as string

  if (visibility === 'dark') {
    // Can't see anything
    return []
  }

  return room.items.filter(i => i.name === noun)
}
```

---

## Resolution Flow

```
Input: "get the red ball"
              ↓
Tokenize: ["get", "the", "red", "ball"]
              ↓
Identify verb: GET (pattern: subject)
              ↓
Parse noun phrase: articles=["the"], adjectives=["red"], noun="ball"
              ↓
Call resolver("ball", ["red"], scope)
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Your resolver:                                              │
│   1. Search scope.room and scope.inventory                  │
│   2. Filter by noun === "ball"                              │
│   3. Filter by adjectives includes "red"                    │
│   4. Return matching entities                               │
└─────────────────────────────────────────────────────────────┘
              ↓
Parser handles result:
  - 1 entity  → CommandResult with subject
  - N entities → AmbiguousResult
  - 0 entities → UnknownNounResult
```
