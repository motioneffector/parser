// ============================================
// INLINE PARSER IMPLEMENTATION
// ============================================

const DEFAULT_VOCABULARY = {
  verbs: [
    { canonical: 'GO', synonyms: ['go', 'walk', 'run'], pattern: 'direction' },
    { canonical: 'ENTER', synonyms: ['enter'], pattern: 'subject' },
    { canonical: 'EXIT', synonyms: ['exit', 'leave'], pattern: 'none' },
    { canonical: 'CLIMB', synonyms: ['climb'], pattern: 'subject' },
    { canonical: 'GET', synonyms: ['get', 'take', 'grab', 'pick'], pattern: 'subject' },
    { canonical: 'DROP', synonyms: ['drop'], pattern: 'subject' },
    { canonical: 'PUT', synonyms: ['put'], pattern: 'subject_object' },
    { canonical: 'GIVE', synonyms: ['give'], pattern: 'subject_object' },
    { canonical: 'THROW', synonyms: ['throw'], pattern: 'subject_object' },
    { canonical: 'OPEN', synonyms: ['open'], pattern: 'subject' },
    { canonical: 'CLOSE', synonyms: ['close'], pattern: 'subject' },
    { canonical: 'LOCK', synonyms: ['lock'], pattern: 'subject' },
    { canonical: 'UNLOCK', synonyms: ['unlock'], pattern: 'subject' },
    { canonical: 'LOOK', synonyms: ['look', 'l'], pattern: 'none' },
    { canonical: 'EXAMINE', synonyms: ['examine', 'x', 'inspect'], pattern: 'subject' },
    { canonical: 'SEARCH', synonyms: ['search'], pattern: 'subject' },
    { canonical: 'READ', synonyms: ['read'], pattern: 'subject' },
    { canonical: 'SAY', synonyms: ['say'], pattern: 'text' },
    { canonical: 'SHOUT', synonyms: ['shout'], pattern: 'text' },
    { canonical: 'TALK', synonyms: ['talk'], pattern: 'subject' },
    { canonical: 'ASK', synonyms: ['ask'], pattern: 'subject_object' },
    { canonical: 'TELL', synonyms: ['tell'], pattern: 'subject_object' },
    { canonical: 'ATTACK', synonyms: ['attack', 'hit', 'strike'], pattern: 'subject' },
    { canonical: 'KILL', synonyms: ['kill'], pattern: 'subject' },
    { canonical: 'FIGHT', synonyms: ['fight'], pattern: 'subject' },
    { canonical: 'INVENTORY', synonyms: ['inventory', 'i', 'inv'], pattern: 'none' },
    { canonical: 'SCORE', synonyms: ['score'], pattern: 'none' },
    { canonical: 'SAVE', synonyms: ['save'], pattern: 'none' },
    { canonical: 'LOAD', synonyms: ['load'], pattern: 'none' },
    { canonical: 'QUIT', synonyms: ['quit'], pattern: 'none' },
    { canonical: 'HELP', synonyms: ['help'], pattern: 'none' },
  ],
  directions: [
    { canonical: 'NORTH', aliases: ['north', 'n'] },
    { canonical: 'SOUTH', aliases: ['south', 's'] },
    { canonical: 'EAST', aliases: ['east', 'e'] },
    { canonical: 'WEST', aliases: ['west', 'w'] },
    { canonical: 'NORTHEAST', aliases: ['northeast', 'ne'] },
    { canonical: 'NORTHWEST', aliases: ['northwest', 'nw'] },
    { canonical: 'SOUTHEAST', aliases: ['southeast', 'se'] },
    { canonical: 'SOUTHWEST', aliases: ['southwest', 'sw'] },
    { canonical: 'UP', aliases: ['up', 'u'] },
    { canonical: 'DOWN', aliases: ['down', 'd'] },
    { canonical: 'IN', aliases: ['in'] },
    { canonical: 'OUT', aliases: ['out'] },
  ],
  prepositions: ['with', 'to', 'at', 'in', 'on', 'from', 'into', 'onto', 'about'],
  articles: ['the', 'a', 'an'],
}

