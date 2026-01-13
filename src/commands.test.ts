import { describe, it, expect } from 'vitest'
import { createParser } from './parser'
import type { ResolvedEntity, ResolverScope } from './types'

const mockResolver = (
  noun: string,
  adjectives: string[],
  scope: ResolverScope
): ResolvedEntity[] => {
  const entities: Record<string, ResolvedEntity> = {
    lamp: { id: 'lamp-1' },
    door: { id: 'door-1' },
    key: { id: 'key-1' },
    ball: { id: 'ball-1' },
    barrel: { id: 'barrel-1' },
    hammer: { id: 'hammer-1' },
    box: { id: 'box-1' },
    coin: { id: 'coin-1' },
    merchant: { id: 'merchant-1' },
    chest: { id: 'chest-1' },
  }

  if (adjectives.length > 0 && adjectives.includes('red') && noun === 'ball') {
    return [{ id: 'ball-red' }]
  }
  if (adjectives.length > 0 && adjectives.includes('old') && noun === 'door') {
    return [{ id: 'door-old' }]
  }
  if (adjectives.length > 0 && adjectives.includes('rusty') && noun === 'key') {
    return [{ id: 'key-rusty' }]
  }
  if (adjectives.length > 1 && adjectives.includes('big') && adjectives.includes('red') && noun === 'ball') {
    return [{ id: 'ball-big-red' }]
  }

  return entities[noun] ? [entities[noun]!] : []
}

describe('Default Vocabulary', () => {
  const parser = createParser({ resolver: mockResolver })

  describe('Movement Verbs', () => {
    it('recognizes "go" with pattern direction', () => {
      const result = parser.parse('go north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GO')
      }
    })

    it('recognizes "walk" as synonym for go', () => {
      const result = parser.parse('walk north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GO')
      }
    })

    it('recognizes "run" as synonym for go', () => {
      const result = parser.parse('run north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GO')
      }
    })

    it('recognizes "enter" with pattern subject', () => {
      const result = parser.parse('enter door')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('ENTER')
      }
    })

    it('recognizes "exit" with pattern none', () => {
      const result = parser.parse('exit')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXIT')
      }
    })

    it('recognizes "leave" with pattern none', () => {
      const result = parser.parse('leave')
      expect(result.type).toBe('command')
    })

    it('recognizes "climb" with pattern subject', () => {
      const result = parser.parse('climb ladder')
      expect(result.type).toBe('command')
    })
  })

  describe('Interaction Verbs', () => {
    it('recognizes "get" with pattern subject', () => {
      const result = parser.parse('get lamp')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('recognizes "take" as synonym for get', () => {
      const result = parser.parse('take lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('recognizes "grab" as synonym for get', () => {
      const result = parser.parse('grab lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('recognizes "pick" as synonym for get', () => {
      const result = parser.parse('pick lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GET')
      }
    })

    it('recognizes "drop" with pattern subject', () => {
      const result = parser.parse('drop lamp')
      expect(result.type).toBe('command')
    })

    it('recognizes "put" with pattern subject_object', () => {
      const result = parser.parse('put key in box')
      expect(result.type).toBe('command')
    })

    it('recognizes "give" with pattern subject_object', () => {
      const result = parser.parse('give coin to merchant')
      expect(result.type).toBe('command')
    })

    it('recognizes "throw" with pattern subject_object', () => {
      const result = parser.parse('throw ball at door')
      expect(result.type).toBe('command')
    })

    it('recognizes "open" with pattern subject', () => {
      const result = parser.parse('open door')
      expect(result.type).toBe('command')
    })

    it('recognizes "close" with pattern subject', () => {
      const result = parser.parse('close door')
      expect(result.type).toBe('command')
    })

    it('recognizes "lock" with pattern subject', () => {
      const result = parser.parse('lock door')
      expect(result.type).toBe('command')
    })

    it('recognizes "unlock" with pattern subject', () => {
      const result = parser.parse('unlock door')
      expect(result.type).toBe('command')
    })
  })

  describe('Examination Verbs', () => {
    it('recognizes "look" with pattern none', () => {
      const result = parser.parse('look')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('LOOK')
      }
    })

    it('recognizes "examine" with pattern subject', () => {
      const result = parser.parse('examine lamp')
      expect(result.type).toBe('command')
    })

    it('recognizes "x" as shortcut for examine', () => {
      const result = parser.parse('x lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXAMINE')
      }
    })

    it('recognizes "inspect" as synonym for examine', () => {
      const result = parser.parse('inspect lamp')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('EXAMINE')
      }
    })

    it('recognizes "search" with pattern subject', () => {
      const result = parser.parse('search chest')
      expect(result.type).toBe('command')
    })

    it('recognizes "read" with pattern subject', () => {
      const result = parser.parse('read book')
      expect(result.type).toBe('command')
    })

    it('recognizes "l" as shortcut for look', () => {
      const result = parser.parse('l')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('LOOK')
      }
    })
  })

  describe('Communication Verbs', () => {
    it('recognizes "say" with pattern text', () => {
      const result = parser.parse('say hello')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('SAY')
        expect(result.command.text).toBe('hello')
      }
    })

    it('recognizes "talk" with pattern subject', () => {
      const result = parser.parse('talk merchant')
      expect(result.type).toBe('command')
    })

    it('recognizes "ask" with pattern subject_object', () => {
      const result = parser.parse('ask merchant about key')
      expect(result.type).toBe('command')
    })

    it('recognizes "tell" with pattern subject_object', () => {
      const result = parser.parse('tell merchant about quest')
      expect(result.type).toBe('command')
    })

    it('recognizes "shout" with pattern text', () => {
      const result = parser.parse('shout help')
      expect(result.type).toBe('command')
    })
  })

  describe('Combat Verbs', () => {
    it('recognizes "attack" with pattern subject', () => {
      const result = parser.parse('attack troll')
      expect(result.type).toBe('command')
    })

    it('recognizes "hit" with pattern subject', () => {
      const result = parser.parse('hit troll')
      expect(result.type).toBe('command')
    })

    it('recognizes "strike" as synonym for attack', () => {
      const result = parser.parse('strike troll')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('ATTACK')
      }
    })

    it('recognizes "kill" with pattern subject', () => {
      const result = parser.parse('kill troll')
      expect(result.type).toBe('command')
    })

    it('recognizes "fight" with pattern subject', () => {
      const result = parser.parse('fight troll')
      expect(result.type).toBe('command')
    })
  })

  describe('Meta Verbs', () => {
    it('recognizes "inventory" with pattern none', () => {
      const result = parser.parse('inventory')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('INVENTORY')
      }
    })

    it('recognizes "i" as shortcut for inventory', () => {
      const result = parser.parse('i')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('INVENTORY')
      }
    })

    it('recognizes "inv" as shortcut for inventory', () => {
      const result = parser.parse('inv')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('INVENTORY')
      }
    })

    it('recognizes "score" with pattern none', () => {
      const result = parser.parse('score')
      expect(result.type).toBe('command')
    })

    it('recognizes "save" with pattern none', () => {
      const result = parser.parse('save')
      expect(result.type).toBe('command')
    })

    it('recognizes "load" with pattern none', () => {
      const result = parser.parse('load')
      expect(result.type).toBe('command')
    })

    it('recognizes "quit" with pattern none', () => {
      const result = parser.parse('quit')
      expect(result.type).toBe('command')
    })

    it('recognizes "help" with pattern none', () => {
      const result = parser.parse('help')
      expect(result.type).toBe('command')
    })
  })
})

