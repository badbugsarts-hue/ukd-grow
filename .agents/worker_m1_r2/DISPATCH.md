# Task Dispatch — Worker M1 (2026-08-14 Release)

## Mission

Implement Milestone 1 (Domain & Data Lineage Engine Extensions) based on specifications in `c:\Users\badbu\Documents\grow\.agents\explorer_m1_r2\handoff.md`.

Target files to modify:

1. `src/domain.ts`:
   - Add `calculatePpfdMapSummary(points, fixtureHeightCm, dimmerPercent)`
   - Add `calculateBiologicalPlantAge(dayZeroAnchor, growthEvents, now)`
   - Add `calculateSubstrateHydration(currentMassGrams, potProfile)`
2. `src/scientific-core.ts`:
   - Add `getSensorCalibrationStatus(deviceId, metric, calibrations, now)`
   - Integrate `getSensorCalibrationStatus` into `assessMeasurementTrust`
3. `src/domain.test.ts`:
   - Add unit tests for `calculatePpfdMapSummary`, `calculateBiologicalPlantAge`, and `calculateSubstrateHydration`.
4. `src/scientific-core.test.ts`:
   - Add unit tests for `getSensorCalibrationStatus`.

## Mandatory Rules & Constraints

- Read ORIGINAL_REQUEST.md and AGENTS.md.
- MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- You must run `npx tsc --noEmit` and `npx vitest run` and report passing build/test results in your handoff.md.
- Write your handoff report to `c:\Users\badbu\Documents\grow\.agents\worker_m1_r2\handoff.md`.
