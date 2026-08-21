# Milestone 2: Core Interactive Input Panels Specification & Analysis Report

## Summary

This report presents the architectural specification, component contracts, domain calculations mapping, fail-closed safety gates, and co-located unit test plans for **Milestone 2 (Core Interactive Input Panels)** of the UKD Grow Masterplan 2026.

The 4 interactive input panels (`EnvironmentTargetsPanel`, `NutrientMixPanel`, `RunConfigPanel`, `VpdDliCalculatorPanel`) and their co-located test suite (`panels.test.ts`) are fully specified according to the scientific domain models in `src/domain.ts`, state manager in `src/run-state.ts`, UI primitives in `src/components/common/`, and strictly compliant with `AGENTS.md` invariants.

---

## 1. Observation

### 1.1 Existing Common Primitives & Domain Infrastructure

- **`src/components/common/TermTooltip.tsx`**: Accepts `term: string`, `lens?: ExperienceLens`, `showIcon?: boolean`, `customText?: string`. Uses `getTermDefinition` and `getTermDescription` from `termDictionary.ts`.
- **`src/components/common/MetricGauge.tsx`**: Accepts `value`, `min`, `max`, `unit`, `optimalMin`, `optimalMax`, `warnMin`, `warnMax`, `label`, `lens`, `showMarker`. Exports `calculateGaugeStatus()` returning `{ status, colorVar, dimColorVar, icon, labelGerman, percentage }`.
- **`src/components/common/LensBadge.tsx`**: Renders `guided` (GEFÜHRT), `advanced` (STANDARD), or `expert` (EXPERTE) badges with theme CSS variables (`var(--blue)`, `var(--green)`, `var(--purple)`).
- **`src/domain.ts`**:
  - `calculateLeafVpd(airTempC, relativeHumidity, leafDeltaC)`: calculates leaf VPD in kPa using Tetens-type saturation pressure model:
    `sat(T) = 0.6108 * exp(17.27 * T / (T + 237.3))`
    `LeafVPD = sat(airTempC + leafDeltaC) - (relativeHumidity / 100) * sat(airTempC)`.
  - `calculateDli(ppfd, hours)`: `(ppfd * hours * 3600) / 1,000,000` mol/m²/d.
  - `calculateMix(plan, batchLiters)`: scales day plan nutrient items by batch volume, flagging Athena BalanceTitration and pH Down warnings.
- **`src/run-state.ts`**:
  - `createObservation(day, now)`: instantiates a empty observation object.
  - `addObservation(run, observation)`: records typed measurements, audit events, and updates immutable run state.
  - `updateRunConfig(run, config)`: updates draft or active configuration profile.
  - `activateRun(run)`: freezes configuration snapshot vN and transitions status to `active`.
  - `deriveRunAlerts(run, plan, now)`: flags `water-baseline-missing` if `water.sourcePh === null` or `water.sourceEc === null`.

### 1.2 Invariant Constraints from `AGENTS.md`

- **Invariant 1**: Measurement and plant reaction override calendar target values.
- **Invariant 2**: Experience lenses (`guided`, `advanced`, `expert`) alter display density and explanations, never calculated values or domain rules.
- **Invariant 4**: Missing or unknown water chemistry MUST NOT be replaced by fake CalMag or Athena dosages. Fail-closed alert required.
- **Invariant 6**: HESI PK 13/14 MUST NOT be stacked additively with conflicting bloom boosters (e.g. Big Bud, Overdrive). Enzyme and silicon roles must not be duplicated.
- **Invariant 12**: Target values (Sollwert), measured values (Messwert), simulated values (Simulation), missing values, and stale values must be distinct in types and UI.
- **Invariant 14**: Safety-critical warnings must be persistent and accessible; toasts are secondary signals only.

---

## 2. Logic Chain & Component Specifications

### 2.1 Specification: `EnvironmentTargetsPanel.tsx`

- **File Location**: `src/components/panels/EnvironmentTargetsPanel.tsx`
- **Props Interface**:
  ```typescript
  import type {
    RunPackage,
    DayPlan,
    ExperienceLens,
    RouteId,
  } from "../../types";

  export interface EnvironmentTargetsPanelProps {
    run: RunPackage;
    plan?: DayPlan;
    lens: ExperienceLens;
    onUpdateRun: (updatedRun: RunPackage) => void;
    navigate?: (route: RouteId) => void;
  }
  ```
