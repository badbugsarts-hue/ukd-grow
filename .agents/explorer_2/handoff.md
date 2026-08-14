# Handoff Report: App Shell & State Flow Investigation

**From**: Explorer 2 (App Shell & State Flow Explorer)  
**To**: Parent Agent / Implementation Team  
**Date**: 2026-08-11  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\explorer_2`

---

## 1. Observation

Direct observations from codebase inspection:

1. **App Shell Entry & State Loading (`src/App.tsx:448-520`)**:
   - `App` component loads JSON assets (`evidence-guarded-workbook-v8.json`, `legacy-audit.json`, `knowledge-base.json`, `ai-context.json`, `skills.json`) and renders `<Workspace />`.
   - In `Workspace` (`src/App.tsx:522-779`), primary UI state is defined:
     ```typescript
     const [route, setRoute] = useState<RouteId>(readRoute);
     const [lens, setLens] = useState<ExperienceLens>(readLens);
     const [day, setDay] = useState(readDay);
     const [run, setRun] = useState<RunPackage>(() => createDefaultRunPackage());
     ```

2. **Persistence Pipeline (`src/App.tsx:582-592` & `src/run-storage.ts:176-181`)**:
   - `Workspace` auto-persists updates to IndexedDB using a debounced timer (250ms):
     ```typescript
     useEffect(() => {
       if (!runHydrated) return;
       const timer = window.setTimeout(() => {
         saveActiveRun(run).catch(() => setStorageError("Autosave fehlgeschlagen..."));
       }, 250);
       return () => window.clearTimeout(timer);
     }, [run, runHydrated]);
     ```
   - IndexedDB store used: `run-packages-v3` under database name `ukd-operator-workspace`.

3. **Domain Mutation Functions (`src/run-state.ts`)**:
   - Functions like `addObservation(run, observation)`, `addStructuredObservation(run, obs)`, `updateRunConfig(run, config)`, and `setTaskCompleted(run, day, task, completed)` return a new `RunPackage` object with updated arrays, `auditEvents`, `domainEvents`, and `events`.

4. **Experience Level Lenses (`src/App.tsx:272-276, 804-811, 850-852`)**:
   - Lenses available: `"guided"`, `"advanced"`, `"expert"`.
   - `Sidebar` filters visible navigation items in `"guided"` mode using `GUIDED_CORE_ROUTES`:
     ```typescript
     const GUIDED_CORE_ROUTES: RouteId[] = ["cockpit", "today", "setup", "log", "mix", "timeline"];
     ```

5. **Existing Component Directory (`src/`)**:
   - `src/components/` directory does not currently exist. Standalone workspaces exist in `src/RunWorkspace.tsx` and `src/AlertCenter.tsx`.

6. **Design & Styling (`src/styles.css:32-147`)**:
   - CSS tokens defined in `@layer tokens`: `--bg`, `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--line`, `--line-strong`, `--text`, `--text-2`, `--muted`, `--green`, `--green-dim`, `--blue`, `--amber`, `--red`, `--purple`, `--radius`, `--radius-sm`, `--radius-lg`.

---

## 2. Logic Chain

1. **Premise**: `App.tsx` routes views via `RouteContent` (`src/App.tsx:1107-1196`), passing `run` and `setRun` down to active workspaces.
2. **Observation Step 1**: `run` state in `Workspace` is updated via `setRun`. When `setRun(newRun)` is called, React triggers re-render, and `useEffect` asynchronously debounces saving `newRun` to IndexedDB via `saveActiveRun`.
3. **Observation Step 2**: Existing domain state transition functions (`addObservation`, `addStructuredObservation`, `updateRunConfig`, etc.) in `src/run-state.ts` are pure functions taking `(run, input)` and returning `nextRun`.
4. **Reasoning**: New "Master Class" input panels in `src/components/` should accept `run`, `plan`, `lens`, and `onUpdateRun: (run: RunPackage) => void` as props. When a user completes an input action in a panel, the panel calls the appropriate domain state transition function in `src/run-state.ts` and passes the returned `nextRun` to `onUpdateRun`.
5. **Conclusion**: This state flow guarantees that all updates seamlessly persist to storage, generate audit logs, trigger state machine alerts, and update derived metrics without mutating any existing contracts or Workbook data.

---

## 3. Caveats

- **No Code Modifications Made**: Per the Explorer role constraints, no core source files (`App.tsx`, `domain.ts`, `run-state.ts`, etc.) were edited during this investigation.
- **Mockup File Formats**: Detailed visual layout of input panels in `.antigravitz` includes PNG and PDF mockups; component design recommendations match standard 2026 UKD UI/UX tokens in `styles.css`.

---

## 4. Conclusion

1. Proposed Directory Structure:
   - Create `src/components/common/` (`TermTooltip.tsx`, `LensBadge.tsx`, `MetricGauge.tsx`).
   - Create `src/components/panels/` (`DailyObservationPanel.tsx`, `NutrientMixPanel.tsx`, `ClimateControlPanel.tsx`, `WaterBaselinePanel.tsx`).
2. Prop Contract Standard:
   ```typescript
   interface PanelProps {
     run: RunPackage;
     plan: DayPlan;
     lens: ExperienceLens;
     onUpdateRun: (updatedRun: RunPackage) => void;
     navigate?: (route: RouteId) => void;
   }
   ```
3. Integration Target Points in `App.tsx`:
   - `log` route -> `DailyObservationPanel`
   - `mix` route -> `NutrientMixPanel`
   - `climate` route -> `ClimateControlPanel`
   - `setup` route -> `WaterBaselinePanel`
4. All UI text in German, accompanied by `TermTooltip` for technical terms (VPD, DLI, PPFD, EC, pH).

---

## 5. Verification Method

To verify the integration after implementation:
1. Run type checker: `pnpm typecheck` (or `npx tsc --noEmit`) - must pass with 0 errors.
2. Run test suite: `pnpm test` (or `npx vitest run`) - must pass all 29 unit tests.
3. Run build gate: `pnpm build` (or `npx vite build`) - must complete dist build cleanly.
4. Run full check: `pnpm check`.
5. Manual Verification:
   - Switch experience lenses (Guided -> Advanced -> Expert) and verify calculations remain unchanged while UI detail scales.
   - Enter daily observations in `DailyObservationPanel`, refresh browser, and verify state rehydrates correctly from IndexedDB.