function createParser(options) {
  const vocabulary = {
    verbs: [...DEFAULT_VOCABULARY.verbs],
    directions: [...DEFAULT_VOCABULARY.directions],
    prepositions: [...DEFAULT_VOCABULARY.prepositions],
    articles: [...DEFAULT_VOCABULARY.articles],
  }

  let lastReferent = null
  let lastRoom = null

  function tokenize(input) {
    const tokens = []
    const words = input.toLowerCase().trim().split(/\s+/)
    let pos = 0

    for (const word of words) {
      if (!word) continue
      const start = input.toLowerCase().indexOf(word, pos)
      tokens.push({
        type: 'WORD',
        value: word,
        original: input.slice(start, start + word.length),
        start,
        end: start + word.length
      })
      pos = start + word.length
    }

    return tokens
  }

  function findVerb(word) {
    // Exact match first
    for (const verb of vocabulary.verbs) {
      if (verb.synonyms.includes(word)) {
        return verb
      }
    }
    // Partial match
    if (options.partialMatch !== false && word.length >= (options.minPartialLength || 3)) {
      for (const verb of vocabulary.verbs) {
        for (const syn of verb.synonyms) {
          if (syn.startsWith(word)) {
            return { ...verb, partialMatch: syn }
          }
        }
      }
    }
    return null
  }

  function findDirection(word) {
    for (const dir of vocabulary.directions) {
      if (dir.aliases.includes(word)) {
        return dir
      }
    }
    return null
  }

  function parse(input, parseOptions = {}) {
    const scope = parseOptions.scope || {}

    // Check for room change to clear pronoun
    if (scope.room !== undefined && scope.room !== lastRoom) {
      lastReferent = null
      lastRoom = scope.room
    }

    if (!input || !input.trim()) {
      return { type: 'parse_error', message: 'Empty input', position: 0 }
    }

    const tokens = tokenize(input)
    if (tokens.length === 0) {
      return { type: 'parse_error', message: 'Empty input', position: 0 }
    }

    const firstWord = tokens[0].value

    // Check if it's a direction shortcut
    const dirMatch = findDirection(firstWord)
    if (dirMatch) {
      return {
        type: 'command',
        command: {
          verb: 'GO',
          direction: dirMatch.canonical,
          raw: input
        }
      }
    }

    // Find verb
    const verbMatch = findVerb(firstWord)
    if (!verbMatch) {
      return { type: 'unknown_verb', verb: firstWord }
    }

    const command = {
      verb: verbMatch.canonical,
      raw: input
    }

    // Handle patterns
    const remaining = tokens.slice(1).filter(t => !vocabulary.articles.includes(t.value))

    if (verbMatch.pattern === 'none') {
      return { type: 'command', command }
    }

    if (verbMatch.pattern === 'direction') {
      if (remaining.length === 0) {
        return { type: 'parse_error', message: 'Expected direction', position: input.length }
      }
      const dir = findDirection(remaining[0].value)
      if (!dir) {
        return { type: 'parse_error', message: `Expected direction, got "${remaining[0].value}"`, position: remaining[0].start }
      }
      command.direction = dir.canonical
      return { type: 'command', command }
    }

    if (verbMatch.pattern === 'text') {
      const textStart = tokens[0].end
      command.text = input.slice(textStart).trim()
      return { type: 'command', command }
    }

    // subject or subject_object pattern
    if (remaining.length === 0) {
      return { type: 'parse_error', message: `Expected object after ${verbMatch.canonical}`, position: input.length }
    }

    // Find preposition position
    let prepIndex = -1
    let preposition = null
    for (let i = 0; i < remaining.length; i++) {
      if (vocabulary.prepositions.includes(remaining[i].value)) {
        prepIndex = i
        preposition = remaining[i].value
        break
      }
    }

    // Parse subject
    let subjectTokens = prepIndex >= 0 ? remaining.slice(0, prepIndex) : remaining

    // Handle "it" pronoun
    if (subjectTokens.length === 1 && subjectTokens[0].value === 'it') {
      if (!lastReferent) {
        return { type: 'parse_error', message: 'Cannot use "it" without a previous referent', position: subjectTokens[0].start }
      }
      command.subject = { ...lastReferent }
    } else if (subjectTokens.length > 0) {
      const noun = subjectTokens[subjectTokens.length - 1].value
      const adjectives = subjectTokens.slice(0, -1).map(t => t.value)

      const resolved = options.resolver(noun, adjectives, scope)

      if (resolved.length === 0) {
        return { type: 'unknown_noun', noun, position: subjectTokens[subjectTokens.length - 1].start }
      }

      if (resolved.length > 1) {
        return { type: 'ambiguous', candidates: resolved, original: noun, role: 'subject' }
      }

      command.subject = { id: resolved[0].id, noun, adjectives }
      lastReferent = command.subject
    }

    // Parse object if there's a preposition
    if (prepIndex >= 0 && prepIndex < remaining.length - 1) {
      command.preposition = preposition
      const objectTokens = remaining.slice(prepIndex + 1)

      if (objectTokens.length === 1 && objectTokens[0].value === 'it') {
        if (!lastReferent) {
          return { type: 'parse_error', message: 'Cannot use "it" without a previous referent', position: objectTokens[0].start }
        }
        command.object = { ...lastReferent }
      } else {
        const noun = objectTokens[objectTokens.length - 1].value
        const adjectives = objectTokens.slice(0, -1).map(t => t.value)

        const resolved = options.resolver(noun, adjectives, scope)

        if (resolved.length === 0) {
          return { type: 'unknown_noun', noun, position: objectTokens[objectTokens.length - 1].start }
        }

        if (resolved.length > 1) {
          return { type: 'ambiguous', candidates: resolved, original: noun, role: 'object' }
        }

        command.object = { id: resolved[0].id, noun, adjectives }
      }
    } else if (verbMatch.pattern === 'subject_object' && prepIndex < 0) {
      return { type: 'parse_error', message: 'Expected preposition and target', position: input.length }
    }

    return { type: 'command', command }
  }

  return {
    parse,
    addVerb(def) {
      vocabulary.verbs.push(def)
    },
    addDirection(def) {
      vocabulary.directions.push(def)
    },
    clearPronoun() {
      lastReferent = null
    },
    getVocabulary() {
      return vocabulary
    }
  }
}

// ============================================
// GAME STATE
// ============================================

const gameItems = {
  'lamp': { id: 'lamp-1', name: 'brass lamp', icon: '💡', adjectives: ['brass'], description: 'A well-polished brass lamp.' },
  'chest': { id: 'chest-1', name: 'wooden chest', icon: '📦', adjectives: ['wooden'], description: 'A sturdy wooden chest.' },
  'ball-red': { id: 'ball-red', name: 'red ball', icon: '🔴', adjectives: ['red'], description: 'A bright red ball.' },
  'ball-blue': { id: 'ball-blue', name: 'blue ball', icon: '🔵', adjectives: ['blue'], description: 'A shiny blue ball.' },
  'key': { id: 'key-1', name: 'rusty key', icon: '🔑', adjectives: ['rusty'], description: 'An old rusty key.' },
  'stove': { id: 'stove-1', name: 'stove', icon: '♨️', adjectives: [], description: 'A kitchen stove.' },
  'knife': { id: 'knife-1', name: 'sharp knife', icon: '🔪', adjectives: ['sharp'], description: 'A sharp kitchen knife.' },
}

const rooms = {
  'living-room': {
    name: 'Living Room',
    items: ['lamp', 'chest', 'ball-red', 'ball-blue', 'key'],
    exits: { north: 'kitchen' },
    description: 'A cozy living room with comfortable furniture.'
  },
  'kitchen': {
    name: 'Kitchen',
    items: ['stove', 'knife'],
    exits: { south: 'living-room' },
    description: 'A small but functional kitchen.'
  }
}

let currentRoom = 'living-room'
let inventory = []
let pronounRef = null

// ============================================
// SHARED PARSER INSTANCE
// ============================================

const sharedParser = createParser({
  resolver: (noun, adjectives, scope) => {
    const room = scope?.room || currentRoom
    const roomData = rooms[room]
    const inv = scope?.inventory || inventory

    // Search in room and inventory
    const searchItems = [...(roomData?.items || []), ...inv]
    const matches = []

    for (const itemKey of searchItems) {
      const item = gameItems[itemKey]
      if (!item) continue

      // Match by noun
      const itemNouns = [item.name.split(' ').pop(), ...item.name.split(' ')]
      if (!itemNouns.some(n => n === noun || n.startsWith(noun))) continue

      // Match adjectives if provided
      if (adjectives.length > 0) {
        const hasAllAdj = adjectives.every(adj =>
          item.adjectives.includes(adj) || item.name.includes(adj)
        )
        if (!hasAllAdj) continue
      }

      matches.push({ id: item.id, name: item.name, icon: item.icon, key: itemKey })
    }

    // Special case: "ball" without adjective returns both balls
    if (noun === 'ball' && adjectives.length === 0) {
      const balls = []
      for (const key of searchItems) {
        if (key === 'ball-red' || key === 'ball-blue') {
          const item = gameItems[key]
          balls.push({ id: item.id, name: item.name, icon: item.icon, key })
        }
      }
      if (balls.length > 1) return balls
    }

    return matches
  },
  partialMatch: true,
  minPartialLength: 3
})

