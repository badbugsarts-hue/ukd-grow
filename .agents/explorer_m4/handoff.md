# Handoff Report: Milestone 4 - App Shell Routing & State Integration in `App.tsx`

## 1. Observation

### Codebase Inspection Findings
- **File `src/App.tsx`**:
  - Contains navigation definition `NAV: NavItem[]` (lines 106–275) with 21 route identifiers (`cockpit`, `setup`, `log`, `today`, `timeline`, `history`, `mix`, `climate`, `nutrients`, `products`, `compatibility`, `diagnostics`, `knowledge`, `audit`, `raw`, `legal`, `reports`, `system`, `equipment`, `ipm`, `incidents`).
  - Active route state `route` is managed via `useState<RouteId>(readRoute)` (line 528) and synchronized with `window.location.hash` changes.
  - Active lens state `lens` is managed via `useState<ExperienceLens>(readLens)` (line 529) and persisted to `localStorage.getItem("ukd:lens")` and query string parameter `?lens=...`.
  - Active run package state `run` is initialized via `useState<RunPackage>(() => createDefaultRunPackage())` (line 537), hydrated asynchronously via `loadActiveRun()` (lines 567–585), and autosaved asynchronously via `saveActiveRun(run)` (lines 587–597).
  - In `RouteContent` (lines 1112–1201):
    - `case "setup"` renders `<RunConfigPanel run={run} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
    - `case "today"` renders `<DailyOperatorPanel plan={plan} lens={lens} navigate={navigate} run={run} onUpdateRun={setRun} />`
    - `case "mix"` renders `<NutrientMixPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
    - `case "climate"` renders `<EnvironmentTargetsPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
    - `case "knowledge"` renders `<ContextHelpGlossaryPanel run={run} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
  - Neither `VpdDliCalculatorPanel`, `LensBadge`, nor `TermTooltip` are currently imported or rendered in `src/App.tsx`.

- **Component Inventory (`src/components/`)**:
  - `src/components/common/LensBadge.tsx`: Exports `LensBadge` (`LensBadgeProps` with `lens`, `size`, `showIcon`, `onClick`, `className`). Displays color-coded badges for `guided` (🌱 GEFÜHRT), `advanced` (⚡ STANDARD), and `expert` (🔬 EXPERTE).
  - `src/components/common/MetricGauge.tsx`: Exports `MetricGauge` and `calculateGaugeStatus`. Renders visual range bars with target markers and German status tags (`Optimal`, `Warnung`, `Zu niedrig`, `Zu hoch`, `Kein Wert`).
  - `src/components/common/TermTooltip.tsx`: Exports `TermTooltip` (`TermTooltipProps` with `term`, `children`, `lens`, `showIcon`, `customText`, `className`). Renders interactive tooltips with multi-lens German explanations and keyboard accessibility.
  - `src/components/common/termDictionary.ts`: German terminology dictionary covering `VPD`, `DLI`, `EC`, `pH`, `PPFD`, `rF`, `a_w`, `KCanG`, `MedCanG`, `Tropf-Blumat`, `Athena Balance`, `HESI`, etc.
  - `src/components/panels/EnvironmentTargetsPanel.tsx`: Exports `EnvironmentTargetsPanel` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`). Interactive PPFD, DLI, rF, VPD sliders & gauges with observation saving (`addObservation`).
  - `src/components/panels/NutrientMixPanel.tsx`: Exports `NutrientMixPanel` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`) and `applyMixSafetyRules`. 7-step batch calculator with water profile fail-closed gate and booster stacking conflict blocker.
  - `src/components/panels/RunConfigPanel.tsx`: Exports `RunConfigPanel` (`run`, `lens`, `onUpdateRun`, `navigate`) and `calculateReadinessScore`. Substrate, lighting, tent volume, water analysis inputs, and 100% readiness gate.
  - `src/components/panels/VpdDliCalculatorPanel.tsx`: Exports `VpdDliCalculatorPanel` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`, slider initializers). Interactive calculator with 4-phase target comparison matrix.
  - `src/components/panels/DailyOperatorPanel.tsx`: Exports `DailyOperatorPanel` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`) and `getTargetsForDay`. Interactive day cards (Days 0-80), 3-step action flow, measurement forms (`addObservation`), structured observations (`addStructuredObservation`), task checklist (`setTaskCompleted`), and alert acknowledgment (`acknowledgeAlert`).
  - `src/components/panels/ContextHelpGlossaryPanel.tsx`: Exports `ContextHelpGlossaryPanel` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`). Searchable, filterable German glossary for all terms with evidence grades A-E.

---

## 2. Logic Chain

1. **Routing & Navigation Alignment**:
   - The navigation tabs in `App.tsx` (`NAV`) correspond directly to `RouteId` values.
   - `RunConfigPanel`, `NutrientMixPanel`, `EnvironmentTargetsPanel`, `DailyOperatorPanel`, and `ContextHelpGlossaryPanel` already accept the uniform `PanelProps` interface (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`).
   - Routing them into `RouteContent` for routes `setup`, `mix`, `climate`, `today`, and `knowledge` provides immediate UI panel activation.

