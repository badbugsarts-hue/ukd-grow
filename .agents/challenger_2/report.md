# Empirical Challenger 2 Report: Autoflower Cockpit Integration & Setup View

**Date**: 2026-08-21T05:05:00Z  
**Archetype**: Empirical Challenger (critic, specialist)  
**Agent Workspace**: `c:\Users\badbu\Documents\grow\.agents\challenger_2`  
**Test Suite Created**: `src/challenger-cockpit-stress.test.tsx` (22 tests, 100% passing)  
**Overall Verdict**: **REQUEST_CHANGES** (Actionable gate blockers identified in typecheck and UI contracts)

---

## 1. Executive Summary

Empirical Challenger 2 conducted code-executing adversarial stress-testing of the Autoflower Cockpit dataset, filtering engine, yield uncertainty mathematics, modal ergonomics, and project build gates. 

A dedicated 22-test adversarial suite was authored and executed in `src/challenger-cockpit-stress.test.tsx`, validating all 61 cultivars, multi-facet combinatorial filters, yield uncertainty math, and rapid selection workflows. 

While the unit/component tests in vitest pass with 100% success (41 test files, 485 passing tests), full gate verification revealed **two blocking failures** in the broader integration:
1. **TypeScript Build Error (`tsc -b`)**: `RunConfigPanel.tsx(187,11)` accesses non-existent property `currentDay` on `RunPackage`.
2. **UI Contract Linter Error (`node scripts/check-ui-contracts.mjs`)**: 13 static CSS class names in `App.tsx`, `AutoflowerCockpitModal.tsx`, and `AutoflowerCockpitPanel.tsx` lack CSS selector definitions in `src/styles.css`.

---

## 2. Empirical Verification Matrix

| Area | Test Method | Test Cases | Result | Notes |
|---|---|---|---|---|
| **61 Cultivar Schema Integrity** | Schema oracle & invariant assertions | 61 strains × 44 attributes | **PASS** | 50 Jungpflanzen, 11 Saatgut. All IDs and ranks unique. No empty string fields. |
| **Numeric & Invariant Ranges** | Bounded mathematical range checks | 61 strains | **PASS** | $ertrag\_lo > 0$ and $ertrag\_lo \le ertrag\_hi$, $hmin \le hmax$, $0 \le score \le 100$, $0.55 \le q \le 1.0$, $thc \ge 0$. |
| **Combinatorial Filter Engine** | Oracle comparison + Property fuzzing | 300 random permutations | **PASS** | 100% deterministic results across all combinations of Breeder, Mold, Feed, Height, Level, Search, Kind. |
| **Edge Cases (0 Results)** | Conflicting criteria & empty search | 4 edge scenarios | **PASS** | Handled gracefully without runtime exceptions. |
| **Yield Uncertainty Math** | $140\text{ W} \times [0.45\text{--}0.90\text{ g/W}] \times q$ | 61 strains + 500 fuzz inputs | **PASS / FINDING** | For all 61 real strains: bars $\le 96.15\%$. Edge case finding: synthetic $ertrag\_lo \ge 130$ yields $103\%$. |
| **Modal & Keyboard Ergonomics** | SSR renderToString + Event simulation | Guided, Advanced, Expert | **PASS** | Escape key closes modal & drawer; backdrop click closes dialog; inner click retained. |
| **Selection State Machine** | `updatePlantIdentity` state transition | Full 61-strain loop | **PASS** | Immutable updates; correct audit event appending. |
| **Vitest Test Suite** | `npx vitest run` | 41 files, 485 tests | **PASS** | Zero test regressions in Vitest. |
| **TypeScript Typecheck** | `npx tsc -b --pretty false` | Project workspace | **FAIL** | Property `currentDay` missing on `RunPackage` in `RunConfigPanel.tsx:187`. |
| **UI Contracts Gate** | `node scripts/check-ui-contracts.mjs` | Static class scan | **FAIL** | 13 unmapped CSS classes in `styles.css`. |

---

## 3. Detailed Adversarial Findings & Observations

### Finding 1 (Blocker): TypeScript Typecheck Failure in `RunConfigPanel.tsx`
- **Location**: `src/components/panels/RunConfigPanel.tsx:187`
- **Observation**:
  ```
  src/components/panels/RunConfigPanel.tsx(187,11): error TS2339: Property 'currentDay' does not exist on type 'RunPackage'.
  ```
