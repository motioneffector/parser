# Vocabulary

The vocabulary is the parser's dictionary—it defines every word the parser recognizes and what that word means. Without vocabulary, the parser would see "get lamp" as meaningless tokens. With vocabulary, it knows "get" is a verb that expects a subject.

## How It Works

Vocabulary has four parts:

```
┌─────────────────────────────────────────────────────────┐
│                     Vocabulary                          │
├─────────────────────────────────────────────────────────┤
│  Verbs       │ Actions with patterns (get, look, put)  │
│  Directions  │ Movement shortcuts (north, n, up)       │
│  Prepositions│ Object connectors (in, on, with, to)    │
│  Articles    │ Stripped words (the, a, an)             │
└─────────────────────────────────────────────────────────┘
```

**Verbs** are the heart of commands. Each verb has a canonical form (uppercase like `GET`), synonyms (lowercase like `get`, `take`, `grab`), and a pattern that defines what arguments it expects.

**Directions** can be used alone ("north") or with GO ("go north"). Each has a canonical form (`NORTH`) and aliases (`north`, `n`).

**Prepositions** connect subjects to objects: "put key **in** chest", "hit barrel **with** hammer".

**Articles** are stripped during parsing. "get **the** lamp" becomes "get lamp" internally.

## Basic Usage

```typescript
import { createParser } from '@motioneffector/parser'

// Default vocabulary is included automatically
const parser = createParser({
  resolver: (noun) => [{ id: noun }]
})

// These all work out of the box:
parser.parse('get lamp')      // GET verb
parser.parse('take lamp')     // GET verb (synonym)
parser.parse('look')          // LOOK verb
parser.parse('north')         // GO + NORTH direction
parser.parse('n')             // GO + NORTH direction (alias)
parser.parse('go north')      // GO + NORTH direction
```

## Key Points

- **Default vocabulary is comprehensive** - 27 verbs and 12 directions cover most text adventure needs
- **Synonyms map to canonical forms** - "get", "take", and "grab" all become verb `GET`
- **Direction aliases are shortcuts** - "n" for "north", "nw" for "northwest"
- **Articles are invisible** - "get the lamp" and "get lamp" parse identically

## Examples

### Default Verbs

The default vocabulary includes:

| Category | Verbs |
|----------|-------|
| Movement | GO, ENTER, EXIT, CLIMB |
| Interaction | GET, DROP, PUT, GIVE, THROW, OPEN, CLOSE, LOCK, UNLOCK |
| Examination | LOOK, EXAMINE, SEARCH, READ |
| Communication | SAY, SHOUT, TALK, ASK, TELL |
| Combat | ATTACK, KILL, FIGHT |
| Meta | INVENTORY, SCORE, SAVE, LOAD, QUIT, HELP |

### Default Directions

```
NORTH (n)    SOUTH (s)    EAST (e)     WEST (w)
NORTHEAST (ne)  NORTHWEST (nw)  SOUTHEAST (se)  SOUTHWEST (sw)
UP (u)       DOWN (d)     IN           OUT
```

### Extending Vocabulary

Add game-specific verbs without losing defaults:

```typescript
const parser = createParser({
  resolver: myResolver,
  vocabulary: {
    extend: true,  // Keep defaults
    verbs: [
      { canonical: 'CAST', synonyms: ['cast', 'invoke'], pattern: 'subject' }
    ],
    directions: [
      { canonical: 'PORTAL', aliases: ['portal', 'p'] }
    ]
  }
})

parser.parse('cast spell')  // Works
parser.parse('get lamp')    // Still works (default verb)
```

## Related

- **[Verb Patterns](Concept-Verb-Patterns)** - How verbs specify their expected arguments
- **[Custom Vocabulary](Guide-Custom-Vocabulary)** - Adding and replacing vocabulary
- **[Parser Configuration API](API-Parser-Configuration)** - Full vocabulary type definitions
