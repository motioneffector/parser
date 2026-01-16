# Tokenization API

Internal types for tokens produced by the parser's tokenizer. Exposed for advanced use cases like error position mapping.

---

## `Token`

A single token from the input string.

```typescript
interface Token {
  type: TokenType
  value: string
  original: string
  start: number
  end: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `TokenType` | The type of token |
| `value` | `string` | Normalized value (lowercase for words) |
| `original` | `string` | Original text before normalization |
| `start` | `number` | Start position in original input (0-indexed) |
| `end` | `number` | End position in original input (exclusive) |

**Example:**

```typescript
// Input: "Get THE lamp"
// Tokens:
[
  { type: 'WORD', value: 'get', original: 'Get', start: 0, end: 3 },
  { type: 'WORD', value: 'the', original: 'THE', start: 4, end: 7 },
  { type: 'WORD', value: 'lamp', original: 'lamp', start: 8, end: 12 }
]
```

---

## `TokenType`

Type of token produced by the tokenizer.

```typescript
type TokenType =
  | 'WORD'
  | 'QUOTED_STRING'
  | 'NUMBER'
  | 'PUNCTUATION'
  | 'WHITESPACE'
```

| Type | Description | Example |
|------|-------------|---------|
| `'WORD'` | Alphanumeric word | `get`, `lamp`, `café` |
| `'QUOTED_STRING'` | Text in quotes | `"hello world"` |
| `'NUMBER'` | Numeric value | `123`, `42` |
| `'PUNCTUATION'` | Punctuation character | `.`, `!`, `,` |
| `'WHITESPACE'` | Whitespace (usually skipped) | ` `, `\t`, `\n` |

---

## Position Mapping

Use token positions to map errors back to input:

```typescript
const input = 'get the unicorn from chest'
const result = parser.parse(input)

if (result.type === 'unknown_noun') {
  const position = result.position

  // Highlight the problem word
  const before = input.slice(0, position)
  const word = result.noun
  const after = input.slice(position + word.length)

  console.log(`${before}[${word}]${after}`)
  // "get the [unicorn] from chest"

  // Or show a caret
  console.log(input)
  console.log(' '.repeat(position) + '^'.repeat(word.length))
  // get the unicorn from chest
  //         ^^^^^^^
}
```

---

## Tokenization Behavior

**Word normalization:**
- Converted to lowercase
- Trailing punctuation stripped
- Unicode characters preserved

**Quoted strings:**
- Delimiters: `"` or `'`
- Escape sequences: `\"`, `\'`, `\\`
- Value excludes quotes

**Whitespace:**
- Tabs, newlines, spaces all treated as separators
- Multiple consecutive whitespace collapsed
- Not included in token output

**Punctuation:**
- Stripped from word ends
- Standalone punctuation skipped
- Commas between items don't create lists

**Examples:**

```typescript
// Lowercase
"GET LAMP" → [{ value: 'get' }, { value: 'lamp' }]

// Trailing punctuation stripped
"look." → [{ value: 'look' }]

// Quoted strings
'say "Hello!"' → [{ value: 'say' }, { value: 'Hello!', type: 'QUOTED_STRING' }]

// Unicode preserved
"get café" → [{ value: 'get' }, { value: 'café' }]

// Whitespace variations
"get\tlamp" → [{ value: 'get' }, { value: 'lamp' }]
"get\nlamp" → [{ value: 'get' }, { value: 'lamp' }]
```

---

## Use Cases

**Error display:**
Use `position` from `UnknownNounResult` or `ParseErrorResult` to highlight problems in the original input.

**Custom preprocessing:**
If you need to normalize or transform input before parsing, token positions let you map results back to the original.

**Debugging:**
Understanding tokenization helps diagnose why certain inputs parse unexpectedly.
