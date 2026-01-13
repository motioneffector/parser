/**
 * Custom error classes for @motioneffector/parser
 */

/**
 * Base error class for all parser errors
 */
export class ParserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParserError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends ParserError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when parsing fails
 */
export class ParseError extends ParserError {
  constructor(
    message: string,
    public readonly position?: number,
    public readonly input?: string
  ) {
    super(message)
    this.name = 'ParseError'
  }
}
