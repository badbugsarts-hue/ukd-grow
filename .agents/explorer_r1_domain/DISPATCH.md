# Task Dispatch — Explorer Domain

## Mission

Investigate existing domain model and state architecture in `src/run-state.ts`, `src/domain.ts`, `src/scientific-core.ts`, `src/backup.ts`, `src/run-storage.ts`, and related files.
Determine how to integrate:

1. Equipment Manager & 9-point PPFD mapping data model (manufacturer, model, dimmer stages, 9 grid points).
2. Sensor Calibration Manager for pH/EC (calibration test date, valid/expired state logic, calibration history).
3. Plant Identity & Biology Engine (breeder, seed-lot, phenotype, Day Zero time anchor definition).
4. Pot Weight Tracking & domain integration (dry weight, saturated weight, current weight, moisture status).

## Constraints & Requirements

- Read ORIGINAL_REQUEST.md and AGENTS.md.
- Maintain append-only audit rules for active runs.
- Do NOT mutate domain calculations or violate AGENTS.md invariants.
- Produce a detailed handoff report in your working directory (`handoff.md`).

## 2026-08-14T01:19:54Z

Received USER_REQUEST:
Investigate `src/run-state.ts`, `src/domain.ts`, `src/scientific-core.ts`, `src/backup.ts`, `src/run-storage.ts`, and existing types.
Determine data models and integration strategy for:

1. 9-point PPFD mapping
2. Sensor Calibration Manager (pH/EC)
3. Plant Identity & Biology Engine
4. Pot Weight Tracking
5. Integration into RunPackage/RunState and AuditEvent without breaking schemas.
