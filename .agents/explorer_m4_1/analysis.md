# Blueprint & Integration Analysis: App Shell Routing & State Integration (Milestone 4)

## Executive Summary

Milestone 4 (M4) integrates all Master Class interactive input and context panels into `src/App.tsx`, providing a unified, reactive, 2026-level web application shell for the UKD Grow Masterplan.

The scope encompasses:

1. Routing integration for all core interactive panels (`today`, `mix`, `setup`, `climate`, `knowledge`, `calc`).
2. Header Experience Lens Selector (`guided`, `advanced`, `expert`) with `LensBadge` display and dual-persistence (`localStorage` + URL query params).
3. Immutable unidirectional state binding of `run: RunPackage` and `onUpdateRun: (updatedRun: RunPackage) => void` across all panel components.
4. Seamless cross-panel navigation via `navigate(route)`.
5. Strict preservation of existing backup/restore SHA-256 gates, legal disclaimers, audit logs, and app shell utilities.
6. Guaranteed 100% preservation of all existing unit and component tests (`npx tsc --noEmit` and `npx vitest run`).

---

## 1. Route & Navigation Integration

### 1.1 Route Definition (`src/types.ts`)

The `RouteId` union in `src/types.ts` is expanded to explicitly include the standalone `calc` route for `VpdDliCalculatorPanel`:

```typescript
export type RouteId =
  | "cockpit"
  | "setup"
  | "log"
  | "today"
  | "timeline"
  | "history"
  | "mix"
  | "climate"
  | "nutrients"
  | "products"
  | "compatibility"
  | "diagnostics"
  | "knowledge"
  | "audit"
  | "raw"
  | "legal"
  | "reports"
  | "system"
  | "equipment"
  | "ipm"
  | "incidents"
  | "calc";
```

### 1.2 Navigation Registry (`src/App.tsx`)

The `NAV` array in `src/App.tsx` is updated to include the `calc` route under the `"Werkzeuge"` group:

```typescript
  {
    id: "calc",
    label: "VPD & DLI Rechner",
    short: "Rechner",
    icon: "🧮",
    group: "Werkzeuge",
    description: "VPD & DLI Schnellrechner und 4-Phasen-Matrix",
  },
```

### 1.3 Help & Guidance Registries

The `HELP` and `GUIDED_HINTS` lookup tables in `src/App.tsx` are extended with canonical German explanations:

```typescript
// HELP dictionary extension:
  calc: {
    what: "Interaktiver Schnellrechner für VPD, DLI und 4-Phasen-Klimamatrix.",
    why: "Ermöglicht schnelle Vorab-Simulationen von Temperatur, Luftfeuchte, PPFD und Photoperiode.",
    how: "Regler für Temperatur, RLF und Licht anpassen und Zielkorridore vergleichen.",
    interpret: "Die Berechnungen nutzen die kanonischen Formeln für Leaf-VPD und DLI.",
  },

// GUIDED_HINTS dictionary extension:
  calc: "Simuliere hier Temperatur, Luftfeuchte und Lichtwerte, um VPD und DLI vorab zu berechnen und mit den Phasen-Zielwerten zu vergleichen.",
```

---

## 2. Header & Experience Lens Integration

### 2.1 Lens Controls and `LensBadge` Integration

The header topbar in `App.tsx` contains the `LensControl` component and displays the active `LensBadge`:

```tsx
<div className="topbar-actions">
  <LensBadge lens={lens} size="sm" onClick={() => setHelpOpen(true)} />
  <LensControl lens={lens} onChange={setLens} />
</div>
```

### 2.2 Dual State Persistence

`Workspace()` manages the `lens` state (`"guided" | "advanced" | "expert"`):

- **Initialization**: `readLens()` reads `?lens=` from URL search params, falling back to `localStorage.getItem("ukd:lens")`, defaulting to `"guided"`.
- **Synchronization**: `useEffect` updates `localStorage.setItem("ukd:lens", lens)` and syncs `window.history.replaceState({}, "", url)` without reloading the page.

---

## 3. Unidirectional State Binding (`RunPackage` & `onUpdateRun`)

`App.tsx` (`Workspace`) owns the reactive `run: RunPackage` state, loaded asynchronously from IndexedDB (`loadActiveRun()`) and autosaved on state changes (`saveActiveRun(run)`).

### Component Wiring Matrix

| Route ID    | Component                  | Props Bound                               | State Callback                                           | Cross-Panel Navigation |
| ----------- | -------------------------- | ----------------------------------------- | -------------------------------------------------------- | ---------------------- |
| `today`     | `DailyOperatorPanel`       | `run={run}`, `plan={plan}`, `lens={lens}` | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `mix`       | `NutrientMixPanel`         | `run={run}`, `plan={plan}`, `lens={lens}` | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `setup`     | `RunConfigPanel`           | `run={run}`, `lens={lens}`                | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `climate`   | `EnvironmentTargetsPanel`  | `run={run}`, `plan={plan}`, `lens={lens}` | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `knowledge` | `ContextHelpGlossaryPanel` | `run={run}`, `plan={plan}`, `lens={lens}` | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `calc`      | `VpdDliCalculatorPanel`    | `run={run}`, `plan={plan}`, `lens={lens}` | `onUpdateRun={setRun}`                                   | `navigate={navigate}`  |
| `cockpit`   | `Cockpit`                  | `run={run}`, `plan={plan}`, `lens={lens}` | `setRun={setRun}`                                        | `navigate={navigate}`  |
| `log`       | `RunLogWorkspace`          | `run={run}`, `plan={plan}`                | `onChange={setRun}`                                      | —                      |
| `history`   | `RunHistoryWorkspace`      | `run={run}`                               | `onChange={setRun}`                                      | —                      |
| `legal`     | `LegalWorkspace`           | `run={run}`, `profile={legalProfile}`     | `onChange={setRun}`, `onProfileChange={setLegalProfile}` | —                      |
| `reports`   | `ReportsWorkspace`         | `run={run}`                               | `onChange={setRun}`                                      | —                      |

---

## 4. Route Content Dispatcher Blueprint (`RouteContent`)

Below is the concrete wiring structure in `RouteContent` for `src/App.tsx`:

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
        <EnvironmentTargetsPanel
          run={run}
          plan={plan}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "calc":
      return (
        <VpdDliCalculatorPanel
          run={run}
          plan={plan}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
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
  }
}
```

---

## 5. Preservation of Safety & Legal Gates

1. **Storage & Persistence Safety**:
   - `loadActiveRun()` loads from IndexedDB on startup.
   - Debounced `saveActiveRun(run)` persists state. Fallback banner alerts operator if local storage is disabled or quota exceeded.
2. **Legal & Compliance Gate**:
   - `LegalWorkspace` manages session-bound `LegalProfile` imports without storing sensitive personal records in `localStorage` or telemetry (AGENTS.md Invariant).
3. **Evidence Guarded Data**:
   - `evidence-guarded-workbook-v8.json` (27 sheets) and `knowledge-base.json` (55 audit findings) loaded asynchronously with fail-safe error screens.
4. **Command Palette & Keyboard Accessibility**:
   - `Ctrl+K` command palette, `?` help overlay, and `Escape` key handlers preserved intact.

---

## 6. Verification Plan

1. **TypeScript Type Safety**: Run `npx tsc --noEmit` to confirm 0 type errors across `src/types.ts` and `src/App.tsx`.
2. **Vitest Unit & Component Test Suite**: Run `npx vitest run` to ensure all 9 test suites (112 tests) pass without regression.
3. **Vite Build**: Run `npx vite build` to verify production bundle generation.
