# UKD Grow Masterplan — Setup View & Missing Elements: Comprehensive Analysis Report

**Investigator:** Explorer Agent (Setup & Architecture)  
**Date:** 2026-08-21  
**Target Scope:** UKD Grow Masterplan Setup View, Parameter Visibility & Editability, Autoflower Cockpit Integration, Global Live/Simulation Modes, Retroactive Milestones, and Missing UKD Setup Elements.  
**Repository Root:** `c:\Users\badbu\Documents\grow`

---

## 1. Executive Summary & Problem Formulation

The UKD Grow Masterplan is an evidence-guarded, scientific cannabis cultivation operating system. The current Setup view (primarily implemented via `RunConfigPanel.tsx` and routed under `id: "setup"` in `src/App.tsx`) provides an initial configuration surface and a fail-closed 5-category Readiness Gate. However, our systematic code audit reveals substantial architectural gaps between what the underlying TypeScript domain models (`RunConfig`, `RunPackage`, `PotProfile`, `WaterProfile`, `LightProfile`, `GrowthEvent`, `EquipmentProfile`, `ProductDatabase`) support versus what is actually rendered, editable, and interconnected in the UI.

Crucially:
1. **Parameter Visibility & Editability Deficit:** Key parameters (such as `plantCount`, `startDate`, `endDay`, `mediumProduct`, pot dimensions, empty/saturated pot tare weights, advanced water ions, AKF filtration rating, exhaust fan persistence) are either missing from `RunConfigPanel`, stored in transient local state (`exhaustM3h`), or scattered in isolated secondary panels (`GlobalPlanEditorPanel`, `EquipmentManagerPanel`, `RunWorkspace`).
2. **Orphaned Autoflower Cockpit:** While `src/data/autoflower-cockpit.json` and `src/components/panels/AutoflowerCockpitPanel.tsx` exist, they are completely disconnected from `App.tsx` routing and cannot be used to select a cultivar directly into the active run.
3. **Hidden Live vs. Simulation Switch:** The execution mode toggle is buried inside a nested dropdown in `GlobalCommandCenter.tsx`, lacking a prominent top-level indicator and visual clarity across setup and monitoring.
4. **Limited Retroactive Plant Milestones:** The system allows setting an initial `dayZeroAnchor` in `PlantIdentityModal`, but lacks a structured multi-event milestone lifecycle (Aussaat, Eintopfen, Keimung/Durchstoß, Erstes Blattpaar) that growers can update retroactively during active/live runs to dynamically recalibrate the master timeline.
5. **Missing UKD Setup Elements:** Essential grow-room calculations (such as CFM/turnover rate based on tent geometry and light heat load, substrate component ratios, phase-specific VPD/DLI target envelopes, irrigation dryback tare baseline, and KCanG compliance limits) are not integrated into a cohesive master setup workflow.

This report documents the exact findings, traces the state propagation paths, categorizes all missing elements, and presents a complete 2026 Master Class UI/UX architecture in German terminology.

---

## 2. Parameter Audit: Configured vs. Visible vs. Editable

The table below outlines every parameter in `RunConfig` and `RunPackage`, comparing its definition in `src/types.ts` with its visibility and editability in `src/components/panels/RunConfigPanel.tsx`:

