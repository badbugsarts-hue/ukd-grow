# Handoff Report: In-Place Editing & Prediction Engine

**Agent**: explorer_2 (In-Place Editing & Prediction Engine Explorer)
**Recipient**: Parent Orchestrator / Worker Agent
**Date**: 2026-08-22
**Handoff Type**: Hard (Investigation Complete)

---

## 1. Observation

1. **Static Cockpit Display**:
   - `src/App.tsx:2039-2088`: The 6 primary metric cards (PPFD, DLI, Klima, Leaf-VPD, EC, pH) are rendered via static `<Metric />` components without any click-to-edit or inline logging handlers.
   - `src/App.tsx:2016-2038`: The `run-strip` displays `config.genetics`, `phase`, and `goal` as static strings, forcing users into `RunConfigPanel` (`setup`) for edits.
2. **Minimal Prediction Engine**:
   - `src/prediction-engine.ts:11-50`: Only contains `predictGeneticsMetadata`, which performs a basic exact/fuzzy string match against `autoflowerData`.
   - `src/prediction-engine.ts:52-61`: `predictEmergenceDate` simply adds 3 calendar days to `pottingDate`. No climate, DLI, VPD, nutrient, or water volume prediction capabilities exist.
3. **State Mutation APIs Available in Domain**:
   - `src/run-state.ts:242-284`: `addObservation(run, observation)` cleanly appends typed measurements, audit events (`measurement-recorded`), and domain events without mutating canonical workbook sheets.
   - `src/run-state.ts:1160-1200`: `addRunOverride(run, override)` appends audit-guarded overrides for active runs without modifying immutable configuration snapshots (`run.configurationSnapshot`).
   - `src/domain.ts:98-116`: Contains canonical calculation formulas for `calculateDli` and `calculateLeafVpd`.
4. **Test Suite Baseline**:
   - Running `npm test` (`vitest run`) executes 41 test files: 37 test files pass (478 tests passed), confirming core domain logic and data integrity are stable.

---

## 2. Logic Chain

1. **Step 1 (Observation 1 -> Interaction Friction)**:
   Because the Cockpit displays metrics as read-only cards, growers must leave their primary dashboard view and navigate into `DailyOperatorPanel` or `RunConfigPanel` for routine entries (logging climate, adjusting genetics, or updating pot mass). This induces cognitive friction and navigation overhead (4–6 clicks per action).
2. **Step 2 (Observation 2 -> Need for Expanded Prediction Engine)**:
   Without real-time target corridors and auto-completion, manual inputs are error-prone and lack biological safety feedback. Expanding `prediction-engine.ts` to calculate instant VPD, DLI, target corridors, and strain suggestions enables instantaneous in-memory suggestions (<5ms latency) directly inside input fields.
3. **Step 3 (Observations 1 & 3 -> Non-Destructive In-Place Architecture)**:
   By wrapping Cockpit metric cards in an `InlineMetricCard` / `InlineEditable` component that calls `addObservation`, daily measurements can be recorded in-place. This fulfills the invariant that measurements take precedence over calendar targets while keeping the canonical plan (`02_Daily_Master`) read-only.
4. **Step 4 (Observation 3 -> Audit & Snapshot Safety)**:
   When an in-place edit targets an active run's configuration, triggering `addRunOverride` with a mandatory reason ensures that `run.configurationSnapshot` remains strictly immutable, upholding `AGENTS.md` Rule 18.

---

## 3. Caveats

1. **No Live Sensor WebSocket**: Live sensor streaming (MQTT/Home Assistant) is not yet implemented according to `capability-roadmap.json`. All in-place edits represent manual grower entries or calibrated spot measurements.
2. **Pre-existing Integration Test Mismatches**: 4 test files had minor legacy assertion discrepancies (e.g. `Double Grape` vs `Double Grape Auto` test mock naming in `AppM4Integration.test.tsx`). These are separate from the prediction engine and should be maintained by the remediation worker.
3. **Modal Workspaces Preserved**: Full workspaces (`RunConfigPanel`, `DailyOperatorPanel`, `AutoflowerCockpitPanel`) remain accessible as deep-dive views; in-place editing acts as a rapid shortcut, not a complete replacement.

---

## 4. Conclusion

In-place editing with AJAX-like predictive assistance is technically feasible, architecturally sound, and brings immediate ergonomic gains to the UKD Grow dashboard.

**Core Recommendations for Worker Implementers**:

1. Extend `src/prediction-engine.ts` with 4 core modules: Genetics fuzzy search, Environmental corridor prediction, Physical VPD/DLI calculations, and the unified `getLiveFieldSuggestions` hook.
2. Create `src/components/common/InlineEditable.tsx` and `InlineMetricCard.tsx` with full keyboard navigation (Enter/Esc/Arrows/Tab), ARIA accessibility, and 44px mobile touch targets.
3. Connect Cockpit metric cards (`src/App.tsx`) to `InlineMetricCard` with `addObservation` dispatching.
4. Add live strain fuzzy auto-completion to the Run Strip and Run Config genetics inputs.

---

## 5. Verification Method

To independently verify this investigation and validate downstream implementations:

1. **Source Inspection**:
   - Inspect `src/prediction-engine.ts` and `src/App.tsx:1990-2165` to confirm current static displays and predictor boundaries.
   - Inspect `.agents/explorer_2/analysis.md` for the detailed component specification and matrix.
2. **Unit Test Command**:
   - Run `npm test -- src/domain.test.ts` to verify domain calculation integrity.
   - Run `npm test -- src/components/panels/panels.test.ts` to verify panel rendering.
3. **Invalidation Conditions**:
   - If an in-place edit mutates `run.configurationSnapshot` directly on an active run without creating an override audit event, the invariant is invalidated.
   - If in-place inputs do not provide keyboard Escape/Enter or violate 44px mobile touch targets, the accessibility requirement is invalidated.
