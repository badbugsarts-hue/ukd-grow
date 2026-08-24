# UI/UX & Panel Structure Audit Report

**Audit Target**: UKD Grow Masterplan 2026 Frontend (`src/App.tsx`, `src/styles.css`, `src/components/panels/`, `src/components/modals/`, `src/components/common/`)
**Auditor**: explorer_1 (UI/UX & Panel Structure Explorer)
**Date**: 2026-08-22
**Integrity Mode**: Development / Scientific Read-Only Analysis

---

## 1. Executive Summary

A comprehensive, forensic UX/UI audit of the UKD Grow Masterplan 2026 frontend was conducted across desktop and mobile form factors (320px to 1920px+).

### Core Assessment:

- **Strengths**: The application boasts an exceptionally rich domain model, German first-principles terminology, strict fail-closed safety gates (e.g. water chemistry baseline enforcement before CalMag/Athena dosing), a structured 3-lens system (Guided, Advanced, Expert), and powerful scientific calculation engines (VPD, DLI, substrate hydration, dryback rate, biological age, batch resolution).
- **Primary Usability Deficits**:
  1. **Mobile Collision / Overlap**: An overlap exists on small screens (`max-width: 680px`) where bottom clearance (`padding-bottom: 92px`) in `styles.css` is insufficient for the stacked `.mobile-bar` (62px) and floating `.global-command-center` (~48px), clipping the bottom-most interactive controls (save buttons, notes).
  2. **Touch Targets < 44px**: Multiple interactive elements (preset buttons, view-mode toggles, filter chips, table inputs) fail the 44px minimum touch target standard (WCAG 2.5.5 and AGENTS.md invariant).
  3. **Information Density & Navigation Fatigue**: 23 top-level routes create high cognitive overhead. On mobile, the primary Operator action is placed below read-only plan metrics.
  4. **In-Place Editing Potential**: Users are frequently forced to transition into `setup` or `today` to record simple measurements or tweak parameters. The `prediction-engine.ts` is currently only utilized in `RunConfigPanel.tsx` and can be expanded to provide seamless AJAX-style suggestions across the app.

---

## 2. Global Shell, Navigation & Layout Audit

### 2.1 Navigation Structure & Routing

- **Desktop Sidebar**: Fixed 260px sidebar containing 23 navigation items divided into 5 groups (`Operator`, `Werkzeuge`, `Bibliothek`, `Evidenz`, `System`).
  - _Finding_: High vertical density. While icons and labels are well-differentiated, grouping lacks collapse/expand affordances, causing users on smaller laptops (768px - 1024px) to scroll the sidebar.
- **Mobile Navigation (`max-width: 900px` / `max-width: 680px`)**:
  - _Bottom Bar (`.mobile-bar`)_: Contains 5 primary routes (`cockpit`, `setup`, `log`, `today`, `mix`).
  - _Hamburger Drawer_: Slides out with all 23 routes.
  - _Global Command Center (`.global-command-center`)_: Floating bar above the mobile bar (`bottom: calc(64px + env(safe-area-inset-bottom))`).

### 2.2 Critical Layout Collision (`src/styles.css`)

- **Observation**:
  - In `src/styles.css` line 3783: `@media (max-width: 760px) { .main-content { padding-bottom: calc(160px + env(safe-area-inset-bottom)); } }`
  - In `src/styles.css` line 3343: `@media (max-width: 680px) { .main-content { padding: 20px 12px 92px; } }`
- **Impact**: The rule at 680px overrides the 160px bottom padding with 92px. On mobile devices, the `.mobile-bar` (62px) + `.global-command-center` (~48px) require at least 120-140px clearance. The 92px padding causes the last 28-48px of every view (often the primary Save/Submit button) to be obscured by the floating command center.
- **Remediation**: Update `styles.css` line 3343 to ensure `.main-content` maintains `padding-bottom: calc(160px + env(safe-area-inset-bottom))`.

### 2.3 Color Contrast & Theme Tokens

- **Dark Mode (`:root`)**:
  - Background: `--bg: #07110f`, Surfaces: `#0b1715` to `#1c2d29`, Text: `#eef6f2`.
  - Contrast is generally strong (> 7:1) for primary text.
  - Secondary/Muted text (`--muted: #82958e` on `#0b1715`) is ~4.8:1. For 10px-11px annotations and table headers, readability suffers under sunlight.
- **Light Mode (`:root[data-theme="light"]`)**:
  - Background: `#eef3f0`, Text: `#14231f`, Green: `#006b4d`. High contrast and clean token overrides.

---

