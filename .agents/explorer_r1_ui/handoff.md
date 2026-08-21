# Handoff Report — UI Component Architecture & Design Blueprint (explorer_r1_ui)

## 1. Observation

Direct inspection of the codebase, design specifications, and domain state models yielded the following specific observations:

1. **Navigation and Route Handling (`src/App.tsx`)**:
   - `NAV` items array defines route `equipment` at line 286 (`id: "equipment"`, `label: "Equipment & Wartung"`).
   - In `RouteContent` (`src/App.tsx`, lines 1300–1308), the `equipment` case currently renders a fallback stub panel:
     ```tsx
     case "equipment":
         return (
             <Panel title="Equipment & Wartung" kicker="GERÄTE & KALIBRIERUNG">
                 <p className="description">{HELP.equipment.what}</p>
                 <div className="callout note" style={{ marginTop: "1rem" }}>
                     <strong>Hinweis:</strong> {HELP.equipment.interpret}
                 </div>
             </Panel>
         );
     ```
   - Overlay and Modal handling patterns in `App.tsx` (lines 586–618, 808–818) utilize state flags (`helpOpen`, `paletteOpen`, `showWelcome`), backdrop buttons (`.nav-backdrop`), `returnFocusRef` for focus restoration, and global keyboard shortcuts (Escape key, Ctrl+K, ?).

2. **Domain Models & Type Definitions (`src/types.ts` & `src/run-state.ts`)**:
   - `LightProfile` and 9-point PPFD Mapping (`src/types.ts`, lines 268–310):
     `PpfdMapPosition` defines 9 cardinal grid points: `"NW" | "N" | "NE" | "W" | "C" | "E" | "SW" | "S" | "SE"`.
     `PpfdMap` contains `dimmerPercent`, `powerWatts`, `fixtureHeightCm`, `points: PpfdMapPoint[]`, `mean`, `min`, `max`, `uniformity`, `measurementDevice`, and `measuredAt`.
   - Sensor Calibration & Trust Status (`src/types.ts`, lines 155–163, 767–778):
     `MeasurementTrustStatus` supports values: `"valid" | "stale" | "unverified" | "calibration-due" | "outlier" | "conflicting" | "missing" | "suspect"`.
     `CalibrationRecord` contains `id`, `deviceId`, `metric`, `performedAt`, `validUntil`, `method`, `referenceStandard`, `uncertainty`, `unit`, `result`.
   - Plant Identity & Day Zero Anchor (`src/types.ts`, lines 224–240, `src/run-state.ts`, lines 70–97):
     `PlantIdentity` contains `breeder`, `seedType`, `seedLot`, `packBatch`, `sourceDate`, `phenotypeNotes`.
     `DayZeroAnchor` contains `"seed-started" | "seed-planted" | "emergence" | "first-true-leaves" | "run-operational-start"`.
   - Pot Profile & Weight Metrics (`src/types.ts`, lines 213–222, 660–677):
     `PotProfile` contains `type`, `nominalVolumeLiters`, `actualFillLiters`, `diameterCm`, `heightCm`, `emptyMassGrams`, `saturatedMassGrams`.
     `DailyObservation.values` stores `potMassGrams`.

3. **Design System & CSS Tokens (`src/styles.css`)**:
   - Theme variables defined in `@layer tokens` (lines 33–100):
     `--bg: #07110f;`, `--surface-0: #0b1715;`, `--surface-1: #101e1b;`, `--surface-2: #152521;`, `--surface-3: #1c2d29;`, `--line: #29403a;`, `--text: #eef6f2;`, `--muted: #82958e;`, `--green: #67d6ae;`, `--blue: #62a8ff;`, `--amber: #e5a44b;`, `--red: #ef705c;`.
   - Sensor status tokens (lines 71–75): `--equip-online`, `--equip-degraded`, `--equip-offline`, `--equip-unknown`.
   - Touch accessibility standards: minimum touch target 44px (`min-height: 44px` / button paddings), keyboard focus ring (`:focus-visible` with 2px solid `var(--green)`).

4. **Existing Panels (`src/components/panels/`)**:
   - `RunConfigPanel.tsx` (lines 21–103) computes a 5-category Readiness Score but lacks dedicated sub-modals for Plant Identity, Equipment, and Sensor Calibration.
   - `DailyOperatorPanel.tsx` (lines 283–374) captures daily observations but currently relies on manual inputs for pot mass without visual dryback gauges or watering threshold triggers.

---

## 2. Logic Chain

From the observations above, the logical progression for designing the 4 new UI feature areas and integrating them into `App.tsx` is structured as follows:

1. **Area 1: Equipment Manager & 9-Point PPFD Mapping UI Design**:
   - _Observation_: `route = "equipment"` is a stub; `LightProfile` and `PpfdMap` in `types.ts` specify 9 grid positions (`NW`, `N`, `NE`, `W`, `C`, `E`, `SW`, `S`, `SE`) and summary statistics (`mean`, `min`, `max`, `uniformity`).
   - _Logic_: Create `src/components/panels/EquipmentManagerPanel.tsx` to handle inventory, fixture properties (hersteller, modell, max watt), and maintenance history. Within or alongside this panel, create `src/components/modals/PpfdMappingModal.tsx` displaying a 3x3 visual grid corresponding to tent geometry. Entering point values dynamically recomputes Mean PPFD (`sum / 9`), Min, Max, and Uniformity Ratio (`min / mean`). Visual cells use color-intensity coding based on variance from the mean.

