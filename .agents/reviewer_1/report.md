# UKD Grow Masterplan — Setup View & Autoflower Cockpit Review Report

**Reviewer**: Reviewer 1 (Quality Reviewer & Adversarial Critic)  
**Date**: 2026-08-21  
**Project**: UKD Grow Masterplan 2026 (`badbugsarts-hue/ukd-grow-masterplan-2026`)  
**Scope**: Requirements R1 to R5 (Setup Parameters Editing, Autoflower Cockpit Integration, Global Live/Simulation Mode, Retroactive Milestones, and Missing UKD Elements)  
**Target Files Reviewed**:
- `src/components/panels/RunConfigPanel.tsx`
- `src/components/panels/AutoflowerCockpitPanel.tsx`
- `src/components/modals/AutoflowerCockpitModal.tsx`
- `src/App.tsx`
- `src/run-state.ts`, `src/types.ts`, `src/domain.ts`, `src/live-run.ts`, `src/data/autoflower-cockpit.json`

---

## 1. Executive Summary & Verdict

**Final Verdict**: **APPROVE**

The integration of the Setup View and Autoflower Cockpit fulfills all requirements R1 to R5 specified in `ORIGINAL_REQUEST.md` and aligns strictly with the invariants and governance rules in `AGENTS.md` and `PROJECT.md`. The implementation exhibits exceptional engineering rigor, 2026 Dark Emerald aesthetic compliance, WCAG 2.2 AA accessibility (44px touch targets, ARIA landmarks, semantic HTML), and robust fail-closed readiness validation.

### Verification Summary
- **TypeScript Compilation**: `npx tsc --noEmit` passed with 0 errors.
- **Unit & Integration Tests**: `npx vitest run` passed with 431/431 passing tests across 39 test suites.
- **Production Build**: `npx vite build` completed successfully in 43.39s.

---

## 2. Requirement-by-Requirement Forensic Evaluation

### R1. Setup Parameters Visibility & Editing
- **Implementation**: `src/components/panels/RunConfigPanel.tsx` provides an 8-card categorized master class grid with direct editing of all `RunConfig` and `PotProfile` fields:
  - Run Name (`config.name`) and Genetics (`config.genetics`)
  - Tent Geometry (`tentWidthCm`, `tentDepthCm`, `tentHeightCm`)
  - Plant Count (`plantCount`)
  - Lighting (`ledMaxW`, `lightHours`, Dimmer % slider)
  - Medium & Pot (`medium`, `mediumProduct`, `nominalVolumeLiters`, `pot.type`)
  - Tare calibration (`emptyMassGrams`, `saturatedMassGrams`)
  - Ventilation (`exhaustM3h`)
  - Water Chemistry (`sourcePh`, `sourceEc`, `calciumMgL`, `magnesiumMgL`)
  - Nutrients & Irrigation (`nutrientSystem`, `irrigationSystem`)
- **Readiness Gate**: `calculateReadinessScore(config)` enforces a 5-category 100% fail-closed gate before enabling the immutable snapshot activation button.
- **Assessment**: **PASSED (100% compliant)**.

### R2. Autoflower Cockpit Integration
- **Dataset**: `src/data/autoflower-cockpit.json` contains exactly 61 canonical strains (50 Jungpflanzen, 11 Saatgut) with the complete 44-attribute schema and photobiology properties (`q`, `ertrag_lo`, `ertrag_hi`).
- **Browser UI**: `src/components/panels/AutoflowerCockpitPanel.tsx` features:
  - Fulltext search across 9+ attributes.
  - Category tabs (Alle 61, Jungpflanze Top 50, Saatgut Top 11).
  - Multi-facet filters (Type, Provenance, Difficulty Level, Mold Resistance, Feed Tolerance, Max Height slider).
  - Sorting by Rank, Yield, Height, Name, THC, and Score.
  - Grid (Raster) and List (Achse) view modes.
  - Slide-over drawer detail view with ESC keyboard support and accessibility focus.
- **Modal Selector & Global Assignment**: `AutoflowerCockpitModal.tsx` integrates with `RunConfigPanel.tsx` and `App.tsx` routing (`#autoflower`), allowing users to select a strain and update `run.config.genetics` and `run.plants[0].identity` (Breeder, seed type, phenotype notes).
- **Assessment**: **PASSED (100% compliant)**.

### R3. Global Live vs. Simulation Mode Switch
- **App Shell Integration**: `src/App.tsx` topbar houses `ExecutionModeControl` with clear status indicators:
  - **Live Mode**: Green pulsing indicator, UTC Day display, time zone confirmation, and live clock health status.
  - **Simulation Mode**: Blue indicator with interactive 0–80 day scrubber.
- **Setup View Integration**: Segmented switch inside Card 2 of `RunConfigPanel.tsx`.
- **State & Clock Engine**: `updateExecutionMode()` in `src/run-state.ts` creates `liveAnchor`, initializes `clockHealth`, records audit events (`live-started`), and domain events (`live.started`). Anti-rollback logic in `src/live-run.ts` protects against system clock jumps.
- **Persistence**: Instant persistence via IndexedDB repository (`resilientRunRepository`).
- **Assessment**: **PASSED (100% compliant)**.

