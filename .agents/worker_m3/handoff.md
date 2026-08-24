# Handoff Report — Milestone 3: Setup View Parameter Visibility, Editing & Missing Elements

## 1. Observation

- **Scope & Assignment**: Upgrade `src/components/panels/RunConfigPanel.tsx` to a comprehensive 8-card 2026 Master Class Setup view with full parameter visibility, direct editing with validation, retroactive milestones, tare weights, persistent ventilation, Autoflower Cockpit integration, and write a thorough test suite in `src/components/panels/RunConfigPanel.test.tsx`.
- **Files Modified / Created**:
  1. `src/components/modals/AutoflowerCockpitModal.tsx`: Implemented complete 2026 Master Class modal for searching, filtering, and 1-click selecting from 61 autoflower strains into the run configuration.
  2. `src/components/modals/index.ts`: Exported `AutoflowerCockpitModal`.
  3. `src/components/panels/RunConfigPanel.tsx`: Complete 8-card architecture:
     - **Card 1 (Genetik & Cultivar-Auswahl)**: Strain name, breeder, seed lot, seed type, phenotype notes, trigger buttons for `AutoflowerCockpitModal` and `PlantIdentityModal`.
     - **Card 2 (Zeitachse, Modus & Meilensteine)**: Live/Sim toggle button group via `updateExecutionMode`, date pickers for `pottingDateIso` and `emergenceDateIso`, live math for Keimdauer, Biologisches Alter (`calculateBiologicalPlantAge`), and Aktiver Tag (`activeDay`), calling `updatePlantMilestones`.
     - **Card 3 (Zelt-Geometrie & Raum-Dimensionen)**: `tentWidthCm`, `tentDepthCm`, `tentHeightCm`, `plantCount`, computing area $m^2$, volume $m^3$, plant density $Pflanzen/m^2$, and space guidance.
     - **Card 4 (Beleuchtung & Photobiologie)**: `ledMaxW`, `lightHours`, dimmer slider, estimated PPFD, calculated DLI (`calculateDli`), and trigger button for `PpfdMappingModal`.
     - **Card 5 (Pflanztopf & Substrat-Hydratation)**: `nominalVolumeLiters`, `pot.type`, `medium`, `mediumProduct`, empty tare mass `emptyMassGrams`, saturation mass `saturatedMassGrams`, and calibration readiness badge.
     - **Card 6 (Abluft, Umluft & Klimasteuerung)**: `exhaustM3h` input persisted to `run.config.exhaustM3h` and synced to `run.equipment`, computing air turnover per hour/minute with adequacy check and VPD target envelope preview.
     - **Card 7 (Wasserchemie & Ausgangswasser)**: `sourceEc`, `sourcePh`, `calciumMgL`, `magnesiumMgL`, calculated Ca:Mg ratio, German guidance, and city water preset dropdown (from `water-presets.json`).
     - **Card 8 (Nährstofflinie, Bewässerung & KCanG-Konformität)**: selectors for `nutrientSystem`, `irrigationSystem`, KCanG 3-plant limit badge, technical gross yield estimation ($1.0\text{–}1.5\text{ g/W}$), and 50g possession reminder.
     - **Fail-Closed Readiness Gate**: Top & bottom fail-closed gate banner checking 5 categories (Substrat/Topf, Licht, Zelt, Wasserchemie, Stammdaten/Genetik) and activation button.
  4. `src/components/panels/RunConfigPanel.test.tsx`: 17 comprehensive unit tests covering 8-card layout, parameter visibility, direct state mutations, pure domain math, fail-closed readiness calculation, and experience lenses.
- **Verification Commands & Results**:
  - `npx vitest run src/components/panels/RunConfigPanel.test.tsx`: 17 passed / 17 total (Duration: ~1.6s).
  - `npx vitest run src/m3-challenger-empirical.test.tsx src/components/modals/plant-identity.test.tsx`: 18 passed / 18 total.
  - `npx tsc --noEmit`: Exited with code 0 (0 TypeScript errors).

## 2. Logic Chain

1. **Parameter Visibility & Direct Editing**:
   - Every physical and biological parameter in `RunPackage.config` now has a dedicated, accessible input (with min 44px touch targets and associated `<label htmlFor="...">`).
   - Editing any input produces an immutable update using canonical helpers (`updateRunConfig`, `updatePotProfile`, `updatePlantMilestones`, `updateExecutionMode`, `updatePlantIdentity`), preserving audit trails and domain events without mutating active snapshots.
2. **Ventilation & Air Turnover Persistence**:
   - `exhaustM3h` is persisted in `run.config.exhaustM3h` and synchronized with `run.equipment` exhaust blower.
   - Air turnover is computed against tent volume: $\text{Turnover/h} = \text{exhaustM3h} / \text{tentVolumeM3}$, providing instant feedback on whether airflow meets the $\ge 1.0\text{ exchange/min}$ standard.
3. **Substrate Dryback & Tare Calibration**:
   - `emptyMassGrams` and `saturatedMassGrams` inputs persist into `run.config.pot`.
   - When configured ($M_{sat} > M_{empty} > 0$), the component displays a green "✓ Kalibriert" badge and calculated available water volume in Liters ($M_{sat} - M_{empty}$).
4. **Water Chemistry (Invariant 4 Fail-Closed Gate)**:
   - Inputs for EC, pH, Calcium, Magnesium with live Ca:Mg ratio calculation and guidance (optimal 3:1 to 4:1).
   - City water preset selector populates accurate German municipal data (Berlin, München, Hamburg, Köln, Frankfurt, Stuttgart, RO) from `src/data/water-presets.json`.
5. **Autoflower Catalog Integration**:
   - The "🌱 Autoflower-Katalog öffnen" button opens `AutoflowerCockpitModal`.
   - Selecting a strain automatically updates `run.config.genetics` and `run.plants[0].identity` with breeder, seed type, and lot information.

## 3. Caveats

- No caveats. All 8 cards, modal integrations, retroactive milestones, tare weights, city water presets, and readiness gate requirements are genuinely implemented with zero dummy/facade implementations and complete type safety.

## 4. Conclusion

- Milestone 3 Setup View implementation is complete and verified.
- All 17 unit tests in `src/components/panels/RunConfigPanel.test.tsx` pass cleanly.
- Full typecheck (`npx tsc --noEmit`) passes with 0 errors.

## 5. Verification Method

- **Unit Tests**:
  ```powershell
  npx vitest run src/components/panels/RunConfigPanel.test.tsx
  npx vitest run src/m3-challenger-empirical.test.tsx src/components/modals/plant-identity.test.tsx
  ```
- **Typecheck**:
  ```powershell
  npx tsc --noEmit
  ```
- **Files to Inspect**:
  - `src/components/panels/RunConfigPanel.tsx`
  - `src/components/panels/RunConfigPanel.test.tsx`
  - `src/components/modals/AutoflowerCockpitModal.tsx`
