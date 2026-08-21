# BRIEFING — 2026-08-11T05:17:30Z

## Mission

Remediation of App Shell Routing & Test Configuration (Milestone 4 Iteration 2).

## 🔒 My Identity

- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\badbu\Documents\grow\.agents\worker_m4_it2
- Original parent: 6783987b-1cde-4c0a-8087-df980caf57b6
- Milestone: M4 Iteration 2

## 🔒 Key Constraints

- Follow AGENTS.md invariants (e.g. minimal changes, no hardcoded tests/outputs).
- Edit vite.config.ts to include .test.tsx files.
- Edit src/App.tsx to support missing routes (equipment, ipm, incidents) and fallback case, and pass lens={lens} to all <Metric> calls in Cockpit and Climate.
- Edit src/AppIntegration.test.tsx to assert equipment, ipm, incidents, fallback routing, and active lens passing to Metric.
- Pass typecheck (`npx tsc --noEmit`) and unit tests (`npx vitest run`).

## Current Parent

- Conversation ID: 6783987b-1cde-4c0a-8087-df980caf57b6
- Updated: 2026-08-11T05:17:30Z

## Task Summary

- **What to build**: Routing fixes for equipment, ipm, incidents, fallback; lens parameter propagation to Metric in Cockpit and Climate views; test configuration update for vitest; comprehensive integration tests.
- **Success criteria**: 100% tests passing, tsc --noEmit passing, all requirements satisfied genuinely.
- **Interface contracts**: PROJECT.md, AGENTS.md
- **Code layout**: src/App.tsx, src/AppIntegration.test.tsx, vite.config.ts

## Key Decisions Made

- Initial setup of worker briefing and dispatch.

## Artifact Index

- c:\Users\badbu\Documents\grow\.agents\worker_m4_it2\DISPATCH.md
- c:\Users\badbu\Documents\grow\.agents\worker_m4_it2\BRIEFING.md
- c:\Users\badbu\Documents\grow\.agents\worker_m4_it2\progress.md

## Change Tracker

- **Files modified**: TBD
- **Build status**: TBD
- **Pending issues**: TBD

## Quality Status

- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: TBD

## Loaded Skills

- None loaded explicitly.
