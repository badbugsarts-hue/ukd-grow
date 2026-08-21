# Task Dispatch — Reviewer M1 (2026-08-14 Release)

## Mission

Review Milestone 1 code changes in `src/domain.ts`, `src/scientific-core.ts`, `src/domain.test.ts`, and `src/scientific-core.test.ts`.

Checklist:

1. `calculatePpfdMapSummary`: Mean, Min, Max, Uniformity (min/mean), edge cases (empty array, dimmer scale).
2. `getSensorCalibrationStatus`: 30-day pH and 60-day EC windows, `result === "failed"` check, `assessMeasurementTrust` integration.
3. `calculateBiologicalPlantAge`: 5 Day Zero anchors, fallback to operational start, date math.
4. `calculateSubstrateHydration`: Moisture %, depletion %, category mapping, volumetric fallback.
5. Verification: Run `npx tsc --noEmit` and `npx vitest run`. Ensure all 168 tests pass.

Provide verdict (APPROVE or REQUEST_CHANGES) in `c:\Users\badbu\Documents\grow\.agents\reviewer_m1_1_r2\handoff.md`.
