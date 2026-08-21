# Hard Handoff Report — Explorer M3: Plant Identity Modal & Biology Engine Specification

## 1. Observation

1. **Original User Request & Requirements**:
   - `ORIGINAL_REQUEST.md`, line 49-51: "Implementiere ein 'Plant Identity Modal', in dem Züchter (Breeder), Seed-Lot und Phenotyp von der einfachen Genetik getrennt werden. Verknüpfe dies mit einer echten Definition des Zeitankers (Day Zero: z. B. Seed planted vs. Emergence), damit die App nicht mehr standardmäßig 'defaultPlantIdentity' generiert."
   - `ORIGINAL_REQUEST.md`, line 60: "Das Plant Identity Modal speichert beim Start einen konkreten Zeitanker ab, anstatt 'Day 0' hart zu kodieren."

2. **Domain Engine Capabilities (`src/domain.ts`)**:
   - `src/domain.ts`, lines 313-379: `calculateBiologicalPlantAge` is already implemented and exported. It takes `dayZeroAnchor: DayZeroAnchor`, `growthEvents: GrowthEvent[]`, and optional `now?: Date`, returning `{ biologicalAgeDays: number, operationalAgeDays: number, anchorDateString: string }`.
   - Supports 5 `DayZeroAnchor` values: `"seed-started"`, `"seed-planted"`, `"emergence"`, `"first-true-leaves"`, `"run-operational-start"`.

3. **Data Model Contracts (`src/types.ts`)**:
   - `src/types.ts`, lines 224-231: `PlantIdentity` interface contains `breeder: string | null`, `seedType: "regular" | "feminized" | "autoflower" | "clone" | "unknown"`, `seedLot: string | null`, `packBatch: string | null`, `sourceDate: string | null`, `phenotypeNotes: string`.
   - `src/types.ts`, lines 234-266: `DayZeroAnchor` and `GrowthEvent` interfaces are fully defined.
   - `src/types.ts`, lines 639-659: `RunConfig` contains `genetics: string` and `dayZeroAnchor: DayZeroAnchor`.

4. **Existing Panels (`src/components/panels/`)**:
   - `RunConfigPanel.tsx` (lines 342-444): Category 1 currently captures `config.name`, `config.genetics`, `config.medium`, and `config.pot.nominalVolumeLiters`, but lacks a trigger to manage detailed `PlantIdentity` or `dayZeroAnchor`.
   - `DailyOperatorPanel.tsx` (lines 640-662): Header displays operational day (`Tag {selectedDay} / 80 — {targets.phaseName}`) but does not yet present the biological plant age computed by `calculateBiologicalPlantAge`.

5. **Existing Modal Architecture (`src/components/modals/`)**:
   - `PpfdMappingModal.tsx` and `SensorCalibrationModal.tsx` establish the standard pattern: overlay backdrop (`palette-backdrop`), palette container (`command-palette`), German terminology with `TermTooltip`, 44px min touch targets, and `onClose` / `onSave` callbacks.

---

## 2. Logic Chain

1. **Decoupling Genetics from Identity Details**:
   - _Observation_: `RunConfig` stores generic `genetics` (e.g. "Double Grape Auto"), but `PlantIdentity` stores granular lineage (`breeder`, `seedLot`, `packBatch`, `seedType`, `phenotypeNotes`).
   - _Reasoning_: `PlantIdentityModal.tsx` must provide controlled inputs for each of these fields, allowing growers to record exact batch and breeder metadata without altering the core `genetics` label.

2. **Day Zero Time Anchor Math Integration**:
   - _Observation_: `src/domain.ts` provides `calculateBiologicalPlantAge(dayZeroAnchor, growthEvents, now)`.
   - _Reasoning_: As the user selects a `dayZeroAnchor` (e.g. `emergence`) and enters an `anchorDate` (e.g. `2026-08-01`), `PlantIdentityModal` creates a candidate `GrowthEvent` and invokes `calculateBiologicalPlantAge` in real time, presenting a live math summary card showing `biologicalAgeDays` vs. `operationalAgeDays`.

3. **Immutable State & Audit Event Flow**:
   - _Observation_: `AGENTS.md` Invariant 62 states: "Aktive Run-Snapshots nicht mutieren; Korrekturen und Overrides ausschließlich append-only mit Grund und AuditEvent speichern."
   - _Reasoning_: Upon saving, `updatePlantIdentity` creates a new `RunPackage` snapshot, updating `run.plants[0].identity`, `run.config.dayZeroAnchor`, creating/updating a `GrowthEvent` in `run.growthEvents`, and appending an `AuditEvent` (`action: "configuration-changed"`, `entityType: "plant-identity"`).

4. **Panel Integration**:
   - _Observation_: `RunConfigPanel.tsx` needs a summary trigger box, and `DailyOperatorPanel.tsx` needs a dual age badge.
   - _Reasoning_: Integrating `PlantIdentityModal` into `RunConfigPanel.tsx` allows setup configuration, while updating `DailyOperatorPanel.tsx` provides immediate operator visibility into biological vs. operational progress.

---

## 3. Caveats

- **Multi-Plant Runs**: `RunPackage.plants` is an array. Currently default runs contain 1 primary plant (`run.plants[0]`). The update logic will sync `identity` and `genetics` across all plants in `run.plants`, ensuring consistency.
- **Future Anchors**: If a user selects an anchor date in the future, `calculateBiologicalPlantAge` safely returns `0` days due to `Math.max(0, ...)` protection in `src/domain.ts`. The UI will display a helpful validation notice in German.
- **No Source Code Changes Executed**: As an Explorer agent, zero source files outside of `.agents/explorer_m3/` were modified. Implementation will be performed by `worker_m3`.

---

## 4. Conclusion

The specification for `PlantIdentityModal.tsx` and its integration into `RunConfigPanel.tsx`, `DailyOperatorPanel.tsx`, and `src/run-state.ts` is fully detailed in `.agents/explorer_m3/analysis_m3.md`. The implementation plan is clear, adheres to all repository invariants, uses existing domain math, and provides comprehensive unit test coverage strategy.

---

## 5. Verification Method

To verify the investigation and specifications:

1. **Inspect Analysis Artifacts**:
   - View `c:\Users\badbu\Documents\grow\.agents\explorer_m3\analysis_m3.md` for full technical specifications.
   - View `c:\Users\badbu\Documents\grow\.agents\explorer_m3\handoff.md` for handoff summary.

2. **Verify Existing Domain Math**:
   - Run `npx vitest run src/domain.test.ts` to confirm `calculateBiologicalPlantAge` unit test suite passes.

3. **Invalidation Conditions**:
   - Changes to `PlantIdentity` interface in `src/types.ts`.
   - Modifying `calculateBiologicalPlantAge` contract signature in `src/domain.ts`.
