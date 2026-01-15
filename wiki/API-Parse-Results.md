# Parse Results API

Types for the discriminated union returned by `parser.parse()`.

---

## `ParseResult`

Union of all possible parse outcomes.

```typescript
type ParseResult =
  | CommandResult
  | AmbiguousResult
  | UnknownVerbResult
  | UnknownNounResult
  | ParseErrorResult
```

Check `result.type` to narrow to the specific type:

```typescript
const result = parser.parse(input)

switch (result.type) {
  case 'command':      // CommandResult
  case 'ambiguous':    // AmbiguousResult
  case 'unknown_verb': // UnknownVerbResult
  case 'unknown_noun': // UnknownNounResult
  case 'parse_error':  // ParseErrorResult
}
```

---

## `CommandResult`

Successful parse with a fully resolved command.

```typescript
interface CommandResult {
  type: 'command'
  command: Command
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'command'` | Discriminator |
| `command` | `Command` | The parsed command |

---

## `Command`

A successfully parsed command with all resolved entities.

```typescript
interface Command {
  verb: string
  subject?: EntityRef
  object?: EntityRef
  preposition?: string
  direction?: string
  text?: string
  raw: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `verb` | `string` | Canonical verb (uppercase, e.g., `"GET"`) |
| `subject` | `EntityRef` | Primary entity. Present for `subject` and `subject_object` patterns. |
| `object` | `EntityRef` | Secondary entity. Present for `subject_object` pattern. |
| `preposition` | `string` | Connecting preposition (e.g., `"in"`, `"with"`). Present when object exists. |
| `direction` | `string` | Canonical direction (uppercase). Present for `direction` pattern. |
| `text` | `string` | Raw text content. Present for `text` pattern. |
| `raw` | `string` | Original input string |

**Examples:**

```typescript
// "look"
{ verb: 'LOOK', raw: 'look' }

// "get lamp"
{ verb: 'GET', subject: { id: 'lamp-1', noun: 'lamp', adjectives: [] }, raw: 'get lamp' }

// "put key in chest"
{
  verb: 'PUT',
  subject: { id: 'key-1', noun: 'key', adjectives: [] },
  preposition: 'in',
  object: { id: 'chest-1', noun: 'chest', adjectives: [] },
  raw: 'put key in chest'
}

// "north" or "go north"
{ verb: 'GO', direction: 'NORTH', raw: 'north' }

// "say hello world"
{ verb: 'SAY', text: 'hello world', raw: 'say hello world' }
```

---

## `EntityRef`

Reference to a resolved entity within a command.

```typescript
interface EntityRef {
  id: string
  noun: string
  adjectives: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Entity ID from resolver |
| `noun` | `string` | The noun that was used |
| `adjectives` | `string[]` | Adjectives that were used (may be empty) |

**Example:**

```typescript
// "get the red ball"
{
  id: 'ball-red',      // From resolver
  noun: 'ball',        // From input
  adjectives: ['red']  // From input
}
```

---

## `AmbiguousResult`

Multiple entities matched and disambiguation is needed.

```typescript
interface AmbiguousResult {
  type: 'ambiguous'
  candidates: ResolvedEntity[]
  original: string
  role: 'subject' | 'object'
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'ambiguous'` | Discriminator |
| `candidates` | `ResolvedEntity[]` | All matching entities from resolver |
| `original` | `string` | The noun phrase that was ambiguous (e.g., `"ball"`) |
| `role` | `'subject' \| 'object'` | Which part of command was ambiguous |

**Example:**

```typescript
// "get ball" when red and blue balls exist
{
  type: 'ambiguous',
  candidates: [
    { id: 'ball-red', name: 'red ball' },
    { id: 'ball-blue', name: 'blue ball' }
  ],
  original: 'ball',
  role: 'subject'
}
```

---

## `UnknownVerbResult`

First word not recognized as a verb or direction.

```typescript
interface UnknownVerbResult {
  type: 'unknown_verb'
  verb: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'unknown_verb'` | Discriminator |
| `verb` | `string` | The unrecognized word |

**Example:**

```typescript
// "dance around"
{
  type: 'unknown_verb',
  verb: 'dance'
}
```

---

## `UnknownNounResult`

Resolver returned empty array for the noun.

```typescript
interface UnknownNounResult {
  type: 'unknown_noun'
  noun: string
  position: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'unknown_noun'` | Discriminator |
| `noun` | `string` | The unrecognized noun |
| `position` | `number` | Character position in input where noun appeared |

**Example:**

```typescript
// "get unicorn"
{
  type: 'unknown_noun',
  noun: 'unicorn',
  position: 4
}
```

---

## `ParseErrorResult`

Structural problem with the input.

```typescript
interface ParseErrorResult {
  type: 'parse_error'
  message: string
  position: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'parse_error'` | Discriminator |
| `message` | `string` | Human-readable error description |
| `position` | `number` | Character position where error occurred |

**Common Messages:**

| Message | Cause |
|---------|-------|
| `"Empty input"` | Input was empty or only whitespace |
| `"Expected object after GET"` | Verb requires subject but none provided |
| `"Expected direction after GO"` | GO without a direction |
| `"Expected preposition and target"` | PUT without destination |
| `"Expected direction, got 'X'"` | GO followed by non-direction |
| `"Cannot use 'it' without a previous referent"` | Pronoun with no antecedent |

**Example:**

```typescript
// "put key" (missing destination)
{
  type: 'parse_error',
  message: 'Expected preposition and target',
  position: 7
}
```
