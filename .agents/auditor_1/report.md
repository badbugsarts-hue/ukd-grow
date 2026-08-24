# Forensic Integrity Audit Report

**Work Product**: UKD Grow Masterplan Setup View & Autoflower Cockpit Integration
**Project Root**: c:\Users\badbu\Documents\grow
**Auditor**: uditor_1 (Forensic Integrity Auditor)
**Integrity Mode**: Development Mode (as specified in ORIGINAL_REQUEST.md)
**Verdict**: 🔴 INTEGRITY VIOLATION

---

## Executive Summary

The UKD Grow Masterplan Setup View and Autoflower Cockpit integration was subjected to an exhaustive forensic audit covering static code analysis, dataset authenticity, state engine & domain logic verification, type checking, linting, and behavioral test execution.

While the botanical dataset (61 strains, 44 attributes) and the state-domain logic (domain.ts,
un-state.ts, live-run.ts) represent authentic, high-quality botanical and physical models without fake facade functions or hardcoded answers, the deliverable **fails the Behavioral Verification Gate (Phase 2, Check 4)**:

1. **TypeScript Build Gate Failure**: sc -b fails with TS2339: Property 'currentDay' does not exist on type 'RunPackage' at src/components/panels/RunConfigPanel.tsx:187:11.
2. **Linter Gate Failure**: iome lint fails at src/components/panels/RunConfigPanel.tsx:505:10 (lint/a11y/noRedundantRoles on <section role=region>).
3. **Adversarial Stress Suite Failure**: src/challenger-cockpit-stress.test.tsx fails 5 of 22 tests (TypeError on undefined indica/sativa properties and UI button text assertions).

In accordance with the forensic audit charter (Trust nothing — verify empirically; If ANY check fails, the verdict is INTEGRITY VIOLATION and you MUST reject the work product), the integration is rejected pending resolution of these build, type, and test defects.

---

## Detailed Phase Results

### Phase 1: Static Code & Dataset Analysis

| #   | Check Name                                                     | Status  | Details                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Hardcoded test results detection                               | ✅ PASS | Searched src/. No hardcoded test responses or static answers found in domain or state reducers.                                                                                                                                                                                                                                                                               |
| 1.2 | Facade / Dummy implementation detection                        | ✅ PASS | Functions in domain.ts (calculateBiologicalPlantAge, calculateSubstrateHydration, calculatePpfdMapSummary, calculateDrybackRate) and live-run.ts (evaluateLiveClock) perform real arithmetic, timestamp parsing, and validation.                                                                                                                                              |
| 1.3 | Pre-populated artifact detection                               | ✅ PASS | No stale pre-computed result artifacts or fabricated logs exist.                                                                                                                                                                                                                                                                                                              |
| 1.4 | 61-Strain Dataset Integrity (src/data/autoflower-cockpit.json) | ✅ PASS | Verified 61 distinct cultivars (50 Jungpflanzen, 11 Saatgut), each containing 44 botanical/photobiology attributes. Breeders (Sensi Seeds, Mephisto Genetics, Dutch Passion, Fast Buds, Humboldt Seed Company, etc.), chemotypes, terpenes, feed/mold ratings, and {gesamt} = 140\text{ W} \times [0.45\text{--}0.90\text{ g/W}] \times q$ photobiology formulas are genuine. |
| 1.5 | State Mutation & Event Provenance                              | ✅ PASS | updateExecutionMode, updatePlantMilestones, updateRunConfig, updatePotProfile, and updatePlantIdentity in src/run-state.ts append immutable audit events and domain events with UTC timestamps.                                                                                                                                                                               |
| 1.6 | Substrate Dryback Tare Weights                                 | ✅ PASS | emptyMassGrams and saturatedMassGrams in PotProfile are fully wired to calculateSubstrateHydration with tare boundary checks.                                                                                                                                                                                                                                                 |

### Phase 2: Behavioral & Build Verification

