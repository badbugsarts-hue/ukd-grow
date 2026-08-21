## 2026-08-11T05:16:36Z

You are Worker for Milestone 4 Iteration 2 (Remediation of App Shell Routing & Test Configuration).
Working directory: c:\Users\badbu\Documents\grow\.agents\worker_m4_it2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:

1. Create directory `c:\Users\badbu\Documents\grow\.agents\worker_m4_it2`.
2. Read `c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md`, `c:\Users\badbu\Documents\grow\PROJECT.md`, `c:\Users\badbu\Documents\grow\AGENTS.md`, and `c:\Users\badbu\Documents\grow\.agents\explorer_m4_it2\handoff.md`.
3. Apply the remediations specified in `.agents/explorer_m4_it2/handoff.md`:
   - Edit `vite.config.ts`: Change `include` pattern to `["src/**/*.test.ts", "src/**/*.test.tsx"]`.
   - Edit `src/App.tsx`:
     - Update `RouteContent`'s `switch(route)` to handle `equipment`, `ipm`, `incidents`, and add a default fallback case.
     - Pass `lens={lens}` to all `<Metric>` calls in `Cockpit` and `Climate` views.
   - Edit `src/AppIntegration.test.tsx`: Add test assertions for `equipment`, `ipm`, `incidents`, fallback routing, and active `lens` passing to `<Metric>`.
4. Run type checking (`npx tsc --noEmit`) and unit tests (`npx vitest run`). Verify 100% of tests pass across all test files (including `.tsx` test files).
5. Write handoff report in `c:\Users\badbu\Documents\grow\.agents\worker_m4_it2\handoff.md`.
6. Send a message to Parent (`6783987b-1cde-4c0a-8087-df980caf57b6`) with your report summary when complete.