## 3. Detailed Panel-by-Panel UX Audit

### Panel 1: `DailyOperatorPanel.tsx` (90 KB, 3263 lines)

- **Role**: Core daily operator workspace — 3-step structured daily workflow.
- **Step 1: Zielkorridor & Freigabe**:
  - Clear corridor display for PPFD, DLI, Temp, Humidity, Leaf-VPD, EC, pH, Water.
  - Status pills and Stop-Rule callouts are immediately prominent.
- **Step 2: Messung & Beobachtung**:
  - _Strengths_: Highly comprehensive. Includes Pot Weight tare/saturation calibration, real-time Substrate Hydration percentage gauge, historical dryback rate ($g/h$), plant height, stress score, and structured category observations.
  - _Usability Deficits_:
    - Form is very tall (~1200 vertical pixels). Users must scroll extensively on mobile.
    - Topfprofil kalibrieren button (line 2295) and Measurement save button (line 2824) have good height (44px), but smaller inputs lack quick increment/decrement buttons for rapid thumb adjustment.
- **Step 3: Maßnahmen & Bestätigung**:
  - Action checklist with interactive toggle states (`pending`, `in-progress`, `completed`, `skipped`). Clean tactile feedback.

### Panel 2: `AutoflowerCockpitPanel.tsx` (67 KB, 2240 lines)

- **Role**: Genetics Cockpit & Strain Database (44 attributes per strain).
- **Usability Deficits**:
  - _Touch Target Violations_:
    - Raster / Achse toggle buttons (lines 358, 380): `minHeight: "32px"` (Violation: <44px).
    - Filter toggle chips (lines 1018, 1058, 1129): `minHeight: "40px"` (Violation: <44px).
  - _Mobile Layout_:
    - At `< 900px`, the filter aside stacks above the grid, pushing strain cards far down. A collapsible filter accordion or filter drawer is recommended for mobile.
  - _Detail Drawer_:
    - Detail drawer (line 3945) slides in smoothly on desktop and mobile, with keyboard ESC close and backdrop tap support.

### Panel 3: `NutrientMixPanel.tsx` (29 KB, 1093 lines)

- **Role**: 7-Step fail-closed nutrient mixing protocol and batch preparation.
- **Usability Deficits**:
  - _Touch Target Violations_:
    - Step 6 Measured EC and Measured pH inputs (lines 851, 904): `width: "90px"`, `padding: "6px"`, no `minHeight` (~28px rendered height, <44px).
  - _Table Responsiveness_:
    - Step 5 mixing table has horizontal overflow. On mobile screens, column headers ("Ist-Dosis", "Status & Hinweis") become compressed.
  - _In-Place Prediction_:
    - When user inputs a measured EC higher than target, an instant live recommendation (e.g. "EC um +0.3 mS/cm überhöht → Verdünnung mit 1.2 L Wasser empfohlen") should render immediately next to the gauge.

### Panel 4: `RunConfigPanel.tsx` (74 KB, 2813 lines)

- **Role**: Setup workspace, readiness scoring gate (100% required for activation), multi-plant configuration, water profile baseline.
- **Usability & In-Place Editing Assessment**:
  - _Genetics Input_: Has AJAX-style prediction via `predictGeneticsMetadata(newValue)` (line 855), which auto-populates breeder, seed type, and phenotype notes when typing $\ge 3$ characters.
  - _Potting & Emergence Dates_: Uses `predictEmergenceDate(newPotting)` to calculate emergence date (+3 days), reducing manual entry.
  - _Touch Target Violations_:
    - Dimmer range slider (line 1689): `minHeight: "36px"` (<44px).
  - _Readiness Checklist_: The 5 categories (Substrate, Light, Tent, Water, Genetics) give clear 0-100% feedback with missing item listings.

### Panel 5: `EnvironmentTargetsPanel.tsx` (16 KB, 652 lines)

- **Role**: Interactive microclimate & VPD simulator with preset targets.
- **Usability Deficits**:
  - _Touch Target Violations_:
    - Quick-Preset buttons (lines 276-333: 🌱 Sämling, 🌿 Vegi, 🌸 Blüte, 🍂 Spätblüte): `padding: "6px 8px"`, `fontSize: "11px"`, no `minHeight` (~26-28px height, <44px).
    - Header button "📊 Klima-Details" (line 207): `padding: "6px 12px"`, `fontSize: "12px"` without minHeight (~30px, <44px).
  - _Slider Usability on Mobile_:
    - Temperature and humidity sliders require fine motor control. Adding numeric stepper buttons (`-` / `+`) on mobile improves one-handed thumb interaction.

