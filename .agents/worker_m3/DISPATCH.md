## 2026-08-14T02:12:08Z

You are Worker M3 (teamwork_preview_worker).
Your working directory is: c:\Users\badbu\Documents\grow\.agents\worker_m3

Your task:
Implement `PlantIdentityModal.tsx` and integrate it into `RunConfigPanel.tsx` and `DailyOperatorPanel.tsx`, along with comprehensive unit tests for Milestone 3 of the UKD App project.

Read the specifications and context before writing code:

- `c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md`
- `c:\Users\badbu\Documents\grow\AGENTS.md`
- `c:\Users\badbu\Documents\grow\.agents\explorer_m3\analysis_m3.md`
- `c:\Users\badbu\Documents\grow\.agents\explorer_m3\handoff.md`
- `c:\Users\badbu\Documents\grow\src\domain.ts`
- `c:\Users\badbu\Documents\grow\src\types.ts`
- `c:\Users\badbu\Documents\grow\src\run-state.ts`
- `c:\Users\badbu\Documents\grow\src\components\panels\RunConfigPanel.tsx`
- `c:\Users\badbu\Documents\grow\src\components\panels\DailyOperatorPanel.tsx`
- `c:\Users\badbu\Documents\grow\src\components\modals\`

Requirements for implementation:

1. **Create `src/components/modals/PlantIdentityModal.tsx`**:
   - Master Class 2026 overlay modal using `palette-backdrop`, `command-palette` CSS design tokens.
   - Form fields:
     - Breeder (`breeder`: string | null)
     - Seed Lot (`seedLot`: string | null)
     - Pack Batch (`packBatch`: string | null)
     - Seed Type (`seedType`: `"regular" | "feminized" | "autoflower" | "clone" | "unknown"`)
     - Strain/Genetics (`genetics`: string)
     - Phenotype Notes (`phenotypeNotes`: string)
     - Day Zero Anchor Type (`dayZeroAnchor.type`: `"seed-started" | "seed-planted" | "emergence" | "first-true-leaves" | "run-operational-start"`)
     - Anchor Date (`dayZeroAnchor.timestamp`: ISO date string `YYYY-MM-DD`)
   - Integration with `calculateBiologicalPlantAge` from `src/domain.ts`:
     - Real-time preview card displaying `Biologisches Alter: X Tage` and `Operatives Alter: Y Tage`.
   - German labels & inline `TermTooltip` components for terms like "Day Zero Anchor", "Phänotyp", "Breeder".
   - 44px minimum touch targets and keyboard accessibility (`aria-modal`, focus containment).
   - Save (`onSave`) and Close (`onClose`) callbacks.

2. **Integrate into `src/components/panels/RunConfigPanel.tsx`**:
   - Add trigger button / summary card: `🌱 Pflanzen-Identität & Anker bearbeiten`.
   - Show summary of breeder, seed type, phenotype notes, and Day Zero anchor.
   - Wire state to open/close `PlantIdentityModal`.

3. **Integrate into `src/components/panels/DailyOperatorPanel.tsx`**:
   - In header/cockpit bar, display biological plant age alongside operational plant age (e.g. `Operativ: Tag X · Biologisch: Tag Y (Keimung)`).

4. **Create `src/components/modals/plant-identity.test.tsx`**:
   - Write comprehensive unit tests for `PlantIdentityModal.tsx` covering:
     - Default rendering with initial values
     - Form input changes (breeder, seed type, phenotype, anchor type, anchor date)
     - Biological age live calculation preview update
     - Callback invocation on Save and Cancel
     - Accessibility attributes

5. **Export & Verify**:
   - Export `PlantIdentityModal` from `src/components/modals/index.ts` if appropriate.
   - Run unit tests: `npx vitest run` (ensure all pass, including existing 242 tests).
   - Run typecheck: `npx tsc --noEmit` (ensure 0 errors).

## 2026-08-21T04:15:41Z

You are a Worker agent implementing Milestone 3: Setup View Parameter Visibility, Editing & Missing Elements for the UKD Grow Masterplan project.
Your Working Directory is: c:\Users\badbu\Documents\grow\.agents\worker_m3
Project Root: c:\Users\badbu\Documents\grow

Read:
- c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md
- c:\Users\badbu\Documents\grow\AGENTS.md
- c:\Users\badbu\Documents\grow\PROJECT.md
- c:\Users\badbu\Documents\grow\.agents\explorer_setup\report.md
- c:\Users\badbu\Documents\grow\.agents\explorer_setup\handoff.md
- src/components/panels/RunConfigPanel.tsx
- src/run-state.ts
- src/types.ts
- src/domain.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Boundaries:
You EXCLUSIVELY own:
- `src/components/panels/RunConfigPanel.tsx`
- Any tests for RunConfigPanel (e.g. `src/components/panels/RunConfigPanel.test.tsx`)

Your Tasks:
1. Upgrade `src/components/panels/RunConfigPanel.tsx` to a comprehensive 8-card 2026 Master Class Setup view with full parameter visibility, direct editing with validation, and persistence into `RunPackage`:
   - **Card 1: Genetik & Cultivar-Auswahl**:
     - Displays selected strain name, breeder, seed lot / phenotype, type (Autoflower), cycle weeks.
     - Action button "Autoflower-Katalog öffnen" (opens `AutoflowerCockpitModal` when clicked, updates `run.config.genetics`, `run.plantIdentity` with selected strain info).
     - Action button "Erweiterte Pflanzenidentität" (opens `PlantIdentityModal`).
   - **Card 2: Zeitachse, Modus & Retroaktive Meilensteine**:
     - Global / Setup Mode Switch: Segmented control for "Simulation" vs "Live-Betrieb" using `updateExecutionMode(run, mode)`.
     - Direct Date Pickers:
       - "Eintopfen / Aussaat (Potting Date)" (`pottingDateIso`)
       - "Durchstoß / Keimung (Emergence / Day Zero)" (`emergenceDateIso`)
     - Dynamic Status: Displays calculated Keimdauer (Germination days), Biologisches Alter (Biological age), and Aktiver Tag (Current Day).
     - Modifying these dates calls `updatePlantMilestones(run, { pottingDateIso, emergenceDateIso }, "Setup view update")` to dynamically recalibrate the plan.
   - **Card 3: Zelt-Geometrie & Raum-Dimensionen**:
     - Direct inputs for `tentWidthCm`, `tentDepthCm`, `tentHeightCm`.
     - Displays computed Grundfläche (m²), Zeltvolumen (m³), `plantCount` (Anzahl Pflanzen), and Pflanzendichte (Pflanzen/m²).
   - **Card 4: Beleuchtung & Photobiologie**:
     - Direct inputs for `ledMaxW`, `lightHours` (Photoperiode), dimmer level.
     - Displays calculated Daily Light Integral (DLI) reference and target PPFD.
     - Action button for 9-point PPFD Map (`PpfdMappingModal`).
   - **Card 5: Pflanztopf & Substrat-Hydratation (Dryback Tare)**:
     - Direct inputs for `nominalVolumeLiters`, `medium` ("Erde", "Coco", "Hydro", etc.), `mediumProduct` (z.B. "Biobizz Light-Mix").
     - Direct inputs for Pot Tare Weights: `emptyMassGrams` (Leergewicht Topf + trockenes Substrat) and `saturatedMassGrams` (Sättigungsgewicht nach Gießen 100% FC).
     - Substrate Hydration readiness badge: shows "Kalibriert" if tare weights are present (enabling `calculateSubstrateHydration`), or warning if missing.
   - **Card 6: Abluft, Umluft & Klimasteuerung**:
     - Direct input for `exhaustM3h` (Lüfterleistung in m³/h) — MUST be persisted into `run.config.exhaustM3h` and `run.equipment.exhaustM3h` (NO transient local state!).
     - Displays computed Luftwechselrate (Turnover per minute/hour) with status badge against recommended 1.0–2.0 min turnover.
     - Target VPD and temperature/humidity envelope preview.
   - **Card 7: Wasserchemie & Ausgangswasser**:
     - Direct inputs for `water.sourceEc`, `water.sourcePh`, `water.calciumMgL`, `water.magnesiumMgL`.
     - Displays calculated Ca:Mg ratio with German guidance (ideal 3:1 bis 4:1) and city water preset dropdown.
   - **Card 8: Nährstofflinie, Bewässerung & KCanG-Konformität**:
     - Direct selector for `nutrientSystem` ("Hesi", "Biobizz", "Athena", "Canna", etc.).
     - Direct selector for `irrigationSystem` ("Manuell (Hand)", "Tropf-Blumat", "Autopot", "Tropfbewässerung").
     - Plant limit indicator (KCanG 3 blühende Pflanzen pro erwachsene Person).
   - **Readiness Gate & Save State**:
     - Maintain and update the 5-category Readiness Gate banner at top/bottom with instant feedback.
2. Ensure `AutoflowerCockpitModal` is imported and used when the user clicks "Autoflower-Katalog öffnen", passing `onSelectStrain={(strain) => { ... }}` which updates `run.config.genetics` and `run.plantIdentity`.
3. Create/update unit tests in `src/components/panels/RunConfigPanel.test.tsx` verifying:
   - All 8 cards render cleanly.
   - All inputs (including dryback tare weights, exhaust persistence, retroactive milestone dates, tent dimensions, nutrient system) trigger `onUpdateRun` with correct values.
   - Live/Sim toggle triggers `onUpdateRun` with updated execution mode.
4. Run tests and typecheck (`pnpm test` and `pnpm typecheck`).
5. Write `c:\Users\badbu\Documents\grow\.agents\worker_m3\handoff.md` and notify parent.