- **State & Real-Time Calculation Logic**:
  - Maintains interactive state for microclimate inputs:
    - `tempAir` (°C, default 24.0, min 15.0, max 35.0, step 0.5)
    - `humidity` (%, default 60.0, min 30.0, max 90.0, step 1.0)
    - `ppfd` (µmol/m²/s, default 500, min 50, max 1200, step 10)
    - `lightHours` (h/d, default 18, min 12, max 24, step 1)
    - `leafDelta` (°C, default -1.0, min -4.0, max +2.0, step 0.5)
    - `notes` (string, optional observation notes)
  - Pure calculation functions called reactively:
    - `leafVpd = calculateLeafVpd(tempAir, humidity, leafDelta)`
    - `airVpd = calculateLeafVpd(tempAir, humidity, 0)`
    - `dli = calculateDli(ppfd, lightHours)`
- **Phase Targets Matrix**:
  - Dynamically extracts current phase targets from `plan` or phase defaults:
    - Seedling / Keimung (Days 0-7): Temp 22-26°C, rF 65-75%, Leaf VPD 0.4-0.8 kPa, PPFD 150-300, DLI 10-15 mol/m²/d.
    - Vegetation (Days 8-28): Temp 23-27°C, rF 55-70%, Leaf VPD 0.8-1.1 kPa, PPFD 400-600, DLI 20-30 mol/m²/d.
    - Blüte (Days 29-63): Temp 21-25°C, rF 40-55%, Leaf VPD 1.1-1.5 kPa, PPFD 700-1000, DLI 35-45 mol/m²/d.
    - Spätblüte (Days 64-80): Temp 19-23°C, rF 38-48%, Leaf VPD 1.3-1.6 kPa, PPFD 600-900, DLI 30-40 mol/m²/d.
- **UI & Accessibility Layout**:
  - Panel header with `<LensBadge lens={lens} />` and title `"Klima & Umwelt Zielwerte"`.
  - 2-Column Responsive Layout:
    - **Left Column**: Sliders with numeric input boxes and quick presets (e.g. "Sämling 24°C/70%", "Vegi 25°C/60%", "Blüte 23°C/45%"). Includes `<TermTooltip term="rF" />`, `<TermTooltip term="PPFD" />`, and `<TermTooltip term="Leaf-VPD" />`.
    - **Right Column**: Live Metric Gauges:
      - `MetricGauge` for **Leaf VPD** (unit: `kPa`, optimal bounds based on phase).
      - `MetricGauge` for **DLI** (unit: `mol/m²/d`, optimal bounds based on phase).
      - Secondary indicator for **Air VPD** (`kPa`).
      - Save action button `"Messung als Tagesbeobachtung speichern"`, invoking `createObservation()` and `addObservation(run, obs)`.

---

### 2.2 Specification: `NutrientMixPanel.tsx`

- **File Location**: `src/components/panels/NutrientMixPanel.tsx`
- **Props Interface**:
  ```typescript
  import type {
    RunPackage,
    DayPlan,
    ExperienceLens,
    RouteId,
  } from "../../types";

  export interface NutrientMixPanelProps {
    run: RunPackage;
    plan?: DayPlan;
    lens: ExperienceLens;
    onUpdateRun: (updatedRun: RunPackage) => void;
    navigate?: (route: RouteId) => void;
  }
  ```
