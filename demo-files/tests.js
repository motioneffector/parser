// Import library to ensure it is available (also set by demo.js)
import * as Library from '../dist/index.js'
if (!window.Library) window.Library = Library

// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] Reset Page button exists', () => {
    const btn = document.getElementById('reset-page')
    if (!btn) {
      throw new Error('No button with id="reset-page"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Reset Page')) {
      throw new Error(`Button text must include "Reset Page", got: "${text}"`)
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    // Subtract any non-exhibit registrations if needed
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output]')
    outputs.forEach(output => {
      // Allow placeholder text but not actual content
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      // If it has content that isn't a placeholder, that's a violation
      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    // This test verifies by checking a flag set during load
    // The test-runner.js must set window.__demoLoadComplete = true after load
    // Any setTimeout from module load would not have completed
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    // At least one export must be a function
    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    // Check for common mock patterns in window
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate',
      'mockCreateParser', 'fakeCreateParser'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        // Skip cross-origin stylesheets
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      // CORS error - assume external sheet has animations
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return // No buttons to check

    // Check that buttons aren't unstyled
    const btn = buttons[0]
    const styles = window.getComputedStyle(btn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
      // Check if it's async by seeing if it returns a thenable
      const result = exhibit.demonstrate.toString()
      if (!result.includes('async') && !result.includes('Promise')) {
        console.warn(`Exhibit "${exhibit.name}" demonstrate() may not be async`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      // Must have a title
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      // Must have an interactive area
      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

function registerLibraryTests() {
  const { createParser } = window.Library

  testRunner.registerTest('creates parser with resolver', () => {
    const parser = createParser({ resolver: () => [] })
    assert(parser, 'Parser should be created')
    assert(typeof parser.parse === 'function', 'Parser should have parse method')
  })

  testRunner.registerTest('parses simple verb command', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('look')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'LOOK')
  })

  testRunner.registerTest('parses verb with subject', () => {
    const parser = createParser({ resolver: () => [{ id: 'item-1' }] })
    const result = parser.parse('get lamp')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'GET')
    assertEqual(result.command.subject.noun, 'lamp')
  })

  testRunner.registerTest('strips articles from input', () => {
    const parser = createParser({ resolver: () => [{ id: 'item-1' }] })
    const result = parser.parse('get the lamp')
    assertEqual(result.type, 'command')
    assertEqual(result.command.subject.noun, 'lamp')
  })

  testRunner.registerTest('parses direction shortcut', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('north')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'GO')
    assertEqual(result.command.direction, 'NORTH')
  })

  testRunner.registerTest('parses direction alias', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('n')
    assertEqual(result.type, 'command')
    assertEqual(result.command.direction, 'NORTH')
  })

  testRunner.registerTest('parses go with direction', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('go north')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'GO')
    assertEqual(result.command.direction, 'NORTH')
  })

  testRunner.registerTest('parses subject_object pattern', () => {
    const parser = createParser({ resolver: (noun) => [{ id: noun }] })
    const result = parser.parse('put key in chest')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'PUT')
    assertEqual(result.command.subject.noun, 'key')
    assertEqual(result.command.preposition, 'in')
    assertEqual(result.command.object.noun, 'chest')
  })

  testRunner.registerTest('parses text pattern', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('say hello world')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'SAY')
    assertEqual(result.command.text, 'hello world')
  })

  testRunner.registerTest('returns unknown_verb for unrecognized verb', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('dance')
    assertEqual(result.type, 'unknown_verb')
    assertEqual(result.verb, 'dance')
  })

  testRunner.registerTest('returns unknown_noun when resolver returns empty', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('get unicorn')
    assertEqual(result.type, 'unknown_noun')
    assertEqual(result.noun, 'unicorn')
  })

  testRunner.registerTest('returns ambiguous when resolver returns multiple', () => {
    const parser = createParser({ resolver: () => [{ id: '1' }, { id: '2' }] })
    const result = parser.parse('get ball')
    assertEqual(result.type, 'ambiguous')
    assertEqual(result.candidates.length, 2)
  })

  testRunner.registerTest('partial matching works for verbs', () => {
    const parser = createParser({ resolver: () => [{ id: '1' }] })
    const result = parser.parse('exa lamp')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'EXAMINE')
  })

  testRunner.registerTest('partial matching respects minPartialLength', () => {
    const parser = createParser({ resolver: () => [], partialMatch: true, minPartialLength: 4 })
    const result = parser.parse('exa')
    assertEqual(result.type, 'unknown_verb')
  })

  testRunner.registerTest('partial matching can be disabled', () => {
    const parser = createParser({ resolver: () => [], partialMatch: false })
    const result = parser.parse('exa lamp')
    assertEqual(result.type, 'unknown_verb')
  })

  testRunner.registerTest('addVerb adds custom verb', () => {
    const parser = createParser({ resolver: () => [{ id: '1' }] })
    parser.addVerb({ canonical: 'CUSTOM', synonyms: ['custom'], pattern: 'none' })
    const result = parser.parse('custom')
    assertEqual(result.type, 'command')
    assertEqual(result.command.verb, 'CUSTOM')
  })

  testRunner.registerTest('addDirection adds custom direction', () => {
    const parser = createParser({ resolver: () => [] })
    parser.addDirection({ canonical: 'PORTAL', aliases: ['portal'] })
    const result = parser.parse('portal')
    assertEqual(result.type, 'command')
    assertEqual(result.command.direction, 'PORTAL')
  })

  testRunner.registerTest('handles adjectives in subject', () => {
    const parser = createParser({ resolver: (noun, adj) => adj.length ? [{ id: 'red' }] : [] })
    const result = parser.parse('get red ball')
    assertEqual(result.type, 'command')
    assertEqual(result.command.subject.adjectives[0], 'red')
  })

  testRunner.registerTest('returns parse_error for empty input', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('')
    assertEqual(result.type, 'parse_error')
  })

  testRunner.registerTest('returns parse_error for missing subject', () => {
    const parser = createParser({ resolver: () => [] })
    const result = parser.parse('get')
    assertEqual(result.type, 'parse_error')
  })

  testRunner.registerTest('returns parse_error for missing object in subject_object', () => {
    const parser = createParser({ resolver: (noun) => [{ id: noun }] })
    const result = parser.parse('put key')
    assertEqual(result.type, 'parse_error')
  })

  testRunner.registerTest('clearPronoun clears the referent', () => {
    const parser = createParser({ resolver: () => [{ id: '1' }] })
    parser.parse('get lamp')
    parser.clearPronoun()
    const result = parser.parse('examine it')
    assertEqual(result.type, 'parse_error')
    assert(result.message.includes('it'), 'Error should mention "it"')
  })

  testRunner.registerTest('parser instances are isolated', () => {
    const parser1 = createParser({ resolver: () => [] })
    const parser2 = createParser({ resolver: () => [] })
    parser1.addVerb({ canonical: 'TEST', synonyms: ['test'], pattern: 'none' })
    const result1 = parser1.parse('test')
    const result2 = parser2.parse('test')
    assertEqual(result1.type, 'command')
    assertEqual(result2.type, 'unknown_verb')
  })

  testRunner.registerTest('handles multiple prepositions correctly', () => {
    const parser = createParser({ resolver: (noun) => [{ id: noun }] })
    const result = parser.parse('put sword on table')
    assertEqual(result.type, 'command')
    assertEqual(result.command.preposition, 'on')
  })

  testRunner.registerTest('all 12 directions are recognized', () => {
    const parser = createParser({ resolver: () => [] })
    const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest',
                        'southeast', 'southwest', 'up', 'down', 'in', 'out']
    for (const dir of directions) {
      const result = parser.parse(dir)
      assertEqual(result.type, 'command', `Direction ${dir} should be recognized`)
    }
  })

  testRunner.registerTest('verb synonyms all work', () => {
    const parser = createParser({ resolver: () => [{ id: '1' }] })
    const synonyms = ['get', 'take', 'grab', 'pick']
    for (const syn of synonyms) {
      const result = parser.parse(`${syn} lamp`)
      assertEqual(result.type, 'command')
      assertEqual(result.command.verb, 'GET', `Synonym ${syn} should map to GET`)
    }
  })
}

