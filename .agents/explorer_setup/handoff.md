# Handoff Report — UKD Grow Masterplan Setup View & Missing Elements Analysis

**Agent:** Explorer Setup (`.agents/explorer_setup`)  
**Parent / Orchestrator:** f405ce39-450a-4cb1-bc3b-d8f617d532f0  
**Date:** 2026-08-21  
**Handoff Type:** Hard (Task Complete)

---

## 1. Observation

1. **Active Setup Route & Component**:
   - In `src/App.tsx` (lines 1619–1626), route `"setup"` mounts `<RunConfigPanel run={run} lens={lens} onUpdateRun={setRun} navigate={navigate} />`.
   - In `src/components/panels/RunConfigPanel.tsx` (lines 336–849), the view renders 5 configuration cards:
     - Card 1 (lines 343–496): `name`, `genetics`, `medium` ("Erde", "Coco", "Hydro"), `pot.nominalVolumeLiters`, and a plant identity summary with button opening `PlantIdentityModal`.
     - Card 2 (lines 499–558): `ledMaxW` and `lightHours`.
     - Card 3 (lines 561–661): `tentWidthCm`, `tentDepthCm`, `tentHeightCm`, displaying computed `tentAreaM2` and `tentVolumeM3`.
     - Card 4 (lines 664–799): `water.sourceEc`, `water.sourcePh`, `water.calciumMgL`, `water.magnesiumMgL`, and computed `caMgRatio`.
     - Card 5 (lines 802–849): `exhaustM3h` and turnover calculation.
2. **Transient State in Card 5**:
   - In `src/components/panels/RunConfigPanel.tsx` line 116: `const [exhaustM3h, setExhaustM3h] = useState<number>(220);`.
   - This value is held purely in local React component state and is never saved to `RunConfig` or `RunPackage`. Navigating away and returning resets it to 220.
3. **Orphaned Autoflower Cockpit Data & Component**:
   - In `src/data/autoflower-cockpit.json` (lines 1–63), 6 genetics entries exist with tags, description, yield, level, type, and provenance.
   - In `src/components/panels/AutoflowerCockpitPanel.tsx` (lines 1–155), a browser component renders these cards.
   - In `src/App.tsx` line 1696, route `"autoflower"` renders `<LibraryPage sheetName="15_Strains" lens={lens} />` rather than `AutoflowerCockpitPanel`.
   - `AutoflowerCockpitPanel` is never imported in `App.tsx` and provides no callback or action to select a cultivar into `run.config.genetics`.
4. **Missing Pot Tare Weights & Dryback Blocking**:
   - In `src/types.ts` lines 228–236, `PotProfile` includes `emptyMassGrams` and `saturatedMassGrams`.
   - In `src/domain.ts` lines 391–480, `calculateSubstrateHydration` checks `if (emptyMass === undefined || emptyMass === null)` and returns `state: "INSUFFICIENT_DATA", reason: "EMPTY_MASS_MISSING"`.
   - `RunConfigPanel.tsx` only provides an input for `nominalVolumeLiters`, omitting pot tare weights.
5. **Hidden / Fragmented Parameters**:
   - `plantCount` (`types.ts:711`), `startDate` (`types.ts:709`), `endDay` (`types.ts:710`), `mediumProduct` (`types.ts:719`), `nutrientSystem` (`types.ts:721`), and `irrigationSystem` (`types.ts:720`) are present in the `RunConfig` interface but are completely absent from `RunConfigPanel.tsx`.
   - Some of these fields are only partially editable in secondary panels like `GlobalPlanEditorPanel.tsx` (lines 165–312).
6. **Execution Mode & Milestone Tracking**:
   - `run.executionMode` (`types.ts:1336`) defaults to `"simulation"` and can only be toggled via `GlobalCommandCenter.tsx:445`.
   - Day zero anchor tracking in `PlantIdentityModal.tsx` supports a single anchor date, but lacks a multi-step progression (Aussaat → Eintopfen → Durchstoß → Erstes Blattpaar) for retroactive milestone adjustments.
7. **Test Suite Baseline**:
   - Running `npx vitest run` executes 36 test files, 386 tests, all passing with 0 failures in 33.04s.

