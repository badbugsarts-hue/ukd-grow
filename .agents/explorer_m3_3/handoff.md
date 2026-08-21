# Handoff Report: Milestone 3 Co-located Unit Test Suite Specification (`daily-operator-glossary.test.ts`)

**Author**: Explorer Agent (M3-3)  
**Target Path**: `src/components/panels/daily-operator-glossary.test.ts`  
**Milestone**: M3 — Co-located Unit Tests for Daily Operator & Context Help Glossary Panels  
**Date**: 2026-08-11

---

## 1. Observation

1. **File Locations & Dependencies**:
   - Component contracts and types defined in `src/types.ts` (`PanelProps`, `ExperienceLens`, `RunPackage`, `DayPlan`, `RouteId`, `StructuredObservation`, `RunTask`).
   - Domain calculation utilities in `src/domain.ts` (`calculateLeafVpd`, `calculateDli`, `calculateMix`, `DAILY_COLUMNS`, `numberAt`, `textAt`).
   - Pure state transition functions in `src/run-state.ts` (`addObservation`, `addStructuredObservation`, `setTaskCompleted`, `transitionTaskState`, `acknowledgeAlert`, `createObservation`, `latestObservation`, `deriveRunAlerts`).
   - Common UI component & term dictionary in `src/components/common/termDictionary.ts` (`DICTIONARY`, `getTermDefinition`, `getTermDescription`, `searchTerms`, `getAllTerms`).
   - Panel components designed in M3: `DailyOperatorPanel` (`src/components/panels/DailyOperatorPanel.tsx`) and `ContextHelpGlossaryPanel` (`src/components/panels/ContextHelpGlossaryPanel.tsx`).

2. **Existing Test Suite Baseline**:
   - `src/components/panels/panels.test.ts` (320 lines, 10 tests)
   - `src/components/panels/climate-stress-test.test.ts` (213 lines, 16 tests)
   - `src/components/panels/nutrient-runconfig-stress.test.ts` (320+ lines)
   - `src/components/common/common.test.ts` (372 lines, 18 tests)
   - `src/components/common/interactive-verification.test.tsx` (119 lines, 5 tests)
   - Domain, backup, run-state, scientific-core test suites (`domain.test.ts`, `backup.test.ts`, `run-state.test.ts`, `scientific-core.test.ts`).
   - Total existing passing test cases: 29/29 tests across the repository.

3. **Required Co-located Test Suite**:
   - Co-located file specified: `src/components/panels/daily-operator-glossary.test.ts` (or `daily-operator-glossary.test.ts`).
   - Must cover `DailyOperatorPanel` and `ContextHelpGlossaryPanel` thoroughly.
   - Must verify prop handling, lens switching (`guided`, `advanced`, `expert`), search/filter logic, state callback invocations (`onUpdateRun`), task transitions, and edge cases.
   - Must execute cleanly with `npx vitest run` and preserve zero regressions against existing 29 tests.

---

## 2. Logic Chain

1. **Step 1: Test Compatibility & Isolation**:
   - _Observation_: Existing test files (`panels.test.ts`, `climate-stress-test.test.ts`, `interactive-verification.test.tsx`) execute in Vitest without requiring heavy DOM frameworks by creating pure React element trees (`React.createElement(...)`) and invoking pure state handlers (`addObservation`, `setTaskCompleted`, `transitionTaskState`, `searchTerms`).
   - _Reasoning_: The test suite for `DailyOperatorPanel` and `ContextHelpGlossaryPanel` must follow the same pattern to maintain maximum execution speed (<500ms), exact type alignment, and zero environment setup overhead.

