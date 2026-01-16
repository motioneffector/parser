# Handling Disambiguation

When your resolver returns multiple matching entities, the parser returns an `ambiguous` result instead of a command. This guide shows how to present choices to the player and complete the command.

## Prerequisites

Before starting, you should:

- [Understand entity resolution](Concept-Entity-Resolution)
- [Understand parse results](Concept-Parse-Results)

## Overview

We'll handle disambiguation by:

1. Detecting ambiguous results
2. Presenting candidates to the player
3. Getting the player's choice
4. Completing the command

## Step 1: Detect Ambiguous Results

Check for `type: 'ambiguous'` after parsing:

```typescript
const result = parser.parse('get ball')

if (result.type === 'ambiguous') {
  // Multiple items matched "ball"
  console.log(result.candidates)  // [{ id: 'ball-red' }, { id: 'ball-blue' }]
  console.log(result.original)    // 'ball'
  console.log(result.role)        // 'subject' or 'object'
}
```

## Step 2: Present Choices

Show the candidates with a way to select:

```typescript
function presentChoices(result: AmbiguousResult): string {
  const options = result.candidates
    .map((candidate, index) => {
      // Use name property if available, otherwise id
      const label = (candidate as { name?: string }).name || candidate.id
      return `  ${index + 1}) ${label}`
    })
    .join('\n')

  return `Which ${result.original}?\n${options}`
}
```

Output:
```
Which ball?
  1) red ball
  2) blue ball
```

## Step 3: Get Player Choice

Accept the player's selection. Common approaches:

```typescript
// By number
function handleSelection(input: string, candidates: ResolvedEntity[]): ResolvedEntity | null {
  const num = parseInt(input, 10)
  if (num >= 1 && num <= candidates.length) {
    return candidates[num - 1]!
  }
  return null
}

// By name/adjective
function handleSelectionByName(input: string, candidates: ResolvedEntity[]): ResolvedEntity | null {
  const lower = input.toLowerCase()
  return candidates.find(c => {
    const name = ((c as { name?: string }).name || c.id).toLowerCase()
    return name.includes(lower)
  }) || null
}
```

## Step 4: Complete the Command

Once the player chooses, you have two options:

**Option A: Re-parse with more specific input**

```typescript
// Player said "red" to clarify
const clarified = `get red ball`
const result = parser.parse(clarified)
```

**Option B: Construct the command directly**

```typescript
function completeCommand(
  originalInput: string,
  selectedEntity: ResolvedEntity,
  role: 'subject' | 'object'
): Command {
  // Re-parse the original to get the verb
  const parsed = parser.parse(originalInput)

  if (parsed.type === 'ambiguous') {
    // Build command manually with selected entity
    return {
      verb: 'GET',  // You'd extract this from original parsing context
      subject: {
        id: selectedEntity.id,
        noun: 'ball',
        adjectives: []
      },
      raw: originalInput
    }
  }

  // Shouldn't happen, but handle gracefully
  throw new Error('Expected ambiguous result')
}
```

## Complete Example

```typescript
import { createParser } from '@motioneffector/parser'
import type { AmbiguousResult, ParseResult, ResolvedEntity } from '@motioneffector/parser'

// Game state with ambiguous items
const items = [
  { id: 'ball-red', name: 'red ball', baseNoun: 'ball' },
  { id: 'ball-blue', name: 'blue ball', baseNoun: 'ball' },
  { id: 'lamp-1', name: 'lamp', baseNoun: 'lamp' },
]

function resolver(noun: string, adjectives: string[]): ResolvedEntity[] {
  let matches = items.filter(item => item.baseNoun === noun)
  if (adjectives.includes('red')) {
    matches = matches.filter(item => item.name.includes('red'))
  }
  if (adjectives.includes('blue')) {
    matches = matches.filter(item => item.name.includes('blue'))
  }
  return matches
}

const parser = createParser({ resolver })

// State machine for disambiguation
let pendingAmbiguous: AmbiguousResult | null = null
let pendingVerb: string | null = null

function handleInput(input: string): string {
  // Check if we're waiting for disambiguation
  if (pendingAmbiguous) {
    return handleDisambiguation(input)
  }

  const result = parser.parse(input)

  switch (result.type) {
    case 'command':
      return executeCommand(result.command)

    case 'ambiguous':
      pendingAmbiguous = result
      pendingVerb = extractVerb(input)
      return formatChoices(result)

    case 'unknown_verb':
      return `I don't understand "${result.verb}".`

    case 'unknown_noun':
      return `I don't see any "${result.noun}" here.`

    case 'parse_error':
      return result.message
  }
}

function handleDisambiguation(input: string): string {
  const selection = parseInt(input, 10)

  if (selection >= 1 && selection <= pendingAmbiguous!.candidates.length) {
    const selected = pendingAmbiguous!.candidates[selection - 1]!
    const verb = pendingVerb!

    // Clear pending state
    pendingAmbiguous = null
    pendingVerb = null

    // Execute with selected entity
    return `You ${verb.toLowerCase()} the ${(selected as { name: string }).name}.`
  }

  return `Please enter a number between 1 and ${pendingAmbiguous!.candidates.length}.`
}

function formatChoices(result: AmbiguousResult): string {
  const lines = result.candidates.map((c, i) =>
    `  ${i + 1}) ${(c as { name: string }).name}`
  )
  return `Which ${result.original}?\n${lines.join('\n')}`
}

function extractVerb(input: string): string {
  return input.split(' ')[0]!.toUpperCase()
}

function executeCommand(cmd: { verb: string; subject?: { id: string } }): string {
  return `You ${cmd.verb.toLowerCase()} the ${cmd.subject?.id || 'thing'}.`
}

// Usage
console.log(handleInput('get ball'))
// Which ball?
//   1) red ball
//   2) blue ball

console.log(handleInput('1'))
// You get the red ball.
```

## Variations

### Subject vs Object Disambiguation

The `role` field tells you which part was ambiguous:

```typescript
if (result.type === 'ambiguous') {
  if (result.role === 'subject') {
    // "get ball" - which ball to get?
    return `Which ${result.original} do you want to get?`
  } else {
    // "put key in ball" - which ball to put it in?
    return `Which ${result.original} do you want to put it in?`
  }
}
```

### Cancel Disambiguation

Let players abort:

```typescript
function handleDisambiguation(input: string): string {
  if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'nevermind') {
    pendingAmbiguous = null
    return 'Okay, never mind.'
  }
  // ... normal handling
}
```

### Re-parse Instead of State Machine

Simpler approach if you can modify input:

```typescript
function handleInput(input: string): string {
  const result = parser.parse(input)

  if (result.type === 'ambiguous') {
    // Ask player to be more specific
    return `Which ${result.original}? Try "get red ball" or "get blue ball".`
  }

  // ... handle other cases
}
```

## Troubleshooting

### Always Getting Ambiguous

**Symptom:** Every noun returns ambiguous

**Cause:** Resolver returning all items instead of filtering

**Solution:** Check resolver logic filters by noun and adjectives

### Wrong Entity Selected

**Symptom:** Selection returns wrong item

**Cause:** Index mismatch (1-based vs 0-based)

**Solution:** Remember candidates array is 0-indexed, but display is 1-indexed

## See Also

- **[Entity Resolution](Concept-Entity-Resolution)** - How matching works
- **[Error Handling](Guide-Error-Handling)** - Other result types
- **[Parse Results API](API-Parse-Results)** - AmbiguousResult interface
