## 2026-08-11T01:35:26Z

You are Worker for Milestone 2 Iteration 2 (Remediation of Fail-Closed Dose & Stacking Rules).
Working directory: c:\Users\badbu\Documents\grow\.agents\worker_m2_it2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:

1. Create directory `c:\Users\badbu\Documents\grow\.agents\worker_m2_it2`.
2. Read `c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md`, `c:\Users\badbu\Documents\grow\PROJECT.md`, `c:\Users\badbu\Documents\grow\AGENTS.md`, and `c:\Users\badbu\Documents\grow\.agents\explorer_m2_it2\handoff.md`.
3. Implement the fixes in `src/components/panels/NutrientMixPanel.tsx` and update `src/components/panels/panels.test.ts` according to the exact specifications in `.agents/explorer_m2_it2/handoff.md`:
   - When `isWaterProfileIncomplete` is `true`, override all dose items in `mixItems` to `0.0` (ml/L and total ml) and display status `⛔ Gesperrt: Wasserprofil fehlt`.
   - When `stackingBoosterConflict` is `true`, override PK 13/14 dose items in `mixItems` to `0.0` (ml/L and total ml) and display status `⛔ GESPERRT: Stacking-Konflikt`.
   - Add unit tests in `panels.test.ts` verifying zeroed doses and fail-closed statuses under both conditions.
4. Run type checking (`npx tsc --noEmit`) and unit tests (`npx vitest run`). Ensure all test suites pass 100%.
5. Write your handoff report in `c:\Users\badbu\Documents\grow\.agents\worker_m2_it2\handoff.md`.
6. Send a message to Parent (`6783987b-1cde-4c0a-8087-df980caf57b6`) with your report summary when complete.
