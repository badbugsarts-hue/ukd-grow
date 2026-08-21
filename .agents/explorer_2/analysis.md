# Master Class Input Panels & App Shell State Flow Analysis

**Author**: Explorer 2 (App Shell & State Flow Explorer)  
**Date**: 2026-08-11  
**Target Repository**: UKD Grow Masterplan 2026 (`src/App.tsx`, `src/domain.ts`, `src/run-state.ts`, `src/run-storage.ts`, `src/scientific-core.ts`)

---

## 1. Executive Summary

This report presents a thorough analysis of the UKD Grow Masterplan application shell (`App.tsx`), experience level mechanisms (`guided`, `advanced`, `expert`), state flow pipelines, storage contracts (`run-storage.ts`), and scientific core validation (`scientific-core.ts`).

The objective is to establish an architectural blueprint for integrating new **"Master Class" input panels** located in `src/components/` into `App.tsx` and workspace views, ensuring:

- **Zero regression** on existing domain calculations, state machines, and IndexedDB storage contracts (`RunPackage-v3`).
- **Strict compliance** with `AGENTS.md` invariants (read-only plan snapshots, immutable event streams, clear separation of planned vs. measured values).
- **High UX standards** tailored for all experience levels in clear German terminology with tooltips and visual safety gates.

---

## 2. Current App Shell Architecture & Navigation

### 2.1 Component Lifecycle & Data Ingestion

1. **`App` (`src/App.tsx:448-520`)**:
   - Asynchronously loads canonical JSON snapshots: `evidence-guarded-workbook-v8.json` (Workbook), `legacy-audit.json`, `knowledge-base.json`, `ai-context.json`, and `skills.json`.
   - Displays a loading screen during hydration and renders `<Workspace />` upon completion.
2. **`Workspace` (`src/App.tsx:522-779`)**:
   - Manages top-level application state:
     - `route`: `RouteId` (synced with `window.location.hash`, defaults to `"cockpit"`).
     - `lens`: `ExperienceLens` (`"guided" | "advanced" | "expert"`), synced with `localStorage.getItem("ukd:lens")` and URL query parameter `?lens=...`.
     - `day`: `number` (0 to 80), synced with `localStorage.getItem("ukd:day")` and URL query parameter `?day=...`.
     - `theme`: `"light" | "dark"`, synced with `localStorage.getItem("ukd:theme")` and `document.documentElement.dataset.theme`.
     - `run`: `RunPackage` (v4 schema `RUN_SCHEMA_VERSION = "4.0.0"`), loaded via `loadActiveRun()`.
     - Overlays: `helpOpen` (`HelpDrawer`), `paletteOpen` (`CommandPalette`), `navOpen` (Mobile Sidebar).
   - Automatically debounces (250ms) changes to `run` and persists them to IndexedDB using `saveActiveRun(run)`.

### 2.2 Navigation Structure (`NAV`)

The shell organizes 21 routes into 6 logical groups:

- **Operator**: `cockpit`, `setup`, `log`, `today`, `timeline`, `history`
- **Werkzeuge**: `mix`, `climate`, `incidents`
- **Bibliothek**: `products`, `compatibility`, `diagnostics`, `ipm`, `nutrients`
- **Evidenz**: `knowledge`, `audit`
- **System**: `raw`, `legal`, `reports`, `system`, `equipment`

### 2.3 Experience Level Lenses (`ExperienceLens`)

- **`guided`**: Filters the sidebar to core routes (`GUIDED_CORE_ROUTES`), displays top guidance banners (`GuidedBanner`), provides step-by-step action instructions (`💡`), truncates large datasets (max 25 rows), and hides formula/trace panels.
- **`advanced`**: Displays full data tables, complete metrics, mixing protocols (`MixOrder`), and detailed checklists without inline beginner banners.
- **`expert`**: Exposes formula inspection (`ExpertTrace`), raw cell formula toggles, detailed provenance tracing, JSON inspect blocks, and raw model exports.

_Invariant Check_: Experience levels alter layout density, visual cues, and explanation levels—they **never** alter calculated results, formulas, or safety rules.

---

## 3. State Management & Storage Contracts

### 3.1 `RunPackage` (v4 Schema) Invariants

- `RunPackage` is an immutable state tree (`src/types.ts:518-566`).
- Active snapshots (`run.configurationSnapshot`) are immutable once a run moves from `"draft"` to `"active"`.
- Every state modification appends to immutable event streams:
  - `auditEvents`: Human-readable audit trails (`AuditEvent`).
  - `domainEvents`: Machine-parsable events for state projections (`DomainEvent`).
  - `events`: User-facing timeline entries (`RunEvent`).