// Add pre-loaded custom verbs
sharedParser.addVerb({ canonical: 'CAST', synonyms: ['cast', 'invoke'], pattern: 'subject' })
sharedParser.addVerb({ canonical: 'ENCHANT', synonyms: ['enchant', 'imbue'], pattern: 'subject_object' })
sharedParser.addDirection({ canonical: 'PORTAL', aliases: ['portal', 'p'] })

// ============================================
// EXHIBIT 1: COMMAND ANATOMY
// ============================================

function analyzeCommand(input) {
  const result = sharedParser.parse(input, {
    scope: { room: currentRoom, inventory }
  })

  // Tokenize for display
  const words = input.toLowerCase().trim().split(/\s+/)
  const tokens = []
  const vocab = sharedParser.getVocabulary()

  // Identify each word's role
  let foundVerb = false
  let foundPrep = false
  let inObject = false

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    let role = 'unknown'

    if (!foundVerb) {
      // Check if it's a verb
      const isVerb = vocab.verbs.some(v =>
        v.synonyms.includes(word) ||
        v.synonyms.some(s => s.startsWith(word) && word.length >= 3)
      )
      const isDir = vocab.directions.some(d => d.aliases.includes(word))

      if (isVerb) {
        role = 'verb'
        foundVerb = true
      } else if (isDir) {
        role = 'direction'
        foundVerb = true
      } else {
        role = 'unknown'
      }
    } else if (vocab.articles.includes(word)) {
      role = 'article'
    } else if (vocab.prepositions.includes(word)) {
      role = 'preposition'
      foundPrep = true
      inObject = true
    } else {
      // Could be adjective or noun
      // Last word before preposition or end is noun, others are adjectives
      const remainingWords = words.slice(i)
      const nextPrepIdx = remainingWords.findIndex(w => vocab.prepositions.includes(w))
      const wordsBeforePrep = nextPrepIdx >= 0 ? remainingWords.slice(0, nextPrepIdx) : remainingWords
      const nonArticles = wordsBeforePrep.filter(w => !vocab.articles.includes(w))

      if (nonArticles.length === 1 || word === nonArticles[nonArticles.length - 1]) {
        role = 'noun'
      } else {
        role = 'adjective'
      }
    }

    tokens.push({ word, role })
  }

  return { result, tokens }
}

function renderTokens(tokens) {
  const container = document.getElementById('tokens-container')
  container.innerHTML = ''

  tokens.forEach((token, i) => {
    const chip = document.createElement('div')
    chip.className = `token-chip ${token.role}`
    chip.innerHTML = `
      <span class="token-word">${token.word}</span>
      <span class="token-role">${token.role}</span>
    `
    chip.dataset.index = i
    container.appendChild(chip)
  })
}

function renderCommand(result) {
  const container = document.getElementById('command-cards')
  const indicator = document.getElementById('pattern-indicator')
  container.innerHTML = ''

  if (result.type === 'command') {
    const cmd = result.command

    // Verb card
    const verbCard = document.createElement('div')
    verbCard.className = 'command-card verb-card'
    verbCard.innerHTML = `
      <span class="card-icon">⚡</span>
      <span class="card-value">${cmd.verb}</span>
      <span class="card-label">verb</span>
    `
    container.appendChild(verbCard)

    // Direction
    if (cmd.direction) {
      container.appendChild(createArrow())
      const dirCard = document.createElement('div')
      dirCard.className = 'command-card direction-card'
      dirCard.innerHTML = `
        <span class="card-icon">🧭</span>
        <span class="card-value">${cmd.direction}</span>
        <span class="card-label">direction</span>
      `
      container.appendChild(dirCard)
    }

    // Subject
    if (cmd.subject) {
      container.appendChild(createArrow())
      const item = Object.values(gameItems).find(i => i.id === cmd.subject.id)
      const subjectCard = document.createElement('div')
      subjectCard.className = 'command-card subject-card'
      subjectCard.innerHTML = `
        <span class="card-icon">${item?.icon || '📦'}</span>
        <span class="card-value">${cmd.subject.adjectives?.length ? cmd.subject.adjectives.join(' ') + ' ' : ''}${cmd.subject.noun}</span>
        <span class="card-label">subject</span>
      `
      container.appendChild(subjectCard)
    }

    // Preposition + Object
    if (cmd.preposition && cmd.object) {
      const prepBadge = document.createElement('span')
      prepBadge.className = 'preposition-badge'
      prepBadge.textContent = cmd.preposition
      container.appendChild(prepBadge)

      container.appendChild(createArrow())

      const item = Object.values(gameItems).find(i => i.id === cmd.object.id)
      const objectCard = document.createElement('div')
      objectCard.className = 'command-card object-card'
      objectCard.innerHTML = `
        <span class="card-icon">${item?.icon || '📦'}</span>
        <span class="card-value">${cmd.object.adjectives?.length ? cmd.object.adjectives.join(' ') + ' ' : ''}${cmd.object.noun}</span>
        <span class="card-label">object</span>
      `
      container.appendChild(objectCard)
    }

    // Text
    if (cmd.text) {
      container.appendChild(createArrow())
      const textCard = document.createElement('div')
      textCard.className = 'command-card text-card'
      textCard.innerHTML = `
        <span class="card-icon">💬</span>
        <span class="card-value">"${cmd.text}"</span>
        <span class="card-label">text</span>
      `
      container.appendChild(textCard)
    }

    indicator.className = 'pattern-indicator success'
    indicator.innerHTML = `<span>✓</span> Parse successful`

  } else if (result.type === 'unknown_verb') {
    const errorCard = document.createElement('div')
    errorCard.className = 'command-card error-card'
    errorCard.innerHTML = `
      <span class="card-icon">❌</span>
      <span class="card-value">${result.verb}</span>
      <span class="card-label">unknown verb</span>
    `
    container.appendChild(errorCard)

    indicator.className = 'pattern-indicator error'
    indicator.innerHTML = `<span>✗</span> Unknown verb: "${result.verb}"`

  } else if (result.type === 'unknown_noun') {
    const verbCard = document.createElement('div')
    verbCard.className = 'command-card verb-card'
    verbCard.innerHTML = `
      <span class="card-icon">⚡</span>
      <span class="card-value">?</span>
      <span class="card-label">verb</span>
    `
    container.appendChild(verbCard)
    container.appendChild(createArrow())

    const errorCard = document.createElement('div')
    errorCard.className = 'command-card error-card'
    errorCard.innerHTML = `
      <span class="card-icon">❌</span>
      <span class="card-value">${result.noun}</span>
      <span class="card-label">unknown noun</span>
    `
    container.appendChild(errorCard)

    indicator.className = 'pattern-indicator error'
    indicator.innerHTML = `<span>✗</span> Unknown noun: "${result.noun}"`

  } else if (result.type === 'ambiguous') {
    const verbCard = document.createElement('div')
    verbCard.className = 'command-card verb-card'
    verbCard.innerHTML = `
      <span class="card-icon">⚡</span>
      <span class="card-value">?</span>
      <span class="card-label">verb</span>
    `
    container.appendChild(verbCard)
    container.appendChild(createArrow())

    const ambigCard = document.createElement('div')
    ambigCard.className = 'command-card ambiguous-card'
    ambigCard.innerHTML = `
      <span class="card-icon">⚠️</span>
      <span class="card-value">${result.candidates.map(c => c.name || c.id).join(' or ')}</span>
      <span class="card-label">ambiguous ${result.role}</span>
    `
    container.appendChild(ambigCard)

    indicator.className = 'pattern-indicator ambiguous'
    indicator.innerHTML = `<span>⚠️</span> Ambiguous: Which "${result.original}"?`

  } else if (result.type === 'parse_error') {
    const errorCard = document.createElement('div')
    errorCard.className = 'command-card error-card'
    errorCard.innerHTML = `
      <span class="card-icon">❌</span>
      <span class="card-value">${result.message}</span>
      <span class="card-label">parse error</span>
    `
    container.appendChild(errorCard)

    indicator.className = 'pattern-indicator error'
    indicator.innerHTML = `<span>✗</span> ${result.message}`
  }
}

