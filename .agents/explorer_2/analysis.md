# In-Place Editing & Prediction Engine: Deep Technical Analysis

**Author**: explorer_2 (In-Place Editing & Prediction Engine Explorer)
**Date**: 2026-08-22
**Target Codebase**: `src/prediction-engine.ts`, `src/domain.ts`, `src/run-state.ts`, `src/App.tsx`, `src/components/panels/*`, `src/components/common/*`

---

## 1. Executive Summary & Problem Boundary

The UKD Grow Masterplan application is an evidence-guarded, scientifically grounded operating system for precision indoor cultivation. While the underlying domain models (`src/domain.ts`, `src/run-state.ts`) provide robust state machines and snapshot immutability, the primary user experience (UX) suffers from substantial **context loss and interaction friction**:

1. **Dashboard Read-Only Isolation**: The primary Cockpit landing view (`src/App.tsx`) displays core metrics (PPFD, DLI, Temp/RH, Leaf-VPD, EC, pH) and the active run strip as completely static, read-only cards.
2. **High-Friction Navigation**: Routine daily actions (e.g. logging canopy climate, checking watering volume, adjusting genetics, or updating light height) require 4 to 6 clicks and navigating into separate workspaces (`today` / `DailyOperatorPanel`, `setup` / `RunConfigPanel`, `mix` / `NutrientMixPanel`).
3. **Underutilized Prediction Engine**: The existing `src/prediction-engine.ts` is a minimal prototype (limited to strain name string matching and potting date +3 days). It lacks real-time environmental target corridor inference, live VPD/DLI calculations, water/dryback advice, and an AJAX-like auto-completion engine for inline inputs.

This report establishes a comprehensive architectural specification for:

- **Universal In-Place Editing** across the Cockpit and Dashboard panels.
- An **expanded, physics-grounded Prediction Engine** delivering in-memory suggestions (<5ms latency).
- Strict adherence to `AGENTS.md` invariants (measurements override calendar values, append-only event streams, active snapshot immutability, fail-closed safety gates).

---

## 2. Current State Audit & Friction Analysis

### 2.1 Cockpit (Dashboard Landing Page)

- **File & Location**: `src/App.tsx` (`function Cockpit`, lines 1990–2200).
- **Displayed Metrics**:
  - `PPFD`: `numberAt(plan, DAILY_COLUMNS.ppfd)`
  - `DLI`: `numberAt(plan, DAILY_COLUMNS.dli)`
  - `Klima`: `tempLight` & `humidity`
  - `Leaf-VPD`: `leafVpd`
  - `EC`: `ec` (target)
  - `pH`: `ph` (target)
  - Run Strip: `config.genetics`, `phase`, `goal`, `day` progress.
- **Pain Points**:
  - If a grower inspects their tent and measures 26.2 °C, 58% rF, and 540 PPFD, clicking any of these metric cards does nothing.
  - The grower must click `Vollansicht →`, scroll down the massive `DailyOperatorPanel`, find the respective inputs, enter values, and click save.
  - After saving, they must manually click back to the Cockpit.

### 2.2 Daily Operator Panel (`src/components/panels/DailyOperatorPanel.tsx`)

- **Structure**:
  - Target Corridors (top summary cards) are read-only.
  - Substrate Hydration / Topfgewicht calculations require scrolling to a separate section.
  - Form fields at the bottom are unassisted native inputs without live corridor boundaries or auto-completion.
- **Pain Points**:
  - No instant visual feedback if an entered value violates biological safety corridors (e.g. EC > 2.2 mS/cm in early veg).

### 2.3 Run Configuration Panel (`src/components/panels/RunConfigPanel.tsx`)

- **Structure**:
  - Large monolithic form for editing `RunConfig`.
  - Genetics selection requires manual free-text entry or opening the full-screen `AutoflowerCockpitModal`.
- **Pain Points**:
  - No combobox with inline fuzzy search from `autoflower-cockpit.json` to immediately populate breeder, flowering time, and cycle targets.

### 2.4 Gap Analysis of `src/prediction-engine.ts`

