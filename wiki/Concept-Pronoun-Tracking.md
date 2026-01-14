# Pronoun Tracking

The parser automatically tracks the last resolved entity as "it". When a player types "get lamp" then "examine it", the parser substitutes the lamp for "it" without any work on your part. This makes natural multi-command sequences feel fluid.

## How It Works

```
> get lamp
  Parser resolves "lamp" → { id: 'lamp-1' }
  Parser remembers: lastReferent = { id: 'lamp-1', noun: 'lamp' }

> examine it
  Parser sees "it" → uses lastReferent
  Returns: { verb: 'EXAMINE', subject: { id: 'lamp-1', noun: 'lamp' } }

> drop it
  Parser sees "it" → still lamp-1
  Returns: { verb: 'DROP', subject: { id: 'lamp-1', noun: 'lamp' } }
```

The referent clears in two situations:
1. You call `parser.clearPronoun()`
2. The `scope.room` changes between parse calls

## Basic Usage

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun) => {
    const items: Record<string, { id: string }> = {
      lamp: { id: 'lamp-1' },
      key: { id: 'key-1' },
    }
    return items[noun] ? [items[noun]] : []
  }
})

// Establish a referent
parser.parse('get lamp')

// "it" now refers to the lamp
const result = parser.parse('examine it')
if (result.type === 'command') {
  result.command.subject?.id  // 'lamp-1'
}
```

## Key Points

- **Automatic tracking** - No setup required; works out of the box
- **Works in both positions** - "examine it" (subject) and "put key in it" (object)
- **Clears on room change** - Prevents stale references when moving between rooms
- **Error if no referent** - Using "it" before any entity was resolved returns a parse error

## Examples

### Subject Position

```typescript
parser.parse('get lamp')
parser.parse('examine it')   // Examines the lamp
parser.parse('drop it')      // Drops the lamp
```

### Object Position

```typescript
parser.parse('get lamp')
parser.parse('put key in it')  // Puts key in the lamp

if (result.type === 'command') {
  result.command.subject?.id  // 'key-1'
  result.command.object?.id   // 'lamp-1' (from "it")
}
```

### Room Change Clears Reference

```typescript
// In room 1
parser.parse('get lamp', { scope: { room: 'room-1' } })

// Move to room 2 - referent clears
const result = parser.parse('examine it', { scope: { room: 'room-2' } })

if (result.type === 'parse_error') {
  result.message  // 'Cannot use "it" without a previous referent'
}
```

### Manual Clearing

```typescript
parser.parse('get lamp')
parser.clearPronoun()

const result = parser.parse('examine it')
// parse_error: Cannot use "it" without a previous referent
```

### No Prior Referent

```typescript
const parser = createParser({ resolver: () => [] })

const result = parser.parse('get it')
// parse_error: Cannot use "it" without a previous referent
```

### Referent Updates

Each successful single-entity resolution updates the referent:

```typescript
parser.parse('get lamp')     // referent = lamp
parser.parse('examine key')  // referent = key (updated)
parser.parse('drop it')      // drops the key, not the lamp
```

## Related

- **[Parsing Commands](Guide-Parsing-Commands)** - Full game loop with room changes
- **[Parser Instance API](API-Parser-Instance)** - clearPronoun() method
- **[Parse Results](Concept-Parse-Results)** - Parse error when no referent