### Panel 6: `VpdDliCalculatorPanel.tsx` (12 KB, 505 lines)

- **Role**: Standalone fast VPD/DLI calculator and 4-phase matrix reference.
- **Usability Deficits**:
  - _Touch Target Violations_:
    - Header button "🌡️ Zu den Klima-Zielwerten" (line 153): `padding: "6px 12px"`, <44px.
  - _Layout_:
    - Clean 2-column layout on desktop, stacks well on mobile. 4-phase cards provide instant contextual comparisons.

### Panel 7: `EquipmentManagerPanel.tsx` (15 KB, 323 lines)

- **Role**: Lighting fixture profile, sensor calibration lineage (pH/EC), and PPFD mapping modal triggers.
- **Usability Assessment**:
  - Touch targets for calibration buttons are well-sized (`minHeight: "44px"` on lines 128, 163, 195, 222, 277).
  - Clean status badge indicators (`VALID`, `CALIBRATION_DUE`, `DUE_SOON`).

### Panel 8: `FeedingSchedulePanel.tsx` (15 KB, 226 lines)

- **Role**: 12-Week feeding schedule matrix (HESI Basis, Additives, Modifiers).
- **Usability Deficits**:
  - _Horizontal Scroll Table_: Table width is fixed at `minWidth: "1200px"`. On mobile devices, swiping horizontally disconnects the week numbers from the "Produkt / Rolle" row headers.
  - _Remediation_: Apply `position: sticky; left: 0` with a solid background to the first column ("Produkt / Rolle") so users always know which additive row they are inspecting.

### Panel 9: `MasterplanOverviewPanel.tsx` (15 KB, 453 lines)

- **Role**: 3-step introductory guide, goal definition, system overview.
- **Usability Deficits**:
  - Inline navigation links in the equipment list (lines 274-280) are standard text links with small hit areas. On mobile, tapping `run.config.tentWidthCm` easily causes mis-taps.
  - _Remediation_: Convert inline links to interactive badge pills with adequate touch padding.

### Panel 10: `BatchResolverDashboard.tsx` (5 KB, 124 lines)

- **Role**: Multi-plant biological age evaluation and nutrient batch routing (Common vs Split vs Flush).
- **Usability Deficits**:
  - Header button "⚙️ Setup anpassen" (line 59) has `padding: "8px 16px"` without explicit `minHeight: 44px`.

### Panel 11: `ContextHelpGlossaryPanel.tsx` (2 KB, 78 lines)

- **Role**: Single source of truth knowledge base glossary search.
- **Usability Assessment**:
  - Clean search input, clear 3-lens terminology definitions, proper category badges.

---

## 4. WCAG & Mobile Usability Violation Matrix

| Component / Panel           | File Path                                           | Line(s)          | Element                               | Observed Size          | Required Size              | Violation Type                      |
| --------------------------- | --------------------------------------------------- | ---------------- | ------------------------------------- | ---------------------- | -------------------------- | ----------------------------------- |
| `AutoflowerCockpitPanel`    | `src/components/panels/AutoflowerCockpitPanel.tsx`  | 358, 380         | Raster / Achse Toggle Buttons         | `minHeight: "32px"`    | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `AutoflowerCockpitPanel`    | `src/components/panels/AutoflowerCockpitPanel.tsx`  | 1018, 1058, 1129 | Filter Tag Chips                      | `minHeight: "40px"`    | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `EnvironmentTargetsPanel`   | `src/components/panels/EnvironmentTargetsPanel.tsx` | 276–333          | Preset Buttons (Sämling, Vegi, etc.)  | ~28px height           | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `EnvironmentTargetsPanel`   | `src/components/panels/EnvironmentTargetsPanel.tsx` | 207              | Header Button (Klima-Details)         | ~30px height           | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `VpdDliCalculatorPanel`     | `src/components/panels/VpdDliCalculatorPanel.tsx`   | 153              | Header Button (Klima-Zielwerte)       | ~30px height           | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `NutrientMixPanel`          | `src/components/panels/NutrientMixPanel.tsx`        | 851, 904         | Measured EC / pH Inputs               | ~28px height           | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `RunConfigPanel`            | `src/components/panels/RunConfigPanel.tsx`          | 1689             | Dimmer Range Slider Container         | `minHeight: "36px"`    | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `BatchResolverDashboard`    | `src/components/panels/BatchResolverDashboard.tsx`  | 59               | Setup anpassen Button                 | ~32px height           | $\ge 44\text{px}$          | WCAG 2.5.5 Touch Target             |
| `MasterplanOverviewPanel`   | `src/components/panels/MasterplanOverviewPanel.tsx` | 274–280          | Setup Jump Links                      | In-text line           | $\ge 44\text{px}$ tap area | WCAG 2.5.5 Touch Target             |
| Global Shell (`styles.css`) | `src/styles.css`                                    | 3343             | Mobile `.main-content` bottom padding | `padding-bottom: 92px` | $\ge 160\text{px}$         | Layout Collision / Obscured Actions |