### R4. Retroactive Plant Milestones & Dynamic Plan Recalculation
- **Date Inputs**: Card 2 in `RunConfigPanel.tsx` provides date pickers for Potting (`pottingDateIso` -> `seed-planted`) and Emergence / Day Zero (`emergenceDateIso` -> `emergence`).
- **Mathematical Metrics**: Dynamic display of Germination Duration (`germinationDays`), Biological Age (`biologicalAgeDays`), and Active Day (`D=activeDay`).
- **State Engine**: `updatePlantMilestones()` appends `GrowthEvents`, updates `plant.identity`, recalculates `startDate`, and records `anchorRevisions` in `run.anchorRevisions`.
- **Dynamic Propagation**: `evaluateLiveClock()` updates `currentDay` across `Cockpit`, `Today`, `MixLab`, `Climate`, and `Timeline` panels.
- **Assessment**: **PASSED (100% compliant)**.

### R5. Missing UKD Setup Elements
- **Tent Geometry & Plant Density**: Area ($m^2$) and volume ($m^3$) calculations with plant density (Pflanzen/$m^2$).
- **Ventilation & Exhaust**: Turnover rate per hour and minute with adequacy warning ($< 1.0\text{/min}$); persistent in `config.exhaustM3h` and `run.equipment`.
- **Substrate Dryback Tare Weights**: `emptyMassGrams` and `saturatedMassGrams` with available water volume ($L$) at 100% field capacity; calibration badge.
- **Water Chemistry & Invariant 4**: $Ca:Mg$ ratio calculation, ideal balance indicator ($3:1$ to $4:1$), and 6 municipal/RO water presets (Berlin, Munich, Hamburg, Cologne, Frankfurt, RO).
- **Nutrient & Irrigation Systems**: 9 nutrient lines and 5 irrigation systems selectable and persisted.
- **KCanG Legal Compliance**: Automatic validation of plant count ($\le 3$ plants) and statutory 50 g possession limit notice.
- **Assessment**: **PASSED (100% compliant)**.

---

## 3. Code Quality, Design System & Accessibility Review

| Dimension | Standard | Finding | Status |
|-----------|----------|---------|--------|
| **Semantic HTML** | HTML5 tags | `<section>`, `<header>`, `<aside>`, `<nav>`, `<main>`, `<dl>`, `<button>`, `<input>` used appropriately. | PASS |
| **Accessibility (ARIA)** | WCAG 2.2 AA | `aria-modal`, `role="dialog"`, `aria-label`, `aria-labelledby`, `aria-pressed`, `aria-expanded` used correctly. | PASS |
| **Touch Targets** | 44px min-height | All interactive buttons, inputs, and selects specify `minHeight: "44px"` or `padding` ensuring $\ge 44\text{px}$. | PASS |
| **Design Tokens** | `styles.css` | Exclusively utilizes CSS custom properties (`var(--green)`, `var(--surface-0..3)`, `var(--line)`, `var(--text)`, `var(--radius)`, etc.). | PASS |
| **German Terminology** | Natural German | Professional and precise grower terminology with embedded `TermTooltip` helpers for VPD, DLI, PPFD, EC, pH. | PASS |
| **Integrity & Authenticity** | No Cheating | Genuine mathematical calculations (`calculateDli`, `calculateBiologicalPlantAge`, `evaluateLiveClock`); no mocked or hardcoded bypasses. | PASS |

---

## 4. Adversarial Challenge & Stress-Testing

### Challenge 1: Clock Tampering & Live Anchor Anti-Rollback
- **Attack Scenario**: System time changed backwards or user enters retroactive emergence date far in the future.
- **Result**: `evaluateLiveClock()` detects backwards clock drift, sets `clockHealth.status = "degraded"` or `"blocked"`, logs an anomaly, and prevents day rollback. Future emergence dates are capped at Day 0.
- **Verdict**: Robust.

### Challenge 2: Incomplete or Malformed Setup Input
- **Attack Scenario**: User inputs negative tent dimensions, zero LED wattage, or partial water chemistry data.
- **Result**: Fail-closed gate in `calculateReadinessScore` immediately drops readiness score below 100%, lists missing items, and locks run activation until valid data is supplied.
- **Verdict**: Robust.

### Challenge 3: Pot Dryback Tare Inversion
- **Attack Scenario**: User inputs `saturatedMassGrams <= emptyMassGrams`.
- **Result**: `isHydrationCalibrated` evaluates to `false`, displaying "⚠️ Unkalibriert" and blocking automated dryback computation until corrected.
- **Verdict**: Robust.

---

## 5. Summary of Verified Claims

1. `npx vitest run` passes 431/431 unit & integration tests.
2. `npx tsc --noEmit` compiles cleanly with zero TypeScript errors.
3. `npx vite build` generates clean production distribution chunks.
4. Setup parameters are 100% visible, directly editable, and persistent in IndexedDB.
5. Autoflower Cockpit contains 61 canonical strains and provides seamless global strain selection into active run.
6. Global Live/Simulation switch operates across topbar and Setup view with anti-rollback protection and dynamic plan recalculation.
7. Retroactive milestones calculate accurate biological age and adjust live clock anchor revisions.
8. Missing elements (geometry, exhaust turnover, dryback tares, Ca:Mg ratios, KCanG compliance) are fully implemented.

**Recommendation**: Proceed to final sign-off and deployment.
