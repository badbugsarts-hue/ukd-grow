# Handoff Report: Milestone 4 App Shell Routing & State Integration

## 1. Observation

- **Modified Files**:
  - `src/types.ts`: Added `"calc"` to the `RouteId` union type (`src/types.ts:32`).
  - `src/App.tsx`:
    - Updated `NAV` array to include the `"calc"` route definition (`src/App.tsx:176-182`).
    - Added `"calc"` entry to `HELP` dictionary (`src/App.tsx:345-350`).
    - Added `"calc"` entry to `GUIDED_HINTS` dictionary (`src/App.tsx:1099-1100`).
    - Updated `RouteContent` switch block (`src/App.tsx:1186-1222`) to route:
      - `case "climate"`: `<EnvironmentTargetsPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
      - `case "calc"`: `<VpdDliCalculatorPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
      - `case "knowledge"`: `<ContextHelpGlossaryPanel run={run} plan={plan} lens={lens} onUpdateRun={setRun} navigate={navigate} />`
    - Verified topbar lens controls (`LensControl` + `LensBadge`) with dual state persistence (`localStorage` + `URLSearchParams`).

- **Verification Commands & Results**:
  1. `npx tsc --noEmit`
     - Result: Exit code 0, 0 errors.
  2. `npx vitest run`
     - Result: Exit code 0. 9 test files passed, 112/112 tests passed.
       - `src/domain.test.ts` (10 tests)
       - `src/backup.test.ts` (3 tests)
       - `src/run-state.test.ts` (13 tests)
       - `src/components/panels/nutrient-runconfig-stress.test.ts` (19 tests)
       - `src/components/panels/panels.test.ts` (12 tests)
       - `src/components/panels/daily-operator-glossary.test.ts` (17 tests)
       - `src/scientific-core.test.ts` (3 tests)
       - `src/components/common/common.test.ts` (18 tests)
       - `src/components/panels/climate-stress-test.test.ts` (17 tests)
  3. `npx vite build`
     - Result: Exit code 0. Built production client bundle in `dist/` in 6.09s.

---

## 2. Logic Chain

1. **Observation**: `VpdDliCalculatorPanel` is a key interactive tool in the UKD Masterplan, but `"calc"` was missing from `RouteId` in `src/types.ts` and `NAV` in `src/App.tsx`.
2. **Logic Step**: Adding `"calc"` to `RouteId` and `NAV` allows navigation to `#calc` via sidebar links and `navigate("calc")` programmatically.
3. **Observation**: Panels require unified prop binding matching the `PanelProps` interface (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`).
4. **Logic Step**: In `RouteContent`, passing `run`, `plan`, `lens`, `setRun` as `onUpdateRun`, and `navigate` down to `DailyOperatorPanel`, `NutrientMixPanel`, `RunConfigPanel`, `EnvironmentTargetsPanel`, `ContextHelpGlossaryPanel`, and `VpdDliCalculatorPanel` ensures unidirectional data flow without state mutation or prop mismatches.
5. **Observation**: Experience lens selection is managed in topbar by `LensControl` and `LensBadge` with dual state persistence (`localStorage` + `URLSearchParams`).
6. **Logic Step**: Preserving the existing `useEffect` in `Workspace()` maintains seamless lens synchronization across route changes and browser reloads.
7. **Observation**: Safety gates, backup/restore modals, legal profile verification, and local storage autosave must remain strictly preserved per AGENTS.md rules.
8. **Logic Step**: Modifying only the router dispatch, route definitions, and dictionary tables in `src/App.tsx` leaves all safety, legal, and storage logic 100% intact.

---

## 3. Caveats

- **No Caveats**: All 6 panel routes, topbar lens toggle, state persistence, type definitions, and test suites are fully integrated and verified with 0 regressions.

---

## 4. Conclusion

Milestone 4 (M4: App Shell Routing & State Integration) is 100% complete and fully verified.
- All 6 panels (`DailyOperatorPanel`, `NutrientMixPanel`, `RunConfigPanel`, `EnvironmentTargetsPanel`, `ContextHelpGlossaryPanel`, `VpdDliCalculatorPanel`) are imported, wired to their routes, and bound to `run: RunPackage` and `onUpdateRun`.
- Dual lens persistence and topbar badge display are active.
- All safety invariants, storage persistence, legal profile confirmation gates, and backup/restore modals remain intact.

---

## 5. Verification Method

1. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Unit & Component Test Suite**:
   ```bash
   npx vitest run
   ```
   *Expected*: 9 test files passed, 112/112 tests passed.

3. **Production Build**:
   ```bash
   npx vite build
   ```
   *Expected*: Production bundle compiled cleanly in `dist/`.

4. **Invalidation Conditions**:
   - Any typescript error when adding or rendering routes.
   - Any test failure in `vitest run`.
   - Broken state persistence or hash navigation for `#calc`.
