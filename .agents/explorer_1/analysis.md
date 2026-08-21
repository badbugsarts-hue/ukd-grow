# Comprehensive Design & UI Analysis Report: `.antigravitz` Assets & Master Class UI Components

**Explorer**: Explorer 1 (Design & Component Mockup Explorer)  
**Date**: 2026-08-11  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\explorer_1\`  
**Target Repository**: `c:\Users\badbu\Documents\grow`

---

## Executive Summary

This report delivers a full architectural and design analysis of the `.antigravitz` directory and `ORIGINAL_REQUEST.md` for the **UKD Grow Masterplan 2026 (v10)** web application.

The `.antigravitz` folder contains 9 core visual, technical, and structural specification files (including high-resolution UI posters, navigation/term maps, feed maps, and a 125-page canonical UI/UX specification PDF `UKD_Grow_Masterplan_2026_v10_CONTEXT_HELP_VISUAL_UX.pdf`).

Our analysis extracts the complete design system, layout rules, color tokens, micro-interactions, German terminology standards, fail-closed safety logic, and specifies **6 standalone "Master Class" UI components** to be placed under `src/components/` and integrated into `src/App.tsx`.

---

## 1. Inventory & Deep Inspection of `.antigravitz` Directory

The `.antigravitz` directory contains the following 9 files:

| Filename                                                         | Type & Size            | Description / Core Purpose                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatGPT Image 11. Aug. 2026, 02_34_31.png`                      | PNG (1.92 MB)          | High-res UI Masterplan v9 Poster Mockup - Full screen layout with 3-step action bar, mode switchers, goal/problem panels, system overview, feed map matrix, daily tasks footer.                                         |
| `ChatGPT Image 11. Aug. 2026, 02_34_35.png`                      | PNG (1.92 MB)          | Twin high-res UI Masterplan v9 Poster Mockup - Visual reference for dark/light contrast, badge indicators, and symbol legends.                                                                                          |
| `UKD_Grow_Masterplan_2026_v10_CONTEXT_HELP_VISUAL_UX.pdf`        | PDF (1.73 MB, 125 pgs) | **Canonical v10 UX/UI Specification Document**. Contains North Star, 12-route contract, term maps, 81 daily cards, 7-step mix operator, goal/problem prioritization (P0–P4), context help contracts, and release gates. |
| `UKD_Grow_Masterplan_Elite_2026_v10_CONTEXT_HELP_VISUAL_UX.xlsx` | XLSX (282.8 KB)        | Canonical data workbook backing v10 calculations, daily master, context help entries, and audit reports.                                                                                                                |
| `UKD_Grow_Masterplan_Elite_2026_v9_GOAL_PROBLEM_UX.xlsx`         | XLSX (255.8 KB)        | Archived v9 goal/problem data workbook.                                                                                                                                                                                 |
| `UKD_v10_DECISION_FLOW.png`                                      | PNG (86.0 KB)          | Visual flowchart for 5-step decision cycle (1 Messen -> 2 Prüfen -> 3 Entscheiden -> 4 Handeln -> 5 Loggen) & Fail-Closed rule.                                                                                         |
| `UKD_v10_SECTION_MAP.png`                                        | PNG (126.1 KB)         | Canonical Navigation Diagram ("Wo finde ich was?"): Start Hier -> Heute, Setup, Mix -> Log, Diagnose, Wissen.                                                                                                           |
| `UKD_v10_TERM_MAP.png`                                           | PNG (136.4 KB)         | Plain German First Term Map (PPFD, DLI, EC, pH, rF, VPD, BT, BW) with units and common errors.                                                                                                                          |
| `UKD_v10_UGro_Rhiza_Feed_Map.png`                                | PNG (254.3 KB)         | Owned-Stock Feed Map for UGro Rhiza Coco (W1–W12 nutrient schedule and product classification).                                                                                                                         |

---

## 2. Core Design Concepts & UI Paradigm

### A. North Star & Operator-First UX (PDF Page 1)