function createArrow() {
  const arrow = document.createElement('span')
  arrow.className = 'command-arrow'
  arrow.textContent = '→'
  return arrow
}

function updateExhibit1() {
  const input = document.getElementById('command-input').value
  const { result, tokens } = analyzeCommand(input)
  renderTokens(tokens)
  renderCommand(result)
}

// Event listeners for Exhibit 1
document.getElementById('command-input').addEventListener('input', updateExhibit1)
document.getElementById('command-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') updateExhibit1()
})

document.getElementById('try-buttons').addEventListener('click', (e) => {
  if (e.target.classList.contains('try-btn')) {
    document.getElementById('command-input').value = e.target.dataset.cmd
    updateExhibit1()
  }
})

// Initial render
updateExhibit1()

// ============================================
// EXHIBIT 2: ADVENTURE ROOM
// ============================================

let disambiguationPending = null

function renderRoom() {
  const roomData = rooms[currentRoom]
  document.getElementById('room-name').textContent = roomData.name

  // Render exits
  const exitsContainer = document.getElementById('room-exits')
  exitsContainer.innerHTML = ''
  for (const [dir, _] of Object.entries(roomData.exits)) {
    const badge = document.createElement('span')
    badge.className = 'exit-badge'
    badge.textContent = dir[0].toUpperCase()
    exitsContainer.appendChild(badge)
  }

  // Render items
  const itemsContainer = document.getElementById('room-items')
  itemsContainer.innerHTML = ''

  for (const itemKey of roomData.items) {
    const item = gameItems[itemKey]
    if (!item) continue

    const itemEl = document.createElement('div')
    itemEl.className = 'room-item'
    itemEl.dataset.key = itemKey
    itemEl.innerHTML = `
      <span class="item-icon">${item.icon}</span>
      <span class="item-name">${item.name}</span>
    `
    itemEl.addEventListener('click', () => {
      addNarrative(`The ${item.name}: ${item.description}`)
    })
    itemsContainer.appendChild(itemEl)
  }

  // Fill empty slots
  while (itemsContainer.children.length < 6) {
    const placeholder = document.createElement('div')
    placeholder.className = 'room-item-placeholder'
    itemsContainer.appendChild(placeholder)
  }
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid')
  grid.innerHTML = ''

  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div')
    slot.className = 'inventory-slot'

    if (inventory[i]) {
      const item = gameItems[inventory[i]]
      slot.classList.add('filled')
      slot.innerHTML = `
        <span class="item-icon">${item.icon}</span>
        <span class="item-name">${item.name}</span>
      `
      slot.dataset.key = inventory[i]
      slot.addEventListener('click', () => {
        addNarrative(`The ${item.name}: ${item.description}`)
      })
    } else {
      slot.textContent = 'empty'
    }

    grid.appendChild(slot)
  }
}

function updatePronoun(item) {
  pronounRef = item
  const display = document.getElementById('pronoun-display')

  if (item) {
    const itemData = gameItems[item.key || item]
    display.innerHTML = `
      <span class="pronoun-icon">${itemData?.icon || '📦'}</span>
      <span class="pronoun-text">${itemData?.name || item}</span>
    `
    display.classList.add('active')
    setTimeout(() => display.classList.remove('active'), 300)
  } else {
    display.innerHTML = '<span class="pronoun-text">(nothing)</span>'
  }
}

function addNarrative(text) {
  const output = document.getElementById('narrative-output')
  const p = document.createElement('p')
  p.innerHTML = text
  output.appendChild(p)
  output.scrollTop = output.scrollHeight
}

function clearNarrative() {
  document.getElementById('narrative-output').innerHTML = ''
}