- **7-Step Interactive Batch Workflow**:
  - **Step 1: Water (Wasser & Volumen)**:
    - Select batch volume in Liters (`batchLiters`, default 10L).
    - Summary of water chemistry (`run.config.water`).
    - **Fail-Closed Safety Check**: If `water.sourcePh === null` or `water.sourceEc === null` or `calciumMgL === null`:
      Display persistent Red Warning Alert:
      `"FEHLENDES WASSERPROFIL: Keine automatische Conditioner- oder CalMag-Dosis ableitbar. Bitte Wasserwerte in der Run-Konfiguration erfassen."`
  - **Step 2: Base (Basisdünger)**:
    - Select nutrient line (e.g. HESI Hydro/Erde/Coco, Athena Stack).
    - Calculates base dosage scaled to `batchLiters` via `calculateMix(plan, batchLiters)`.
    - Status Chip: `AKTIV` (Green).
  - **Step 3: Micro (Mikronährstoffe & Wurzel-Complex)**:
    - Displays Wurzel Complex and SuperVit dosing.
    - Status Chip: `AKTIV` (or `BEDINGT` if past early veg).
  - **Step 4: Additives (Enzyme, Boost & PK 13/14)**:
    - PowerZyme, HESI Boost, PK 13/14.
    - **Safety Gates & Rule Enforcements**:
      - PK 13/14 Status Chip: `BEDINGT` (Active during BT 22-42). If user attempts to stack with conflicting bloom boosters (e.g. Big Bud, Overdrive), displays rule warning: `"HESI PK 13/14 darf nicht additiv mit weiteren PK-Boostern gestapelt werden!"` and sets status chip to `GESPERRT` (Red).
      - PowerZyme: Status Chip `AKTIV` (Notice: `"Nicht zusätzlich Sensizym im Referenzplan duplizieren"`).
  - **Step 5: pH (pH-Korrektur & Athena Balance)**:
    - Athena Balance: Status Chip `BEDINGT` (requires verified water chemistry).
    - pH Down: Status Chip `BEDINGT` (Warning: `"Ganz zum Schluss: pH Down erst nach finaler Durchmischung und Messung zugeben!"`).
  - **Step 6: Check (Soll- vs. Ist-Kontrolle)**:
    - Target EC (`plan.raw[DAILY_COLUMNS.ec]`) vs. Measured EC input.
    - Target pH (`plan.raw[DAILY_COLUMNS.ph]`) vs. Measured pH input.
    - Visual `MetricGauge` comparison for EC and pH.
  - **Step 7: Apply (Aufzeichnen & Chargenprotokoll)**:
    - Appends a `MixBatchRecord` to `run.mixBatches` with timestamp, water volume, components, and measured final EC/pH.
    - Calls `onUpdateRun(updatedRun)`.

---

### 2.3 Specification: `RunConfigPanel.tsx`

- **File Location**: `src/components/panels/RunConfigPanel.tsx`
- **Props Interface**:
  ```typescript
  import type { RunPackage, ExperienceLens, RouteId } from "../../types";

  export interface RunConfigPanelProps {
    run: RunPackage;
    lens: ExperienceLens;
    onUpdateRun: (updatedRun: RunPackage) => void;
    navigate?: (route: RouteId) => void;
  }
  ```
- **Setup Wizard & Configuration Categories**:
  1. **Substrate Setup**: Medium (`Erde`, `Coco`, `Hydro`), product label (`mediumProduct`), pot volume (`nominalVolumeLiters`), pot type (`fabric`, `plastic`, `airpot`, `autopot`).
  2. **Light Setup**: Fixture type (`LED`, `NDL`, `PWM`), max wattage (`ledMaxW`), photoperiod (`lightHours`).
  3. **Tent Dimensions**: Width (`tentWidthCm`), Depth (`tentDepthCm`), Height (`tentHeightCm`). Calculates floor area (m²) and volume (m³).
  4. **Ventilation / Carbon Filter (AKF)**: Exhaust capacity (m³/h), filter model, air exchange multiplier check (`exhaust m³/h >= tent volume * 60`).
  5. **Water Analysis (Wasseranalyse)**: Source type (`municipal`, `ro`, `well`, `rain`), Source EC, Source pH, Calcium (Ca mg/L), Magnesium (Mg mg/L), Alkalinity (HCO3- mg/L). Calculates Ca:Mg ratio (Target 3:1).
- **Fail-Closed Readiness Score & Readiness Gate**:
  - Calculates readiness percentage across 5 categories (20% each):
    1. Substrate & pot configured
    2. Light type & max W > 0 set
    3. Tent dimensions valid (W>0, D>0, H>0)
    4. Water analysis complete (`sourceEc !== null`, `sourcePh !== null`, `calciumMgL !== null`, `magnesiumMgL !== null`)
    5. Equipment & AKF profile complete
  - **Fail-Closed Readiness Gate**:
    - If score < 100% or critical water analysis fields missing:
      - Display prominent Readiness Gate Box:
        `"RUN READINESS: UNVOLLSTÄNDIG (Score: X%)"`
      - Render bulleted resolution list of missing required fields (e.g. `"Wasser-EC und Wasser-pH fehlen"`, `"Zelt-Abmessungen unvollständig"`).
      - Lock run activation button ("Sperre aktiv - bitte Konfiguration vervollständigen").
    - If score === 100%:
      - Enable `"Run Aktivieren"` button, which executes `activateRun(run)` and calls `onUpdateRun(updatedRun)`.

---

### 2.4 Specification: `VpdDliCalculatorPanel.tsx`

