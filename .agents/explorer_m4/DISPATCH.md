## 2026-08-11T06:58:34Z
You are Explorer for Milestone 4 (App Shell Routing & State Integration in `App.tsx`).
Working directory: c:\Users\badbu\Documents\grow\.agents\explorer_m4

Your task:
1. Create directory `c:\Users\badbu\Documents\grow\.agents\explorer_m4`.
2. Read `c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md`, `c:\Users\badbu\Documents\grow\PROJECT.md`, `c:\Users\badbu\Documents\grow\AGENTS.md`, `src/App.tsx`, and all components in `src/components/common/` and `src/components/panels/`.
3. Analyze `src/App.tsx` navigation structure (`NAV` array), active route handlers (`route`), experience lens state (`lens`), and state callbacks (`saveActiveRun`).
4. Define exact blueprint for integrating:
   - `EnvironmentTargetsPanel` into route `climate`
   - `NutrientMixPanel` into route `mix`
   - `RunConfigPanel` into route `setup`
   - `DailyOperatorPanel` into route `today`
   - `ContextHelpGlossaryPanel` into route `knowledge`
   - `VpdDliCalculatorPanel` integrated in `climate` or `cockpit` quick action
   - `TermTooltip` and `LensBadge` in shell header/sidebar
5. Define integration test specifications in `src/AppIntegration.test.tsx` verifying component routing and `onUpdateRun` callback triggering without mutating domain logic.
6. Write handoff report in `c:\Users\badbu\Documents\grow\.agents\explorer_m4\handoff.md`.
7. Send a message to Parent (`6783987b-1cde-4c0a-8087-df980caf57b6`) with your report summary when complete.
