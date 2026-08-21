# Hard Handoff Report — Reviewer 1 (Milestone 4)

**Agent:** Reviewer 1 (`teamwork_preview_reviewer`)  
**Roles:** Reviewer, Critic  
**Working Directory:** `.agents/reviewer_m4_1`  
**Milestone:** Milestone 4: Pot Weight Dryback Tracking Widget & App Shell Routing Integration  
**Date:** 2026-08-14  
**Verdict:** `APPROVE`

---

## 1. Observation

Direct code and execution observations across all reviewed files:

1. **Gravimetric Dryback Tracking in `src/components/panels/DailyOperatorPanel.tsx`**:
   - **Calculation hook** (lines 557–610): Reactive computation via `calculateSubstrateHydration(currentPotMassVal, activePotProfile)` using `useMemo`. Live updates dynamically reflect input changes from `potMassG`, `potTaraInput`, `potSatInput`, and `potVolInput`.
   - **Historical Dryback Rate** (lines 592–610): Computes rate in $g/h$ from previous day observations (`deltaHours = deltaDays * 24; massLoss = prev.values.potMassGrams - currentPotMassVal;`). Safely returns `null` when no prior measurement exists or when mass loss is non-positive (e.g., following irrigation).
   - **5-Zone Progress Gauge / Meter Bar** (lines 2275–2335):
     - Uses semantic accessibility attributes: `role="meter"`, `aria-label="Substrat-Hydratation"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, and localized `aria-valuetext`.
     - 5 discrete color zones: 0–20% (Trocken / Red), 20–40% (Leicht / Amber), 40–70% (Optimal / Emerald), 70–90% (Feucht / Cyan), 90–100% (Sättigung / Purple).
     - Indicator needle positioned via `left: calc(${Math.min(99, Math.max(1, substrateHydration.hydrationPercent))}% - 3px)`.
   - **German Watering Recommendations** (lines 252–330 & 2420–2479):
     - `HYDRATION_CATEGORY_DETAILS` defines structured guidance for all 5 categories (`saturated`, `heavy`, `medium`, `light`, `dry`).
     - Distinct copy for each experience lens: `guided` (accessible, actionable), `advanced` (technical percentages and dryback phase), and `expert` (matrix potential, hypoxia risk, root zone gas exchange, 15–20% drain targets).
   - **Inline Explanations & Tooltips** (lines 2073–2079, 2113–2119, 2153–2159, 2255–2261, 2375–2377):
     - Implements `<TermTooltip>` with localized German definitions for "Topfgewicht", "TARA", "Vollsättigung", "Substrat-Feuchte", and "Dryback".
   - **Touch Target Compliance**:
     - All interactive inputs (`potMassG`, `potTaraInput`, `potSatInput`, `potVolInput`, `plantHeightCm`, etc.) and buttons (`handleSavePotCalibration`) define `minHeight: "44px"` and `minWidth: "44px"`, adhering to WCAG 2.5.5 / mobile ergonomics.

2. **State Transition & Lineage in `src/run-state.ts`**:
   - `updatePotProfile` (lines 415–493) implements pure, immutable state transformation via `touch(...)`.
   - Configuration is cloned (`...run.config, pot: updatedPot`) with numerical bounds enforced (`Math.max(0.1, ...)` for volume, `Math.max(0, ...)` for masses).
   - Appends an `AuditEvent` (`action: "configuration-changed"`, `entityType: "pot-profile"`, `entityId: run.id`).
   - Appends a `DomainEvent` (`aggregateId: run.id`, `type: "configuration.changed"`, payload with `pot` and `activeSnapshotPreserved`).
   - Snapshot preservation: When `run.status !== "draft"`, `run.configurationSnapshot` remains strictly untouched.

3. **App Shell Routing & State Integration in `src/App.tsx`**:
   - `NAV` definition (line 284) registers `#equipment` under group `"System"` with icon `"⚙"`.
   - Route descriptions and help metadata configured in `HELP.equipment` (lines 461–467).
   - `WorkspaceRoute` switch handler (lines 1332–1340) maps case `"equipment"` to `<EquipmentManagerPanel run={run} lens={lens} onUpdateRun={setRun} navigate={navigate} />`.
   - Modal handlers (`PpfdMappingModal`, `SensorCalibrationModal`, `PlantIdentityModal`) dispatch state updates via `onUpdateRun` without direct mutations.