- **File Location**: `src/components/panels/VpdDliCalculatorPanel.tsx`
- **Props Interface**:
  ```typescript
  import type { ExperienceLens } from "../../types";

  export interface VpdDliCalculatorPanelProps {
    lens?: ExperienceLens;
    initialTemp?: number;
    initialHumidity?: number;
    initialPpfd?: number;
    initialHours?: number;
    initialLeafDelta?: number;
  }
  ```
- **Standalone Matrix Architecture**:
  - Does NOT mutate `RunPackage` state directly; provides interactive standalone simulation & reference matrix.
  - Interactive sliders: Temp °C (15–35°C), rF % (30–90%), PPFD µmol/m²/s (50–1200), Photoperiode h/d (12–24h), Leaf Delta °C (-4 to +2°C).
  - Real-time calculated values: `Leaf VPD`, `Air VPD`, `DLI`.
  - **4-Phase Comparison Matrix Cards**:
    1. **Keimung / Sämling**: Target VPD 0.4–0.8 kPa | Target DLI 10–15 mol/m²/d.
    2. **Vegetation**: Target VPD 0.8–1.1 kPa | Target DLI 20–30 mol/m²/d.
    3. **Blüte**: Target VPD 1.1–1.5 kPa | Target DLI 35–45 mol/m²/d.
    4. **Spätblüte**: Target VPD 1.3–1.6 kPa | Target DLI 30–40 mol/m²/d.
  - Each phase card uses `calculateGaugeStatus()` and renders `<MetricGauge>` widgets for instant visual status evaluation (Optimal / Warning / Alert-Low / Alert-High).
  - Includes `<TermTooltip term="VPD" />`, `<TermTooltip term="DLI" />`, `<TermTooltip term="PPFD" />`.

---

### 2.5 Specification: `panels.test.ts` (Co-located Vitest Suite)

- **File Location**: `src/components/panels/panels.test.ts`
- **Test Scenarios**:
  1. `EnvironmentTargetsPanel` test suite:
     - Verifies VPD & DLI real-time slider calculations match `calculateLeafVpd` & `calculateDli`.
     - Verifies saving observation invokes `addObservation()` and updates measurements correctly.
  2. `NutrientMixPanel` test suite:
     - Verifies 7-step batch volume scaling for 5L, 10L, and 20L batches.
     - Verifies fail-closed warning triggering when water profile (`water.sourcePh` or `water.sourceEc`) is null.
     - Verifies product status chip logic (`AKTIV`, `BEDINGT`, `GESPERRT`) and PK 13/14 conflict detection.
  3. `RunConfigPanel` test suite:
     - Verifies readiness score calculation algorithm (0% to 100%).
     - Verifies fail-closed activation gate blocking run activation when score < 100%.
     - Verifies successful transition when configuration is complete.
  4. `VpdDliCalculatorPanel` test suite:
     - Verifies matrix status evaluation across all 4 growth phases.
     - Verifies edge case values (e.g. 0 rF, extreme temp) are clamped safely.

---

## 3. Caveats

- **Scope Boundary**: Milestone 2 focuses exclusively on panel component design, interfaces, calculation mapping, fail-closed logic, and unit tests under `src/components/panels/`. Integration into `src/App.tsx` navigation shell is scheduled for Milestone 4.
- **Daily Operator Panel & Glossary Panel**: Scheduled for Milestone 3 per `PROJECT.md`.
- **Water Chemistry Defaulting**: In accordance with `AGENTS.md` Invariant 4, unknown water profile parameters (`calciumMgL`, `magnesiumMgL`, `sourceEc`, `sourcePh`) must NEVER be filled with fake/assumed numbers. They must remain `null` until entered by the user, triggering the fail-closed warning in `NutrientMixPanel` and `RunConfigPanel`.

---

## 4. Conclusion

The specification for Milestone 2 provides an exhaustive, mathematically sound, fail-closed, and UI-consistent blueprint for all four interactive input panels and their co-located test suite. The design preserves all existing 29 unit tests while establishing robust contracts for the upcoming implementation phase.

---

## 5. Verification Method

### 5.1 Verification Commands (for Implementer)

1. **TypeScript Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   Must pass with zero type errors.

2. **Unit Test Execution**:

   ```bash
   npx vitest run
   ```

   Must execute and pass all existing 29 unit tests plus new panel tests in `src/components/panels/panels.test.ts`.

3. **Vite Production Build**:

   ```bash
   npx vite build
   ```

   Must compile cleanly without build errors or missing module resolutions.

4. **Full Gate Validation**:
   ```bash
   pnpm check
   ```