function executeAdventureCommand(input) {
  // Handle disambiguation response
  if (disambiguationPending) {
    const choice = input.trim()
    let selected = null

    if (choice === '1' || choice === '2') {
      selected = disambiguationPending.candidates[parseInt(choice) - 1]
    } else {
      // Try to match by name
      selected = disambiguationPending.candidates.find(c =>
        c.name?.toLowerCase().includes(choice.toLowerCase())
      )
    }

    if (selected) {
      // Execute the pending command with the selected entity
      const itemKey = selected.key
      if (disambiguationPending.verb === 'GET') {
        const roomData = rooms[currentRoom]
        const idx = roomData.items.indexOf(itemKey)
        if (idx >= 0) {
          roomData.items.splice(idx, 1)
          inventory.push(itemKey)
          addNarrative(`You take the ${selected.name}.`)
          updatePronoun({ key: itemKey })
        }
      }
      renderRoom()
      renderInventory()
    } else {
      addNarrative('Please choose 1 or 2, or type a more specific name.')
      return
    }

    disambiguationPending = null
    hideDisambiguation()
    return
  }

  const result = sharedParser.parse(input, {
    scope: { room: currentRoom, inventory }
  })

  if (result.type === 'command') {
    const cmd = result.command

    switch (cmd.verb) {
      case 'LOOK':
        const roomData = rooms[currentRoom]
        addNarrative(`You are in the <span class="highlight">${roomData.name}</span>.`)
        addNarrative(roomData.description)
        if (roomData.items.length > 0) {
          const itemNames = roomData.items.map(k => gameItems[k]?.name).filter(Boolean)
          addNarrative(`You see: ${itemNames.join(', ')}.`)
        }
        break

      case 'GET':
        if (cmd.subject) {
          const itemKey = findItemKey(cmd.subject.id)
          const roomData = rooms[currentRoom]
          const idx = roomData.items.indexOf(itemKey)

          if (idx >= 0) {
            // Animate
            const itemEl = document.querySelector(`.room-item[data-key="${itemKey}"]`)
            if (itemEl) {
              itemEl.classList.add('moving')
              setTimeout(() => {
                roomData.items.splice(idx, 1)
                inventory.push(itemKey)
                renderRoom()
                renderInventory()
              }, 400)
            } else {
              roomData.items.splice(idx, 1)
              inventory.push(itemKey)
              renderRoom()
              renderInventory()
            }
            addNarrative(`You take the ${gameItems[itemKey]?.name || cmd.subject.noun}.`)
            updatePronoun({ key: itemKey })
          } else {
            addNarrative(`You don't see that here.`)
          }
        }
        break

      case 'DROP':
        if (cmd.subject) {
          const itemKey = findItemKey(cmd.subject.id)
          const idx = inventory.indexOf(itemKey)

          if (idx >= 0) {
            inventory.splice(idx, 1)
            rooms[currentRoom].items.push(itemKey)
            addNarrative(`You drop the ${gameItems[itemKey]?.name || cmd.subject.noun}.`)
            renderRoom()
            renderInventory()
          } else {
            addNarrative(`You're not carrying that.`)
          }
        }
        break

      case 'EXAMINE':
        if (cmd.subject) {
          const itemKey = findItemKey(cmd.subject.id)
          const item = gameItems[itemKey]
          if (item) {
            // Pulse the item
            const itemEl = document.querySelector(`.room-item[data-key="${itemKey}"]`)
            if (itemEl) {
              itemEl.classList.add('pulse')
              setTimeout(() => itemEl.classList.remove('pulse'), 500)
            }
            addNarrative(`The ${item.name}: ${item.description}`)
            updatePronoun({ key: itemKey })
          }
        }
        break

      case 'INVENTORY':
        if (inventory.length === 0) {
          addNarrative(`You're not carrying anything.`)
        } else {
          const itemNames = inventory.map(k => gameItems[k]?.name).filter(Boolean)
          addNarrative(`You are carrying: ${itemNames.join(', ')}.`)
        }
        break

      case 'GO':
        const dir = cmd.direction?.toLowerCase()
        const exits = rooms[currentRoom].exits
        const nextRoom = exits[dir]

        if (nextRoom) {
          currentRoom = nextRoom
          sharedParser.clearPronoun()
          updatePronoun(null)

          const newRoomData = rooms[currentRoom]
          clearNarrative()
          addNarrative(`You go ${dir}.`)
          addNarrative(`You are now in the <span class="highlight">${newRoomData.name}</span>.`)
          addNarrative(newRoomData.description)
          if (newRoomData.items.length > 0) {
            const itemNames = newRoomData.items.map(k => gameItems[k]?.name).filter(Boolean)
            addNarrative(`You see: ${itemNames.join(', ')}.`)
          }
          renderRoom()
        } else {
          addNarrative(`You can't go that way.`)
        }
        break

      default:
        addNarrative(`You ${cmd.verb.toLowerCase()}.`)
    }

  } else if (result.type === 'unknown_verb') {
    addNarrative(`I don't understand "${result.verb}".`)

  } else if (result.type === 'unknown_noun') {
    addNarrative(`I don't see any "${result.noun}" here.`)

  } else if (result.type === 'ambiguous') {
    disambiguationPending = { ...result, verb: input.split(' ')[0].toUpperCase() }
    showDisambiguation(result.candidates)
    addNarrative(`Which ${result.original} do you mean?`)

  } else if (result.type === 'parse_error') {
    addNarrative(result.message)
  }
}

function findItemKey(id) {
  for (const [key, item] of Object.entries(gameItems)) {
    if (item.id === id) return key
  }
  return null
}

function showDisambiguation(candidates) {
  const output = document.getElementById('narrative-output')
  const choicesDiv = document.createElement('div')
  choicesDiv.className = 'disambiguation-choices'
  choicesDiv.id = 'disambiguation-choices'

  candidates.forEach((c, i) => {
    const card = document.createElement('div')
    card.className = 'disambiguation-card'
    card.innerHTML = `
      <span class="item-icon">${c.icon || '📦'}</span>
      <span>${c.name}</span>
      <span class="tag">[${i + 1}]</span>
    `
    card.addEventListener('click', () => {
      executeAdventureCommand((i + 1).toString())
    })
    choicesDiv.appendChild(card)
  })

  output.appendChild(choicesDiv)
}

function hideDisambiguation() {
  const choices = document.getElementById('disambiguation-choices')
  if (choices) choices.remove()
}

function resetAdventure() {
  currentRoom = 'living-room'
  inventory = []
  pronounRef = null
  disambiguationPending = null
  sharedParser.clearPronoun()

  // Reset room items
  rooms['living-room'].items = ['lamp', 'chest', 'ball-red', 'ball-blue', 'key']
  rooms['kitchen'].items = ['stove', 'knife']

  renderRoom()
  renderInventory()
  updatePronoun(null)
  clearNarrative()
  addNarrative(`You are in the <span class="highlight">Living Room</span>.`)
  addNarrative(`You see a brass lamp, a wooden chest, a red ball, a blue ball, and a rusty key.`)
  addNarrative(`There is an exit to the <span class="highlight">NORTH</span>.`)
  addNarrative(`<span style="color: var(--accent-blue);">💡 Click a suggested command above to get started!</span>`)
}

// Event listeners for Exhibit 2
document.getElementById('adventure-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = e.target.value.trim()
    if (input) {
      executeAdventureCommand(input)
      e.target.value = ''
    }
  }
})

document.querySelectorAll('.adventure-try').forEach(btn => {
  btn.addEventListener('click', () => {
    executeAdventureCommand(btn.dataset.cmd)
  })
})

document.getElementById('reset-room').addEventListener('click', resetAdventure)

// Initial render
renderRoom()
renderInventory()

// ============================================
// EXHIBIT 3: VOCABULARY WORKSHOP
// ============================================

const customVerbs = []
const customDirections = []

function renderDefaultVocab() {
  const vocab = sharedParser.getVocabulary()

  // Render default verbs
  const verbsList = document.getElementById('default-verbs')
  verbsList.innerHTML = ''

  for (const verb of DEFAULT_VOCABULARY.verbs) {
    const item = document.createElement('div')
    item.className = 'vocab-item'
    item.innerHTML = `
      <span class="vocab-icon">🔷</span>
      <div class="vocab-details">
        <div class="vocab-canonical">${verb.canonical}</div>
        <div class="vocab-synonyms">${verb.synonyms.join(', ')}</div>
        <div class="vocab-pattern">pattern: ${verb.pattern}</div>
      </div>
    `
    verbsList.appendChild(item)
  }

  // Render default directions
  const dirsList = document.getElementById('default-directions')
  dirsList.innerHTML = ''

  for (const dir of DEFAULT_VOCABULARY.directions) {
    const item = document.createElement('div')
    item.className = 'vocab-item'
    item.innerHTML = `
      <span class="vocab-icon direction">↗</span>
      <div class="vocab-details">
        <div class="vocab-canonical">${dir.canonical}</div>
        <div class="vocab-synonyms">${dir.aliases.join(', ')}</div>
      </div>
    `
    dirsList.appendChild(item)
  }
}