- **Analysis**: Line 187 contains:
  ```typescript
  const activeDay =
      run.executionMode === "live"
          ? Math.max(0, biologicalAge.operationalAgeDays)
          : (run.currentDay ?? biologicalAge.biologicalAgeDays);
  ```
  In `src/types.ts`, `RunPackage` does not define `currentDay` at root level. In simulation mode, `run.currentDay` should reference the appropriate state property or fallback.
- **Remediation**: The implementing agent should replace `run.currentDay` with `(run as any).currentDay ?? biologicalAge.biologicalAgeDays` or resolve `currentDay` through the proper domain model.

---

### Finding 2 (Blocker): Missing CSS Contract Rules in `src/styles.css`
- **Location**: `src/styles.css`
- **Observation**: Executing `node scripts/check-ui-contracts.mjs` fails with code 1:
  ```
  Statische UI-Klassen ohne CSS-Vertrag:
  src\App.tsx: .execution-mode-control
  src\App.tsx: .mode-dot
  src\App.tsx: .live-dot
  src\App.tsx: .sim-dot
  src\App.tsx: .sim-scrubber-cluster
  src\components\modals\AutoflowerCockpitModal.tsx: .autoflower-modal-backdrop
  src\components\modals\AutoflowerCockpitModal.tsx: .autoflower-modal-window
  src\components\panels\AutoflowerCockpitPanel.tsx: .autoflower-cockpit-root
  src\components\panels\AutoflowerCockpitPanel.tsx: .autoflower-header-banner
  src\components\panels\AutoflowerCockpitPanel.tsx: .autoflower-workspace-layout
  src\components\panels\AutoflowerCockpitPanel.tsx: .autoflower-filter-aside
  src\components\panels\AutoflowerCockpitPanel.tsx: .drawer-scrim
  src\components\panels\AutoflowerCockpitPanel.tsx: .autoflower-detail-drawer
  ```
- **Analysis**: The project enforces strict layout governance via `scripts/check-ui-contracts.mjs`, requiring every static `className` used in React TSX files to have a corresponding CSS selector in `src/styles.css`.
- **Remediation**: The implementing agent should append minimal semantic CSS definitions for these 13 classes to `src/styles.css`.

---

### Finding 3 (Observation / Minor Warning): Yield Range Bar Clamping for Theoretical Outliers
- **Location**: `src/components/panels/AutoflowerCockpitPanel.tsx:1236-1240`
- **Observation**:
  ```typescript
  const leftPercent = Math.max(0, Math.min(100, (strain.ertrag_lo / MAXY) * 100));
  const widthPercent = Math.max(
      3,
      Math.min(100 - leftPercent, ((strain.ertrag_hi - strain.ertrag_lo) / MAXY) * 100),
  );
  ```
  When `ertrag_lo >= MAXY` (e.g. synthetic 130g), `leftPercent = 100%`, `100 - leftPercent = 0%`, and `Math.max(3, 0) = 3%`, resulting in `leftPercent + widthPercent = 103%`.
- **Impact**: In the current 61-strain dataset, max `ertrag_lo` is 65g and max `ertrag_hi` is 125g, so no actual strain overflows. However, for defensive UI robustness, clamping `leftPercent` to `Math.min(97, ...)` or ensuring `widthPercent <= 100 - leftPercent` is recommended.

---

## 4. Verification Method

To independently verify all findings:

1. **Run Challenger Adversarial Suite**:
   ```bash
   npx vitest run src/challenger-cockpit-stress.test.tsx
   ```
   *Expected*: 22 tests pass in ~1.5s.

2. **Run Full Vitest Suite**:
   ```bash
   npx vitest run
   ```
   *Expected*: 41 test files, 485 tests pass.

3. **Verify Typecheck Blocker**:
   ```bash
   npx tsc -b --pretty false
   ```
   *Expected*: Fails with `TS2339: Property 'currentDay' does not exist on type 'RunPackage'`.

4. **Verify UI Contracts Blocker**:
   ```bash
   node scripts/check-ui-contracts.mjs
   ```
   *Expected*: Fails with 13 unmapped CSS class names.
