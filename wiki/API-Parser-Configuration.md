# Parser Configuration API

Functions and types for creating and configuring parser instances.

---

## `createParser()`

Creates a new parser instance with the specified configuration.

**Signature:**

```typescript
function createParser(options: ParserOptions): Parser
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `ParserOptions` | Yes | Configuration options for the parser |

**Returns:** `Parser` — A parser instance with `parse`, `addVerb`, `addDirection`, and `clearPronoun` methods.

**Example:**

```typescript
import { createParser } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun, adjectives, scope) => {
    // Return matching entities from your game state
    return [{ id: 'example-1' }]
  }
})
```

**Throws:**

- `ValidationError` — When resolver is not a function

---

## Types

### `ParserOptions`

Configuration options for creating a parser.

```typescript
interface ParserOptions {
  resolver: Resolver
  vocabulary?: Partial<Vocabulary> & { extend?: boolean }
  partialMatch?: boolean
  minPartialLength?: number
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `resolver` | `Resolver` | Yes | Function that resolves nouns to game entities |
| `vocabulary` | `Partial<Vocabulary> & { extend?: boolean }` | No | Custom vocabulary configuration |
| `partialMatch` | `boolean` | No | Enable partial word matching. Default: `true` |
| `minPartialLength` | `number` | No | Minimum characters for partial match. Default: `3` |

---

### `Vocabulary`

Complete vocabulary defining all recognized words.

```typescript
interface Vocabulary {
  verbs: VerbDefinition[]
  directions: DirectionDefinition[]
  prepositions: string[]
  articles: string[]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `verbs` | `VerbDefinition[]` | Yes | All verb definitions |
| `directions` | `DirectionDefinition[]` | Yes | All direction definitions |
| `prepositions` | `string[]` | Yes | Recognized prepositions (with, to, in, etc.) |
| `articles` | `string[]` | Yes | Articles to strip (the, a, an) |

When using `vocabulary.extend`:
- `true` (default): Merges with default vocabulary
- `false`: Replaces default vocabulary entirely

---

### `VerbDefinition`

Definition of a verb with its canonical form, synonyms, and pattern.

```typescript
interface VerbDefinition {
  canonical: string
  synonyms: string[]
  pattern: VerbPattern
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `canonical` | `string` | Yes | Uppercase canonical form (e.g., `"GET"`) |
| `synonyms` | `string[]` | Yes | Lowercase synonyms including base form (e.g., `["get", "take", "grab"]`) |
| `pattern` | `VerbPattern` | Yes | What arguments this verb expects |

**Example:**

```typescript
const castVerb: VerbDefinition = {
  canonical: 'CAST',
  synonyms: ['cast', 'invoke', 'conjure'],
  pattern: 'subject'
}
```

---

### `VerbPattern`

Pattern that defines what arguments a verb expects.

```typescript
type VerbPattern = 'none' | 'subject' | 'subject_object' | 'direction' | 'text'
```

| Value | Description | Example |
|-------|-------------|---------|
| `'none'` | No arguments | look, inventory, quit |
| `'subject'` | One entity (optional preposition + object) | get lamp, unlock door with key |
| `'subject_object'` | Two entities with required preposition | put key in chest |
| `'direction'` | A direction | go north |
| `'text'` | Everything after verb as raw text | say hello world |

---

### `DirectionDefinition`

Definition of a direction with its canonical form and aliases.

```typescript
interface DirectionDefinition {
  canonical: string
  aliases: string[]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `canonical` | `string` | Yes | Uppercase canonical direction (e.g., `"NORTH"`) |
| `aliases` | `string[]` | Yes | Ways to refer to this direction (e.g., `["north", "n"]`) |

**Example:**

```typescript
const portalDirection: DirectionDefinition = {
  canonical: 'PORTAL',
  aliases: ['portal', 'p', 'teleport']
}
```

---

## Default Vocabulary

The parser includes these defaults:

**Verbs (27):**
- Movement: GO, ENTER, EXIT, CLIMB
- Interaction: GET, DROP, PUT, GIVE, THROW, OPEN, CLOSE, LOCK, UNLOCK
- Examination: LOOK, EXAMINE, SEARCH, READ
- Communication: SAY, SHOUT, TALK, ASK, TELL
- Combat: ATTACK, KILL, FIGHT
- Meta: INVENTORY, SCORE, SAVE, LOAD, QUIT, HELP

**Directions (12):**
NORTH (n), SOUTH (s), EAST (e), WEST (w), NORTHEAST (ne), NORTHWEST (nw), SOUTHEAST (se), SOUTHWEST (sw), UP (u), DOWN (d), IN, OUT

**Prepositions (9):**
with, to, at, in, on, from, into, onto, about

**Articles (3):**
the, a, an