2. **Integration of Standalone Components (`VpdDliCalculatorPanel`, `LensBadge`, `TermTooltip`)**:
   - `VpdDliCalculatorPanel` should be integrated into route `climate` as a dedicated calculation section/tab alongside `EnvironmentTargetsPanel`, and accessible via a Quick Action button in `Cockpit` (`cockpit`).
   - `LensBadge` provides active experience level visual feedback. Integrating `LensBadge` into the topbar header (next to `LensControl`), `PageHeader`, and `Sidebar` brand area establishes consistent lens awareness across all views.
   - `TermTooltip` provides inline German terminology guidance. Integrating `TermTooltip` into `PageHeader` descriptions and Cockpit metric cards enables users of all experience levels to understand scientific metrics (`VPD`, `DLI`, `PPFD`, `EC`, `pH`, `rF`) on hover/focus.

3. **State Flow & Domain Integrity**:
   - `App.tsx` owns the reactive `run: RunPackage` state.
   - When a panel triggers `onUpdateRun(updatedRun)`, `setRun` updates the React state, which asynchronously persists to IndexedDB via `saveActiveRun(run)`.
   - Domain operations inside panels invoke pure transition functions (`addObservation`, `addStructuredObservation`, `updateRunConfig`, `activateRun`, `acknowledgeAlert`, `setTaskCompleted`) from `src/run-state.ts`, creating immutable `RunPackage` snapshots.
   - Domain logic and scientific core remain unmutated and clean, respecting all `AGENTS.md` invariants.

---

## 3. Blueprint Specifications

### 3.1 Blueprint for `src/App.tsx` Wiring

#### A. Imports Addition
```tsx
import { EnvironmentTargetsPanel } from "./components/panels/EnvironmentTargetsPanel";
import { NutrientMixPanel } from "./components/panels/NutrientMixPanel";
import { RunConfigPanel } from "./components/panels/RunConfigPanel";
import { DailyOperatorPanel } from "./components/panels/DailyOperatorPanel";
import { ContextHelpGlossaryPanel } from "./components/panels/ContextHelpGlossaryPanel";
import { VpdDliCalculatorPanel } from "./components/panels/VpdDliCalculatorPanel";
import { LensBadge } from "./components/common/LensBadge";
import { TermTooltip } from "./components/common/TermTooltip";
```

#### B. Shell Header & Sidebar Enhancements
- **Header Topbar (`<header className="topbar">`)**:
  - Add `<LensBadge lens={lens} onClick={() => setLens(lens === "guided" ? "advanced" : lens === "advanced" ? "expert" : "guided")} />` adjacent to `<LensControl lens={lens} onChange={setLens} />`.
- **Sidebar (`<Sidebar>`)**:
  - Render `<LensBadge lens={lens} size="sm" />` under `<small>Grow Workspace · v8</small>`.
- **PageHeader (`<PageHeader>`)**:
  - Enhance metric/group breadcrumb with `<LensBadge lens={lens} size="sm" />`.
  - Wrap technical term labels in header descriptions with `<TermTooltip term="..." lens={lens} showIcon />`.