// ============================================
// EXHIBIT WALKTHROUGH REGISTRATIONS
// ============================================

function registerExhibits() {
  // Exhibit 1: Command Anatomy
  testRunner.registerExhibit(
    'Command Anatomy',
    document.getElementById('exhibit-1').closest('.exhibit'),
    async () => {
      const input = document.getElementById('command-input')
      const commands = [
        'look',
        'get the brass lamp',
        'exa lamp',
        'put key in chest',
        'go north',
        'say hello world',
        'get ball'
      ]

      for (const cmd of commands) {
        input.value = cmd
        input.dispatchEvent(new Event('input'))
        await testRunner.delay(800)
      }
    }
  )

  // Exhibit 2: Adventure Room
  testRunner.registerExhibit(
    'Adventure Room',
    document.getElementById('exhibit-2').closest('.exhibit'),
    async () => {
      // Reset first
      if (typeof resetAdventure === 'function') {
        resetAdventure()
        await testRunner.delay(400)
      }

      const commands = [
        'get lamp',
        'examine it',
        'get key',
        'drop lamp',
        'inventory',
        'north',
        'look',
        'south'
      ]

      for (const cmd of commands) {
        if (typeof executeAdventureCommand === 'function') {
          executeAdventureCommand(cmd)
        }
        await testRunner.delay(1000)

        // Handle disambiguation if it appears
        if (typeof disambiguationPending !== 'undefined' && disambiguationPending) {
          executeAdventureCommand('1')
          await testRunner.delay(500)
        }
      }
    }
  )

  // Exhibit 3: Vocabulary Workshop
  testRunner.registerExhibit(
    'Vocabulary Workshop',
    document.getElementById('exhibit-3').closest('.exhibit'),
    async () => {
      const canonicalInput = document.getElementById('verb-canonical')
      const synonymsInput = document.getElementById('verb-synonyms')
      const patternSelect = document.getElementById('verb-pattern')
      const addBtn = document.getElementById('add-verb-btn')

      // Simulate adding a custom verb
      canonicalInput.value = 'ZORK'
      canonicalInput.dispatchEvent(new Event('input'))
      await testRunner.delay(300)

      synonymsInput.value = 'zork, frotz'
      synonymsInput.dispatchEvent(new Event('input'))
      await testRunner.delay(300)

      patternSelect.value = 'none'
      patternSelect.dispatchEvent(new Event('change'))
      await testRunner.delay(300)

      addBtn.click()
      await testRunner.delay(500)

      // Test the custom verb in Exhibit 1
      const cmdInput = document.getElementById('command-input')
      document.getElementById('exhibit-1').closest('.exhibit').scrollIntoView({ behavior: 'smooth', block: 'center' })
      await testRunner.delay(400)

      cmdInput.value = 'zork'
      cmdInput.dispatchEvent(new Event('input'))
      await testRunner.delay(800)
    }
  )
}

// ============================================
// REGISTER ALL TESTS
// ============================================

// FIRST: Register integrity tests (same for all demos)
registerIntegrityTests()

// THEN: Register library-specific tests
registerLibraryTests()

// FINALLY: Register exhibits for walkthrough
document.addEventListener('DOMContentLoaded', () => {
  registerExhibits()
})