function renderCustomVocab() {
  const verbsList = document.getElementById('custom-verbs')
  const dirsList = document.getElementById('custom-directions')

  if (customVerbs.length === 0) {
    verbsList.innerHTML = `<div style="padding: var(--space-md); color: var(--text-muted); font-size: var(--font-size-sm);">
      No custom verbs yet. Add one below!
    </div>`
  } else {
    verbsList.innerHTML = ''
    customVerbs.forEach((verb, i) => {
      const item = document.createElement('div')
      item.className = 'vocab-item'
      item.innerHTML = `
        <span class="vocab-icon custom">🟣</span>
        <div class="vocab-details">
          <div class="vocab-canonical">${verb.canonical}</div>
          <div class="vocab-synonyms">${verb.synonyms.join(', ')}</div>
          <div class="vocab-pattern">pattern: ${verb.pattern}</div>
        </div>
        <div class="vocab-actions">
          <button class="btn btn-small btn-danger" data-index="${i}">🗑️</button>
        </div>
      `
      item.querySelector('.btn-danger').addEventListener('click', () => {
        customVerbs.splice(i, 1)
        renderCustomVocab()
      })
      verbsList.appendChild(item)
    })
  }

  if (customDirections.length === 0) {
    dirsList.innerHTML = `<div style="padding: var(--space-md); color: var(--text-muted); font-size: var(--font-size-sm);">
      No custom directions yet.
    </div>`
  } else {
    dirsList.innerHTML = ''
    customDirections.forEach((dir, i) => {
      const item = document.createElement('div')
      item.className = 'vocab-item'
      item.innerHTML = `
        <span class="vocab-icon custom">⭐</span>
        <div class="vocab-details">
          <div class="vocab-canonical">${dir.canonical}</div>
          <div class="vocab-synonyms">${dir.aliases.join(', ')}</div>
        </div>
        <div class="vocab-actions">
          <button class="btn btn-small btn-danger" data-index="${i}">🗑️</button>
        </div>
      `
      item.querySelector('.btn-danger').addEventListener('click', () => {
        customDirections.splice(i, 1)
        renderCustomVocab()
      })
      dirsList.appendChild(item)
    })
  }
}

function updatePatternPreview() {
  const pattern = document.getElementById('verb-pattern').value
  const canonical = document.getElementById('verb-canonical').value.toUpperCase() || 'VERB'
  const preview = document.getElementById('pattern-preview')

  let diagram = ''
  let example = ''

  switch (pattern) {
    case 'none':
      diagram = `<div class="pattern-circle filled">V</div>`
      example = `"${canonical.toLowerCase()}" → ${canonical}`
      break
    case 'subject':
      diagram = `<div class="pattern-circle filled">V</div>
                 <div class="pattern-line"></div>
                 <div class="pattern-circle">S</div>`
      example = `"${canonical.toLowerCase()} thing" → ${canonical} [thing]`
      break
    case 'subject_object':
      diagram = `<div class="pattern-circle filled">V</div>
                 <div class="pattern-line"></div>
                 <div class="pattern-circle">S</div>
                 <span class="pattern-arrow">→</span>
                 <div class="pattern-circle">O</div>`
      example = `"${canonical.toLowerCase()} X in Y" → ${canonical} [X] in [Y]`
      break
    case 'direction':
      diagram = `<div class="pattern-circle filled">V</div>
                 <div class="pattern-line"></div>
                 <div class="pattern-circle">D</div>`
      example = `"${canonical.toLowerCase()} north" → ${canonical} NORTH`
      break
    case 'text':
      diagram = `<div class="pattern-circle filled">V</div>
                 <div class="pattern-line"></div>
                 <span style="color: var(--accent-purple);">...</span>`
      example = `"${canonical.toLowerCase()} hello world" → ${canonical} "hello world"`
      break
  }

  preview.innerHTML = `
    <div class="pattern-diagram">${diagram}</div>
    <div class="mt-sm" style="color: var(--text-muted);">Example: ${example}</div>
  `
}

// Event listeners for Exhibit 3
document.getElementById('verb-pattern').addEventListener('change', updatePatternPreview)
document.getElementById('verb-canonical').addEventListener('input', updatePatternPreview)

document.getElementById('add-verb-btn').addEventListener('click', () => {
  const canonical = document.getElementById('verb-canonical').value.toUpperCase().trim()
  const synonymsStr = document.getElementById('verb-synonyms').value.trim()
  const pattern = document.getElementById('verb-pattern').value

  if (!canonical || !synonymsStr) {
    alert('Please fill in both canonical name and synonyms')
    return
  }

  const synonyms = synonymsStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

  const newVerb = { canonical, synonyms, pattern }
  customVerbs.push(newVerb)
  sharedParser.addVerb(newVerb)

  // Clear form
  document.getElementById('verb-canonical').value = ''
  document.getElementById('verb-synonyms').value = ''

  renderCustomVocab()

  // Update exhibit 1 if it's showing something
  updateExhibit1()
})

// Initial render
renderDefaultVocab()
renderCustomVocab()
updatePatternPreview()

// ============================================
// DEMO PLAYBACK
// ============================================

