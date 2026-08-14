## 2026-08-11T07:05:11Z

<USER_REQUEST>
You are Worker M4 for Milestone 4 (M4: App Shell Routing & State Integration).
Working directory: c:\Users\badbu\Documents\grow\.agents\worker_m4_1

Read:
1. c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
2. c:\Users\badbu\Documents\grow\PROJECT.md
3. c:\Users\badbu\Documents\grow\AGENTS.md
4. Explorer M4 blueprint:
   - `c:\Users\badbu\Documents\grow\.agents\explorer_m4_1\analysis.md`
   - `c:\Users\badbu\Documents\grow\.agents\explorer_m4_1\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
Implement Milestone 4:
1. Update `src/types.ts` if needed to include `"calc"` in `RouteId`.
2. Update `src/App.tsx`:
   - Import all 6 panels (`DailyOperatorPanel`, `NutrientMixPanel`, `RunConfigPanel`, `EnvironmentTargetsPanel`, `ContextHelpGlossaryPanel`, `VpdDliCalculatorPanel`) from `src/components/panels/`.
   - Wire all routes (`today`, `mix`, `setup`, `climate`, `knowledge`, `calc`) in `NAV` items, route headers, and main switch block.
   - Wire global experience lens toggle in topbar (`guided`, `advanced`, `expert`) with `LensBadge` and state persistence.
   - Pass `run`, `plan`, `lens`, `onUpdateRun`, `navigate` props to panels cleanly.
   - Preserve backup/restore modal, legal profile confirmation gate, disclaimer banner, and state storage.

Verification:
- Run `npx tsc --noEmit` and confirm exit code 0.
- Run `npx vitest run` and confirm all tests pass.
- Run `npx vite build` and confirm production build succeeds.

Write your implementation report to `c:\Users\badbu\Documents\grow\.agents\worker_m4_1\handoff.md`.
Send a message when completed with verification outputs and file paths.
</USER_REQUEST>
