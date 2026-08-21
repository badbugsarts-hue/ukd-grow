## 2026-08-21T02:03:29Z

You are a Worker agent implementing Milestone 1: Data Models, Storage & State Engine for the UKD Grow Masterplan project.
Your Working Directory is: c:\Users\badbu\Documents\grow\.agents\worker_m1
Project Root: c:\Users\badbu\Documents\grow

Read:
- c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
- c:\Users\badbu\Documents\grow\AGENTS.md
- c:\Users\badbu\Documents\grow\PROJECT.md
- c:\Users\badbu\Documents\grow\.agents\spec_miner_autoflower\extracted_plant_data.json
- c:\Users\badbu\Documents\grow\.agents\spec_miner_autoflower\report.md
- c:\Users\badbu\Documents\grow\.agents\explorer_state_domain\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Update `src/data/autoflower-cockpit.json` with the canonical 61-strain dataset from `c:\Users\badbu\Documents\grow\.agents\spec_miner_autoflower\extracted_plant_data.json`.
2. Update `src/types.ts` to include:
   - `AutoflowerStrain` interface and any related types matching the 61-strain schema.
   - Ensure `RunConfig` and `EquipmentProfile` cleanly support `exhaustM3h?: number` (or in equipment profile) and verify `PotProfile` includes `emptyMassGrams?: number`, `saturatedMassGrams?: number`.
   - Plant milestone structures (`pottingDateIso?: string`, `emergenceDateIso?: string`).
3. In `src/run-state.ts`:
   - Implement `updateExecutionMode(run: RunPackage, mode: "simulation" | "live"): RunPackage` with audit event recording.
   - Implement `updatePlantMilestones(run: RunPackage, milestones: { pottingDateIso?: string; emergenceDateIso?: string }, reason?: string): RunPackage` to record `seed-planted` and `emergence` in `run.growthEvents`, update `run.plantIdentity.dayZeroAnchorDate`, and log append-only `AuditEvent` and `DomainEvent`.
   - Export these helper functions and ensure all reducers handle them cleanly.
4. Verify `src/domain.ts` and `src/live-run.ts`:
   - Ensure `calculateBiologicalPlantAge` and `evaluateLiveClock` operate smoothly with updated milestones and mode.
5. Create or update unit tests (e.g. in `src/run-state.test.ts` and/or `src/domain.test.ts`) to test:
   - `updateExecutionMode` toggling and audit event generation.
   - `updatePlantMilestones` retroactive potting & emergence date updates, event creation, and dynamic day calculation.
   - Autoflower dataset parsing and validation.
6. Run tests: `pnpm test` (or `npx vitest run`) and typecheck `pnpm typecheck` (or `npx tsc --noEmit`) to ensure 100% passing tests.
7. Write `c:\Users\badbu\Documents\grow\.agents\worker_m1\handoff.md` with:
   - Files modified
   - Build and test results
   - Summary of implemented functions
8. When complete, send a message to your parent orchestrator.
