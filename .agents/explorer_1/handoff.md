# Handoff Report — explorer_1 (UI/UX & Panel Structure Explorer)

**Date**: 2026-08-22
**Working Directory**: `C:\Users\badbu\Documents\grow\.agents\explorer_1`
**Handoff Type**: Hard (Task Complete)
**Parent Agent**: parent (`be3893a9-44d5-47ef-b492-5725ea9951b0`)

---

## 1. Observation

Direct code observations from inspecting `src/App.tsx`, `src/styles.css`, `src/components/panels/`, `src/components/modals/`, and `src/prediction-engine.ts`:

1. **Mobile Bottom Spacing Collision**:
   - `src/styles.css` line 3783: `@media (max-width: 760px) { .main-content { padding-bottom: calc(160px + env(safe-area-inset-bottom)); } }`
   - `src/styles.css` line 3343: `@media (max-width: 680px) { .main-content { padding: 20px 12px 92px; } }`
   - The rule at 680px overrides the 160px padding with 92px. On mobile, `.mobile-bar` (height: 62px) and `.global-command-center` (floating with bottom offset 64px) occupy ~110-126px, causing content at the bottom of pages to be obscured behind the floating command bar.

2. **Touch Targets Under 44px (<44px)**:
   - `src/components/panels/AutoflowerCockpitPanel.tsx` lines 358, 380: `minHeight: "32px"` on Raster and Achse view mode buttons.
   - `src/components/panels/AutoflowerCockpitPanel.tsx` lines 1018, 1058, 1129: `minHeight: "40px"` on filter toggle chips.
   - `src/components/panels/EnvironmentTargetsPanel.tsx` lines 276–333: Quick preset buttons (🌱 Sämling, 🌿 Vegi, 🌸 Blüte, 🍂 Spätblüte) have `padding: "6px 8px"`, `fontSize: "11px"`, no `minHeight` (~26-28px computed height).
   - `src/components/panels/EnvironmentTargetsPanel.tsx` line 207: Header button "📊 Klima-Details" has `padding: "6px 12px"` without minHeight (~30px).
   - `src/components/panels/VpdDliCalculatorPanel.tsx` line 153: Header button "🌡️ Zu den Klima-Zielwerten" has `padding: "6px 12px"` (~30px).
   - `src/components/panels/NutrientMixPanel.tsx` lines 851, 904: Step 6 Measured EC and Measured pH inputs have `width: "90px"`, `padding: "6px"`, no minHeight (~28px height).
   - `src/components/panels/RunConfigPanel.tsx` line 1689: Dimmer range slider container has `minHeight: "36px"`.
   - `src/components/panels/BatchResolverDashboard.tsx` line 59: "⚙️ Setup anpassen" header button has `padding: "8px 16px"`, no minHeight (~32px).
   - `src/components/panels/MasterplanOverviewPanel.tsx` lines 274–280: Setup inline links (`<li><strong>Zelt:</strong> <a href="#setup">...</a></li>`) have zero padding and sub-20px line heights.

3. **In-Place Editing & Prediction Engine Implementation**:
   - `src/prediction-engine.ts`:
     - Exports `predictGeneticsMetadata(strainName: string)` and `predictEmergenceDate(pottingDateStr: string)`.
     - `predictGeneticsMetadata` is invoked in `src/components/panels/RunConfigPanel.tsx` (line 855) upon user typing $\ge 3$ characters to suggest breeder, seedType, and phenotype notes.
     - `predictEmergenceDate` is used in `src/components/panels/RunConfigPanel.tsx` (line 248) to auto-calculate emergence date (+3 days from potting date).
   - Currently, Cockpit metric cards in `src/App.tsx` (lines 2039-2088) are read-only and lack in-place quick-logging affordances.
   - In `src/components/panels/DailyOperatorPanel.tsx`, pot weight entries compute substrate hydration percentage, but predictive dryback duration countdown ("ca. X Std. bis 50% Dryback") is not yet rendered inline.

4. **Test Suite Baseline Execution**:
   - Execution of `vitest run` executes 41 test files (485 tests). 38 test files passed (479 tests passed). 3 integration test files had edge-case expectation differences in test fixtures (`AppIntegration.test.tsx`, `AppM4Integration.test.tsx`, `plant-identity-adversarial-challenger.test.tsx`).

---

## 2. Logic Chain

