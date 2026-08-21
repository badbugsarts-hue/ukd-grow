# Task Dispatch — Worker M2 (2026-08-14 Release)

## Mission

Implement Milestone 2: Equipment Manager & Sensor Calibration UI based on specifications in `c:\Users\badbu\Documents\grow\.agents\explorer_m2_r2\handoff.md`.

Target Files to Create:

1. `src/components/panels/EquipmentManagerPanel.tsx`
2. `src/components/modals/PpfdMappingModal.tsx`
3. `src/components/modals/SensorCalibrationModal.tsx`
4. `src/components/panels/equipment.test.tsx`

Target File to Update:

- `src/App.tsx`: Import `EquipmentManagerPanel` and replace the equipment stub under `route === "equipment"` with `<EquipmentManagerPanel run={run} lens={lens} onUpdateRun={onUpdateRun} navigate={navigate} />`. Also apply the 1-line defensive filter to `calculateBiologicalPlantAge` in `src/domain.ts` if needed.

## Mandatory Rules & Constraints

- Read ORIGINAL_REQUEST.md and AGENTS.md.
- MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- You must run `npx tsc --noEmit` and `npx vitest run` and report passing build/test results in your handoff.md.
- Write your handoff report to `c:\Users\badbu\Documents\grow\.agents\worker_m2_r2\handoff.md`.
