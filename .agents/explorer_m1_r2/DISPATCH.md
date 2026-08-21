# Task Dispatch — Explorer M1 (2026-08-14 Release)

## Mission

Analyze specifications and generate implementation plan for Milestone 1: Domain & Data Lineage Engine Extensions.

Target files:

- `src/domain.ts`
- `src/scientific-core.ts`
- `src/types.ts` (if needed)
- `src/domain.test.ts`
- `src/scientific-core.test.ts`

Key domain functions to specify:

1. `calculatePpfdMapSummary(points: PpfdMapPoint[], fixtureHeightCm: number, dimmerPercent: number): PpfdMapSummary`:
   - Compute mean, min, max, and spatial uniformity ratio (`min / mean`). Handle empty/incomplete grids gracefully.
2. `getSensorCalibrationStatus(deviceId: string, metric: MeasurementMetric, calibrations: CalibrationRecord[], now?: Date): SensorCalibrationStatus`:
   - Enforce 30-day pH and 60-day EC validity windows, handle `result === "failed"`, and wire into `assessMeasurementTrust` in `src/scientific-core.ts`.
3. `calculateBiologicalPlantAge(dayZeroAnchor: DayZeroAnchor, growthEvents: GrowthEvent[], now?: Date)`:
   - Calculate biological plant age in days relative to `seed-started`, `seed-planted`, `emergence`, `first-true-leaves`, or `run-operational-start`.
4. `calculateSubstrateHydration(currentMassGrams: number, potProfile: PotProfile)`:
   - Calculate moisture %, depletion %, available water grams, and moisture category (`dry`, `light`, `medium`, `heavy`, `saturated`).
5. Unit tests covering all happy paths, boundary cases, and invalid input clamping.

Write detailed report to `c:\Users\badbu\Documents\grow\.agents\explorer_m1_r2\handoff.md`.

## 2026-08-14T03:22:40Z

Investigate `src/domain.ts`, `src/scientific-core.ts`, `src/types.ts`, `src/domain.test.ts`, and `src/scientific-core.test.ts`.
Provide precise, implementation-ready specifications and code snippets for:

1. `calculatePpfdMapSummary` in `src/domain.ts`
2. `getSensorCalibrationStatus` & `assessMeasurementTrust` integration in `src/scientific-core.ts`
3. `calculateBiologicalPlantAge` in `src/domain.ts`
4. `calculateSubstrateHydration` in `src/domain.ts`
5. Unit tests for `src/domain.test.ts` and `src/scientific-core.test.ts`.
   Write a comprehensive report to c:\Users\badbu\Documents\grow\.agents\explorer_m1_r2\handoff.md and report to the orchestrator.