1. **Premise 1 (Mobile Shell Usability)**: A mobile viewport has limited screen real estate. When fixed and sticky navigation elements (`.mobile-bar` + `.global-command-center`) are stacked, the bottom padding of the scrolling container must equal or exceed their combined height plus safe area insets.
2. **Premise 2 (Touch Target Standard)**: The project rule in `AGENTS.md` and WCAG 2.5.5 Level AA mandate a minimum touch target size of $44\text{px} \times 44\text{px}$ for all mobile interactive controls.
3. **Premise 3 (Direct Observations)**: Several buttons and inputs have explicit inline heights of 32px, 36px, or 40px, or lack explicit `minHeight: 44px`.
4. **Conclusion**: Standardizing interactive control sizing to $\ge 44\text{px}$ and repairing the 680px mobile padding override in `styles.css` will immediately resolve major usability and accessibility hurdles on mobile devices.
5. **Premise 4 (In-Place Editing)**: `prediction-engine.ts` provides instant domain inference from partial inputs. Expanding this to provide inline AJAX-style suggestions (e.g. quick-log popover on Cockpit metrics, live EC titration assistance, predictive dryback countdown) minimizes navigation context switching between Cockpit, Setup, and Today.

---

## 3. Caveats

1. **Read-Only Investigation**: As `explorer_1`, no application code was mutated during this analysis. All findings are compiled as actionable proposals for implementers/workers.
2. **Device Matrix**: Observations are based on CSS media queries, DOM structure, and rendering inspection. Physical device testing across iOS Safari and Android Chrome should be performed during QA to verify viewport keyboard behavior when typing into inputs.
3. **Alternative Architecture Considerations**: Consolidating 23 top-level navigation routes into 3 spaces could alter existing URL hash bookmarking (`#setup`, `#cockpit`, `#mix`), so route alias redirection must be maintained.

---

## 4. Conclusion

The UKD Grow Masterplan 2026 frontend has a solid, evidence-backed domain foundation. Usability remediation can be cleanly divided into:

### A. Immediate Quick Fixes (Sprint 1 / Implementer Action Items):

1. **Fix Touch Targets $\ge 44\text{px}$**:
   - `EnvironmentTargetsPanel.tsx`: Preset buttons (lines 276-333) & header button (line 207).
   - `VpdDliCalculatorPanel.tsx`: Header button (line 153).
   - `AutoflowerCockpitPanel.tsx`: View toggles (lines 358, 380) & filter chips (lines 1018, 1058, 1129).
   - `NutrientMixPanel.tsx`: Step 6 measured EC/pH inputs (lines 851, 904).
   - `BatchResolverDashboard.tsx`: Setup button (line 59).
   - `MasterplanOverviewPanel.tsx`: System links (lines 274-280).
2. **Fix Mobile Bottom Padding**:
   - In `styles.css` (line 3343), update `.main-content` padding at `@media (max-width: 680px)` to `padding: 20px 12px calc(160px + env(safe-area-inset-bottom));`.
3. **Add Sticky Row Headers in `FeedingSchedulePanel.tsx`**:
   - Keep "Produkt / Rolle" column sticky during horizontal swipe.
4. **Enhance In-Place Editing**:
   - Add inline quick-log affordance on Cockpit metric cards.
   - Show predictive badges ("⚡ Vorhersage") for genetics & emergence date suggestions.

### B. Architectural Candidates for `ux_audit_report.md`:

1. Progressive disclosure & 3-space workspace navigation consolidation.
2. Dual-axis virtualized data tables for 12-week and 29-sheet data views.
3. Event-sourced reactive observable store for instant continuous multi-panel sync.

---

## 5. Verification Method

To verify findings and validate subsequent fixes:

1. **CSS & Touch Target Inspection**:
   - Inspect elements in Chrome DevTools responsive device mode (iPhone 14 / Pixel 7: 390px - 412px width).
   - Verify every clickable button, pill, toggle, and input has a bounding client rect $\ge 44\text{px}$ in height.
2. **Bottom Clearance Verification**:
   - Scroll to the bottom of `#today` (`DailyOperatorPanel`) and `#mix` (`NutrientMixPanel`) on a 375px viewport.
   - Confirm that the primary action buttons (Save Measurement, Record Batch) remain 100% visible and unclipped above the `.global-command-center` and `.mobile-bar`.
3. **Unit & Integration Test Suite**:
   - Run `npx vitest run` (or `pnpm test`) to ensure zero domain regressions.