---

## 2. Logic Chain

1. **From Observation 1 & 5**: Because `RunConfigPanel.tsx` does not render `plantCount`, `startDate`, `endDay`, `mediumProduct`, `pot.type`, `emptyMassGrams`, `saturatedMassGrams`, `nutrientSystem`, or `irrigationSystem`, users cannot configure a complete grow plan from the primary Setup view.
2. **From Observation 2**: Because `exhaustM3h` in Card 5 is stored only in local `useState`, user-entered ventilation values are lost on route transition and cannot be audited or utilized by climate engines.
3. **From Observation 3**: Because `AutoflowerCockpitPanel.tsx` is unrouted and lacks an `onSelect` callback, growers must manually re-type strain names, losing all associated metadata (cycle length, breeder, expected yield, experience level).
4. **From Observation 4**: Because `emptyMassGrams` and `saturatedMassGrams` cannot be set in Setup, automated pot dryback calculations fail-closed with `INSUFFICIENT_DATA`, breaking real-time hydration metrics in `DailyOperatorPanel`.
5. **From Observation 6**: Because mode switching is nested in `GlobalCommandCenter` and milestone entry is limited to a single anchor date, growers cannot easily toggle between Simulation/Live modes or retroactively adjust potting/emergence dates to dynamically recalibrate the masterplan timeline.
6. **Synthesized Conclusion**: A unified, modular 2026 Setup View architecture (incorporating an 8-card grid, an Autoflower Cockpit selector modal, a prominent Live/Simulation switch, a 4-step retroactive milestone tracker, and full parameter persistence) is required to resolve all identified gaps while maintaining strict compliance with `AGENTS.md` invariants.

---

## 3. Caveats

- **No Code Modifications Made**: In accordance with the Explorer role, no application source code was modified.
- **Hardware Integration Scope**: Bluetooth/Wi-Fi live sensor communication is out of scope (per `AGENTS.md` roadmap constraint: no fake live hardware connectivity). Sensor inputs are manual/calibrated or simulated.
- **Water Chemistry Invariant**: City presets from `water-presets.json` must remain purely informative references; actual water chemistry must be explicitly entered or verified by the user to avoid silent fabrication of CalMag dosages.

---

## 4. Conclusion

The current Setup view provides a solid foundation with its fail-closed Readiness Gate and core inputs, but suffers from significant parameter visibility and persistence gaps, an orphaned genetics cockpit, and a lack of retroactive milestone and live mode controls.

We have produced a comprehensive architectural blueprint in `c:\Users\badbu\Documents\grow\.agents\explorer_setup\report.md` detailing:
1. Complete configured vs. visible vs. editable parameter matrix.
2. Full specification of missing UKD setup elements (ventilation persistence, AKF matching, target VPD envelopes, dryback tare weights, substrate mix ratios, advanced water ions, KCanG compliance).
3. 2026 Master Class UI layout design with 8 categorized cards, Progressive Disclosure per Experience Lens (Guided/Advanced/Expert), and German terminology.
4. Component hierarchy and integration interfaces for `AutoflowerCockpitModal` and `RunExecutionModeToggle`.

---

## 5. Verification Method

To verify the investigation findings and test future implementations:
1. **Source Code Inspection**:
   - Inspect `src/components/panels/RunConfigPanel.tsx` (lines 116, 343–849) to confirm missing fields and transient `exhaustM3h` state.
   - Inspect `src/App.tsx` (lines 1619–1626, 1696) to confirm routing of `RunConfigPanel` and orphaning of `AutoflowerCockpitPanel`.
   - Inspect `src/domain.ts` (lines 391–480) to confirm dryback calculation requirements for `emptyMassGrams`.
2. **Automated Test Suite**:
   - Run `npx vitest run` to verify baseline test suite execution (36 files, 386 tests).
3. **Invalidation Conditions**:
   - If `RunConfigPanel.tsx` already persisted `exhaustM3h` to `run.config` or `run.equipment`, Finding 2 would be invalidated (confirmed transient in line 116).
   - If `AutoflowerCockpitPanel` was actively imported and used in `App.tsx`, Finding 3 would be invalidated (confirmed unimported in `App.tsx`).
