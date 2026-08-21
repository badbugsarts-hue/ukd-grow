# Handoff Report — Explorer State & Domain

## 1. Observation
- **RunPackage Schema**: In `src/run-state.ts` (lines 68–212), default packages are instantiated with schema version `"6.0.0"`, `executionMode: "simulation"`, `status: "draft"`, and initial plant identity.
- **Storage Layer**: In `src/run-storage.ts` (lines 265–373), persistence targets IndexedDB `ukd-operator-workspace` v8 across `run-packages-v3`, `workspace-meta` (`active-run-id`), and `sync-outbox-v1`. Writes are debounced (250ms) in `App.tsx:804`.
- **Live Clock**: In `src/live-run.ts` (lines 13–68), `evaluateLiveClock(run, now)` computes the live operational day strictly as elapsed UTC days (`Math.floor((nowMs - anchorMs) / 86_400_000)`), guarded against clock rollbacks (>5 min tolerance).
- **Biological Age**: In `src/domain.ts` (lines 313–379), `calculateBiologicalPlantAge(dayZeroAnchor, growthEvents, now)` extracts anchor events (e.g. `emergence` or `seed-planted`) to calculate `biologicalAgeDays` vs. `operationalAgeDays`.
- **Current Setup View**: In `src/components/panels/RunConfigPanel.tsx` (lines 1–865), setup configuration covers 5 readiness categories, with plant identity opened via a modal (`PlantIdentityModal.tsx`), but potting date and emergence date are not yet directly displayed and editable on the setup panel surface.
- **Test Integrity**: Test verification (`npx vitest run`) confirms 386/386 passing tests across 36 test files, with all 18 core domain calculation tests in `src/domain.test.ts` passing.

## 2. Logic Chain
1. **Separation of Execution Modes**: `executionMode` in `RunPackage` cleanly separates simulation (arbitrary temporal scrubbing, what-if explorations) from live mode (real-world UTC progression from day zero). Toggling between these modes must be exposed globally (topbar / command center) and persisted to IndexedDB without destroying existing anchors.
2. **Plant Milestone Dynamics**: Potting (`seed-planted`) and Emergence (`emergence` / Day Zero) represent distinct horticultural milestones. Storing both in `run.growthEvents` allows computing germination duration (`emergence - potting`) and establishing biological Day Zero.
3. **Dynamic Cascading Recalculation**: When a user retroactively adjusts either milestone date in the Setup view, the biological age recalculates immediately. In live mode, this shifts the computed `currentDay`. Because `App.tsx` feeds `day` into `getDayPlan(workbook, day)`, all downstream views (`Cockpit`, `Today`, `MixLab`, `Climate`, `Timeline`, `EnvironmentTargetsPanel`) automatically display the correct recalculated targets and nutrient dosages without mutating the immutable canonical v8 XLSX reference sheet.
4. **Append-Only Audit**: In accordance with AGENTS.md Invariant 18, modifying milestones in an active run produces append-only `AuditEvent` and `DomainEvent` entries, preserving configuration lineage without mutating locked historical snapshots.

## 3. Caveats
- The canonical Daily Master sheet (`02_Daily_Master`) remains an immutable 81-day trajectory (days 0–80). Botanical days prior to Day Zero (e.g. germination days -4 to 0) are represented as pre-emergence / germination phase, while Day 0 aligns with emergence.
- Hardware sensor integration and backend remote sync remain mocked/offline in alignment with `capability-roadmap.json`.

## 4. Conclusion
The recommended implementation strategy is documented in detail in `report.md`:
1. Implement `updatePlantMilestones()` in `src/run-state.ts` to manage retroactive potting and emergence dates with append-only audit tracking.
2. Add a global, accessible Live/Simulation segmented toggle switch to the Topbar / Command Center with instant IndexedDB persistence.
3. Expose direct Potting and Emergence date pickers along with live derived age/phase metrics on `RunConfigPanel.tsx`.
4. Connect Autoflower Cockpit strain selection directly into the Setup configuration flow.

## 5. Verification Method
- **Unit & Domain Tests**: Run `npx vitest run src/domain.test.ts` to confirm 100% passing rate.
- **Full Test Suite**: Run `npx vitest run` to verify that all 386 tests across all 36 test suites pass.
- **TypeScript Typecheck**: Run `npx tsc --noEmit` to verify type safety.