### 3.2 Canonical State Mutator Functions (`src/run-state.ts`)

Existing domain functions that must be used by input panels (no direct state mutations):

- `addObservation(run, observation)`: Adds daily measurements (`DailyObservation`) and extracts typed `Measurement` items.
- `addStructuredObservation(run, observation)`: Records category/severity-based qualitative observations.
- `updateRunConfig(run, config)`: Updates setup parameters (genetics, light wattage, medium, water profile).
- `setTaskCompleted(run, day, task, completed)`: Updates daily operational checklist task status.
- `supersedeMeasurement(run, measurementId, correctedValue, reason)`: Appends measurement corrections with audit rationale.
- `addRunOverride(run, override)`: Registers intentional deviations with required justification.

### 3.3 Storage Pipeline (`src/run-storage.ts`)

- **Primary Store**: IndexedDB database `ukd-operator-workspace` (Store `run-packages-v3`).
- **Autosave Gate**: Triggered in `Workspace` on `run` state change with 250ms debounce window.
- **Schema Validation**: Validates loaded data via `validateRunPackage(raw)`. Failed validation returns `null` or prompts backup restoration without crashing the app shell.

---

## 4. Proposed "Master Class" Input Panel Directory & Component Architecture

To maintain code clarity and adhere to modular architecture guidelines, all new "Master Class" input panels and support UI elements should be placed inside a new directory: `src/components/`.

### 4.1 Recommended Component Hierarchy

```
src/
├── components/
│   ├── common/
│   │   ├── TermTooltip.tsx         # Inline hover/focus German terminology explainer (VPD, DLI, EC, pH, etc.)
│   │   ├── LensBadge.tsx           # Displays experience level indicator tag (Guided/Advanced/Expert)
│   │   └── MetricGauge.tsx         # Visual indicator showing actual vs target range with status tones
│   └── panels/
│       ├── DailyObservationPanel.tsx  # Master Class Panel for logging daily measurements (log/today routes)
│       ├── NutrientMixPanel.tsx       # Master Class Panel for batch mixing & dose calculations (mix route)
│       ├── ClimateControlPanel.tsx    # Master Class Panel for light & VPD environment inputs (climate route)
│       └── WaterBaselinePanel.tsx     # Master Class Panel for source water chemistry & setup (setup route)
```

---

## 5. Component Specifications & Prop Contracts

### 5.1 Common Support Components

#### `TermTooltip`

Provides clear German explanations for technical terminology.

```typescript
export interface TermTooltipProps {
  term: "VPD" | "DLI" | "PPFD" | "EC" | "pH" | "Dryback" | "Drain";
  children: React.ReactNode;
  lens?: ExperienceLens;
}
```

_Terminology Dictionary_:

- **VPD**: _Dampfdruckdefizit_ – Maß für das Verdunstungspotenzial der Luft. Beeinflusst Nährstoffaufnahme und Transpiration.
- **DLI**: _Tägliche Lichtmenge (Daily Light Integral)_ – Gesamtmenge an nutzbarer Lichtstrahlung pro Quadratmeter an einem Tag (mol/m²/d).
- **PPFD**: _Photosynthetische Photonenflussdichte_ – Momentane Lichtintensität am Pflanzendach (µmol/m²/s).
- **EC**: _Elektrische Leitfähigkeit_ – Stärke der Nährstoffkonzentration in der Lösung (mS/cm).
- **pH**: _Säuregrad_ – Bestimmt die chemische Verfügbarkeit von Nährstoffen an den Wurzeln.
- **Dryback**: _Abtrocknungsrate_ – Gewichtsdifferenz des Topfes zwischen Bewässerungszyklen.

---

### 5.2 Master Class Input Panels

#### 1. `DailyObservationPanel`

Used in `log` (`RunLogWorkspace`) and `today` (`Today`) views.

```typescript
export interface DailyObservationPanelProps {
  run: RunPackage;
  plan: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
}
```

_Inputs & Mechanics_:

- Quantitative inputs: Air Temp Max/Min, Humidity Max/Min, Leaf Temp, PPFD, pH In, EC In, pH Drain, EC Drain, Water Volume, Drain Volume, Pot Mass, Plant Height.
- Qualitative input: Plant Stress rating (`none` | `slight` | `moderate` | `severe`) with notes.
- Flow: Validates inputs using plausibility bounds, creates `DailyObservation` via `createObservation(plan.day)`, calls `addObservation(run, obs)`, and passes the resulting `RunPackage` to `onUpdateRun`.