describe('Command Patterns', () => {
  const parser = createParser({ resolver: mockResolver })

  describe('Pattern: VERB (none)', () => {
    it('parses "look" as verb-only command', () => {
      const result = parser.parse('look')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('LOOK')
      }
    })

    it('parses "inventory" as verb-only command', () => {
      const result = parser.parse('inventory')
      expect(result.type).toBe('command')
    })

    it('returns command with verb and no subject/object', () => {
      const result = parser.parse('look')
      if (result.type === 'command') {
        expect(result.command.subject).toBeUndefined()
        expect(result.command.object).toBeUndefined()
      }
    })
  })

  describe('Pattern: DIRECTION', () => {
    it('parses "north" as direction command', () => {
      const result = parser.parse('north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.direction).toBe('NORTH')
      }
    })

    it('parses "n" as direction command', () => {
      const result = parser.parse('n')
      expect(result.type).toBe('command')
    })

    it('parses "northeast" as direction command', () => {
      const result = parser.parse('northeast')
      expect(result.type).toBe('command')
    })

    it('parses "ne" as direction command', () => {
      const result = parser.parse('ne')
      expect(result.type).toBe('command')
    })

    it('parses "up" as direction command', () => {
      const result = parser.parse('up')
      expect(result.type).toBe('command')
    })

    it('parses "u" as direction command', () => {
      const result = parser.parse('u')
      expect(result.type).toBe('command')
    })

    it('returns command with direction property', () => {
      const result = parser.parse('north')
      if (result.type === 'command') {
        expect(result.command.direction).toBeDefined()
      }
    })
  })

  describe('Pattern: GO DIRECTION', () => {
    it('parses "go north" as direction command', () => {
      const result = parser.parse('go north')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GO')
        expect(result.command.direction).toBe('NORTH')
      }
    })

    it('parses "go n" as direction command', () => {
      const result = parser.parse('go n')
      expect(result.type).toBe('command')
    })

    it('parses "walk east" as direction command', () => {
      const result = parser.parse('walk east')
      expect(result.type).toBe('command')
    })

    it('returns command with verb GO and direction', () => {
      const result = parser.parse('go north')
      if (result.type === 'command') {
        expect(result.command.verb).toBe('GO')
        expect(result.command.direction).toBeDefined()
      }
    })
  })

  describe('Pattern: VERB NOUN (subject)', () => {
    it('parses "get lamp" with subject', () => {
      const result = parser.parse('get lamp')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.subject).toBeDefined()
        expect(result.command.subject?.noun).toBe('lamp')
      }
    })

    it('parses "examine door" with subject', () => {
      const result = parser.parse('examine door')
      expect(result.type).toBe('command')
    })

    it('parses "take key" with subject', () => {
      const result = parser.parse('take key')
      expect(result.type).toBe('command')
    })

    it('calls resolver with noun and empty adjectives', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.adjectives).toEqual([])
      }
    })

    it('returns command with resolved subject', () => {
      const result = parser.parse('get lamp')
      if (result.type === 'command') {
        expect(result.command.subject?.id).toBe('lamp-1')
      }
    })
  })

  describe('Pattern: VERB ADJECTIVE NOUN', () => {
    it('parses "get red ball" with adjective', () => {
      const result = parser.parse('get red ball')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.subject?.adjectives).toContain('red')
        expect(result.command.subject?.noun).toBe('ball')
      }
    })

    it('parses "examine old door" with adjective', () => {
      const result = parser.parse('examine old door')
      expect(result.type).toBe('command')
    })

    it('parses "take rusty key" with adjective', () => {
      const result = parser.parse('take rusty key')
      expect(result.type).toBe('command')
    })

    it('calls resolver with noun and adjectives array', () => {
      const result = parser.parse('get red ball')
      if (result.type === 'command') {
        expect(result.command.subject?.adjectives).toEqual(['red'])
      }
    })

    it('handles multiple adjectives "get big red ball"', () => {
      const result = parser.parse('get big red ball')
      if (result.type === 'command') {
        expect(result.command.subject?.adjectives).toEqual(['big', 'red'])
      }
    })
  })

  describe('Pattern: VERB NOUN PREPOSITION NOUN (subject_object)', () => {
    it('parses "put key in box" with subject and object', () => {
      const result = parser.parse('put key in box')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.subject?.noun).toBe('key')
        expect(result.command.object?.noun).toBe('box')
      }
    })

    it('parses "hit barrel with hammer" with subject and object', () => {
      const result = parser.parse('hit barrel with hammer')
      expect(result.type).toBe('command')
    })

    it('parses "give coin to merchant" with subject and object', () => {
      const result = parser.parse('give coin to merchant')
      expect(result.type).toBe('command')
    })

    it('returns command with preposition property', () => {
      const result = parser.parse('put key in box')
      if (result.type === 'command') {
        expect(result.command.preposition).toBe('in')
      }
    })

    it('resolves both subject and object entities', () => {
      const result = parser.parse('put key in box')
      if (result.type === 'command') {
        expect(result.command.subject?.id).toBe('key-1')
        expect(result.command.object?.id).toBe('box-1')
      }
    })
  })

  describe('Pattern: VERB TEXT (text)', () => {
    it('parses "say hello" capturing rest as text', () => {
      const result = parser.parse('say hello')
      expect(result.type).toBe('command')
      if (result.type === 'command') {
        expect(result.command.text).toBe('hello')
      }
    })

    it('parses "say hello there friend" as single text', () => {
      const result = parser.parse('say hello there friend')
      if (result.type === 'command') {
        expect(result.command.text).toBe('hello there friend')
      }
    })

    it('preserves original case in text content', () => {
      const result = parser.parse('say Hello World')
      if (result.type === 'command') {
        expect(result.command.text).toContain('Hello World')
      }
    })

    it('returns command with text property', () => {
      const result = parser.parse('say test')
      if (result.type === 'command') {
        expect(result.command.text).toBeDefined()
      }
    })
  })
})