| Desired Capability                | Current Status in `prediction-engine.ts` | Proposed Architecture                                                                                     |
| --------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Genetics Auto-Complete**        | Basic exact/fuzzy string match           | Fast fuzzy combobox search across 24+ strains in `autoflower-cockpit.json` with instant metadata autofill |
| **Milestone Prediction**          | Only +3 days emergence                   | Full cycle projection (Emergence, Early Veg, Preflower, Peak Bloom, Flush, Harvest Window)                |
| **Environmental Corridors**       | Missing                                  | Dynamic target corridor resolver (PPFD, DLI, Temp, RH, Leaf-VPD, Air-VPD) based on day & strain           |
| **Instant Physical Calculations** | Missing                                  | Pure Magnus-Tetens leaf/air VPD, leaf Delta T heuristics, and DLI integrals                               |
| **Water & Substrate Dryback**     | Missing                                  | Recommends irrigation volume based on current pot mass, tare, and saturation capacity                     |
| **Nutrient Dosage Corridor**      | Missing                                  | Suggests base fertilizer, booster, and CalMag dosing adjusted for source water EC/Ca/Mg                   |
| **Live In-Place Suggestion API**  | Missing                                  | Unified `getLiveFieldSuggestions(field, input, context)` for all inline components                        |

---

## 3. UI Component Architecture for In-Place Editing

To ensure high performance, seamless desktop/mobile ergonomics, and WCAG accessibility, we define two primary reusable primitives.

### 3.1 `InlineEditable<T>` Primitive (`src/components/common/InlineEditable.tsx`)

A universal wrapper component managing the lifecycle between formatted display and active input with predictive overlay.

```tsx
export interface FieldSuggestion<T = string | number> {
  value: T;
  label: string;
  hint: string;
  badge?: "Plan" | "Empfohlen" | "Sicher" | "Katalog" | "Letzter Wert";
  confidence?: number;
  payload?: any;
}

export interface InlineEditableProps<T> {
  value: T | null | undefined;
  displayValue?: React.ReactNode;
  label: string;
  unit?: string;
  type?: "text" | "number" | "select" | "combobox" | "date";
  step?: number | string;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: Array<{ label: string; value: T }>;
  getSuggestions?: (
    query: string,
  ) => Promise<FieldSuggestion<T>[]> | FieldSuggestion<T>[];
  validate?: (val: T) => { valid: boolean; error?: string; warning?: string };
  onSave: (
    newValue: T,
    meta?: { reason?: string; isOverride?: boolean },
  ) => void | Promise<void>;
  permission?: "edit" | "override" | "readonly";
  isOverrideMode?: boolean;
  lens?: ExperienceLens;
  tone?: "neutral" | "blue" | "amber" | "green" | "danger";
  className?: string;
}
```

### 3.2 `InlineMetricCard` (`src/components/common/InlineMetricCard.tsx`)

Specialized component for Cockpit and Dashboard panels combining metric visualization with click-to-log capabilities.

```tsx
export interface InlineMetricCardProps {
  label: string;
  targetValue: number | string;
  measuredValue?: number | string | null;
  unit: string;
  tone: "blue" | "amber" | "green" | "purple";
  note: string;
  lens: ExperienceLens;
  metricType: "ppfd" | "dli" | "climate" | "vpd" | "ec" | "ph" | "potMass";
  onSaveMeasurement: (
    metricKey: string,
    value: number | { temp: number; rh: number },
  ) => void;
  getSuggestions?: () => FieldSuggestion[];
}
```

### 3.3 Interaction State Machine & Ergonomics

```
+----------------------------------------------------------+
|                      VIEW STATE                          |
|  - Renders as accessible button / interactive card       |
|  - Min 44x44px touch target (Mobile accessible)         |
|  - Displays: Target value, Unit, 'Soll'/'Ist' badge     |
|  - Hover: Subtle pencil icon (✎) + outline accent        |
+-------------------------+--------------------------------+
                          | Click / Enter / Space
                          v
+----------------------------------------------------------+
|                      EDIT STATE                          |
|  - Mounts native <input> / <combobox> with autoFocus     |
|  - Value pre-selected for instant overwrite             |
|  - Live in-memory suggestions queried (<5ms)             |
|  - Opens Suggestion Dropdown Popover beneath input       |
+----------------------------------------------------------+
| Keyboard Handlers:                                       |
|  - [Enter]: Validate -> Commit onSave() -> View State    |
|  - [Escape]: Revert to initial value -> View State       |
|  - [Down/Up]: Navigate suggestion dropdown list          |
|  - [Tab]: Commit valid value & move to next field        |
| Blur / Click Outside: Auto-commit if valid, revert if not|
+-------------------------+--------------------------------+
                          | onSave(value)
                          v
+----------------------------------------------------------+
|                  OPTIMISTIC FEEDBACK                     |
|  - Instant UI update without network lag                 |
|  - Green checkmark (✓) flash for 1.2s                    |
|  - If target override on active run: Prompts for reason  |
+----------------------------------------------------------+
```