- **30-Second Rule**: In under 30 seconds, an operator looking at any view must know:
  1. _Wo bin ich?_ (Where am I in the run timeline / phase?)
  2. _Was muss ich prüfen?_ (What mandatory measurements/checks are open today?)
  3. _Was darf ich tun?_ (What action is authorized?)
  4. _Was ist gesperrt oder nur bedingt?_ (What is blocked or conditional, and why?)
  5. _Was muss ich danach dokumentieren?_ (What needs to be logged?)

### B. "Plain German First" Terminology Contract (PDF Page 1 & 111)

- **Grundregel**: Technical abbreviations never appear isolated without plain German context. The user-facing label lists the understandable German name first, followed by the technical abbreviation in parentheses.
  - Examples:
    - `Nährsalzstärke (EC)` — not bare `EC`
    - `Lichtstärke am Blätterdach (PPFD)` — not bare `PPFD`
    - `Tageslichtmenge (DLI)` — not bare `DLI`
    - `Luftfeuchtigkeit (rF)` — not bare `rF` or `RH`
    - `Trocknungsdruck der Luft (VPD)` — not bare `VPD`
    - `Säure-/Basenwert (pH)` — not bare `pH`
    - `Blütetag (BT)` / `Blütewoche (BW)` — not generic `Day` or `Week`
- **Context Help Contract (Progressive Disclosure)**:
  1. Plain German term
  2. Abbreviation
  3. 1-line plain explanation
  4. Operative meaning / Action recommendation
  5. Unit & Example
  6. Common mistake ("Typischer Fehler")
  7. Resolution when unknown ("Was tun wenn unklar?")

### C. Experience Lenses (Guided / Advanced / Expert)

- **Guided**: High-level, simple explanations, maximum 3 action items above the fold, hidden raw key clutter, full inline tooltips.
- **Advanced**: Full standard controls, complete metrics visible.
- **Expert**: Raw formulas, cell keys (`Daily_Master!AL12`), full metrology lineage.
- _Invariant Rule_: Switching lenses changes **only explanation depth and density**, NEVER calculations, safety gates, or underlying numbers.

### D. Semantic Color Palette & Dual-Encoding

To ensure WCAG 2.2 AA accessibility and no color-only state transmission:

- **Green (`var(--green)`)**: Handeln / Bekannt / OK / Erledigt (Icon: `✓` or `◉`)
- **Blue (`var(--accent) / var(--blue)`)**: Planwert / Information / Ziel (Icon: `ℹ` or `☼`)
- **Amber (`var(--amber) / var(--warning)`)**: Prüfen / Bedingt / Warnung (Icon: `⚠` or `!`)
- **Red (`var(--red) / var(--danger)`)**: Stop / Blocker / Gesperrt (Icon: `⛔` or `✖`)
- **Purple (`var(--purple)`)**: Evidenz / Produktstack / Experiment / Wissenschaft (Icon: `◫` or `🔬`)
- **Gray (`var(--text-dim)`)**: Erklärung / System / Inaktiv (Icon: `⚙`)

### E. 5-Step Decision Flow & Fail-Closed Safety Engine (PDF Page 4)

```
1. MESSEN (Klima, Pflanze, Wasser, pH/EC)
   └─► 2. PRÜFEN (Plausibilität, Kalibrierung, Setup-Gates)
        └─► 3. ENTSCHEIDEN (Aktiv / Nur bedingt / Gesperrt)
             └─► 4. HANDELN (Nur freigegebene Dosis/Aktion ausführen)
                  └─► 5. LOGGEN (Istwert + Aktion in Event Log)
```

- **Fail-Closed Rule**: If a mandatory input is missing or water chemistry/setup parameters conflict, UKD **never invents a positive dosage** based on assumptions. It blocks the action (`GESPERRT`), explains what is missing, why it matters, and gives the safe fallback state.

---

## 3. Required "Master Class" Component Architecture (`src/components/`)

Based on the `.antigravitz` visual mockups and layout specifications, we define **6 modular, self-contained React components** to be implemented under `src/components/` and routed within `App.tsx`:

### Component 1: `EnvironmentTargetsPanel.tsx` (Klima & Licht Input Panel)