2. **Area 2: Sensor Calibration Manager UI Design**:
   - _Observation_: `run.calibrations` holds `CalibrationRecord` entries, and `MeasurementTrustStatus` tracks sensor validity (`valid`, `expired`, `calibration-due`, `unverified`).
   - _Logic_: Implement a Calibration Manager tab within `EquipmentManagerPanel.tsx` or a dedicated `SensorCalibrationModal.tsx`. Display status cards for pH and EC sensors. Render color-coded state badges (`✓ Gültig`, `⚠️ Kalibrierung fällig`, `❌ Abgelaufen`). Provide a guided 3-step calibration flow: (1) Select sensor and standard (e.g. pH 4.01 / 7.00 or 1413 µS/cm EC), (2) Record measured value and uncertainty, (3) Confirm → updates `validUntil` date, appends audit/domain events, and clears stale alerts.

3. **Area 3: Plant Identity & Day Zero Time Anchor UI Design**:
   - _Observation_: `createDefaultRunPackage` currently assigns default plant identity and anchor `"run-operational-start"`. `PlantIdentity` and `DayZeroAnchor` exist in `types.ts`.
   - _Logic_: Create `src/components/modals/PlantIdentityModal.tsx` accessible from `RunConfigPanel.tsx` and `DailyOperatorPanel.tsx`. The modal allows editing Züchter (Breeder), Seed-Lot, Pack-Batch, Seed-Type, and Phenotype Notes. It features a radio selector for the Day Zero Time Anchor (`seed-started`, `seed-planted`, `emergence`, `first-true-leaves`, `run-operational-start`), displaying an live offset calculation showing how plant age in days is derived relative to the anchor date.

4. **Area 4: Pot Weight Tracking & Interactive Dryback UI Design**:
   - _Observation_: `PotProfile` has `emptyMassGrams` and `saturatedMassGrams`; `DailyObservation.values` records `potMassGrams`.
   - _Logic_: Integrate an interactive Pot Weight Tracking widget into `DailyOperatorPanel.tsx` and `RunLogWorkspace.tsx`. Replace static default text with interactive inputs for empty mass, saturated mass, and current measured mass. Dynamically compute available water capacity and dryback percentage (`(current - empty) / (saturated - empty) * 100%`). Display a color-banded progress gauge (Red <35% dry, Green 40–60% optimal, Blue >85% saturated) with automated German watering trigger advice ("Zielgewicht für Gießvorgang erreicht bei ~X g").

5. **Area 5: Integration Architecture & Accessibility Compliance**:
   - _Observation_: `App.tsx` routes navigation and manages overlays; `styles.css` dictates CSS variables and responsive rules.
   - _Logic_: Mount `EquipmentManagerPanel` under `route === "equipment"`. Add state callbacks in `App.tsx` for opening/closing the PPFD, Calibration, and Plant Identity modals. Ensure all new components use CSS variables (`var(--green)`, `var(--surface-1)`), include `<TermTooltip term="..." lens={lens} />` for technical terminology, provide German labels, and adhere to 44px touch target guidelines with `:focus-visible` styling.

---

## 3. Caveats

- **No Source Code Changes**: Per the Explorer role instructions, this investigation provides the complete structural blueprint and architectural specifications without modifying application code files directly.
- **Hardware Integration Boundary**: Hardware sensor telemetry remains strictly manual input / simulated; live MQTT or direct Bluetooth sensor streaming is out of scope per `capability-roadmap.json` and AGENTS.md rules.
- **Data Persistence**: New interactive state updates (PPFD maps, calibration records, plant identity, pot weight parameters) flow through existing `updateRunConfig` and `saveActiveRun` mechanisms without altering schema invariants.

---

## 4. Conclusion

The UI layout, modal architecture, component designs, and state callback flows for the 4 P0/P1 frontend areas are fully specified and ready for implementation.

### Component Architecture Summary

1. **`src/components/panels/EquipmentManagerPanel.tsx`**: Replaces stub in `App.tsx` for route `equipment`. Houses equipment profiles, sensor calibration status, and PPFD mapping triggers.
2. **`src/components/modals/PpfdMappingModal.tsx`**: Interactive 3x3 grid for NW/N/NE/W/C/E/SW/S/SE measurements with live PPFD mean, min, max, and uniformity calculations.
3. **`src/components/modals/SensorCalibrationModal.tsx`**: Guided calibration workflow with valid/expired state badges and audit trail integration.
4. **`src/components/modals/PlantIdentityModal.tsx`**: Breeder, seed-lot, phenotype, and Day Zero anchor selection with age offset calculations.
5. **Interactive Pot Weight Widget (`DailyOperatorPanel.tsx`)**: Replaces mock values with real-time dryback calculations, visual progress gauges, and Gieß-Trigger advice.

All UI elements strictly align with `styles.css` CSS variables, 2026 Master Class Elite aesthetic standards, German terminology with `TermTooltip`, and WCAG 2.2 AA accessibility requirements (44px touch targets).

---

## 5. Verification Method

To independently verify the implementation once completed by the implementer agent:

1. **TypeScript Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected Result_: 0 errors.

2. **Unit & Component Tests**:

   ```bash
   npx vitest run
   ```

   _Expected Result_: All tests pass (30/30+).

3. **Production Build Gate**:

   ```bash
   npx vite build
   ```

   _Expected Result_: Successful bundle compilation without warnings or errors.

4. **Full Verification Suite**:

   ```bash
   pnpm check
   ```

5. **Visual & UI Inspection**:
   - Navigate to `#equipment`: Confirm full Equipment Manager and 9-point PPFD modal open smoothly.
   - Navigate to `#setup`: Confirm Plant Identity Modal trigger updates breeder, seed lot, and Day Zero anchor.
   - Navigate to `#today`: Confirm Pot Weight Tracking gauge responds dynamically to weight inputs.
   - Touch Target Check: Verify all buttons and inputs have at least 44px click/touch areas.
