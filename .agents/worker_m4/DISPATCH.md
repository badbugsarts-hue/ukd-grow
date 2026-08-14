## 2026-08-11T05:02:37Z
You are Worker for Milestone 4 (App Shell Routing & State Integration in `App.tsx`).
Working directory: c:\Users\badbu\Documents\grow\.agents\worker_m4

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Create directory `c:\Users\badbu\Documents\grow\.agents\worker_m4`.
2. Read `c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md`, `c:\Users\badbu\Documents\grow\PROJECT.md`, `c:\Users\badbu\Documents\grow\AGENTS.md`, and `c:\Users\badbu\Documents\grow\.agents\explorer_m4\handoff.md`.
3. Integrate the Master Class components into `src/App.tsx` following the blueprint in `.agents/explorer_m4/handoff.md`:
   - Import `TermTooltip`, `LensBadge`, `MetricGauge` from `./components/common`
   - Import `EnvironmentTargetsPanel`, `NutrientMixPanel`, `RunConfigPanel`, `VpdDliCalculatorPanel`, `DailyOperatorPanel`, `ContextHelpGlossaryPanel` from `./components/panels`
   - Route `today` -> `DailyOperatorPanel`
   - Route `mix` -> `NutrientMixPanel`
   - Route `setup` -> `RunConfigPanel`
   - Route `climate` -> `EnvironmentTargetsPanel` and `VpdDliCalculatorPanel`
   - Route `knowledge` -> `ContextHelpGlossaryPanel`
   - Integrate `LensBadge` and `TermTooltip` into shell header and navigation controls.
   - Pass props cleanly (`run`, `plan`, `lens`, `onUpdateRun={setRun}`, `navigate={setRoute}`).
4. Create `src/AppIntegration.test.tsx` containing comprehensive unit/integration tests asserting component rendering per route, state update triggers via `onUpdateRun`, and zero-mutation of domain state.
5. Run type checking (`npx tsc --noEmit`) and unit tests (`npx vitest run`).
6. Write your handoff report in `c:\Users\badbu\Documents\grow\.agents\worker_m4\handoff.md`.
7. Send a message to Parent (`6783987b-1cde-4c0a-8087-df980caf57b6`) with your report summary when complete.
