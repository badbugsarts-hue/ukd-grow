# Handoff Report: Milestone 4 App Shell Routing & State Integration

## 1. Observation

- **Panel Inventory (`src/components/panels/`)**:
  - `DailyOperatorPanel.tsx`: Accepts `run: RunPackage`, `plan?: DayPlan`, `lens: ExperienceLens`, `onUpdateRun: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
  - `NutrientMixPanel.tsx`: Accepts `run: RunPackage`, `plan?: DayPlan`, `lens: ExperienceLens`, `onUpdateRun: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
  - `RunConfigPanel.tsx`: Accepts `run: RunPackage`, `lens: ExperienceLens`, `onUpdateRun: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
  - `EnvironmentTargetsPanel.tsx`: Accepts `run: RunPackage`, `plan?: DayPlan`, `lens: ExperienceLens`, `onUpdateRun: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
  - `ContextHelpGlossaryPanel.tsx`: Accepts `run?: RunPackage`, `plan?: DayPlan`, `lens?: ExperienceLens`, `onUpdateRun?: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
  - `VpdDliCalculatorPanel.tsx`: Accepts `run?: RunPackage`, `plan?: DayPlan`, `lens?: ExperienceLens`, `onUpdateRun?: (updatedRun: RunPackage) => void`, `navigate?: (route: RouteId) => void`.
- **Primitives (`src/components/common/`)**:
  - `LensBadge.tsx`: Displays lens status ("GEFÜHRT", "STANDARD", "EXPERTE") with customizable size and click handlers.
- **Route Type Status (`src/types.ts:11-32`)**:
  - `RouteId` currently includes 21 routes (`cockpit`, `setup`, `log`, `today`, `timeline`, `history`, `mix`, `climate`, `nutrients`, `products`, `compatibility`, `diagnostics`, `knowledge`, `audit`, `raw`, `legal`, `reports`, `system`, `equipment`, `ipm`, `incidents`).
  - `RouteId` lacks `"calc"`. `VpdDliCalculatorPanel` is not yet imported or routed in `src/App.tsx`.
- **Current App Shell Router (`src/App.tsx:1137-1201`)**:
  - `RouteContent` currently renders `RunConfigPanel` (`setup`), `DailyOperatorPanel` (`today`), `NutrientMixPanel` (`mix`), `EnvironmentTargetsPanel` (`climate`), `ContextHelpGlossaryPanel` (`knowledge`).
  - `VpdDliCalculatorPanel` (`calc`) needs to be imported and added to the switch statement in `RouteContent`.
- **Verification Baseline**:
  - `npx tsc --noEmit` exited with code 0 (0 errors).
  - `npx vitest run` passed all 9 test suites / 112 unit & component tests.

---

## 2. Logic Chain

1. **Observation**: All 6 Master Class input panels share a standardized interface contract (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`).
2. **Logic Step**: In `src/App.tsx`, `Workspace` owns `run: RunPackage` and `lens: ExperienceLens` state. By passing `run` and `setRun` as `onUpdateRun` along with `plan`, `lens`, and `navigate` down to each panel in `RouteContent`, unidirectional data flow is maintained without state duplication.
3. **Observation**: `VpdDliCalculatorPanel` is an interactive panel for simulating microclimates and inspecting 4-phase targets, but `calc` is missing from `RouteId` in `src/types.ts` and `NAV`/`RouteContent` in `src/App.tsx`.
4. **Logic Step**: Adding `"calc"` to `RouteId` in `src/types.ts`, creating a `NAV` item in `src/App.tsx`, adding entries to `HELP` and `GUIDED_HINTS`, and routing `<VpdDliCalculatorPanel>` under `case "calc":` completes the panel integration cleanly.
5. **Observation**: The experience lens is controllable via `LensControl` in the topbar, and `LensBadge` provides visual feedback across the header and panel headers.
6. **Logic Step**: Incorporating `LensBadge` alongside `LensControl` in `App.tsx` header ensures visual consistency and fulfills Requirement R2 & M4 objectives.
7. **Observation**: Existing tests (`panels.test.ts`, `nutrient-runconfig-stress.test.ts`, `climate-stress-test.test.ts`, `daily-operator-glossary.test.ts`, `common.test.ts`, `backup.test.ts`, `run-state.test.ts`, `domain.test.ts`, `scientific-core.test.ts`) test panel calculations, safety gates, and state transition logic directly.
8. **Logic Step**: Wiring panels in `App.tsx` strictly via props matching `PanelProps` ensures zero breakage of existing vitest suites and type checking.

---

## 3. Caveats

- **No Source Code Changes Executed**: Investigation was strictly read-only per Teamwork Explorer guidelines. Code implementation will be executed in Milestone 4 implementation turn.
- **Assumptions**: No changes to domain formulas (`calculateLeafVpd`, `calculateDli`, `calculateMix`) or state transition functions (`addObservation`, `updateRunConfig`, `activateRun`, `acknowledgeAlert`) were necessary; all domain logic remains intact in `src/domain.ts` and `src/run-state.ts`.

---

## 4. Conclusion

The integration plan for Milestone 4 (App Shell Routing & State Integration) is fully designed and ready for implementation.
Key implementation actions required:
1. Update `src/types.ts`: Add `"calc"` to `RouteId` union.
2. Update `src/App.tsx`:
   - Import `LensBadge` from `./components/common/LensBadge`.
   - Import `VpdDliCalculatorPanel` from `./components/panels/VpdDliCalculatorPanel`.
   - Add `{ id: "calc", label: "VPD & DLI Rechner", short: "Rechner", icon: "🧮", group: "Werkzeuge", description: "VPD & DLI Schnellrechner und 4-Phasen-Matrix" }` to `NAV`.
   - Add `calc` entry to `HELP` and `GUIDED_HINTS` dictionaries.
   - Add `topbar` `LensBadge` display in `header.topbar`.
   - Add `case "calc":` to `RouteContent` rendering `<VpdDliCalculatorPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`.
   - Pass `plan={plan}` to `ContextHelpGlossaryPanel` in `RouteContent` case `"knowledge"`.

---

## 5. Verification Method

1. **Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, 0 errors.

2. **Unit Test Suite**:
   ```bash
   npx vitest run
   ```
   *Expected outcome*: 9 test files passed, 112/112 tests passed.

3. **Build Check**:
   ```bash
   npx vite build
   ```
   *Expected outcome*: Successful production build output in `dist/`.

4. **Invalidation Conditions**:
   - Any typescript compilation errors on `RouteId` or component props.
   - Any test failures in `vitest run`.
   - Unhandled route hash changes for `#calc`.
