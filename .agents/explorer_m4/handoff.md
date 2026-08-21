# Hard Handoff Report — Milestone 4 Technical Analysis

**Agent:** Explorer M4 (`teamwork_preview_explorer`)  
**Task:** Technical Specification for Milestone 4 (Pot Weight Dryback Tracking Widget & App Shell Routing Integration)  
**Date:** 2026-08-14

---

## 1. Observation

1. **Gravimetric Domain Calculations**:
   - `src/domain.ts:389-432`: `calculateSubstrateHydration(currentMassGrams, potProfile)` calculates `hydrationPercent`, `depletionPercent`, `availableWaterGrams`, and categorizes into 5 hydration states (`dry` <20%, `light` 20-39%, `medium` 40-69%, `heavy` 70-89%, `saturated` $\ge 90\%$).
   - Fallback formula for missing saturated mass: `emptyMass + fillVolumeLiters * 750` g.
2. **Data Model**:
   - `src/types.ts:213-221`: `PotProfile` contains `type`, `nominalVolumeLiters`, `actualFillLiters`, `diameterCm`, `heightCm`, `emptyMassGrams` (TARA), `saturatedMassGrams` (100% Saturation).
   - `src/types.ts:660-677`: `ObservationValues` contains `potMassGrams: number | null`.
   - `src/types.ts:640-658`: `RunConfig` contains `pot: PotProfile`.
3. **State Management & Audit Invariants**:
   - `src/run-state.ts:43`: Measurement mapping `{ key: "potMassGrams", metric: "pot.mass", unit: "g" }` is already configured in `measurementMap`.
   - Pure state transition `updatePotProfile` is currently missing in `src/run-state.ts` and must be added to support updating pot calibration parameters immutably with audit log tracking.
4. **App Shell Routing & Modals**:
   - `src/App.tsx:284-290`: `NAV` contains route `#equipment` ("Equipment & Wartung").
   - `src/App.tsx:1332-1340`: `WorkspaceRoute` renders `EquipmentManagerPanel`.
   - `EquipmentManagerPanel.tsx:281-304`: Modals `PpfdMappingModal` and `SensorCalibrationModal` are wired and trigger `onUpdateRun(updatedRun)`.
   - `RunConfigPanel.tsx:851-860`: `PlantIdentityModal` is wired and triggers `onUpdateRun(updatedRun)`.
5. **Quality Gates & Tests**:
   - Running `npx vitest run` yields 289 passing tests across 23 test suites.
   - `npx tsc --noEmit` and `npx vite build` execute cleanly with exit code 0.

---

## 2. Logic Chain

1. **From Observation 1 & 2 to UI Specification**:
   - Because `calculateSubstrateHydration` accepts `potProfile` and `currentMassGrams`, `DailyOperatorPanel.tsx` can reactively calculate and display live substrate hydration, dryback depletion %, and remaining water in grams whenever `potMassGrams` or profile inputs change.
   - 5 color zones (`var(--red)`, `var(--amber)`, `var(--green)`, `var(--cyan)`, `var(--purple)`) directly mirror the 5 categories (`dry`, `light`, `medium`, `heavy`, `saturated`) to provide clear visual feedback and actionable German watering advice (`Gieß-Empfehlung`).
2. **From Observation 3 to State Transition Specification**:
   - In accordance with `AGENTS.md` invariants (immutable run snapshots, append-only audit events), updating pot parameters must not mutate active snapshots.
   - `updatePotProfile(run, pot)` in `src/run-state.ts` clones the package, updates `run.config.pot`, and appends an `AuditEvent` (`action: "configuration-changed"`, `entityType: "pot-profile"`), preserving `run.configurationSnapshot`.
3. **From Observation 4 to Route & Overlay Wiring**:
   - `#equipment` route is functional in `src/App.tsx`.
   - Modals in `EquipmentManagerPanel.tsx` and `RunConfigPanel.tsx` dispatch updated immutable `RunPackage` snapshots to `onUpdateRun`, ensuring zero-mutation persistence.

---

## 3. Caveats

1. **Historical Dryback Rate**: Calculation of hourly dryback rate (`g/h`) requires at least two time-stamped pot mass measurements with $\Delta t \ge 0.25$ h. For initial runs with a single observation, the rate should gracefully display as pending / N/A without throwing errors.
2. **Zero/Negative Mass Protection**: Users might enter an invalid pot mass lower than the empty tare weight. `calculateSubstrateHydration` clamps `currentWaterGrams` to $\ge 0$ and `hydrationPercent` to $[0, 100]$, preventing negative percentages or divisions by zero.

---

## 4. Conclusion

The technical specification for Milestone 4 is fully detailed and ready for implementation by Worker M4. The specification covers:

- Complete gravimetric calculation integration with `calculateSubstrateHydration`.
- 2026 Master Class UI/UX widget design for `DailyOperatorPanel.tsx` (TARA, 100% Saturation, current mass input, color-banded progress bar, dynamic German watering recommendations).
- `updatePotProfile` state transition function with audit lineage in `src/run-state.ts`.
- App shell route verification for `#equipment` and modal overlay wiring.
- Detailed test suite specification for `src/components/panels/pot-weight-dryback.test.tsx`.

---

## 5. Verification Method

To verify the findings and technical readiness:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
2. **Unit Test Suite**:
   ```bash
   npx vitest run
   ```
3. **Production Build**:
   ```bash
   npx vite build
   ```
4. **Inspect Analysis Artifacts**:
   - `c:\Users\badbu\Documents\grow\.agents\explorer_m4\analysis_m4.md`
   - `c:\Users\badbu\Documents\grow\.agents\explorer_m4\handoff.md`
