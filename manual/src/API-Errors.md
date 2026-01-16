# Errors API

Error classes that may be thrown by the parser.

---

## `ParserError`

Base error class for all parser errors.

```typescript
class ParserError extends Error {
  name: 'ParserError'
}
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Always `'ParserError'` |
| `message` | `string` | Error description |

**Usage:**

```typescript
import { ParserError } from '@motioneffector/parser'

try {
  parser.parse(input)
} catch (error) {
  if (error instanceof ParserError) {
    // Handle parser-specific error
  }
}
```

---

## `ValidationError`

Thrown when input validation fails.

```typescript
class ValidationError extends ParserError {
  name: 'ValidationError'
  field?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Always `'ValidationError'` |
| `message` | `string` | Error description |
| `field` | `string \| undefined` | Name of the invalid field (if applicable) |

**When Thrown:**

| Condition | Message |
|-----------|---------|
| Resolver not a function | `"Resolver must be a function"` |
| Input exceeds max length | `"Input exceeds maximum length of 1000000 characters"` |

**Example:**

```typescript
import { createParser, ValidationError } from '@motioneffector/parser'

try {
  // Missing resolver
  createParser({} as any)
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message)  // "Resolver must be a function"
    console.log(error.field)    // "resolver"
  }
}

try {
  // Input too long
  parser.parse('x'.repeat(2_000_000))
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message)  // "Input exceeds maximum length..."
    console.log(error.field)    // "input"
  }
}
```

---

## `ParseError`

Thrown when parsing fails critically.

```typescript
class ParseError extends ParserError {
  name: 'ParseError'
  position?: number
  input?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Always `'ParseError'` |
| `message` | `string` | Error description |
| `position` | `number \| undefined` | Character position of error |
| `input` | `string \| undefined` | The input string that failed |

**Notes:**

This error class exists for internal use and future extension. Currently, parsing failures are returned as `ParseErrorResult` values rather than thrown exceptions.

```typescript
// Parsing issues return results, not exceptions
const result = parser.parse('get')
if (result.type === 'parse_error') {
  console.log(result.message)  // "Expected object after GET"
}
```

---

## Error Handling Pattern

```typescript
import { createParser, ValidationError, ParserError } from '@motioneffector/parser'

function safeCreate(resolver: Resolver): Parser | null {
  try {
    return createParser({ resolver })
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`Configuration error: ${error.message}`)
      return null
    }
    throw error  // Re-throw unexpected errors
  }
}

function safeParse(parser: Parser, input: string): ParseResult | null {
  try {
    return parser.parse(input)
  } catch (error) {
    if (error instanceof ValidationError) {
      // Input too long
      console.error('Input rejected:', error.message)
      return null
    }
    if (error instanceof ParserError) {
      console.error('Parser error:', error.message)
      return null
    }
    throw error
  }
}
```

---

## Error vs Result

The parser distinguishes between:

**Errors (thrown):** Configuration problems, security limits
- Invalid resolver → `ValidationError`
- Input too long → `ValidationError`

**Results (returned):** Normal parsing outcomes
- Empty input → `ParseErrorResult`
- Unknown word → `UnknownVerbResult` / `UnknownNounResult`
- Missing argument → `ParseErrorResult`
- Multiple matches → `AmbiguousResult`
- Success → `CommandResult`