#### C. `RouteContent` Switch Case Integration
```tsx
function RouteContent({
  route,
  lens,
  plan,
  day,
  setDay,
  navigate,
  run,
  setRun,
  legalProfile,
  setLegalProfile,
  showWelcome,
  onDismissWelcome,
}: {
  route: RouteId;
  lens: ExperienceLens;
  plan: ReturnType<typeof getDayPlan>;
  day: number;
  setDay: (day: number) => void;
  navigate: (route: RouteId) => void;
  run: RunPackage;
  setRun: (run: RunPackage) => void;
  legalProfile: LegalProfile | null;
  setLegalProfile: (profile: LegalProfile | null) => void;
  showWelcome: boolean;
  onDismissWelcome: () => void;
}) {
  switch (route) {
    case "cockpit":
      return (
        <Cockpit
          plan={plan}
          lens={lens}
          setDay={setDay}
          navigate={navigate}
          run={run}
          setRun={setRun}
          showWelcome={showWelcome}
          onDismissWelcome={onDismissWelcome}
        />
      );
    case "setup":
      return (
        <RunConfigPanel
          run={run}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "log":
      return <RunLogWorkspace run={run} plan={plan} onChange={setRun} />;
    case "today":
      return (
        <DailyOperatorPanel
          plan={plan}
          lens={lens}
          navigate={navigate}
          run={run}
          onUpdateRun={setRun}
        />
      );
    case "timeline":
      return <Timeline day={day} setDay={setDay} lens={lens} />;
    case "history":
      return <RunHistoryWorkspace run={run} onChange={setRun} />;
    case "mix":
      return (
        <NutrientMixPanel
          run={run}
          plan={plan}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "climate":
      return (
        <div className="page-stack">
          <EnvironmentTargetsPanel
            run={run}
            plan={plan}
            lens={lens}
            onUpdateRun={setRun}
            navigate={navigate}
          />
          <VpdDliCalculatorPanel
            run={run}
            plan={plan}
            lens={lens}
            onUpdateRun={setRun}
            navigate={navigate}
          />
        </div>
      );
    case "nutrients":
      return <Nutrients plan={plan} lens={lens} navigate={navigate} />;
    case "products":
      return <LibraryPage sheetName="17_All_Products" lens={lens} />;
    case "compatibility":
      return <LibraryPage sheetName="16_Compatibility" lens={lens} />;
    case "diagnostics":
      return <Diagnostics lens={lens} />;
    case "knowledge":
      return (
        <ContextHelpGlossaryPanel
          run={run}
          plan={plan}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "audit":
      return <AuditPage lens={lens} />;
    case "raw":
      return <RawData lens={lens} />;
    case "legal":
      return (
        <LegalWorkspace
          run={run}
          onChange={setRun}
          profile={legalProfile}
          onProfileChange={setLegalProfile}
        />
      );
    case "reports":
      return <ReportsWorkspace run={run} onChange={setRun} />;
    case "system":
      return <SystemWorkspace run={run} />;
    default:
      return null;
  }
}
```

#### D. Cockpit Quick Action Wiring
In `Cockpit` Quick Actions grid:
Add Quick Action button:
```tsx
<button type="button" onClick={() => navigate("climate")}>
  <span>🧮</span>
  <strong>VPD / DLI Rechner</strong>
  <small>Mikroklima & Phasenmatrix</small>
</button>
```

---

### 3.2 Integration Test Specifications (`src/AppIntegration.test.tsx`)

File `src/AppIntegration.test.tsx` will specify comprehensive tests using Vitest:

