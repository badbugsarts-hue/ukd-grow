## 2026-08-11T07:00:38Z

You are an Explorer for Milestone 4 (M4: App Shell Routing & State Integration).
Working directory: c:\Users\badbu\Documents\grow\.agents\explorer_m4_1

Read:

1. c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
2. c:\Users\badbu\Documents\grow\PROJECT.md
3. c:\Users\badbu\Documents\grow\AGENTS.md
4. `src/App.tsx` and all components in `src/components/common/` and `src/components/panels/`.

Your objective:
Investigate and design the integration of all new Master Class interactive panels into `src/App.tsx`.
Ensure:

- Clear, seamless routing for tabs (`today`, `mix`, `setup`, `climate`, `knowledge`, `calc`).
- Header experience lens selector (`guided`, `advanced`, `expert`) with `LensBadge` and state persistence.
- Binding of `run: RunPackage` state and `onUpdateRun` state handler across all panels.
- Smooth navigation transitions via `navigate(route)`.
- Full preservation of backup/restore gates, legal disclaimers, and existing app shell components.
- Zero breakages of existing tests (`npx tsc --noEmit` and `npx vitest run`).

Write your detailed integration blueprint and component wiring plan to `c:\Users\badbu\Documents\grow\.agents\explorer_m4_1\analysis.md` and `handoff.md`.
Send a message when done with summary and file path.
