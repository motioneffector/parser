/**
 * @motioneffector/parser
 * Text adventure command parser for natural language game input
 */

export { createParser } from './parser'
export { ValidationError, ParseError, ParserError } from './errors'
export type {
  VerbPattern,
  VerbDefinition,
  DirectionDefinition,
  Vocabulary,
  ParserOptions,
  ResolverScope,
  ResolvedEntity,
  Resolver,
  Token,
  TokenType,
  EntityRef,
  Command,
  AmbiguousResult,
  UnknownVerbResult,
  UnknownNounResult,
  ParseErrorResult,
  CommandResult,
  ParseResult,
  ParseOptions,
  Parser,
} from './types'
