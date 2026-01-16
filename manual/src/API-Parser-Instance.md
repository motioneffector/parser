# Parser Instance API

Methods available on a parser instance returned by `createParser()`.

---

## `parse()`

Parses a command string and returns a result.

**Signature:**

```typescript
parse(input: string, options?: ParseOptions): ParseResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `input` | `string` | Yes | The player's command string |
| `options` | `ParseOptions` | No | Parsing options including scope |

**Returns:** `ParseResult` — A discriminated union indicating the parse outcome.

**Example:**

```typescript
const result = parser.parse('get the lamp', {
  scope: {
    room: currentRoom,
    inventory: playerInventory
  }
})

if (result.type === 'command') {
  console.log(result.command.verb)  // "GET"
}
```

**Throws:**

- `ValidationError` — When input exceeds maximum length (1,000,000 characters)

---

## `addVerb()`

Adds a custom verb definition to this parser instance.

**Signature:**

```typescript
addVerb(definition: VerbDefinition): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `definition` | `VerbDefinition` | Yes | The verb to add |

**Returns:** `void`

**Example:**

```typescript
parser.addVerb({
  canonical: 'CAST',
  synonyms: ['cast', 'invoke'],
  pattern: 'subject'
})

const result = parser.parse('cast fireball')
// { type: 'command', command: { verb: 'CAST', ... } }
```

**Notes:**

- Added verbs only affect this parser instance
- Does not modify the default vocabulary
- Synonyms must be lowercase

---

## `addDirection()`

Adds a custom direction definition to this parser instance.

**Signature:**

```typescript
addDirection(definition: DirectionDefinition): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `definition` | `DirectionDefinition` | Yes | The direction to add |

**Returns:** `void`

**Example:**

```typescript
parser.addDirection({
  canonical: 'PORTAL',
  aliases: ['portal', 'p']
})

const result = parser.parse('portal')
// { type: 'command', command: { verb: 'GO', direction: 'PORTAL' } }
```

**Notes:**

- Added directions only affect this parser instance
- Directions can be used alone or with GO
- Aliases must be lowercase

---

## `clearPronoun()`

Clears the pronoun reference ("it") tracked by this parser.

**Signature:**

```typescript
clearPronoun(): void
```

**Returns:** `void`

**Example:**

```typescript
parser.parse('get lamp')      // Sets "it" = lamp
parser.parse('examine it')    // Works, examines lamp

parser.clearPronoun()

parser.parse('examine it')    // parse_error: no referent
```

**Notes:**

- Pronoun also clears automatically when `scope.room` changes
- Use this for manual control, e.g., after time passes or scene change

---

## Types

### `ParseOptions`

Options for a single parse operation.

```typescript
interface ParseOptions {
  scope?: ResolverScope
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `scope` | `ResolverScope` | No | Context passed to the resolver |

---

### `ResolverScope`

Scope information passed to the resolver function.

```typescript
interface ResolverScope {
  room?: unknown
  inventory?: unknown
  [key: string]: unknown
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `room` | `unknown` | No | Current room or location. Changes clear pronoun. |
| `inventory` | `unknown` | No | Player's inventory |
| `[key]` | `unknown` | No | Any additional scope data |

**Example:**

```typescript
parser.parse('get lamp', {
  scope: {
    room: { id: 'room-1', items: [...] },
    inventory: [...],
    npcPresent: true,
    lightLevel: 'dim'
  }
})
```

---

### `Parser`

The parser interface returned by `createParser()`.

```typescript
interface Parser {
  parse(input: string, options?: ParseOptions): ParseResult
  addVerb(definition: VerbDefinition): void
  addDirection(definition: DirectionDefinition): void
  clearPronoun(): void
}
```
