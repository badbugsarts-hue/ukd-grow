## 2026-08-14T03:20:51Z

# Task Dispatch — Explorer Testing

## Mission

Survey the existing test suite (`src/**/*.test.ts`, `vitest.config.ts`), test runner, and acceptance criteria in `ORIGINAL_REQUEST.md`.
Enumerate all test coverage requirements for:

1. Unit tests for PPFD 9-point mapping math, pH/EC sensor calibration validity, Plant Identity Day Zero anchor calculations, and Pot Weight hydration status.
2. Component tests for new modals and panels.
3. Requirements for browser subagent visual UX and end-to-end flow verification.

## Constraints & Requirements

- Read ORIGINAL_REQUEST.md and AGENTS.md.
- Ensure all existing tests remain passing.
- Define explicit test cases and acceptance boundaries.
- Produce a detailed handoff report in your working directory (`handoff.md`).