| #                         | Check Name                                                        | Status                                                                                                                | Details                                                                                                                                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1                       | Core Unit & Integration Tests                                     | ✅ PASS                                                                                                               | 76/76 passing tests across src/run-state.test.ts (18/18), src/domain.test.ts (18/18), src/components/panels/RunConfigPanel.test.tsx (17/17), src/components/panels/AutoflowerCockpitPanel.test.tsx (17/17), and src/AppM4Integration.test.tsx (6/6). |
| 2.2                       | TypeScript Typecheck (                                            |
| pm run typecheck / sc -b) | ❌ FAIL                                                           | TS2339: Property 'currentDay' does not exist on type 'RunPackage' in src/components/panels/RunConfigPanel.tsx:187:11. |
| 2.3                       | Production Build (                                                |
| pm run build)             | ❌ FAIL                                                           | Blocked by sc -b failure on RunConfigPanel.tsx:187.                                                                   |
| 2.4                       | Linter Gate (                                                     |
| pm run lint / iome lint)  | ❌ FAIL                                                           | lint/a11y/noRedundantRoles in src/components/panels/RunConfigPanel.tsx:505:10.                                        |
| 2.5                       | Adversarial Stress Suite (src/challenger-cockpit-stress.test.tsx) | ❌ FAIL                                                                                                               | 5 failed tests out of 22: botanical lineage check throws TypeError on undefined indica/sativa attributes; empty state and button label string mismatches.                                                                                            |

---

## Raw Forensic Evidence

### Evidence A: TypeScript Typecheck Error (

pm run typecheck)
`

> ukd-grow-masterplan-2026@8.0.0 typecheck
> tsc -b --pretty false

src/components/panels/RunConfigPanel.tsx(187,11): error TS2339: Property 'currentDay' does not exist on type 'RunPackage'.
`

### Evidence B: Biome Linter Error (

pm run lint)
`
src\components\panels\RunConfigPanel.tsx:505:10 lint/a11y/noRedundantRoles FIXABLE ━━━━━━━━━━━━━━━

× Using the role attribute 'region' on the 'section' element is redundant, because it is implied by its semantic.

    503 │ 			{/* Top Fail-Closed Readiness Gate Box */}
    504 │ 			<section

> 505 │ role=region
> │ ^^^^^^^^
> 506 │ aria-label=Run Readiness Gate Status
> `

### Evidence C: Adversarial Stress Test Failures (

px vitest run src/challenger-cockpit-stress.test.tsx)
`
FAIL src/challenger-cockpit-stress.test.tsx > Empirical Challenger 2 — Autoflower Cockpit Adversarial Stress Suite > 1. Cultivar Dataset Invariant & Range Verification (61 Strains) > verifies botanical enums and lineage consistency
TypeError: actual value must be number or bigint, received undefined
❯ src/challenger-cockpit-stress.test.tsx:289:23
288| if (s.indica !== null && s.sativa !== null) {
289| expect(s.indica).toBeGreaterThanOrEqual(0);
| ^

FAIL src/challenger-cockpit-stress.test.tsx > 5. View Modes & Sorting Determinism > renders List / Axis view and Card view without syntax or layout errors
AssertionError: expected htmlModal to contain In Setup übernehmen
`

### Evidence D: Dataset & Logic Validation Output

`Count: 61
Keys per item: 44
Sample item 0: Mighty Dwarf Automatic | Breeder: Sensi Seeds | THC: Kein belastbarer öffentlicher THC-/CBD-Wert auf der Pflanzenproduktseite. | Score: 92
Sample item 60: Banana Purple Punch Auto RF3 | Breeder: Fast Buds | THC: Laborspitzenwert 30,4 % THC, CBD <1 % (Herstellerangabe/Labortestclaim). | Score: 74
Unique IDs count: 61
Invalid strains count: 0`

---

## Required Remediation Actions for Workers

To achieve CLEAN verdict, the implementation team must address the following:

1. **Fix src/components/panels/RunConfigPanel.tsx:187**: Replace
   un.currentDay with currentDayForRun(run) or evaluate from live-run.ts (
   un.executionMode === live ? evaluateLiveClock(run).day : 0) since RunPackage does not have a currentDay property.
2. **Fix src/components/panels/RunConfigPanel.tsx:505**: Remove redundant
   ole=region from the <section> element.
3. **Fix src/challenger-cockpit-stress.test.tsx / dataset consistency**: Handle undefined vs
   ull for indica/sativa fields in dataset / test assertions, and align button label expectations with isModal rendering.
4. **Re-run full verification**: Ensure
   pm run typecheck,
   pm run lint,
   pm test, and
   pm run build all pass with 0 errors.