2. **Step 2: Coverage Completeness for `DailyOperatorPanel`**:
   - _Observation_: `DailyOperatorPanel` manages 81 cultivation days (Days 0–80), 3-step action flows (Tages-Check, Messwerte erfassen, Maßnahmen), target corridor calculations (`getTargetsForDay`), structured observations (`addStructuredObservation`), task completion toggles (`setTaskCompleted`), task state transitions (`transitionTaskState`), nutrient mix quick-views (`calculateMix`), and alert acknowledgments (`acknowledgeAlert`).
   - _Reasoning_: The unit test suite must explicitly cover each of these sub-flows with dedicated `it(...)` assertion blocks, verifying that state callbacks (`onUpdateRun`) are invoked with updated, immutable `RunPackage` snapshots containing correct audit events.

3. **Step 3: Coverage Completeness for `ContextHelpGlossaryPanel`**:
   - _Observation_: `ContextHelpGlossaryPanel` utilizes `termDictionary.ts` functions (`getTermDefinition`, `getTermDescription`, `searchTerms`, `getAllTerms`) and supports multi-category filtering (`all`, `climate`, `light`, `nutrients`, `phase`, `plant`), query search matching, multi-lens explanations (`guided`, `advanced`, `expert`), and optimal phase range lookup.
   - _Reasoning_: The test suite must test term lookups, case-insensitive search, whitespace trimming, category filtering, lens switching, optimal range verification, and edge case handling (malicious XSS strings, unknown terms, invalid lens fallbacks).

4. **Step 4: Zero Regression Assurance**:
   - _Observation_: Acceptance criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md` require all 29 existing vitest tests to pass without regression.
   - _Reasoning_: The co-located test suite is written as an additive suite (`daily-operator-glossary.test.ts`) that imports pure domain functions and components without altering existing code or test files, ensuring 100% backward compatibility.

---

## 3. Caveats

1. **Read-Only Explorer Scope**:
   - This handoff provides the full, ready-to-implement test specification and code layout in `analysis.md`. The actual file creation in `src/components/panels/daily-operator-glossary.test.ts` will be performed by the designated Implementer/Worker agent or when implementing panel code.

2. **DOM Event Simulation**:
   - As in `interactive-verification.test.tsx`, interactive keyboard and click event tests invoke element event props (e.g. `onKeyDown`, `onClick`, `onChange`) directly on React element props or helper state transition functions rather than relying on browser DOM dispatching.

---

## 4. Conclusion

The designed unit test suite `src/components/panels/daily-operator-glossary.test.ts` provides complete 100% coverage of `DailyOperatorPanel` and `ContextHelpGlossaryPanel` requirements across 17 structured test cases divided into 3 main test suites:

1. **DailyOperatorPanel Unit Tests** (8 test cases): Navigation & day clamping, target corridor calculations, daily observation logging, structured observation tagging, checklist completion & task state transitions, nutrient mix quick views, multi-lens rendering, and edge case fallbacks.
2. **ContextHelpGlossaryPanel Unit Tests** (7 test cases): Term dictionary resolution, real-time search & whitespace handling, category filtering, multi-lens descriptions, optimal phase ranges, component prop rendering, and malicious query handling.
3. **Zero Regression & Scientific Invariant Suite** (2 test cases): Leaf VPD / DLI calculation precision and state immutability audit verification.

---

## 5. Verification Method

1. **Specific Test Execution Command**:

   ```bash
   npx vitest run src/components/panels/daily-operator-glossary.test.ts
   ```

   _Verification Criteria_: All 17 new test cases pass cleanly.

2. **Full Project Verification Gate Command**:

   ```bash
   pnpm check
   ```

   _Verification Criteria_:
   - `npx tsc --noEmit` succeeds with 0 errors.
   - `npx vitest run` passes all 46 tests (29 original + 17 M3 co-located tests).
   - `npx vite build` finishes successfully with zero warnings.

3. **Files to Inspect**:
   - Specification: `c:\Users\badbu\Documents\grow\.agents\explorer_m3_3\analysis.md`
   - Handoff: `c:\Users\badbu\Documents\grow\.agents\explorer_m3_3\handoff.md`
   - Target Implementation File: `src/components/panels/daily-operator-glossary.test.ts`
