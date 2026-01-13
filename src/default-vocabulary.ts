/**
 * Default vocabulary for text adventure commands
 */

import type { Vocabulary } from './types'

/**
 * Default vocabulary with common text adventure verbs and directions
 */
export const DEFAULT_VOCABULARY: Vocabulary = {
  verbs: [
    // Movement
    { canonical: 'GO', synonyms: ['go', 'walk', 'run'], pattern: 'direction' },
    { canonical: 'ENTER', synonyms: ['enter'], pattern: 'subject' },
    { canonical: 'EXIT', synonyms: ['exit', 'leave'], pattern: 'none' },
    { canonical: 'CLIMB', synonyms: ['climb'], pattern: 'subject' },

    // Interaction
    { canonical: 'GET', synonyms: ['get', 'take', 'grab', 'pick'], pattern: 'subject' },
    { canonical: 'DROP', synonyms: ['drop'], pattern: 'subject' },
    { canonical: 'PUT', synonyms: ['put'], pattern: 'subject_object' },
    { canonical: 'GIVE', synonyms: ['give'], pattern: 'subject_object' },
    { canonical: 'THROW', synonyms: ['throw'], pattern: 'subject_object' },
    { canonical: 'OPEN', synonyms: ['open'], pattern: 'subject' },
    { canonical: 'CLOSE', synonyms: ['close'], pattern: 'subject' },
    { canonical: 'LOCK', synonyms: ['lock'], pattern: 'subject' },
    { canonical: 'UNLOCK', synonyms: ['unlock'], pattern: 'subject' },

    // Examination
    { canonical: 'LOOK', synonyms: ['look', 'l'], pattern: 'none' },
    { canonical: 'EXAMINE', synonyms: ['examine', 'x', 'inspect'], pattern: 'subject' },
    { canonical: 'SEARCH', synonyms: ['search'], pattern: 'subject' },
    { canonical: 'READ', synonyms: ['read'], pattern: 'subject' },

    // Communication
    { canonical: 'SAY', synonyms: ['say'], pattern: 'text' },
    { canonical: 'SHOUT', synonyms: ['shout'], pattern: 'text' },
    { canonical: 'TALK', synonyms: ['talk'], pattern: 'subject' },
    { canonical: 'ASK', synonyms: ['ask'], pattern: 'subject_object' },
    { canonical: 'TELL', synonyms: ['tell'], pattern: 'subject_object' },

    // Combat
    { canonical: 'ATTACK', synonyms: ['attack', 'hit', 'strike'], pattern: 'subject' },
    { canonical: 'KILL', synonyms: ['kill'], pattern: 'subject' },
    { canonical: 'FIGHT', synonyms: ['fight'], pattern: 'subject' },

    // Meta
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
