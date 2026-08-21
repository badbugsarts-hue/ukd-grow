# Task Dispatch — Explorer M2 (2026-08-14 Release)

## 2026-08-14T03:43:25Z

You are explorer_m2_r2.
Your working directory is: c:\Users\badbu\Documents\grow\.agents\explorer_m2_r2
Read ORIGINAL_REQUEST.md at c:\Users\badbu\Documents\grow\ORIGINAL_REQUEST.md, AGENTS.md at c:\Users\badbu\Documents\grow\AGENTS.md, your dispatch at c:\Users\badbu\Documents\grow\.agents\explorer_m2_r2\DISPATCH.md, and overall plan at c:\Users\badbu\Documents\grow\.agents\orchestrator\plan.md.

Investigate UI patterns in `src/components/`, `src/App.tsx`, `src/styles.css`, and existing modals.
Provide complete, implementation-ready specifications and code snippets for:

1. `src/components/panels/EquipmentManagerPanel.tsx`
2. `src/components/modals/PpfdMappingModal.tsx`
3. `src/components/modals/SensorCalibrationModal.tsx`
4. `src/components/panels/equipment.test.tsx`

Ensure:

- 2026 Master Class Elite design using CSS variables (`var(--green)`, `var(--surface-1)`, etc.).
- German terminology with `TermTooltip` for PPFD, DLI, EC, pH, Uniformität.
- Accessible touch targets (min 44px) and focus rings.

Write detailed report to c:\Users\badbu\Documents\grow\.agents\explorer_m2_r2\handoff.md and report to orchestrator.

## Mission

Investigate and specify detailed component architecture and code specifications for Milestone 2: Equipment Manager & Sensor Calibration UI.

Target Components:

1. `src/components/panels/EquipmentManagerPanel.tsx`:
   - Hardware inventory & fixture properties (Hersteller, Modell, Max Watt, Dimmer-Stufen).
   - Sensor calibration overview cards & PPFD mapping trigger buttons.
   - Replaces stub panel under `route === "equipment"` in `App.tsx`.
2. `src/components/modals/PpfdMappingModal.tsx`:
   - 3x3 spatial PPFD grid inputs (NW, N, NE, W, C, E, SW, S, SE).
   - Fixture height (cm) & dimmer % controls.
   - Live Mean PPFD, Min, Max, Uniformity calculation (`calculatePpfdMapSummary`).
   - Color-coded grid cell intensity based on variance from mean.
   - Immutable save action updating `run.config.light.ppfdMaps`.
3. `src/components/modals/SensorCalibrationModal.tsx`:
   - Status cards for pH and EC sensors.
   - Badges: `✓ Gültig`, `⚠️ Kalibrierung fällig`, `❌ Abgelaufen`.
   - Guided 3-step calibration flow (Standard buffers pH 4.01/7.00/10.01 or EC 1.413 mS/cm, raw reading, target date/validity window).
   - Updates `run.calibrations` and appends `AuditEvent`.
4. Co-located unit / component test suite (`src/components/panels/equipment.test.tsx`).