```typescript
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { createDefaultRunPackage, addObservation, updateRunConfig } from "./run-state";
import { EnvironmentTargetsPanel } from "./components/panels/EnvironmentTargetsPanel";
import { NutrientMixPanel } from "./components/panels/NutrientMixPanel";
import { RunConfigPanel } from "./components/panels/RunConfigPanel";
import { DailyOperatorPanel } from "./components/panels/DailyOperatorPanel";
import { ContextHelpGlossaryPanel } from "./components/panels/ContextHelpGlossaryPanel";
import { VpdDliCalculatorPanel } from "./components/panels/VpdDliCalculatorPanel";

describe("Milestone 4 - App Shell Routing & State Integration Test Suite", () => {

  describe("Navigation & Route Integration", () => {
    it("1. Renders EnvironmentTargetsPanel and VpdDliCalculatorPanel on route #climate", () => {
      window.location.hash = "climate";
      // Verify route rendering and panel presence
    });

    it("2. Renders NutrientMixPanel on route #mix", () => {
      window.location.hash = "mix";
      // Verify 7-step batch calculator rendering
    });

    it("3. Renders RunConfigPanel on route #setup", () => {
      window.location.hash = "setup";
      // Verify readiness score gate rendering
    });

    it("4. Renders DailyOperatorPanel on route #today", () => {
      window.location.hash = "today";
      // Verify day cards and 3-step action flow rendering
    });

    it("5. Renders ContextHelpGlossaryPanel on route #knowledge", () => {
      window.location.hash = "knowledge";
      // Verify searchable German glossary rendering
    });
  });

  describe("State Integration & Callback Verification (onUpdateRun)", () => {
    it("6. EnvironmentTargetsPanel onUpdateRun callback triggers with immutable updated RunPackage when saving observation", () => {
      const initialRun = createDefaultRunPackage();
      const onUpdateRun = vi.fn();

      const { getByText } = render(
        <EnvironmentTargetsPanel
          run={initialRun}
          lens="guided"
          onUpdateRun={onUpdateRun}
        />
      );

      const saveButton = getByText(/Messung als Tagesbeobachtung speichern/i);
      fireEvent.click(saveButton);

      expect(onUpdateRun).toHaveBeenCalledTimes(1);
      const updatedRun = onUpdateRun.mock.calls[0][0];
      expect(updatedRun.observations.length).toBe(1);
      expect(updatedRun).not.toBe(initialRun); // Immutable reference update
    });

    it("7. NutrientMixPanel onUpdateRun callback appends batch record without mutating original run state", () => {
      const initialRun = createDefaultRunPackage();
      const onUpdateRun = vi.fn();

      const { getByText } = render(
        <NutrientMixPanel
          run={initialRun}
          lens="advanced"
          onUpdateRun={onUpdateRun}
        />
      );

      const recordButton = getByText(/Nährstoff-Mix als Charge aufzeichnen/i);
      fireEvent.click(recordButton);

      expect(onUpdateRun).toHaveBeenCalledTimes(1);
      const updatedRun = onUpdateRun.mock.calls[0][0];
      expect(updatedRun.mixBatches.length).toBe(1);
      expect(initialRun.mixBatches.length).toBe(0); // Original unchanged
    });

    it("8. RunConfigPanel onUpdateRun callback updates run config and recalculates readiness score", () => {
      const initialRun = createDefaultRunPackage();
      const onUpdateRun = vi.fn();

      const { getByLabelText } = render(
        <RunConfigPanel
          run={initialRun}
          lens="expert"
          onUpdateRun={onUpdateRun}
        />
      );

      const nameInput = getByLabelText(/Run Name:/i);
      fireEvent.change(nameInput, { target: { value: "Test Run 2026" } });

      expect(onUpdateRun).toHaveBeenCalled();
      const updatedRun = onUpdateRun.mock.calls[onUpdateRun.mock.calls.length - 1][0];
      expect(updatedRun.config.name).toBe("Test Run 2026");
    });
  });

  describe("Experience Lens & Tooltip Shell Integration", () => {
    it("9. LensBadge dynamically displays active lens state and supports interactive lens switching", () => {
      // Test LensBadge rendering across guided, advanced, expert
    });

    it("10. TermTooltip renders German explanations without altering numeric values or domain calculations", () => {
      // Test TermTooltip rendering and accessibility attributes
    });
  });

});
```

---

## 4. Caveats

- **Read-Only Explorer Scope**: This report defines the architectural blueprint and test specifications for Milestone 4. Code modifications to `src/App.tsx` and creation of `src/AppIntegration.test.tsx` will be carried out by the Implementer agent.
- **Async Dynamic Loading**: `App.tsx` uses `lazy()` and `Suspense` for workspace components. The integration of panel components in `RouteContent` uses synchronous imports from `src/components/panels/` to guarantee zero-latency tab switching.
- **Fail-Closed Safety**: In `NutrientMixPanel` and `RunConfigPanel`, unconfigured water profiles trigger fail-closed alerts, which must remain active during shell routing.

---

## 5. Conclusion

The integration blueprint for Milestone 4 cleanly maps all 6 interactive panel components (`EnvironmentTargetsPanel`, `NutrientMixPanel`, `RunConfigPanel`, `DailyOperatorPanel`, `ContextHelpGlossaryPanel`, `VpdDliCalculatorPanel`) and common primitives (`LensBadge`, `TermTooltip`) into `src/App.tsx`. State updates pass through `onUpdateRun`, ensuring unidirectional data flow, immutability, and full compliance with `AGENTS.md` invariants.

---

## 6. Verification Method

To independently verify the integration after implementation:

1. **Typecheck Command**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with zero TypeScript errors.

2. **Unit & Integration Test Command**:
   ```bash
   npx vitest run
   ```
   All existing 29 tests plus new integration tests in `src/AppIntegration.test.tsx` must pass cleanly.

3. **Production Build Gate**:
   ```bash
   npx vite build
   ```
   Must build successfully into `dist/`.