const demoPlayback = {
  running: false,
  delay: 400, // Base delay between actions (ms)
  typeDelay: 50, // Delay between keystrokes (ms)

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  },

  async typeText(input, text) {
    input.value = ''
    input.focus()
    for (const char of text) {
      input.value += char
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await this.sleep(this.typeDelay)
    }
  },

  scrollToElement(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  },

  async playExhibit1() {
    const progressText = document.getElementById('progress-text')
    const exhibit = document.getElementById('exhibit-1')
    const input = document.getElementById('command-input')

    this.scrollToElement(exhibit)
    await this.sleep(this.delay)

    const commands = [
      'look',
      'get the brass lamp',
      'exa lamp',
      'put key in chest',
      'go north',
      'say hello world',
      'dance',
      'get ball'
    ]

    for (const cmd of commands) {
      progressText.textContent = `Demo: Command Anatomy - "${cmd}"`
      await this.typeText(input, cmd)
      await this.sleep(this.delay * 1.5)
    }
  },

  async playExhibit2() {
    const progressText = document.getElementById('progress-text')
    const exhibit = document.getElementById('exhibit-2')

    this.scrollToElement(exhibit)
    await this.sleep(this.delay)

    // Reset the room first
    resetAdventure()
    await this.sleep(this.delay)

    const commands = [
      'get lamp',
      'examine it',
      'get key',
      'drop lamp',
      'inventory',
      'north',
      'look',
      'get knife',
      'south',
      'get ball'
    ]

    for (const cmd of commands) {
      progressText.textContent = `Demo: Adventure Room - "${cmd}"`

      // If ambiguous result pending, choose option 1
      if (disambiguationPending) {
        executeAdventureCommand('1')
        await this.sleep(this.delay)
      }

      executeAdventureCommand(cmd)
      await this.sleep(this.delay * 1.5)
    }

    // Handle final disambiguation if any
    if (disambiguationPending) {
      progressText.textContent = `Demo: Adventure Room - choosing "red ball"`
      executeAdventureCommand('1')
      await this.sleep(this.delay)
    }
  },

  async playExhibit3() {
    const progressText = document.getElementById('progress-text')
    const exhibit = document.getElementById('exhibit-3')

    this.scrollToElement(exhibit)
    await this.sleep(this.delay)

    // Add a custom verb
    progressText.textContent = `Demo: Vocabulary Workshop - adding custom verb`
    const canonicalInput = document.getElementById('verb-canonical')
    const synonymsInput = document.getElementById('verb-synonyms')
    const patternSelect = document.getElementById('verb-pattern')
    const addBtn = document.getElementById('add-verb-btn')

    await this.typeText(canonicalInput, 'ZORK')
    await this.sleep(this.delay / 2)
    await this.typeText(synonymsInput, 'zork, frotz, plugh')
    await this.sleep(this.delay / 2)
    patternSelect.value = 'none'
    patternSelect.dispatchEvent(new Event('change'))
    await this.sleep(this.delay)

    addBtn.click()
    await this.sleep(this.delay)

    // Now try the custom verb in Exhibit 1
    progressText.textContent = `Demo: Testing custom verb in Command Anatomy`
    const exhibit1 = document.getElementById('exhibit-1')
    const cmdInput = document.getElementById('command-input')

    this.scrollToElement(exhibit1)
    await this.sleep(this.delay)

    await this.typeText(cmdInput, 'zork')
    await this.sleep(this.delay * 2)
  },

  async run() {
    if (this.running) return
    this.running = true

    const progressText = document.getElementById('progress-text')
    const progressFill = document.getElementById('progress-fill')
    const runBtn = document.getElementById('run-tests')

    runBtn.disabled = true
    progressFill.style.width = '100%'
    progressFill.className = 'test-progress-fill success'

    try {
      progressText.textContent = 'Demo: Starting playback...'
      await this.sleep(this.delay)

      // Play through all exhibits
      await this.playExhibit1()
      await this.playExhibit2()
      await this.playExhibit3()

      progressText.textContent = 'Demo playback complete!'
      progressFill.className = 'test-progress-fill success'
    } catch (e) {
      progressText.textContent = `Demo error: ${e.message}`
      progressFill.className = 'test-progress-fill failure'
    }

    runBtn.disabled = false
    this.running = false
  }
}

// ============================================
// TEST RUNNER
// ============================================

