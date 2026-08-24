## 2026-08-21T02:36:19Z

You are a Worker agent implementing Milestone 4: App Shell Global Integration, Dynamic Plan Recalculation & Testing Gate for the UKD Grow Masterplan project.
Your Working Directory is: c:\Users\badbu\Documents\grow\.agents\worker_m4
Project Root: c:\Users\badbu\Documents\grow

Read:

- c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
- c:\Users\badbu\Documents\grow\AGENTS.md
- c:\Users\badbu\Documents\grow\PROJECT.md
- src/App.tsx
- src/run-state.ts
- src/live-run.ts
- src/domain.ts
- src/components/panels/AutoflowerCockpitPanel.tsx
- src/components/panels/RunConfigPanel.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Boundaries:
You EXCLUSIVELY own:

- `src/App.tsx`
- Any related App tests (e.g. `src/App.test.tsx`, `tests/e2e/`, etc.)

Your Tasks:

1. Integrate the Global Live vs. Simulation Mode Switch & Indicator in `src/App.tsx`:
   - Add a prominent, styled segmented switch or toggle button in the App Topbar / Header (visible across all views).
   - Shows current mode:
     - Live Mode: Emerald indicator dot, "LIVE: Tag X (UTC)" with computed active day from `evaluateLiveClock(run, now)` / `emergenceDateIso`.
     - Simulation Mode: Blue/Amber indicator, "SIMULATION: Tag X" with interactive day slider/scrubber.
   - Clicking/switching toggles `run.executionMode` using `updateExecutionMode(run, newMode)` and updates state via `setRun(...)` (which auto-persists to IndexedDB).
2. Wire up the Autoflower Cockpit in `src/App.tsx`:
   - When route is `"autoflower"`, render `<AutoflowerCockpitPanel lens={lens} onSelectStrain={(strain) => { ... }} />`.
   - When a strain is selected from the cockpit page, update `run.config.genetics` and `run.plants[0].identity` (breeder, strain name, cycle weeks) via `setRun(...)` and navigate to `"setup"` or show confirmation toast/badge.
3. Ensure Dynamic Plan Recalculation:
   - In Live Mode, ensure `currentDay` is driven by the live clock / plant milestones (`emergenceDateIso` or `pottingDateIso`), dynamically updating `activeDay`, `dayPlan = getDayPlan(workbook, calculatedDay)`, and passing the correct day targets to all views (`Dashboard`, `Today`, `MixLab`, `Climate`, `Timeline`, `Targets`).
4. Full Test & Quality Gate:
   - Run `npx vitest run` and ensure 100% of tests pass across the entire workspace.
   - Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
   - Run `npx vite build` and ensure production build succeeds cleanly.
   - Run `npx @biomejs/biome check src` and ensure clean linting.
5. Write `c:\Users\badbu\Documents\grow\.agents\worker_m4\handoff.md` with verification commands and results, then notify parent.
