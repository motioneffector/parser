// Test case to demonstrate the "get red ball and blue ball" issue

import { createParser } from './dist/index.js'

// Mock world with red and blue balls
const mockWorld = {
  redBall: { id: 'ball-red', name: 'ball', adjectives: ['red'] },
  blueBall: { id: 'ball-blue', name: 'ball', adjectives: ['blue'] },
  lamp: { id: 'lamp-1', name: 'lamp', adjectives: [] },
}

function mockResolver(noun, adjectives) {
  const allObjects = Object.values(mockWorld)

  // Filter by noun
  let matches = allObjects.filter(obj => obj.name === noun)

  // Filter by adjectives if provided
  if (adjectives.length > 0) {
    matches = matches.filter(obj =>
      adjectives.every(adj => obj.adjectives.includes(adj))
    )
  }

  return matches
}

const parser = createParser({ resolver: mockResolver })

// Test cases
console.log('=== Test 1: "get red ball" (should work) ===')
const result1 = parser.parse('get red ball')
console.log(JSON.stringify(result1, null, 2))

console.log('\n=== Test 2: "get blue ball" (should work) ===')
const result2 = parser.parse('get blue ball')
console.log(JSON.stringify(result2, null, 2))

console.log('\n=== Test 3: "get red ball and blue ball" (problematic) ===')
const result3 = parser.parse('get red ball and blue ball')
console.log(JSON.stringify(result3, null, 2))

console.log('\n=== Analysis ===')
if (result3.type === 'unknown_noun') {
  console.log(`ERROR: Got unknown_noun for noun "${result3.noun}"`)
  console.log('The parser tried to resolve this as a single entity.')
  console.log('It does not understand "and" as a conjunction to separate multiple objects.')
}