#### 2. `NutrientMixPanel`

Used in `mix` (`MixLab`) view.

```typescript
export interface NutrientMixPanelProps {
  plan: DayPlan;
  lens: ExperienceLens;
  run: RunPackage;
  onUpdateRun?: (updatedRun: RunPackage) => void;
}
```

_Inputs & Mechanics_:

- Interactive batch volume slider/input (Liters).
- Calculates product doses using `calculateMix(plan, liters)`.
- Displays step-by-step chemical safety mixing order:
  1. Measure fresh source water.
  2. Mix Athena Balance (if applicable) completely first.
  3. Mix CalMag (if required by water profile).
  4. Mix HESI Base nutrient.
  5. Add single-role additives (PowerZyme, SuperVit, Boost, PK13/14).
  6. Homogenize and measure final pH; adjust with pH Down only as final step.

#### 3. `ClimateControlPanel`

Used in `climate` (`Climate`) view.

```typescript
export interface ClimateControlPanelProps {
  plan: DayPlan;
  lens: ExperienceLens;
  run: RunPackage;
  onUpdateRun: (updatedRun: RunPackage) => void;
}
```

_Inputs & Mechanics_:

- Photoperiod (hours), Light Power (Watts), Canopy Distance (cm), Measured PPFD, Air Temperature (°C), Relative Humidity (%), Leaf Temperature Offset (°C).
- Real-time calculations: Leaf-VPD via `calculateLeafVpd(airTemp, rh, leafDelta)`, DLI via `calculateDli(ppfd, hours)`.
- Compares calculated Leaf-VPD against target corridor for current phase.

#### 4. `WaterBaselinePanel`

Used in `setup` (`RunSetupWorkspace`) view.

```typescript
export interface WaterBaselinePanelProps {
  run: RunPackage;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
}
```

_Inputs & Mechanics_:

- Source water pH, EC, Calcium (mg/L), Magnesium (mg/L), Bicarbonate (HCO₃⁻).
- Updates `run.config.water` via `updateRunConfig(run, newConfig)`.

---

## 6. Integration Strategy in `App.tsx`

To integrate these components seamlessly:

1. **Import Structure**: Import panel components cleanly into `App.tsx` or route workspace files (`RunWorkspace.tsx`).
2. **State Propagation**: `Workspace` passes `run`, `plan`, `lens`, and `setRun` to `RouteContent`. `RouteContent` delegates to specific route components (`Cockpit`, `Today`, `MixLab`, `Climate`, `RunLogWorkspace`, `RunSetupWorkspace`).
3. **Autosave Safety**: Because `setRun` updates state in `Workspace`, the existing `useEffect` automatically triggers debounced save (`saveActiveRun`). No custom storage calls are needed inside child input components!
4. **CSS Token Alignment**: All panels use CSS variable tokens defined in `src/styles.css` (`var(--bg)`, `var(--surface-1)`, `var(--surface-2)`, `var(--green)`, `var(--blue)`, `var(--amber)`, `var(--red)`, `var(--purple)`, `var(--radius)`, `var(--line)`).

---

## 7. Verification & Parity Matrix

| Verification Aspect         | Method                         | Pass Criteria                                                            |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Type Safety                 | `npx tsc --noEmit`             | Clean compilation, zero TypeScript errors                                |
| Test Suite                  | `npx vitest run`               | All existing unit tests pass (29/29)                                     |
| Production Build            | `npx vite build`               | Successfully bundles dist artifacts                                      |
| Experience Level Invariance | Manual inspection / code audit | Calculation outputs identical across Guided, Advanced, and Expert lenses |
| Storage Integrity           | IndexedDB test                 | Active run rehydrated accurately without schema mutation                 |

---

## 8. Recommendations for Implementation Team

1. Create directory `src/components/common` and `src/components/panels`.
2. Implement `TermTooltip.tsx` first so tooltips can be attached to input labels across all panels.
3. Implement `DailyObservationPanel.tsx` and integrate it into `RunLogWorkspace.tsx` and `Today` route.
4. Implement `NutrientMixPanel.tsx` and integrate into `MixLab`.
5. Implement `ClimateControlPanel.tsx` and integrate into `Climate`.
6. Run full verification gate (`pnpm check` or `npx tsc --noEmit && npx vitest run && npx vite build`).