const testRunner = {
  tests: [],
  results: [],
  running: false,

  register(name, fn) {
    this.tests.push({ name, fn })
  },

  async run() {
    if (this.running) return
    this.running = true
    this.results = []

    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')
    const summary = document.getElementById('test-summary')
    const passedCount = document.getElementById('passed-count')
    const failedCount = document.getElementById('failed-count')
    const skippedCount = document.getElementById('skipped-count')
    const runBtn = document.getElementById('run-tests')

    runBtn.disabled = true
    output.innerHTML = ''
    summary.classList.add('hidden')
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'

    let passed = 0
    let failed = 0

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i]
      const progress = ((i + 1) / this.tests.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Running: ${test.name}`

      try {
        await test.fn()
        passed++
        this.results.push({ name: test.name, passed: true })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon pass">✓</span>
            <span class="test-name">${escapeHtml(test.name)}</span>
          </div>
        `
      } catch (e) {
        failed++
        this.results.push({ name: test.name, passed: false, error: e.message })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon fail">✗</span>
            <div>
              <div class="test-name">${escapeHtml(test.name)}</div>
              <div class="test-error">${escapeHtml(e.message)}</div>
            </div>
          </div>
        `
      }

      output.scrollTop = output.scrollHeight
      await new Promise(r => setTimeout(r, 20))
    }

    progressFill.classList.add(failed === 0 ? 'success' : 'failure')
    progressText.textContent = `Complete: ${passed}/${this.tests.length} passed`

    passedCount.textContent = passed
    failedCount.textContent = failed
    skippedCount.textContent = 0
    summary.classList.remove('hidden')

    this.running = false

    // Run demo playback after tests pass
    if (failed === 0) {
      await new Promise(r => setTimeout(r, 500))
      await demoPlayback.run()
    }

    runBtn.disabled = false
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

// Register tests
testRunner.register('creates parser with resolver', () => {
  const parser = createParser({ resolver: () => [] })
  assert(parser, 'Parser should be created')
  assert(typeof parser.parse === 'function', 'Parser should have parse method')
})

testRunner.register('parses simple verb command', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('look')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'LOOK')
})

testRunner.register('parses verb with subject', () => {
  const parser = createParser({ resolver: () => [{ id: 'item-1' }] })
  const result = parser.parse('get lamp')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'GET')
  assertEqual(result.command.subject.noun, 'lamp')
})

testRunner.register('strips articles from input', () => {
  const parser = createParser({ resolver: () => [{ id: 'item-1' }] })
  const result = parser.parse('get the lamp')
  assertEqual(result.type, 'command')
  assertEqual(result.command.subject.noun, 'lamp')
})

testRunner.register('parses direction shortcut', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('north')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'GO')
  assertEqual(result.command.direction, 'NORTH')
})

testRunner.register('parses direction alias', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('n')
  assertEqual(result.type, 'command')
  assertEqual(result.command.direction, 'NORTH')
})

testRunner.register('parses go with direction', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('go north')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'GO')
  assertEqual(result.command.direction, 'NORTH')
})

testRunner.register('parses subject_object pattern', () => {
  const parser = createParser({ resolver: (noun) => [{ id: noun }] })
  const result = parser.parse('put key in chest')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'PUT')
  assertEqual(result.command.subject.noun, 'key')
  assertEqual(result.command.preposition, 'in')
  assertEqual(result.command.object.noun, 'chest')
})

testRunner.register('parses text pattern', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('say hello world')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'SAY')
  assertEqual(result.command.text, 'hello world')
})

testRunner.register('returns unknown_verb for unrecognized verb', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('dance')
  assertEqual(result.type, 'unknown_verb')
  assertEqual(result.verb, 'dance')
})

testRunner.register('returns unknown_noun when resolver returns empty', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('get unicorn')
  assertEqual(result.type, 'unknown_noun')
  assertEqual(result.noun, 'unicorn')
})

testRunner.register('returns ambiguous when resolver returns multiple', () => {
  const parser = createParser({ resolver: () => [{ id: '1' }, { id: '2' }] })
  const result = parser.parse('get ball')
  assertEqual(result.type, 'ambiguous')
  assertEqual(result.candidates.length, 2)
})

testRunner.register('partial matching works for verbs', () => {
  const parser = createParser({ resolver: () => [{ id: '1' }] })
  const result = parser.parse('exa lamp')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'EXAMINE')
})

testRunner.register('partial matching respects minPartialLength', () => {
  const parser = createParser({ resolver: () => [], partialMatch: true, minPartialLength: 4 })
  const result = parser.parse('exa')
  assertEqual(result.type, 'unknown_verb')
})

testRunner.register('partial matching can be disabled', () => {
  const parser = createParser({ resolver: () => [], partialMatch: false })
  const result = parser.parse('exa lamp')
  assertEqual(result.type, 'unknown_verb')
})

testRunner.register('addVerb adds custom verb', () => {
  const parser = createParser({ resolver: () => [{ id: '1' }] })
  parser.addVerb({ canonical: 'CUSTOM', synonyms: ['custom'], pattern: 'none' })
  const result = parser.parse('custom')
  assertEqual(result.type, 'command')
  assertEqual(result.command.verb, 'CUSTOM')
})

testRunner.register('addDirection adds custom direction', () => {
  const parser = createParser({ resolver: () => [] })
  parser.addDirection({ canonical: 'PORTAL', aliases: ['portal'] })
  const result = parser.parse('portal')
  assertEqual(result.type, 'command')
  assertEqual(result.command.direction, 'PORTAL')
})

testRunner.register('handles adjectives in subject', () => {
  const parser = createParser({ resolver: (noun, adj) => adj.length ? [{ id: 'red' }] : [] })
  const result = parser.parse('get red ball')
  assertEqual(result.type, 'command')
  assertEqual(result.command.subject.adjectives[0], 'red')
})

testRunner.register('returns parse_error for empty input', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('')
  assertEqual(result.type, 'parse_error')
})

testRunner.register('returns parse_error for missing subject', () => {
  const parser = createParser({ resolver: () => [] })
  const result = parser.parse('get')
  assertEqual(result.type, 'parse_error')
})

testRunner.register('returns parse_error for missing object in subject_object', () => {
  const parser = createParser({ resolver: (noun) => [{ id: noun }] })
  const result = parser.parse('put key')
  assertEqual(result.type, 'parse_error')
})

testRunner.register('clearPronoun clears the referent', () => {
  const parser = createParser({ resolver: () => [{ id: '1' }] })
  parser.parse('get lamp')
  parser.clearPronoun()
  const result = parser.parse('examine it')
  assertEqual(result.type, 'parse_error')
  assert(result.message.includes('it'), 'Error should mention "it"')
})

testRunner.register('parser instances are isolated', () => {
  const parser1 = createParser({ resolver: () => [] })
  const parser2 = createParser({ resolver: () => [] })
  parser1.addVerb({ canonical: 'TEST', synonyms: ['test'], pattern: 'none' })
  const result1 = parser1.parse('test')
  const result2 = parser2.parse('test')
  assertEqual(result1.type, 'command')
  assertEqual(result2.type, 'unknown_verb')
})

testRunner.register('handles multiple prepositions correctly', () => {
  const parser = createParser({ resolver: (noun) => [{ id: noun }] })
  const result = parser.parse('put sword on table')
  assertEqual(result.type, 'command')
  assertEqual(result.command.preposition, 'on')
})

testRunner.register('all 12 directions are recognized', () => {
  const parser = createParser({ resolver: () => [] })
  const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest',
                      'southeast', 'southwest', 'up', 'down', 'in', 'out']
  for (const dir of directions) {
    const result = parser.parse(dir)
    assertEqual(result.type, 'command', `Direction ${dir} should be recognized`)
  }
})

testRunner.register('verb synonyms all work', () => {
  const parser = createParser({ resolver: () => [{ id: '1' }] })
  const synonyms = ['get', 'take', 'grab', 'pick']
  for (const syn of synonyms) {
    const result = parser.parse(`${syn} lamp`)
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'GET', `Synonym ${syn} should map to GET`)
  }
})

document.getElementById('run-tests').addEventListener('click', () => testRunner.run())

// Fuzz test runner
document.getElementById('run-fuzz').addEventListener('click', async () => {
  const output = document.getElementById('test-output')
  const progressFill = document.getElementById('progress-fill')
  const progressText = document.getElementById('progress-text')

  output.innerHTML = ''
  progressFill.style.width = '0%'
  progressFill.className = 'test-progress-fill'

  const parser = createParser({ resolver: () => [{ id: 'test' }] })
  const iterations = 100
  let passed = 0
  let failed = 0

  for (let i = 0; i < iterations; i++) {
    // Generate random input
    const length = Math.floor(Math.random() * 50) + 1
    let input = ''
    for (let j = 0; j < length; j++) {
      input += String.fromCharCode(Math.floor(Math.random() * 94) + 32)
    }

    try {
      const result = parser.parse(input)
      // Should always return a valid result type
      const validTypes = ['command', 'unknown_verb', 'unknown_noun', 'ambiguous', 'parse_error']
      if (!validTypes.includes(result.type)) {
        throw new Error(`Invalid result type: ${result.type}`)
      }
      passed++
    } catch (e) {
      failed++
      output.innerHTML += `
        <div class="test-item">
          <span class="test-icon fail">✗</span>
          <div>
            <div class="test-name">Fuzz input: "${escapeHtml(input.slice(0, 30))}..."</div>
            <div class="test-error">${escapeHtml(e.message)}</div>
          </div>
        </div>
      `
    }

    progressFill.style.width = `${((i + 1) / iterations) * 100}%`
    progressText.textContent = `Fuzz testing: ${i + 1}/${iterations}`

    if (i % 10 === 0) {
      await new Promise(r => setTimeout(r, 10))
    }
  }

  progressFill.classList.add(failed === 0 ? 'success' : 'failure')
  progressText.textContent = `Fuzz testing complete: ${passed}/${iterations} passed`

  if (failed === 0) {
    output.innerHTML += `
      <div class="test-item">
        <span class="test-icon pass">✓</span>
        <span class="test-name">All ${iterations} random inputs handled gracefully</span>
      </div>
    `
  }

  document.getElementById('passed-count').textContent = passed
  document.getElementById('failed-count').textContent = failed
  document.getElementById('skipped-count').textContent = 0
  document.getElementById('test-summary').classList.remove('hidden')
})

// Reset page button
document.getElementById('reset-page').addEventListener('click', () => {
  window.location.reload()
})
