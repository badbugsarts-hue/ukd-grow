# Handoff Report — Explorer (Milestone 4 Iteration 2: Remediation of App Shell Routing & Test Configuration)

## 1. Observation

### Key Codebase Analysis & File Inspections
- **`vite.config.ts` (lines 10–14)**:
  ```ts
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  ```
  *Direct observation*: `include` pattern is strictly limited to `"src/**/*.test.ts"`. This excludes all `.tsx` test files in `src/`, specifically:
  - `src/AppIntegration.test.tsx` (296 lines, 11 tests)
  - `src/components/common/lens-badge-tooltip-m4.test.tsx` (196 lines, 8 tests)
  - `src/components/common/interactive-verification.test.tsx` (119 lines, 5 tests)

- **`src/App.tsx` (lines 1174–1264, `RouteContent` function)**:
  - `NAV` array (`src/App.tsx:110–287`) registers 22 routes, including `equipment` (line 264), `ipm` (line 272), and `incidents` (line 280).
  - `readRoute()` (`src/App.tsx:448–451`) returns `value` when `NAV.some(item => item.id === value)` matches.
  - `RouteContent`'s `switch(route)` statement handles 19 explicit route cases (`cockpit`, `setup`, `log`, `today`, `timeline`, `history`, `mix`, `climate`, `calc`, `nutrients`, `products`, `compatibility`, `diagnostics`, `knowledge`, `audit`, `raw`, `legal`, `reports`, `system`).
  - *Direct observation*: `switch(route)` omits explicit cases for `equipment`, `ipm`, `incidents`, and has NO `default:` fallback case. Navigating to `#equipment`, `#ipm`, or `#incidents` yields an unhandled route return (`undefined`).

- **`src/App.tsx` (lines 1318–1359 & 2016–2043, `<Metric>` invocations)**:
  - In `Cockpit` (`src/App.tsx:1318–1359`), 6 `<Metric>` calls (`PPFD`, `DLI`, `Klima`, `Leaf-VPD`, `EC`, `pH`) are invoked without passing `lens={lens}`.
  - In `Climate` (`src/App.tsx:2016–2043`), 4 `<Metric>` calls (`PPFD`, `DLI`, `Leaf-VPD`, `Energie`) are invoked without passing `lens={lens}`.
  - `Metric` component signature (`src/App.tsx:2666–2680`) accepts `lens?: ExperienceLens` and forwards it to `<TermTooltip term={...} lens={lens}>`.
  - *Direct observation*: Because `lens={lens}` is omitted in `Cockpit` and `Climate`, `TermTooltip` defaults to `"guided"`, preventing tooltips from updating when the user selects `"advanced"` or `"expert"` experience lens.

- **`src/AppIntegration.test.tsx` (lines 1–296)**:
  - Existing suite contains 11 tests covering PanelProps contracts, state update triggers (`onUpdateRun`), zero domain state mutation, `LensBadge`, `TermTooltip`, and `MetricGauge`.
  - *Direct observation*: Currently skipped by `npx vitest run` due to `.tsx` extension excluded by `vite.config.ts`. Lacks explicit assertions for `readRoute()` hash parsing, `equipment`/`ipm`/`incidents` route dispatch, default fallback route rendering, and active lens tooltip resolution in `Cockpit`/`Climate` metrics.

- **Command Execution Results**:
  - `npx vitest run`: Currently executes 9 test files, 112 unit tests (all `.ts`), skipping all 3 `.tsx` test files.
  - `npx tsc --noEmit`: Exit code 0, zero diagnostic errors.

---

## 2. Logic Chain

1. **Test Runner Configuration (`vite.config.ts`)**:
   - *Premise*: Vitest configuration matches files based on the `include` array.
   - *Observation*: `vite.config.ts:12` specifies `include: ["src/**/*.test.ts"]`.
   - *Inference*: `.tsx` test files are ignored during `npx vitest run`.
   - *Remediation*: Expand `include` to `["src/**/*.test.ts", "src/**/*.test.tsx"]` so all test suites (including `AppIntegration.test.tsx`) are discovered and executed.