---

## 5. In-Place Editing & Prediction Engine Analysis

### 5.1 Current Implementation in `prediction-engine.ts`

1. `predictGeneticsMetadata(strainName: string)`:
   - Matches input against canonical autoflower database (`autoflower-cockpit.json`).
   - Returns `{ breeder, seedType, phenotypeNotes }`.
   - Used in `RunConfigPanel.tsx` line 855.
2. `predictEmergenceDate(pottingDateStr: string)`:
   - Calculates estimated emergence date (+3 days from potting date).
   - Used in `RunConfigPanel.tsx` line 248.

### 5.2 Identified In-Place Editing Opportunities across the App

1. **Cockpit Dashboard (`Cockpit` in `src/App.tsx`)**:
   - _Current_: 6 metric cards display static plan values (PPFD, DLI, Klima, Leaf-VPD, EC, pH).
   - _Improvement_: Allow double-click or quick "Ist-Wert erfassen" button on metric cards to open an inline popover or quick-input to log actual Temp/RH/EC/pH without navigating away from the Cockpit.
2. **DailyOperatorPanel (`DailyOperatorPanel.tsx`)**:
   - _Predictive Dryback & Hydration_: As the operator enters pot weight, immediately compute and display:
     - Predicted dryback duration remaining until replenishment threshold (e.g. "⚡ Noch ca. 18 Std. bis 50% Dryback").
     - Predicted watering volume needed to reach 100% saturation ($V_{\text{target}} = \text{Vollsättigung} - \text{Ist-Gewicht}$).
3. **NutrientMixPanel (`NutrientMixPanel.tsx`)**:
   - _Live Titration Assistance_: When user inputs measured EC/pH in Step 6, if outside optimal corridor, show instant AJAX-like recommendation (e.g. "pH 6.8 zu hoch → +0.15 ml/L pH-Down zugeben").
4. **MasterplanOverviewPanel (`MasterplanOverviewPanel.tsx`)**:
   - _Quick Parameter Overrides_: Allow clicking on tent dimensions or light power to open inline stepper inputs to modify active RunPackage configuration directly.

---

## 6. Actionable Implementation Roadmap

### 6.1 Immediate Quick-Fix Candidates (Sprint 1 / Implementer Focus)

1. **Fix Touch Targets to $\ge 44\text{px}$**:
   - Standardize all buttons, toggle chips, preset pills, and measurement inputs across `EnvironmentTargetsPanel.tsx`, `VpdDliCalculatorPanel.tsx`, `AutoflowerCockpitPanel.tsx`, `NutrientMixPanel.tsx`, `BatchResolverDashboard.tsx`, and `MasterplanOverviewPanel.tsx`.
2. **Fix Mobile Bottom Padding in `src/styles.css`**:
   - Change `.main-content` padding at `@media (max-width: 680px)` to `padding: 20px 12px calc(160px + env(safe-area-inset-bottom));` to prevent sticky command center overlap.
3. **Sticky Row Headers in `FeedingSchedulePanel.tsx`**:
   - Add `position: sticky; left: 0; background: var(--surface-1); z-index: 2;` to the first table column to make 12-week horizontal navigation readable on mobile.
4. **Predictive In-Place Tooltips & Visual Indicators**:
   - Add subtle "⚡ Vorhersage" badges where `prediction-engine.ts` provides auto-completions.

### 6.2 Architectural Issues (For `ux_audit_report.md` & Future Milestones)

1. **Navigation Consolidation & Progressive Disclosure**:
   - 23 separate routes create high decision fatigue. Architectural consolidation into 3 primary workspaces (Operator, Scientific Analytics, Evidence/System) with an omnibox search command palette.
2. **Virtualized Dual-Axis Data Tables**:
   - Large data sheets (Raw Data 29 sheets, Feeding Schedule 81 days) should utilize virtualized windowing to reduce DOM node counts and memory footprint on mobile devices.
3. **Reactive Observable State Pipeline**:
   - Migrate in-memory local state synchronization to an event-sourced observable model so changes made in one panel immediately propagate without manual save roundtrips.