---

## 4. Expanded Prediction Engine Specification (`src/prediction-engine.ts`)

The prediction engine is enhanced into a modular, pure calculation engine:

### 4.1 Module 1: Genetics & Strain Intelligence

- **`searchGeneticsSuggestions(query: string, limit = 5)`**:
  - Fuzzy-matches query against `autoflower-cockpit.json` across strain name, breeder, aroma, effects.
  - Returns `AutoflowerStrainSuggestion` with expected THC, flowering days, height, yield, difficulty, and setup defaults.
- **`predictStrainSchedule(strainName: string, startDate: string, anchor: DayZeroAnchor)`**:
  - Generates estimated biological timeline (Emergence Day 3-4, Early Veg Day 7-14, Preflower Day 21-28, Peak Bloom Day 35-56, Flush Day 63-70, Harvest Day 70-80).

### 4.2 Module 2: Environmental & Climate Corridors

- **`predictEnvironmentalCorridor(day: number, phaseName?: string, strainData?: Partial<AutoflowerStrain>)`**:
  - Returns safe corridors for `tempLight`, `tempDark`, `humidity`, `ppfd`, `dli`, `leafVpd`, `airVpd`.
  - Automatically adjusts humidity ceilings for mold-sensitive cultivars in late bloom.
- **`calculateInstantVpd(tempAir: number, rh: number, leafDelta = -1.0)`**:
  - Pure Magnus-Tetens calculation returning leaf VPD, air VPD, and safety classification (`optimal`, `under-transpiring`, `over-transpiring`, `mold-risk`).
- **`predictLeafTemp(tempAir: number, rh: number, ppfd: number)`**:
  - Estimates transpiration cooling delta T based on radiation and relative humidity.

### 4.3 Module 3: Water, Substrate & Nutrient Predictions

- **`predictWaterRequirements(day: number, potVolumeL: number, potMassCurrentG?: number, potTareG?: number, potSatG?: number)`**:
  - Computes recommended irrigation volume (L) based on current substrate hydration and target dryback.
- **`predictNutrientDose(day: number, system: string, batchLiters: number, waterProfile: WaterProfile)`**:
  - Calculates base nutrients, boosters, and CalMag titrations tailored to water chemistry.

### 4.4 Module 4: Unified Live Suggestion & Validation Hook

- **`getLiveFieldSuggestions(field: string, inputPartial: string | number, context: PredictorContext)`**:
  - Primary API hook consumed by `InlineEditable` and `InlineMetricCard`.
  - Generates ranked, context-aware suggestions (e.g. for PPFD on Day 21: [Plan: 500 µmol/m²/s, Min Safe: 420 µmol/m²/s, Max Safe: 580 µmol/m²/s]).
- **`validateFieldInput(field: string, value: unknown, context: PredictorContext)`**:
  - Validates physical limits, biological corridors, and fail-closed safety invariants.

---

## 5. Candidate Dashboard Fields & Metric Mapping Matrix

