# Plan: UKD App UI Master Class Project

## Objective
Implement new interactive Input-Panels and "Master Class" UI elements for the UKD App based on design concepts in `.antigravitz`. Ensure 2026 World Elite design, excellent German terminology with tooltips/inline explanations for all experience levels, seamless integration in `App.tsx`, clean `src/components/` structure, and full compliance with `styles.css` CSS tokens and `AGENTS.md` rules.

## Execution Stages

### Stage 0: Survey & Discovery (Phase 0)
- Dispatch 3 parallel Explorers to investigate:
  1. Explorer 1: Inspect `.antigravitz` design concepts, mockups, asset files, and UI specifications.
  2. Explorer 2: Inspect existing `App.tsx`, `src/` directory structure, navigation, state flow, and existing UI patterns.
  3. Explorer 3: Inspect `src/styles.css` CSS tokens, `src/domain.ts`, `src/run-state.ts`, `AGENTS.md`, and test setup (`vitest`).

### Stage 1: Roadmap & Decomposition
- Synthesize survey findings into `PROJECT.md`.
- Establish Feature Inventory, Component Architecture, Interface Contracts, and Milestones.
- Establish E2E Test Infra plan (`TEST_INFRA.md`).

### Stage 2: Dual-Track Execution
- Implementation Track: Execute implementation milestones via subagents (Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate).
- E2E Testing Track: Build/verify requirement-driven test cases (Tiers 1-4).

### Stage 3: Verification & Hardening
- Run full gate checks (`npx tsc --noEmit`, `npx vitest run`, `npx vite build`).
- Hardening via Tier 5 white-box adversarial testing.
- Forensic Integrity Audit (`teamwork_preview_auditor`).

### Stage 4: Completion & Reporting
- Final handoff report to Parent.