2. **App Shell Routing Integrity (`src/App.tsx`)**:
   - *Premise*: `readRoute()` validates hash navigation against `NAV`. `equipment`, `ipm`, and `incidents` are valid `NAV` items.
   - *Observation*: `readRoute()` returns `"equipment"`, `"ipm"`, or `"incidents"`, but `RouteContent`'s `switch(route)` lacks matching `case` branches and lacks a `default:` branch.
   - *Inference*: Selecting equipment, IPM, or incident management routes results in an undefined view return.
   - *Remediation*: Add explicit `case "equipment":`, `case "ipm":`, `case "incidents":` rendering clean `<Panel>` views utilizing `HELP[route]`, and add a `default:` case rendering `<Cockpit ...>` fallback.

3. **Active Lens Tooltip Resolution (`src/App.tsx`)**:
   - *Premise*: `Metric` accepts `lens?: ExperienceLens` and forwards it to `TermTooltip`.
   - *Observation*: `Cockpit` and `Climate` render 10 `<Metric>` instances without passing `lens={lens}`.
   - *Inference*: Hovering metric tooltips in Cockpit or Climate views always shows Guided explanations regardless of active experience lens.
   - *Remediation*: Pass `lens={lens}` to all 6 `<Metric>` calls in `Cockpit` and all 4 `<Metric>` calls in `Climate`.

4. **Integration Test Suite Completeness (`src/AppIntegration.test.tsx`)**:
   - *Premise*: Integration tests must verify end-to-end routing, state handlers, and lens resolution.
   - *Observation*: `AppIntegration.test.tsx` currently lacks coverage for `readRoute()`, route switch fallback/equipment/ipm/incidents, and `<Metric lens={lens}>` tooltip propagation.
   - *Remediation*: Enhance `AppIntegration.test.tsx` with dedicated test cases covering full hash routing, unhandled route fallback, `onUpdateRun` zero-mutation triggers, `readRoute()`, and active lens tooltip resolution.

---

## 3. Caveats

- No caveats. All observations were verified by direct file inspection, grep analysis, and execution of `npx vitest run` and `npx tsc --noEmit`.

---

## 4. Conclusion & Exact Specifications

The remediation plan for Milestone 4 Iteration 2 is fully specified below.

### Specification 1: `vite.config.ts`
File: `c:\Users\badbu\Documents\grow\vite.config.ts`

**Target edit (Line 12)**:
```ts
// BEFORE
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },

// AFTER
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
```

---

### Specification 2: `src/App.tsx`
File: `c:\Users\badbu\Documents\grow\src\App.tsx`

