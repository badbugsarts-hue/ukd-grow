# Task Dispatch — Challenger M1-1 (2026-08-14 Release)

## Mission

Adversarially challenge and stress-test the Milestone 1 domain functions in `src/domain.ts` and `src/scientific-core.ts`.

Stress test scenarios:

1. `calculatePpfdMapSummary`: Negative PPFD values, Infinity, NaN, missing position tags, 0% and >100% dimmer.
2. `getSensorCalibrationStatus`: Invalid dates, future performedAt timestamps, multiple calibration records out of order, missing metrics.
3. `calculateBiologicalPlantAge`: Future anchor dates, duplicate growth events, negative operational age, undefined/null growthEvents array.
4. `calculateSubstrateHydration`: Pot mass < empty mass, saturated mass < empty mass, 0L pot volume, negative mass values.

Run `npx vitest run` to ensure all tests pass under stress.
Provide verdict (APPROVE or REQUEST_CHANGES) in `c:\Users\badbu\Documents\grow\.agents\challenger_m1_1_r2\handoff.md`.

## 2026-08-14T01:27:21Z

<USER_REQUEST>
You are challenger_m1_1_r2.
Your working directory is: c:\Users\badbu\Documents\grow\.agents\challenger_m1_1_r2
Read ORIGINAL_REQUEST.md at c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md, AGENTS.md at c:\Users\badbu\Documents\grow\AGENTS.md, your dispatch at c:\Users\badbu\Documents\grow\.agents\challenger_m1_1_r2\DISPATCH.md, and worker handoff at c:\Users\badbu\Documents\grow\.agents\worker_m1_r2\handoff.md.

Adversarially challenge and stress-test the new domain functions in `src/domain.ts` and `src/scientific-core.ts`.
Run `npx vitest run`.
Deliver your verdict (APPROVE or REQUEST_CHANGES) in c:\Users\badbu\Documents\grow\.agents\challenger_m1_1_r2\handoff.md and report to orchestrator.
</USER_REQUEST>