| Parameter | Domain Type & Location | Visible in `RunConfigPanel`? | Editable in `RunConfigPanel`? | State Path & Persistence | Gaps / Issues Found |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Run Name** (`name`) | `string` (`RunConfig`) | ✅ Yes (Card 1) | ✅ Yes (`<input type="text">`) | `updateRunConfig` → `run.config.name` | Fully functional |
| **Genetik / Strain** (`genetics`) | `string` (`RunConfig`) | ✅ Yes (Card 1) | ✅ Yes (`<input type="text">`) | `updateRunConfig` → `run.config.genetics` | Manual string only; no library link |
| **Pflanzenidentität** (`identity`) | `PlantIdentity` (`Plant[0]`) | ✅ Summary badge | ⚠️ Only via Modal | `PlantIdentityModal` → `updatePlantIdentity` | Breeder, SeedType, Lot, Batch in modal |
| **Pflanzenanzahl** (`plantCount`) | `number` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | Exists in schema (`types.ts:711`), unused in panel | No plant count input; KCanG limit unchecked |
| **Startdatum** (`startDate`) | `string` (`RunConfig`) | ❌ **Hidden** in panel | ⚠️ Only in Modal | `PlantIdentityModal` → `updatePlantIdentity` | Not visible in main setup form |
| **Plan-Endtag** (`endDay`) | `number` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | Defaulted to 80; only in legacy workspace | Cannot adjust cycle length in Setup |
| **Medium Kategorie** (`medium`) | `string` (`RunConfig`) | ✅ Yes (Card 1) | ✅ Yes (`<select>`) | `updateRunConfig` → `run.config.medium` | Limited to "Erde", "Coco", "Hydro" |
| **Medium Produktname** (`mediumProduct`) | `string` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | Only in `GlobalPlanEditorPanel:204` | Brand/model (e.g. UGro Rhiza) missing |
| **Substrat-Mischverhältnis** | *Missing in schema* | ❌ **Missing** | ❌ **Missing** | N/A | No perlite/coco/worm castings ratio |
| **Topfvolumen Nominal** (`pot.nominalVolumeLiters`) | `number` (`PotProfile`) | ✅ Yes (Card 1) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.pot` | Functional |
| **Topf-Typ** (`pot.type`) | `"fabric"\|"plastic"\|"airpot"\|"autopot"` | ❌ **Hidden** | ❌ **Not editable** | In schema (`types.ts:229`), unused | No fabric/airpot selection in setup |
| **Topf-Maße** (`diameterCm`, `heightCm`) | `number\|null` (`PotProfile`) | ❌ **Hidden** | ❌ **Not editable** | In schema (`types.ts:232-233`), unused | Geometry not configured |
| **Topf-Taragewichte** (`emptyMassGrams`, `saturatedMassGrams`) | `number\|null` (`PotProfile`) | ❌ **Hidden** | ❌ **Not editable** | In schema (`types.ts:234-235`), unused | Blocks dryback calculation in `domain.ts:391` |
| **LED Max Leistung** (`ledMaxW`) | `number` (`RunConfig`) | ✅ Yes (Card 2) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.ledMaxW` | Functional |
| **Photoperiode** (`lightHours`) | `number` (`RunConfig`) | ✅ Yes (Card 2) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.lightHours` | Functional (12–24h) |
| **LED Hardware Profil** (`light`) | `LightProfile\|null` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | In `EquipmentManagerPanel:74` | Fixture model, spectrum, dims not in setup |
| **Zelt-Maße** (`tentWidthCm`, `tentDepthCm`, `tentHeightCm`) | `number` (`RunConfig`) | ✅ Yes (Card 3) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config` | Computes $m^2$ and $m^3$ |
| **Abluftkapazität** (`exhaustM3h`) | `number` | ⚠️ Visible (Card 5) | ⚠️ Local state only | `useState(220)` (`RunConfigPanel:116`) | **NOT PERSISTED!** Lost on page change! |
| **Aktivkohlefilter (AKF)** | `EquipmentProfile` (`EquipmentCategory`) | ❌ **Hidden** | ❌ **Not editable** | Schema in `types.ts:398`, unused in setup | No AKF airflow/model matching |
| **Umluftventilatoren** | `EquipmentProfile` (`run.equipment`) | ❌ **Hidden** | ❌ **Not editable** | In `types.ts:399`, unused in setup | No circulation fan count or power |
| **Wasser Quell-EC** (`water.sourceEc`) | `number\|null` (`WaterProfile`) | ✅ Yes (Card 4) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.water` | Functional (Fail-closed gate) |
| **Wasser Quell-pH** (`water.sourcePh`) | `number\|null` (`WaterProfile`) | ✅ Yes (Card 4) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.water` | Functional (Fail-closed gate) |
| **Wasser Calcium** (`water.calciumMgL`) | `number\|null` (`WaterProfile`) | ✅ Yes (Card 4) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.water` | Functional (Calculates Ca:Mg ratio) |
| **Wasser Magnesium** (`water.magnesiumMgL`) | `number\|null` (`WaterProfile`) | ✅ Yes (Card 4) | ✅ Yes (`<input type="number">`) | `updateRunConfig` → `run.config.water` | Functional (Calculates Ca:Mg ratio) |
| **Wasser Alkalinität** (`water.alkalinityMgL`) | `number\|null` (`WaterProfile`) | ❌ **Hidden** | ❌ **Not editable** | Only in `GlobalPlanEditorPanel:274` | Needed for pH buffer calculation |
| **Wasser Sekundär-Ionen** (`sodium`, `chloride`, `sulfate`) | `number\|null` (`WaterProfile`) | ❌ **Hidden** | ❌ **Not editable** | In `types.ts:218-220`, unused | Not accessible in UI |
| **Wasser Quell-Typ & Analyse** (`sourceType`, `analysisDate`) | `string` (`WaterProfile`) | ❌ **Hidden** | ❌ **Not editable** | In `types.ts:211-223`, unused | Provenance missing in setup |
| **Nährstoffsystem** (`nutrientSystem`) | `string` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | Only in `GlobalPlanEditorPanel:174` | Hardcoded default in setup |
| **Bewässerungssystem** (`irrigationSystem`) | `string` (`RunConfig`) | ❌ **Hidden** | ❌ **Not editable** | Only in `GlobalPlanEditorPanel:238` | Hardcoded default in setup |
| **Betriebsmodus** (`executionMode`) | `"simulation"\|"live"` (`RunPackage`) | ❌ **Hidden** in panel | ⚠️ Buried in Command Center | `GlobalCommandCenter.tsx:445` | No direct toggle in Setup view |
| **Aussaatanker / Meilensteine** (`growthEvents`) | `GrowthEvent[]` (`RunPackage`) | ⚠️ Partial in Modal | ⚠️ Anchor only | `PlantIdentityModal` → `updatePlantIdentity` | No multi-step milestone timeline |

---

## 3. Analysis of Missing UKD Setup Architecture Elements

### 3.1. Zelt-Geometrie, Abluft & Strömungs-Architektur (Ventilation & CFM)
- **Current Observation:** `RunConfigPanel.tsx` lines 116–122 calculate area $A = (W \times D) / 10000\ \text{m}^2$ and volume $V = (A \times H) / 100\ \text{m}^3$. Card 5 features a local input `exhaustM3h` with an inline rule checking if $\text{exhaustM3h} \ge V \times 60$. However, `exhaustM3h` is held in React local `useState` (line 116) and is **never written to `RunPackage`**.
- **Missing Architecture:**
  1. **Persistence:** Ventilation parameters must be stored in `run.config` or as an `EquipmentProfile` in `run.equipment` with category `"exhaust"`.
  2. **AKF Matching:** An Aktivkohlefilter (AKF) has a nominal flow rating and a maximum pressure drop ($\Delta P$). If an exhaust fan draws $220\ \text{m}^3/\text{h}$ through a $160\ \text{m}^3/\text{h}$ AKF, filtration fails and odor escapes. Sizing rule: $\text{AKF Rating} \ge 1.2 \times \text{Fan Rating}$.
  3. **Airflow Turnovers & Heat Dissipation:** Air turnover must scale with thermal load:
     $$\text{Min CFM} = \frac{\text{Volume (cu ft)} \times \text{Turnovers/min}}{\text{Filter Efficiency}} \quad \text{or} \quad \text{m}^3/\text{h} \ge V_{\text{tent}} \times 60 + (\text{Watts}_{\text{LED}} \times 0.5)$$
  4. **Circulation Fans (Umluft):** Minimum recommended circulation: 2 clip fans (total $\ge 150\ \text{m}^3/\text{h}$) to prevent microclimate stagnant air pockets and Botrytis (Grauschimmel).

### 3.2. Ziel-Klimamatrix & VPD-Bandbreiten (Target VPD Envelopes)
- **Current Observation:** `EnvironmentTargetsPanel.tsx` (lines 38–97) and `VpdDliCalculatorPanel.tsx` (lines 44–93) define four growth stages (Sämling, Vegetation, Hauptblüte, Spätblüte) with specific target ranges for Leaf VPD, Air VPD, Temperature, RH, PPFD, and DLI. However, these targets are hardcoded inside individual panels and are **not configured, customized, or summarized in the Setup view**.
- **Missing Architecture:**
  - Setup must display the master target climate profile corresponding to the chosen genetics (e.g. Autoflower standard vs. Mold-sensitive Sativa):
    - **Sämling (Tag 0–7):** Temp $24\text{–}26^\circ\text{C}$, RH $65\text{–}75\%$, Leaf VPD $0.4\text{–}0.8\text{ kPa}$, DLI $10\text{–}15\text{ mol/m}^2/\text{d}$.
    - **Vegetation (Tag 8–28):** Temp $24\text{–}27^\circ\text{C}$, RH $55\text{–}65\%$, Leaf VPD $0.8\text{–}1.1\text{ kPa}$, DLI $20\text{–}30\text{ mol/m}^2/\text{d}$.
    - **Hauptblüte (Tag 29–63):** Temp $22\text{–}25^\circ\text{C}$, RH $45\text{–}55\%$, Leaf VPD $1.1\text{–}1.4\text{ kPa}$, DLI $35\text{–}45\text{ mol/m}^2/\text{d}$.
    - **Spätblüte / Reife (Tag 64–80):** Temp $20\text{–}23^\circ\text{C}$, RH $38\text{–}45\%$, Leaf VPD $1.3\text{–}1.6\text{ kPa}$, DLI $30\text{–}40\text{ mol/m}^2/\text{d}$.
  - Custom VPD offsets ($\Delta T_{\text{leaf}} = -1.0^\circ\text{C}$ to $-2.0^\circ\text{C}$) must be exposed to Expert users.

### 3.3. Substrat-Architektur, Topf-Tara & Dryback-Kalibrierung
- **Current Observation:** In `src/types.ts:228-236`, `PotProfile` contains `type`, `nominalVolumeLiters`, `actualFillLiters`, `diameterCm`, `heightCm`, `emptyMassGrams`, and `saturatedMassGrams`. In `src/domain.ts:391-480`, `calculateSubstrateHydration` relies entirely on `emptyMassGrams` (dry pot tare) and `saturatedMassGrams` (100% field capacity).
- **Missing Architecture:**
  - `RunConfigPanel.tsx` only renders a single number input for `nominalVolumeLiters`.
  - Because `emptyMassGrams` and `saturatedMassGrams` cannot be entered during setup, `calculateSubstrateHydration` returns `state: "INSUFFICIENT_DATA"` with reason `"EMPTY_MASS_MISSING"`, causing the automated dryback gauges in `DailyOperatorPanel` and `pot-weight-dryback` to stay uncalibrated!
  - Setup must provide a **"Topf- & Hydratations-Kalibrierung"** card where users select pot type (Stofftopf, Air-Pot, Kunststoff, Autopot) and record the dry tare mass (e.g. $1850\text{ g}$ dry Coco + pot) and water saturation mass (e.g. $5200\text{ g}$).
  - Substrat-Mischverhältnis (e.g. 70% Coco Coir, 30% Perlite, Mykorrhiza-Inokulation) must be recordable.

### 3.4. Wasserchemie-Profil & Erweiterte Ionen-Bilanz (Invariant 4 Fail-Closed Gate)
- **Current Observation:** `RunConfigPanel.tsx` lines 65–84 implement Category 4 of the Readiness Gate, checking `sourcePh`, `sourceEc`, `calciumMgL`, and `magnesiumMgL`.
- **Missing Architecture:**
  - In `src/types.ts:210-226`, `WaterProfile` includes `alkalinityMgL`, `sodiumMgL`, `chlorideMgL`, `sulfateMgL`, `sourceType`, `sourceDescription`, `analysisDate`, and `analysisMethod`.
  - In `GlobalPlanEditorPanel.tsx:264-310`, `alkalinityMgL` is editable, and Rule 5 in `compatibility-engine.ts:65` warns if alkalinity exceeds $150\text{ mg/L}$ in unbuffered media.
  - Setup must bring these fields into a unified progressive-disclosure water card:
    - Base view: Quell-pH, Quell-EC, Ca, Mg, Ca:Mg-Verhältnis (Ziel 3:1), Wasserhärte in $^\circ\text{dH}$ ($\text{Härte} \approx \text{Ca}\times 0.14 + \text{Mg}\times 0.23$).
    - Advanced / Expert view: Säurekapazität $K_{S4.3}$ / Alkalinität, Natrium, Chlorid, Herkunftsnachweis (Wasserversorger/Datum).

### 3.5. Nährstofflinien & Bewässerungsstrategie
- **Current Observation:** `config.nutrientSystem` is defaulted to `"UKD HESI Conservative"` and `config.irrigationSystem` to `"Manuell / indoor-freigegeben"`. In `RunConfigPanel`, neither field is visible. In `GlobalPlanEditorPanel`, changing the nutrient line is locked with a warning ("Ein Systemwechsel ist gesperrt...").
- **Missing Architecture:**
  - Setup needs a transparent **Nährstoff- und Bewässerungs-Konfigurator**:
    - Preset Selector from `src/data/product-presets.json` (Hesi Soil/Hydro, Athena Pro, Canna Coco, BioBizz Organic, Plagron Terra/Alga, AN pH Perfect).
    - Real-time compatibility verification via `validateRunConfig(config)`:
      - Warns if organic thick fertilizer is selected with micro-drip emitters (clogging risk).
      - Warns if unbuffered substrate is combined with high alkalinity water.
      - Warns if Coco is used without adequate Ca baseline.
    - Bewässerungsmethode: Manuell (Drain-to-Waste), Automatisches Tropfsystem (Drip), Autopot (Docht / Schwerkraft), Ebbe-Flut.

### 3.6. Autoflower Cockpit Integration (R2)
- **Current Observation:** `src/data/autoflower-cockpit.json` contains 6 curated cultivars (Sweet Mandarin Zkittlez XL Auto, Bruce Banner Auto, Royal Gorilla Automatic, Northern Lights Fast V, Amnesia Haze Auto, RQS Watermelon Automatic) with rich metadata: type, provenienz, level, yield, tags, description. `src/components/panels/AutoflowerCockpitPanel.tsx` renders this data but is **completely orphaned** (not mounted in `App.tsx`).
- **Missing Architecture:**
  - Setup view must include a dedicated **"Genetik-Cockpit Browser"** action.
  - Opening the browser displays the 2026-styled cards with live search, tags, THC/aroma filters, difficulty ratings, and yield tier badges.
  - Clicking **"Für diesen Run übernehmen"** automatically updates:
    - `run.config.genetics = item.title`
    - `run.plants[0].identity.breeder = item.provenienz`
    - `run.plants[0].identity.seedType = item.type === "Autoflower" ? "autoflower" : "feminized"`
    - `run.plants[0].identity.phenotypeNotes = item.description`
    - Sets expected cycle length and yield tier.

### 3.7. Retroaktive Meilenstein-Steuerung & Dynamischer Zeitanker (R4)
- **Current Observation:** In `src/domain.ts:313-379`, `calculateBiologicalPlantAge` computes biological age vs. operational age by looking for `GrowthEvent` entries matching `dayZeroAnchor`. In `PlantIdentityModal.tsx:70-85`, an anchor date can be set.
- **Missing Architecture:**
  - Growers often plant seeds, pot seedlings, or observe emergence on different dates, and may only record these milestones days later after the run has been activated or switched to "Live".
  - Setup must render a **4-Stufen-Meilenstein-Tracker**:
    1. **Aussaat / Vorkeimung (`seed-started`)**: Datum & Uhrzeit
    2. **Eintopfen / Ins Medium (`seed-planted`)**: Datum & Uhrzeit
    3. **Durchstoß / Keimung (`emergence`) [Kanonischer Day 0 Anker]**: Datum & Uhrzeit
    4. **Erstes echtes Blattpaar (`first-true-leaves`)**: Datum & Uhrzeit
  - When a user retroactively adjusts the date of `emergence` or `seed-planted`:
    - If in **Simulation Mode**: Updates `run.config.startDate` and recalculates view dates.
    - If in **Live Mode**: Emits a `LiveAnchorRevision` domain event (`types.ts:1251`), adjusts `run.liveAnchor.startedAtUtc`, updates `growthEvents`, and recalibrates the active operational day $D = \lfloor(t_{\text{now}} - t_{\text{anchor}})/86400000\rfloor$ without losing or corrupting past measurement logs or violating immutable snapshot invariants.

### 3.8. Globaler Betriebsmodus: Live vs. Simulation (R3)
- **Current Observation:** `run.executionMode` is typed as `"simulation" | "live"`. In `GlobalCommandCenter.tsx:445`, a mode chip exists inside the command center overlay, but there is no prominent top-level toggle in the main header and Setup banner.
- **Missing Architecture:**
  - Global, persistent header component: `RunExecutionModeToggle`.
  - Prominent dual-state pill:
    - `◇ SIMULATION (Planungs- & Testmodus)` — Allows navigating across all 81 days freely, editing hypothetical parameters, calculating dosages.
    - `● LIVE (Echter Durchlauf)` — Locks the active day to real UTC time, displays live day counter ($D=x$), live countdown to lights on/off, and triggers real-time task notifications.
  - Mode transition gate: Switching from Simulation to Live initiates the preflight check (validating readiness score 100%, confirmed emergence anchor, time zone), creating the immutable snapshot and starting the UTC clock.

### 3.9. KCanG-Rechtsrahmen & Technische Ertragsprognose
- **Current Observation:** `AGENTS.md` strictly requires:
  - *"Technischen Bruttoertrag ohne künstliche Grammgrenze prognostizieren; zulässigen Bestand, Apothekenbestand und dokumentierte Vernichtung getrennt bilanzieren."*
  - *"KCanG-Eigenanbau, MedCanG-Apothekenbezug und eine individuelle Erlaubnis nach § 4 MedCanG nie zu einem gemeinsamen Mengenrecht verschmelzen."*
  - *"Pflanzenanzahl limitieren (max. 3 gleichzeitig blühende weibliche Pflanzen im privaten KCanG-Bereich)."*
- **Missing Architecture:**
  - Setup must include `plantCount` with visual KCanG compliance feedback:
    - Input: 1 bis 3 Pflanzen $\rightarrow$ `✓ KCanG-konform (Privater Eigenanbau gem. § 9 KCanG)`.
    - Input $> 3$ Pflanzen $\rightarrow$ `⚠️ KCanG-Überschreitung: Erfordert gewerblichen Anbauverband (KCanG) oder medizinisches Ausnahmerecht (§ 4 MedCanG)`.
  - Technical Gross Yield estimation: $\text{Ertrag}_{\text{brutto}} = \text{ledMaxW} \times 1.2\text{–}1.5\text{ g/W} \approx 170\text{–}210\text{ g}$.
  - Legal possession gate reminder: Max. $50\text{ g}$ getrocknetes Cannabis am Wohnsitz; Überschuss unterliegt der gesetzlichen Vernichtungspflicht mit Inventar-Gate.

---

## 4. Proposed UI Layout & Component Architecture (2026 Master Class)

To achieve world-class 2026 UX, the Setup view must be restructured into clean, modular, glassmorphic cards organized into logical thematic sections with **Progressive Disclosure** (Guided / Advanced / Expert lenses):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ UKD MASTER SETUP CENTER · RUN-KONFIGURATION & SYSTEMGRENZEN                              │
│ [Status: DRAFT / AKTIV]  [● LIVE / ◇ SIMULATION Toggle]  [Guided | Advanced | Expert Lens]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ FAIL-CLOSED READINESS GATE (Score: 100% · Alle 5 Sicherheitskategorien erfüllt)          │
│ [Substrat & Topf: 20%] [Licht: 20%] [Zelt: 20%] [Wasser: 20%] [Genetik & Hardware: 20%]   │
│ [🚀 Run Aktivieren / Live Starten]                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│ ┌────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ 🧬 1. Genetik, Identität & Cockpit     │ │ ⏱️ 2. Lebenszyklus & Meilenstein-Anker      │ │
│ │ • Strain: Sweet Mandarin Zkittlez Auto │ │ • Aussaat:         [10.08.2026 14:00] (✓)    │ │
│ │ • Züchter: Sweet Seeds (Feminisiert)   │ │ • Eintopfen:       [12.08.2026 18:30] (✓)    │ │
│ │ • Pflanzenanzahl: [ 1 ] (✓ KCanG)      │ │ • Durchstoß (D0):  [14.08.2026 08:00] (★)    │ │
│ │ • Ertragspotenzial: 80-120g (Anfänger) │ │ • Erstes Blattpaar:[16.08.2026 11:00] (✓)    │ │
│ │ [🌱 Autoflower-Cockpit öffnen...]      │ │ ➜ Biologisches Alter: Tag 7 (Live D=7)       │ │
│ └────────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│                                                                                             │
│ ┌────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ ⛺ 3. Zelt, Raumvolumen & Lüftung      │ │ 💡 4. Beleuchtung, Photoperiode & DLI      │ │
│ │ • Maße: [ 60 ] x [ 60 ] x [ 180 ] cm   │ │ • Lampenleistung: [ 140 ] W (LED)            │ │
│ │ • Fläche: 0.36 m² | Volumen: 0.65 m³   │ │ • Photoperiode:   [ 18 ] h/Tag (18/6)        │ │
│ │ • Abluftlüfter: [ 220 ] m³/h (125mm)   │ │ • Ziel-DLI:       32.4 mol/m²/d (Veg)        │ │
│ │ • AKF Filter:   [ 250 ] m³/h (✓ Sicher)│ │ • Ziel-PPFD:      500 µmol/m²/s              │ │
│ │ • Luftwechsel:  338x/h (✓ Optimal)     │ │ [🗺️ 9-Punkt PPFD Grid / Spektrum öffnen...]  │ │
│ └────────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│                                                                                             │
│ ┌────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ 🪴 5. Substrat, Topf & Tara-Gewichte   │ │ 💧 6. Wasseranalyse & Ionen-Profil (Gate)  │ │
│ │ • Medium: [ Coco ] (UGro Rhiza Block)  │ │ • Quell-pH: [ 7.20 ] | Quell-EC: [ 0.40 ]   │ │
│ │ • Topf:   [ Stofftopf ] [ 11.0 ] Liter │ │ • Calcium:  [ 60.0 ] | Magnesium: [ 15.0 ]  │ │
│ │ • Mix:    70% Coco + 30% Perlit        │ │ • Ca:Mg Verhältnis: 4.0:1 (Ziel 3:1)        │ │
│ │ • Tara Leer: [ 1850 ] g (Trockengew.)  │ │ • Alkalinität: [ 180 ] mg/L | Härte: 12 °dH  │ │
│ │ • Sättigung: [ 5200 ] g (100% Kapazit.)│ │ [🧪 Messgerät-Kalibrierung (pH/EC)...]      │ │
│ └────────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│                                                                                             │
│ ┌────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ 🧪 7. Nährstofflinie & Bewässerung     │ │ ⚖️ 8. Ertrag, Zyklus & KCanG-Compliance    │ │
│ │ • Nährstofflinie: [ UKD HESI Conserv.] │ │ • Geplante Dauer: [ 80 ] Tage (Bis 02.11.)   │ │
│ │ • Bewässerung:    [ Manuell / Runoff ] │ │ • Brutto-Potenzial: 140–210 g (1.0–1.5 g/W)  │ │
│ │ • Kompatibilität: ✓ Geprüft (Kein K.)  │ │ • KCanG-Status:     Max. 50g legaler Besitz  │ │
│ │ • Ziel-Drain:     15–20% Runoff        │ │ • Vernichtungs-Gate: Dokumentation aktiv     │ │
│ └────────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Proposed Component Hierarchy

1. `src/components/panels/RunConfigPanel.tsx` *(Main Setup View)*
   - `RunSetupHeader.tsx` (Title, Live/Simulation Toggle, LensBadge, Status)
   - `ReadinessGateBar.tsx` (Fail-closed 5-category score & activation trigger)
   - `PlantGeneticsCard.tsx` (Genetics summary, plantCount, KCanG validation, trigger for Cockpit Modal)
   - `MilestoneTimelineCard.tsx` (Visual 4-step milestone tracker, retroactive editing, biological age preview)
   - `TentVentilationCard.tsx` (Width/Depth/Height, area, volume, exhaust m³/h, AKF rating, turnover rate)
   - `LightingConfigCard.tsx` (Watts, lightHours, DLI/PPFD targets, link to PpfdMappingModal)
   - `SubstratePotCard.tsx` (Medium category, product preset, mix ratios, pot type, volume, dry/saturated tare)
   - `WaterChemistryCard.tsx` (pH, EC, Ca, Mg, Ca:Mg ratio, alkalinity, hardness, sensor calibration trigger)
   - `NutrientIrrigationCard.tsx` (Nutrient preset, irrigation method, compatibility engine alerts)
   - `HarvestComplianceCard.tsx` (Cycle length, harvest date prediction, technical yield vs KCanG possession)
2. `src/components/modals/AutoflowerCockpitModal.tsx` *(Interactive Genetics Browser)*
   - Live search input, type filters (Autoflower, Fast Version), experience level filters (Anfänger, Fortgeschritten, Expert).
   - Rich strain cards with THC %, aroma tags, yield potential, provenance badge.
   - 1-Click "Für Run übernehmen" action.
3. `src/components/common/RunExecutionModeToggle.tsx` *(Global Live/Simulation Switch)*
   - Reusable pill button with mode icon, day status, and preflight confirmation dialog.

---

## 5. Verification Method & Test Invariants

To ensure complete stability and safety when these components are implemented:
1. **Type Safety Verification:** Run `npx tsc --noEmit` — ensure all extended props and fields compile cleanly.
2. **Vitest Regression Suite:** Run `npx vitest run` — verify all 36 test suites and 386 tests pass without failure.
3. **Fail-Closed Gate Verification:** Ensure a draft run cannot be activated if any of the 5 mandatory readiness categories (Substrate/Pot, Light, Tent, Water Chemistry, Genetics) are missing.
4. **Retroactive Anchor Fuzzing:** Test changing milestone dates in both Simulation and Live modes; verify `LiveAnchorRevision` is logged and `calculateBiologicalPlantAge` never returns negative values or crashes.
5. **Autoflower Selection Integration Test:** Verify that selecting a cultivar from the Autoflower Cockpit updates `run.config.genetics` and `run.plants[0].identity` in the global `App.tsx` state.

---

*Report prepared by Explorer Agent for the Orchestrator / Implementer Team.*