#### A. Update `RouteContent` Switch Statement (lines 1174–1264)
Add `equipment`, `ipm`, `incidents`, and `default` cases to `RouteContent`:
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
    case "ipm":
      return (
        <Panel title="Plant Health (IPM)" kicker="PFLANZENGESUNDHEIT">
          <p className="description">{HELP.ipm.what}</p>
          <div className="callout note" style={{ marginTop: "1rem" }}>
            <strong>Hinweis:</strong> {HELP.ipm.interpret}
          </div>
        </Panel>
      );
    case "incidents":
      return (
        <Panel title="Incidents & Recovery" kicker="STÖRFÄLLE & RECOVERY">
          <p className="description">{HELP.incidents.what}</p>
          <div className="callout note" style={{ marginTop: "1rem" }}>
            <strong>Hinweis:</strong> {HELP.incidents.interpret}
          </div>
        </Panel>
      );
    default:
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
```

#### B. Pass `lens={lens}` to `<Metric>` Invocations in `Cockpit` (lines 1318–1360)
```tsx
      <section className="metric-grid">
        <Metric
          label="PPFD"
          value={numberAt(plan, DAILY_COLUMNS.ppfd)}
          unit="µmol/m²/s"
          tone="blue"
          note="Lichtdichte am Canopy"
          lens={lens}
        />
        <Metric
          label="DLI"
          value={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          unit="mol/m²/d"
          tone="blue"
          note="Tägliche Lichtmenge"
          lens={lens}
        />
        <Metric
          label="Klima"
          value={`${numberAt(plan, DAILY_COLUMNS.tempLight)}°`}
          unit={`${numberAt(plan, DAILY_COLUMNS.humidity)} % rF`}
          tone="amber"
          note="Lichtphase"
          lens={lens}
        />
        <Metric
          label="Leaf-VPD"
          value={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          unit="kPa est."
          tone="amber"
          note="mit Blatt-ΔT-Schätzung"
          lens={lens}
        />
        <Metric
          label="EC"
          value={numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)}
          unit="mS/cm"
          tone="green"
          note="Ziel Endmix"
          lens={lens}
        />
        <Metric
          label="pH"
          value={numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)}
          unit="Ziel"
          tone="green"
          note="nach vollständigem Mix"
          lens={lens}
        />
      </section>
```

#### C. Pass `lens={lens}` to `<Metric>` Invocations in `Climate` (lines 2016–2044)
```tsx
      <section className="metric-grid four">
        <Metric
          label="PPFD"
          value={numberAt(plan, DAILY_COLUMNS.ppfd)}
          unit="µmol/m²/s"
          tone="blue"
          note={`${numberAt(plan, DAILY_COLUMNS.watts)} W · ${numberAt(plan, DAILY_COLUMNS.distance)} cm`}
          lens={lens}
        />
        <Metric
          label="DLI"
          value={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          unit="mol/m²/d"
          tone="blue"
          note={`${numberAt(plan, DAILY_COLUMNS.lightHours)} h Photoperiode`}
          lens={lens}
        />
        <Metric
          label="Leaf-VPD"
          value={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          unit="kPa est."
          tone="amber"
          note={`Air-VPD ${numberAt(plan, DAILY_COLUMNS.airVpd).toFixed(2)} kPa`}
          lens={lens}
        />
        <Metric
          label="Energie"
          value={numberAt(plan, DAILY_COLUMNS.lightKwh).toFixed(2)}
          unit="kWh/Tag"
          tone="green"
          note={`${numberAt(plan, DAILY_COLUMNS.cumulativeKwh).toFixed(1)} kWh kum.`}
          lens={lens}
        />
      </section>
```

---

### Specification 3: `src/AppIntegration.test.tsx`
File: `c:\Users\badbu\Documents\grow\src\AppIntegration.test.tsx`

Add test cases validating:
1. `readRoute()` parsing across valid hash values (`#cockpit`, `#equipment`, `#ipm`, `#incidents`) and unknown fallback hash (`#invalid_route`).
2. `RouteContent` dispatch for `equipment`, `ipm`, `incidents`, and fallback default case.
3. `onUpdateRun` callback triggering and zero domain mutation verification.
4. Active lens tooltip resolution: verifying that passing `lens="expert"` vs `lens="guided"` to `<Metric>` or `<TermTooltip>` renders lens-specific explanations (`"Transpirationsdruck"` for expert vs `"Dampfdruck-Defizit"` for guided).

---

## 5. Verification Method

To independently verify the implementation after applying changes:

1. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 errors.

2. **Unit & Integration Test Suite**:
   ```powershell
   npx vitest run
   ```
   *Expected result*: 12 test files passed (9 `.ts` + 3 `.tsx`), 140+ unit tests passed. `src/AppIntegration.test.tsx` executed and passing.

3. **Production Build**:
   ```powershell
   npx vite build
   ```
   *Expected result*: Exit code 0, client bundle generated under `dist/`.
