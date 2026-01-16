# @motioneffector/parser

A natural language command parser for text adventures and interactive fiction. You give it player input like "get the red ball from the chest" and it gives you a structured command object: verb `GET`, subject `{id: "ball-red"}`, object `{id: "chest-1"}`, preposition `from`. Your job is to provide a resolver function that connects noun phrases to your game's entities—the parser handles everything else.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Parse](Your-First-Parse) |
| Understand how vocabulary works | [Vocabulary](Concept-Vocabulary) |
| Parse commands in my game | [Parsing Commands](Guide-Parsing-Commands) |
| Handle ambiguous entities | [Handling Disambiguation](Guide-Handling-Disambiguation) |
| Add custom verbs | [Custom Vocabulary](Guide-Custom-Vocabulary) |
| Handle parse errors gracefully | [Error Handling](Guide-Error-Handling) |
| Look up a specific method | [API Reference](API-Parser-Configuration) |

## Key Concepts

### Vocabulary

The vocabulary defines what words the parser recognizes: verbs with their synonyms and argument patterns, directions with shortcuts, prepositions that connect objects, and articles to strip. Ships with 27 verbs and 12 directions out of the box.

### Verb Patterns

Every verb has a pattern that tells the parser what arguments to expect. `look` expects nothing, `get` expects one thing, `put` expects a thing and a destination, `go` expects a direction, and `say` captures everything as text.

### Entity Resolution

You provide a resolver function that the parser calls to look up entities. Given a noun and adjectives, you return matching entities from your game state. Return one for success, multiple for disambiguation, or empty for "I don't see that here."

### Parse Results

The parser returns a discriminated union—check the `type` field to know what happened. You'll get `command` for success, `ambiguous` when multiple entities match, `unknown_verb` or `unknown_noun` for unrecognized words, or `parse_error` for structural problems.

## Quick Example

```typescript
import { createParser } from '@motioneffector/parser'

// Your resolver connects the parser to your game state
const parser = createParser({
  resolver: (noun, adjectives, scope) => {
    // Look up entities by name in current room
    const room = scope.room as { items: Array<{ id: string; name: string }> }
    return room.items.filter(item => item.name === noun)
  }
})

// Parse player input
const result = parser.parse('get lamp', {
  scope: { room: { items: [{ id: 'lamp-1', name: 'lamp' }] } }
})

if (result.type === 'command') {
  console.log(result.command.verb)       // "GET"
  console.log(result.command.subject?.id) // "lamp-1"
}
```

---

**[Full API Reference →](API-Parser-Configuration)**