- **Purpose**: Interactive environment target and measurement calculator.
- **Inputs**: Light Intensity (PPFD in µmol/m²/s), Photoperiod (hours/day), Temperature Light/Dark (°C), Relative Humidity (rF %), Leaf Temp Offset (°C).
- **Outputs / Calculations**:
  - DLI calculation: $\text{DLI} = \text{PPFD} \times \text{Hours} \times 0.0036 \text{ mol/m}^2/\text{Tag}$.
  - Air VPD ($\text{VPD}_{\text{air}}$) & Leaf VPD ($\text{VPD}_{\text{leaf}}$) in kPa using Tetens/Goff-Gratch equations.
- **Master Class UI**: Interactive sliders + numeric inputs, real-time target status gauge (Green/Amber/Red), inline tooltips explaining PPFD, DLI, rF, VPD on focus/hover/click.

### Component 2: `NutrientMixPanel.tsx` (Mischlabor & Dosis-Rechner Panel)

- **Purpose**: 7-step guided nutrient mixing calculator adhering to UKD v10 mixing sequence.
- **Inputs**: Water Batch Volume (Liters), Current Phase / Day, Water Baseline EC/pH, Selection checkboxes for optional/conditional supplements.
- **7-Step Flow Execution**:
  1. **Wasser**: Base water volume, initial temp/pH/EC.
  2. **Bedingte Zusätze**: Athena Balance / CalMag (Fail-closed: 0 ml/L unless water chemistry inputs verified).
  3. **HESI Basis**: HESI TNT Complex (Veg) or HESI Coco (Bloom).
  4. **Support**: Wurzel Complex, PowerZyme, SuperVit, Boost, PK13/14.
  5. **Messen**: Intermediate EC measurement & target check.
  6. **pH Final**: pH adjustment with pH Down only after full mix.
  7. **Biologie**: Voodoo Juice & Tarantula added last (fresh window).
- **Master Class UI**: Total batch dose matrix (ml/L and ml total), product status chips (`AKTIV`, `BEDINGT`, `GESPERRT`), step-by-step progress cards, inline explanations for Titration, Endmix, and EC/pH.

### Component 3: `RunConfigPanel.tsx` (Setup & Systemgrenzen Wizard)

- **Purpose**: Pre-run configuration, equipment profiling, and medium path setup.
- **Inputs**: Medium Path (Eazy Plug Mini -> Eazy Block -> UGro Rhiza Coco), Light Wattage & Type, Tent Dimensions ($60 \times 60 \times 180\text{ cm}$ default), Ventilation (AKF + PWM fan control), Water Baseline profile.
- **Fail-Closed Readiness Gate**: Displays Status: Complete (Grün) / Warning (Gelb) / Hard Blocker (Rot). Prevents run activation if hard blockers exist.
- **Master Class UI**: Interactive setup card layout matching PDF Page 6 & 102-105, Lens selection toggle (Guided / Advanced / Expert), tooltip callouts for Medium-Pufferung and Propagation Gate.

### Component 4: `DailyOperatorPanel.tsx` (Tageskarten & Heute-Operator Panel)

- **Purpose**: Primary daily workflow panel for Days 0–80.
- **Layout (PDF Pages 11-92)**:
  - Top: Day & Phase Header (e.g. `Tag 28 · Transition / Stretch (B1)`).
  - Prioritized 3-Step Action Cards above the fold:
    1. **ZUERST PRÜFEN** (Yellow card: Pflichtmessungen, Pflanze/Blattstellung).
    2. **HEUTE MISCHEN / GEBEN** (Purple card: Dosis nur wenn gewässert wird).
    3. **BEOBACHTEN & LOGGEN** (Blue card: Klima, LF/Drain, Blattwinkel).
  - Stop/Blocker Alert Box (Red banner if Drain-EC high or stress detected).
  - Environment & Water Quick Metric Cards (PPFD, DLI, EC, pH, Klima, Wasser/Wurzelzone) with integrated inline tooltips.

### Component 5: `VpdDliCalculatorPanel.tsx` (VPD & DLI Quick Calculator & Heatmap)