4. **Deterministic Test Suite & Compiler Verification**:
   - Executed `npx vitest run`:
     - **310 tests passed** across **24 test suites** (0 failures, duration 47.94s).
     - Dedicated suite `src/components/panels/pot-weight-dryback.test.tsx` passed all 21 tests covering mathematical calculations, category boundaries, dynamic German lens copy, state transition immutability, measurement ingestion, UI rendering, and route resolution.
   - Executed `npx tsc --noEmit`: Exit code 0, **0 errors**.
   - Executed `npx vite build`: Production build succeeded in 10.98s with 0 errors.

---

## 2. Logic Chain

1. **Mathematical Soundness**: `calculateSubstrateHydration` in `src/domain.ts` calculates available water capacity as `satMass - emptyMass` (with fallback to `fillVolumeLiters * 750g/L` if saturated mass is not specified). Hydration percentage is safely clamped between 0% and 100%, and depletion is calculated as `100 - hydrationPercent`. These calculations provide true gravimetric tracking without arbitrary or hardcoded values.
2. **UX & Accessibility Conformance**: The 5-zone meter bar utilizes `role="meter"` with proper ARIA min, max, now, and text attributes. The 3 experience lenses (`guided`, `advanced`, `expert`) adapt the technical depth of watering guidance without altering the underlying gravimetric metrics, strictly respecting `AGENTS.md` invariants.
3. **Data Lineage & Audit Compliance**: Modifying the pot profile through `updatePotProfile` maintains an append-only log of domain and audit events while leaving active snapshots immutable, preserving reproducibility and forensic integrity.
4. **Architectural Cohesion**: Registering `#equipment` in `NAV` and `WorkspaceRoute` seamlessly integrates the Equipment Manager panel into the app shell navigation.

---

## 3. Adversarial Review & Stress-Testing

### Assumption & Edge Case Stress-Testing

| Scenario / Edge Case           | Test Input / Condition                                                                 | Actual Handling                                                                                             | Result   |
| ------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| **Under-tare Weight**          | Gross pot weight < empty tare weight (e.g. 500g vs 1000g tare)                         | Clamped to 0g water, 0% hydration, category `"dry"`. No negative values or layout breaks.                   | **PASS** |
| **Over-saturation Weight**     | Gross pot weight > saturated mass (e.g. 6000g vs 5000g sat)                            | Clamped to 100% hydration, category `"saturated"`. Needle stays within gauge bounds.                        | **PASS** |
| **Missing Saturated Mass**     | `saturatedMassGrams = null`                                                            | Falls back to density heuristic $750\,\text{g/L} \times \text{Volume}$.                                     | **PASS** |
| **Zero/Negative Volume Input** | User enters `0` or negative string in volume field                                     | Clamped to minimum $0.1\,\text{L}$ (fallback $11\,\text{L}$ on empty/NaN).                                  | **PASS** |
| **Non-monotonic Mass History** | Post-watering observation where current mass > previous mass                           | `massLoss` is $\le 0$; `historicalDrybackRate` safely returns `null` (renders `"—"`).                       | **PASS** |
| **Integrity & Cheating Check** | Codebase inspection for hardcoded test results, facade logic, or bypassed verification | Implementation performs genuine dynamic reactive calculations and state updates; no facades or dummy mocks. | **PASS** |

---

## 4. Caveats

- **Historical Dryback Rate Pre-requisites**: Dryback rate ($g/h$) requires at least one previous observation containing a positive `potMassGrams`. On Day 0 or prior to first weight log, the display safely indicates `—`.
- **Soil Compaction / Root Mass Expansion**: Over an extended cycle (e.g. 80+ days), root dry biomass increases slightly (typically 50–150g). The user can adjust TARA at any time using the "Topfprofil kalibrieren / speichern" button.

---

## 5. Conclusion

The Milestone 4 implementation is thoroughly verified, mathematically accurate, robustly engineered, and fully compliant with project standards and `AGENTS.md` invariants.

**Verdict: `APPROVE`**

---

## 6. Verification Method

To independently reproduce the verification results:

```bash
# 1. Run all 24 unit test suites (310 tests)
npx vitest run

# 2. Run TypeScript strict typecheck
npx tsc --noEmit

# 3. Verify production Vite build
npx vite build
```