| Field / Metric                | Dashboard Location       | Input Type       | In-Place Interaction                    | Prediction Engine Integration                                                       | State Mutation & Invariant Safety                                       |
| ----------------------------- | ------------------------ | ---------------- | --------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **PPFD**                      | Cockpit / Daily Operator | Number           | Click metric card → inline input        | Suggests: (1) Plan target (500), (2) Optimal range [450–550], (3) Max ceiling (600) | `addObservation` (typed `light.ppfd` measurement, non-destructive)      |
| **Klima (Temp/RH)**           | Cockpit / Daily Operator | Dual Number      | Click card → dual temp/RH input         | Live VPD preview during input; warns if RH > 65% in bloom                           | `addObservation` (typed `temperature.air.max`, `humidity.relative.max`) |
| **Leaf-VPD**                  | Cockpit / Calculator     | Number           | Click card → leaf temp / delta input    | Calculates exact leaf VPD from temp + RH + delta                                    | `addObservation` (typed `temperature.leaf`)                             |
| **Feed EC / pH**              | Cockpit / Mix Panel      | Number           | Click card → feed/drain EC & pH input   | Suggests target EC/pH from plan; checks fail-closed water gate                      | `addObservation` (typed `water.ec`, `water.ph`)                         |
| **Topfgewicht**               | Daily Operator Panel     | Number           | Click hydration gauge → mass input      | Suggests tare, saturation reference, and expected dryback mass                      | `addObservation` (typed `pot.mass`) → updates hydration gauge           |
| **Gießmenge**                 | Daily Operator / Mix     | Number           | Click watering row → volume input       | Suggests target volume (e.g. 1.2 L based on 50% dryback)                            | `addObservation` (`waterLiters`, typed irrigation measurement)          |
| **Genetik Name**              | Run Strip / Setup        | Combobox         | Click genetics tag → combobox dropdown  | Live fuzzy search across 24+ autoflower strains with auto-fill of breeder/THC/cycle | `updateRunConfig` (draft) or `updatePlantIdentity` (active run)         |
| **Run-Name**                  | Run Strip / Setup        | Text             | Click title → inline text input         | Auto-generates clean title from Strain + System + Date                              | `updateRunConfig`                                                       |
| **Startdatum / Keimung**      | Run Strip / Setup        | Date             | Click date → datepicker input           | Predicts emergence date (+3d) and full schedule                                     | `updatePlantMilestones` / `updateRunConfig`                             |
| **Batch-Liter**               | Nutrient Mix Panel       | Stepper / Number | Inline stepper input                    | Instantly recalculates all component ml amounts in real time                        | Local component state / Mix batch creation                              |
| **Wasserwerte (pH/EC/Ca/Mg)** | Setup / Water Card       | Number           | Click missing water pill → inline input | Suggests standard municipal presets (Weich / Mittel / Hart)                         | `updateRunConfig` (`water` profile)                                     |

---

## 6. State Mutation Flows & Invariant Compliance Analysis

The proposed in-place editing flow strictly honors all invariant gates specified in `AGENTS.md`:

1. **Messwert überschreibt Kalenderwert**:
   - In-place logging of actual measurements calls `addObservation(run, observation)`.
   - The canonical `02_Daily_Master` sheet remains strictly read-only and unmutated.
   - The Cockpit dynamically resolves `latestObservation(run, day)` to display actual measured values alongside plan targets.
2. **Snapshot Immutability**:
   - For active runs (`run.status !== 'draft'`), editing operational targets prompts for an override reason and creates a typed `RunOverride` via `addRunOverride(run, override)`.
   - `run.configurationSnapshot` remains untouched.
   - Audit events (`override-created` / `measurement-recorded`) and Domain events are appended.
3. **Representational Distinctness**:
   - UI visually separates **Sollwert (Plan)**, **Istwert (Messung)**, **Prognose (Prediction)**, **Override**, and **Fehlender Wert** via dedicated tokens (`var(--accent)`, `var(--tone-green)`, `var(--tone-purple)`, `var(--tone-amber)`, `var(--muted)`).
4. **Lens Independence**:
   - Experience levels (`guided`, `advanced`, `expert`) adjust explanation depth and UI density without modifying prediction math or biological safety bounds.
5. **Fail-Closed Safety Gates**:
   - If water chemistry is unknown, inline nutrient dosage suggestions block CalMag and Athena titration.
6. **Mobile Accessibility**:
   - Minimum 44×44px touch targets on mobile, full keyboard navigation (Enter/Esc/Arrows/Tab), and visible focus rings.

---

## 7. Actionable Implementation Blueprint for Worker Agents

1. **Phase 1 — Prediction Engine Core (`src/prediction-engine.ts`)**:
   - Implement all 4 modules: Genetics Combobox, Corridor Predictor, Physical VPD/DLI Inferences, and Unified `getLiveFieldSuggestions` hook.
   - Create comprehensive unit tests in `src/prediction-engine.test.ts`.
2. **Phase 2 — UI Primitives (`src/components/common/`)**:
   - Build `InlineEditable.tsx` and `InlineMetricCard.tsx`.
   - Add responsive styles and suggestion popover animations in `src/styles.css`.
3. **Phase 3 — Cockpit & Dashboard Panel Integration**:
   - Upgrade `function Cockpit` in `src/App.tsx` to use `InlineMetricCard` for all 6 core metrics.
   - Add inline strain auto-complete to the Run Strip.
   - Enhance `DailyOperatorPanel.tsx` and `NutrientMixPanel.tsx` with inline target adjustments and live prediction hints.
4. **Phase 4 — Quality Gate & Regression Verification**:
   - Run `pnpm check` (lint, typecheck, build, unit tests, contract checks).
