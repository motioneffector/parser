# Error Handling

Display helpful messages when parsing fails. This guide covers each error type and how to respond with clear, player-friendly feedback.

## Prerequisites

Before starting, you should:

- [Understand parse results](Concept-Parse-Results)

## Overview

We'll handle errors by:

1. Identifying each result type
2. Crafting appropriate responses
3. Using position information for highlighting
4. Providing helpful suggestions

## Step 1: Identify Error Types

Non-command results indicate something went wrong:

```typescript
const result = parser.parse(input)

switch (result.type) {
  case 'command':
    // Success - not an error
    break

  case 'unknown_verb':
    // First word not recognized
    break

  case 'unknown_noun':
    // Entity not found by resolver
    break

  case 'ambiguous':
    // Multiple entities matched (covered in disambiguation guide)
    break

  case 'parse_error':
    // Structural problem with input
    break
}
```

## Step 2: Handle Unknown Verb

The player used a word the parser doesn't recognize as a verb or direction:

```typescript
if (result.type === 'unknown_verb') {
  // Simple response
  return `I don't understand "${result.verb}".`

  // With suggestion
  return `I don't know how to "${result.verb}". Try LOOK, GET, or GO.`

  // With help pointer
  return `"${result.verb}" isn't a command I know. Type HELP for a list of commands.`
}
```

## Step 3: Handle Unknown Noun

The resolver returned an empty array—the entity doesn't exist in scope:

```typescript
if (result.type === 'unknown_noun') {
  // Classic text adventure response
  return `You don't see any "${result.noun}" here.`

  // With context
  return `There's no ${result.noun} in the ${currentRoom.name}.`

  // With hint
  return `I don't know what "${result.noun}" refers to. Try LOOK to see what's here.`
}
```

## Step 4: Handle Parse Errors

Structural problems like missing arguments:

```typescript
if (result.type === 'parse_error') {
  // Use the built-in message
  return result.message

  // Or wrap it
  return `I didn't understand that. ${result.message}`
}
```

Common parse errors:
- "Expected object after GET" - verb needs subject but none provided
- "Expected direction after GO" - go without a direction
- "Expected preposition and target" - PUT without destination
- "Cannot use 'it' without a previous referent" - pronoun with no antecedent

## Step 5: Use Position Information

Both `unknown_noun` and `parse_error` include a position for highlighting:

```typescript
if (result.type === 'unknown_noun') {
  const before = input.slice(0, result.position)
  const problem = result.noun
  const after = input.slice(result.position + problem.length)

  // Show with caret
  console.log(input)
  console.log(' '.repeat(result.position) + '^'.repeat(problem.length))

  // Or highlight
  return `${before}[${problem}]${after} - I don't see that here.`
}
```

## Complete Example

```typescript
import { createParser, ParseResult } from '@motioneffector/parser'

const parser = createParser({
  resolver: (noun) => {
    const items: Record<string, { id: string }> = {
      lamp: { id: 'lamp-1' },
      key: { id: 'key-1' },
    }
    return items[noun] ? [items[noun]] : []
  }
})

function respond(input: string): string {
  const result = parser.parse(input)

  switch (result.type) {
    case 'command':
      return executeCommand(result.command)

    case 'unknown_verb':
      return handleUnknownVerb(result.verb)

    case 'unknown_noun':
      return handleUnknownNoun(result.noun, input, result.position)

    case 'ambiguous':
      return handleAmbiguous(result)

    case 'parse_error':
      return handleParseError(result.message, input, result.position)
  }
}

function handleUnknownVerb(verb: string): string {
  const suggestions: Record<string, string> = {
    'grab': "Try GET instead.",
    'walk': "Try GO followed by a direction.",
    'move': "Try GO followed by a direction.",
    'use': "Try a more specific verb like OPEN, UNLOCK, or PUT.",
  }

  const suggestion = suggestions[verb.toLowerCase()]
  if (suggestion) {
    return `I don't understand "${verb}". ${suggestion}`
  }

  return `I don't understand "${verb}". Type HELP for available commands.`
}

function handleUnknownNoun(noun: string, input: string, position: number): string {
  // Check for common misspellings or alternatives
  const alternatives: Record<string, string> = {
    'lantern': 'lamp',
    'light': 'lamp',
    'keys': 'key',
  }

  const alt = alternatives[noun.toLowerCase()]
  if (alt) {
    return `I don't see any "${noun}" here. Did you mean "${alt}"?`
  }

  return `You don't see any "${noun}" here.`
}

function handleAmbiguous(result: { original: string; candidates: Array<{ id: string }> }): string {
  const options = result.candidates
    .map((c, i) => `${i + 1}) ${c.id}`)
    .join(', ')
  return `Which ${result.original}? ${options}`
}

function handleParseError(message: string, input: string, position: number): string {
  // Make messages more conversational
  const friendly: Record<string, string> = {
    'Empty input': "I didn't catch that. What would you like to do?",
  }

  return friendly[message] || message
}

function executeCommand(cmd: { verb: string }): string {
  return `You ${cmd.verb.toLowerCase()}.`
}

// Test various errors
console.log(respond('dance'))           // Unknown verb
console.log(respond('get unicorn'))     // Unknown noun
console.log(respond('put key'))         // Parse error
console.log(respond(''))                // Empty input
console.log(respond('grab lamp'))       // Unknown verb with suggestion
console.log(respond('get lantern'))     // Unknown noun with alternative
```

## Variations

### Contextual Error Messages

Adjust messages based on game state:

```typescript
function handleUnknownNoun(noun: string): string {
  // Check if item exists elsewhere
  const item = findItemAnywhere(noun)

  if (item) {
    if (item.location === 'inventory') {
      return `You're already carrying the ${noun}.`
    }
    return `The ${noun} is in the ${item.location}, not here.`
  }

  return `You don't see any "${noun}" here.`
}
```

### Typo Detection

Suggest corrections for close matches:

```typescript
function handleUnknownVerb(verb: string): string {
  const knownVerbs = ['get', 'look', 'open', 'examine', 'drop']
  const similar = knownVerbs.find(v =>
    levenshteinDistance(v, verb.toLowerCase()) <= 2
  )

  if (similar) {
    return `Did you mean "${similar}"?`
  }

  return `I don't understand "${verb}".`
}
```

### Verbose Mode

Show more detail for debugging:

```typescript
function respond(input: string, verbose = false): string {
  const result = parser.parse(input)

  if (result.type === 'parse_error' && verbose) {
    return `Error at position ${result.position}: ${result.message}\n` +
           `Input: ${input}\n` +
           `       ${' '.repeat(result.position)}^`
  }

  // ... normal handling
}
```

## Troubleshooting

### Unhelpful Error Messages

**Symptom:** Players don't understand what went wrong

**Cause:** Using raw technical messages

**Solution:** Map common errors to friendly explanations

### Missing Position

**Symptom:** Position is 0 when it shouldn't be

**Cause:** Error occurred at start of input

**Solution:** Position 0 is valid—it means the problem is at the beginning

## See Also

- **[Parse Results](Concept-Parse-Results)** - All result types
- **[Handling Disambiguation](Guide-Handling-Disambiguation)** - The ambiguous case
- **[Parse Results API](API-Parse-Results)** - Full interfaces
