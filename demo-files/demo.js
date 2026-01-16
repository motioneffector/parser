// Import library and expose globally for tests
import * as Library from '../dist/index.js'
window.Library = Library

const { createParser } = Library

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
    chip.style.animationDelay = `${i * 100}ms`
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
    verbCard.style.animationDelay = '0ms'
    container.appendChild(verbCard)

    let delay = 1

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
      dirCard.style.animationDelay = `${delay * 150}ms`
      container.appendChild(dirCard)
      delay++
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
      subjectCard.style.animationDelay = `${delay * 150}ms`
      container.appendChild(subjectCard)
      delay++
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
      objectCard.style.animationDelay = `${delay * 150}ms`
      container.appendChild(objectCard)
      delay++
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
      textCard.style.animationDelay = `${delay * 150}ms`
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
  if (!input.trim()) {
    document.getElementById('tokens-container').innerHTML = ''
    document.getElementById('command-cards').innerHTML = ''
    document.getElementById('pattern-indicator').innerHTML = ''
    return
  }
  const { result, tokens } = analyzeCommand(input)
  renderTokens(tokens)
  renderCommand(result)
}

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

// ============================================
// EXHIBIT 3: VOCABULARY WORKSHOP
// ============================================

const customVerbs = []
const customDirections = []

function renderDefaultVocab() {
  const vocab = sharedParser.getVocabulary()

  // Get default vocabulary - first 31 verbs and 12 directions are built-in
  // Custom verbs added via sharedParser come after
  const defaultVerbs = vocab.verbs.slice(0, 31)
  const defaultDirections = vocab.directions.slice(0, 12)

  // Render default verbs
  const verbsList = document.getElementById('default-verbs')
  verbsList.innerHTML = ''

  for (const verb of defaultVerbs) {
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

  for (const dir of defaultDirections) {
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

// ============================================
// EVENT LISTENERS - EXHIBIT 1
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Exhibit 1: Command Anatomy
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

  // DO NOT call updateExhibit1() on page load - outputs must be empty!

  // Exhibit 2: Adventure Room
  renderRoom()
  renderInventory()

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

  // Exhibit 3: Vocabulary Workshop
  renderDefaultVocab()
  renderCustomVocab()
  updatePatternPreview()

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
})
