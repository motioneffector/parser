# Changelog

All notable changes to @motioneffector/parser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-12

### Added

- Initial release of @motioneffector/parser
- Core parser functionality with natural language command parsing
- Default vocabulary with 30+ common text adventure verbs
- Support for multiple command patterns (verb, verb+subject, verb+subject+object, etc.)
- Entity resolution system with pluggable resolver function
- Disambiguation support for ambiguous entity references
- Pronoun tracking for "it" references
- Partial word matching (configurable)
- Custom vocabulary extension support
- Position tracking for error reporting
- Full TypeScript type definitions
- Comprehensive test suite with 230 test cases