- **Purpose**: Standalone calculator & interactive target matrix for climate optimization across growth phases.
- **Inputs**: Dual sliders for Temp ($15\text{–}35^\circ\text{C}$), RH ($30\text{–}90\%$), PPFD ($50\text{–}1200\,\mu\text{mol/m}^2/\text{s}$), Photoperiod ($12\text{–}24\text{h}$).
- **Interactive Heatmap / Target Matrix**: Displays target VPD bands for Keimung ($0.4\text{–}0.8\text{ kPa}$), Veg ($0.8\text{–}1.1\text{ kPa}$), Flower ($1.0\text{–}1.5\text{ kPa}$), Late Flower ($1.2\text{–}1.6\text{ kPa}$).
- **Master Class UI**: Visual VPD zone indicator, leaf temperature offset toggle (geschätzt vs. gemessen IR), German explanation of transpiration and photo-inhibition.

### Component 6: `ContextHelpGlossaryPanel.tsx` (Fachbegriffe & Context Help Center)

- **Purpose**: Searchable, interactive glossary and context help lookup matching PDF Pages 112-116 & `UKD_v10_TERM_MAP.png`.
- **Content Structure**: Filterable by category (Klima, Nährstoffe, Pflanze, System). Displays:
  - Plain German Name
  - Technical Abbreviation
  - 1-Line Explanation
  - Operative Meaning & Unit
  - Common Errors ("Typischer Fehler")
  - Resolution Guide ("Was tun wenn unklar?")
- **Master Class UI**: Instant search input, category tab chips, interactive card accordion, WCAG 2.2 AA compliant focus states.

---

## 4. Integration into App Shell (`src/App.tsx`) & Design Consistency

- **Styles & Design Tokens**: Strict adherence to `src/styles.css`. Use only existing CSS variables:
  - `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`
  - `--text`, `--text-dim`
  - `--green`, `--blue`, `--amber`, `--red`, `--purple`
  - `--border`, `--radius`, `--font-sans`, `--font-mono`
- **Route Navigation**:
  - Seamlessly map the 6 new components into `src/App.tsx` matching the `NAV` items (`cockpit`, `setup`, `today`, `mix`, `climate`, `nutrients`, `knowledge`, `log`).
  - Preserve all existing domain state (`domain.ts`, `run-state.ts`, `run-storage.ts`).
- **Accessibility & UX**:
  - Minimum 44px touch targets on mobile.
  - Visible focus rings (`:focus-visible`).
  - No critical information delivered via hover or color alone.
  - `prefers-reduced-motion` compliance.

---

## 5. Summary Table of Requirements & Implementer Handoff

| Component File                 | Primary Route in App  | Key German Concepts / Tooltips Included                                                            | Target AC Verified |
| ------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| `EnvironmentTargetsPanel.tsx`  | `climate` / `cockpit` | Lichtstärke (PPFD), Tageslichtmenge (DLI), Luftfeuchtigkeit (rF), Trocknungsdruck (VPD), Blatt-VPD | R1, R2, R3, R4     |
| `NutrientMixPanel.tsx`         | `mix`                 | Nährsalzstärke (EC), Säure-/Basenwert (pH), Titration, Endmix, Batch, Fail-closed Dosis            | R1, R2, R3, R4     |
| `RunConfigPanel.tsx`           | `setup`               | Medium-Pufferung, Propagation Gate, Basisequipment, Experience Lens (Geführt/Standard/Experte)     | R1, R2, R3, R4     |
| `DailyOperatorPanel.tsx`       | `today` / `cockpit`   | Zuerst prüfen, Blocker/Stop-Regel, Heute mischen/geben, Beobachten, Blütetag (BT), Blütewoche (BW) | R1, R2, R3, R4     |
| `VpdDliCalculatorPanel.tsx`    | `climate`             | Transpirationsdruck, Sättigungsdampfdruck, Photoperiode, Blatt-Temperatur-Offset                   | R1, R2, R3, R4     |
| `ContextHelpGlossaryPanel.tsx` | `knowledge`           | 16+ canonical terms with Plain German first, common errors & resolutions                           | R1, R2, R3, R4     |

---

_Report prepared by Explorer 1. Ready for handoff to Parent & Implementer agents._
