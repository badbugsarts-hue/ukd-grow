## 2026-08-11T05:12:30Z
You are Explorer for Milestone 4 Iteration 2 (Remediation of App Shell Routing & Test Configuration).
Working directory: c:\Users\badbu\Documents\grow\.agents\explorer_m4_it2

Your task:
1. Create directory `c:\Users\badbu\Documents\grow\.agents\explorer_m4_it2`.
2. Read `c:\Users\badbu\Documents\grow\.agents\reviewer_m4_1\handoff.md`, `src/App.tsx`, `vite.config.ts`, and `src/AppIntegration.test.tsx`.
3. Define exact specifications for:
   - `vite.config.ts`: Update `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]` so that `.tsx` test files are executed by `npx vitest run`.
   - `src/App.tsx`:
     - Update `RouteContent`'s `switch(route)` statement to explicitly handle `equipment`, `ipm`, `incidents`, and add a default fallback case rendering a clean view.
     - Pass `lens={lens}` to all `<Metric>` invocations in `Cockpit` and `Climate` views so metric tooltips reflect the active experience lens.
   - `src/AppIntegration.test.tsx` (or `AppIntegration.test.ts`): Ensure test file is included in Vitest test execution and tests full route navigation, `onUpdateRun` callback triggering, `readRoute()`, and active lens tooltip resolution.
4. Write handoff report in `c:\Users\badbu\Documents\grow\.agents\explorer_m4_it2\handoff.md`.
5. Send a message to Parent (`6783987b-1cde-4c0a-8087-df980caf57b6`) with report summary when complete.
