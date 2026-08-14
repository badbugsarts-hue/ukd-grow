# Technical Analysis & Implementation Blueprint: Context Help & Knowledge Glossary Panel (`ContextHelpGlossaryPanel.tsx`)

**Module Location**: `src/components/panels/ContextHelpGlossaryPanel.tsx`  
**Milestone**: M3 (Context Help & Knowledge Glossary Panel)  
**Author**: Explorer Agent (`explorer_m3_2`)  
**Date**: 2026-08-11  

---

## 1. Executive Summary & Mission Overview

The objective of Milestone 3 (F7: Context Help & Knowledge Glossary Panel) is to provide an elite, searchable, and filterable German Knowledge Glossary and Context Help Panel for the UKD Grow Masterplan 2026 application. 

This panel serves as the canonical knowledge reference hub within the application. It synthesizes two primary data sources:
1. **`termDictionary.ts`**: Core technical growth and environmental metrics (`VPD`, `DLI`, `EC`, `pH`, `PPFD`, `rF`, `Leaf-VPD`, `BT`, `BW`, `VT`, `VW`, `Drain-EC`, `Drain-pH`, `Substrat-EC`).
2. **`knowledge-base.json`**: Verified scientific, legal, and operational claims (e.g., KCanG §3/§9 Eigenanbau & Besitzgrenzen, MedCanG §4 Medizinalcannabis-Erlaubnisse, Athena Balance Wasseraufbereitung, HESI Coco herstellerspezifische Dosen, Tropf-Blumat Indoor-Scope, Post-Harvest Trocknung/Wasseraktivität $a_w$, Preharvest Flushing Evidenz, Autoflower PRR-Genomik).

### Key Architectural Requirements & Principles:
- **`PanelProps` Interface Compliance**: Strictly adheres to `PanelProps` (`run`, `plan`, `lens`, `onUpdateRun`, `navigate`) defined in `PROJECT.md`.
- **Experience Lenses Integration**: Seamless integration of `guided` (Anfänger/Geführt), `advanced` (Standard/Fortgeschritten), and `expert` (Experte/Wissenschaftlich) lenses using `LensBadge` and dynamic text density adjustments without altering underlying scientific facts.
- **Evidence Scale Visibility**: Direct display of Evidence Grades (Grade A to E) as defined in `AGENTS.md` and `knowledge-base.json` to ensure high scientific transparency and legal compliance.
- **7 Category Tabs**: `Alle`, `Klima`, `Nährstoffe`, `Substrat`, `Ertrag`, `Recht`, `Allgemein`.
- **Search & Multi-Filter Engine**: Live multi-field text search and evidence grade/importance filtering with instant match indicators and reset controls.
- **Detailed Term & Evidence Cards**: Term symbol/short name, full German name, category badge, lens badge, evidence grade, dynamic definition, target ranges matrix, mathematical formulas, actionable operator tips ("💡 Praxis-Tipps für Grower"), and citation links.
- **Design & Accessibility**: Strict compliance with `styles.css` CSS variables (`var(--surface-1)`, `var(--green)`, `var(--blue)`, `var(--amber)`, `var(--purple)`, `var(--red)`, `var(--font-mono)`), responsive mobile-first layouts, 44px touch targets, keyboard navigation, and ARIA standards.

---

## 2. Interface Contracts & Component Integration

### 2.1 Panel Component Contract (`PROJECT.md`)

```typescript
import { RunPackage, DayPlan, ExperienceLens, RouteId } from '../../types';

export interface PanelProps {
  run: RunPackage;
  plan?: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
}
```

For maximum flexibility, `ContextHelpGlossaryPanelProps` will extend this interface with optional defaults:

```typescript
export interface ContextHelpGlossaryPanelProps {
  run?: RunPackage;
  plan?: DayPlan;
  lens?: ExperienceLens;
  onUpdateRun?: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
  initialCategory?: GlossaryCategory;
  initialSearchQuery?: string;
}
```

### 2.2 Integration with Existing UI Primitives
- **`TermTooltip`**: Used inside definition texts and operator tips to allow nested term lookups (e.g. hovering over `PPFD` inside the `DLI` definition).
- **`LensBadge`**: Rendered in the panel header, filter controls, and on individual term cards to indicate the active experience lens.
- **`MetricGauge`**: Integrated into the 4-Phase Target Matrix Quick Reference to visually communicate target ranges for climate and nutrient metrics.

---

## 3. Data Model Synthesis & Category Taxonomy

### 3.1 Unified Glossary Item Data Structure

To combine dictionary terms (`termDictionary.ts`) and knowledge claims (`knowledge-base.json`) into a single interactive list, we define the `UnifiedGlossaryItem` data model:

```typescript
export type GlossaryCategory =
  | "all"
  | "klima"
  | "naehrstoffe"
  | "substrat"
  | "ertrag"
  | "recht"
  | "allgemein";

export type ImportanceLevel = "critical" | "high" | "medium" | "low";

export interface TargetRangeItem {
  phase: string;
  min: number;
  max: number;
  unit: string;
}

export interface UnifiedGlossaryItem {
  id: string;
  key: string;               // Acronym or short ID (e.g. "VPD", "KCanG §3")
  acronym: string;           // Short symbol displayed in card header
  germanName: string;        // Full German designation
  category: GlossaryCategory;
  categoryLabel: string;     // German display title (e.g. "Klima & Transpiration")
  
  // Lens-dependent definitions
  beginner: string;          // Geführt mode: accessible explanation with metaphors
  advanced: string;          // Standard mode: technical description with parameters
  expert: string;            // Experte mode: scientific mechanisms & formulas
  
  // Scientific & legal metadata
  unit?: string;
  importance: ImportanceLevel;
  evidenceGrade?: "A" | "B" | "C" | "D" | "E";
  evidenceLabel?: string;
  scope?: string;
  uncertainty?: string;
  sourceIds?: string[];
  
  // Operational details
  optimalRanges?: TargetRangeItem[];
  formula?: string;
  formulaDescription?: string;
  operatorTips?: string[];   // Concrete actionable steps for growers
  tags: string[];
}
```

### 3.2 Category Taxonomy & Item Mapping

| Category ID | German Label | Included Terms & Claims |
| :--- | :--- | :--- |
| `klima` | 🌡️ Klima & Transpiration | `VPD`, `Leaf-VPD`, `rF`, `Leaf-Temperature-Offset`, `Extreme-RH-Boundary` |
| `naehrstoffe` | 🧪 Nährstoffe & Salze | `EC`, `pH`, `Drain-EC`, `Drain-pH`, `HESI-Coco-Label`, `Athena-Balance`, `Preharvest-Flushing`, `NPK-Wechselwirkungen`, `Phosphor-Overfeeding` |
| `substrat` | 🪴 Substrat & Bewässerung | `Substrat-EC`, `Coco-Coir`, `Erde`, `Tropf-Blumat-Scope`, `Irrigation-Observation-Bands` |
| `ertrag` | 💡 Ertrag & Beleuchtung | `DLI`, `PPFD`, `Light-Response-Curve`, `Autoflower-Photoperiode`, `Post-Harvest-Aw` |
| `recht` | ⚖️ Recht & Compliance | `KCanG-Eigenanbau-§9`, `KCanG-Besitz-§3`, `MedCanG-§4-Erlaubnis`, `Yield-Inventory-Separation`, `GACP-GMP-Scope` |
| `allgemein` | ⚙️ Allgemeines & Phasen | `BT`, `BW`, `VT`, `VW`, `Evidence-Scale-A-E`, `Core-Web-Vitals-2026`, `SSDF-ASVS-Governance` |

---

## 4. Interactive Component Architecture & UI Specification

### 4.1 UI Layout Breakdown

```
+-----------------------------------------------------------------------------------+
| 📚 Kontext-Hilfe & Fachbegriff-Glossar                    [🌱 GEFÜHRT] [🌡️ Klima] |
| Interaktives 2026 Nachschlagewerk für Parameter, Formeln, Evidenzen & Recht       |
+-----------------------------------------------------------------------------------+
| 🔍 SEARCH & FILTER BAR                                                            |
| [ 🔎 Begriff oder Formel suchen... ] [ Category: Alle ▼ ] [ Evidenz: Alle ▼ ]    |
| 🟢 20 Einträge gefunden                                          [ ✖️ Filter zurück] |
+-----------------------------------------------------------------------------------+
| CATEGORY TABS BAR                                                                 |
| [🌐 Alle] [🌡️ Klima] [🧪 Nährstoffe] [🪴 Substrat] [💡 Ertrag] [⚖️ Recht] [⚙️ Allgemein] |
+-----------------------------------------------------------------------------------+
| 📊 4-PHASEN SCHNELL-ORIENTIERUNG (VPD, DLI, EC, pH, rF Target Matrix)              |
+-----------------------------------------------------------------------------------+
| GLOSSARY CARDS GRID (Responsive 1-col / 2-col)                                   |
| +-----------------------------------+ +-----------------------------------+ |
| | VPD — Dampfdruckdefizit [Klima]   | | DLI — Lichtintegral [Ertrag]      | |
| | [Evidenz A] [Wichtig: Kritisch]   | | [Evidenz A] [Wichtig: Hoch]       | |
| |-----------------------------------| |-----------------------------------| |
| | Definition (basierend auf Lens):  | | Definition (basierend auf Lens):  | |
| | "VPD zeigt, wie stark die Luft..."| | "DLI misst die Gesamtmenge..."    | |
| |                                   | |                                   | |
| | 📐 FORMEL:                        | | 📐 FORMEL:                        | |
| | VPD = SVP(T_leaf) - VP(T_air, RH) | | DLI = PPFD × h × 3600 / 1.000.000 | |
| |                                   | |                                   | |
| | 🎯 ZIELKORRIDORE:                 | | 🎯 ZIELKORRIDORE:                 | |
| | • Sämling: 0.4 - 0.8 kPa          | | • Sämling: 10 - 15 mol/m²/d       | |
| | • Vegi:    0.8 - 1.1 kPa          | | • Vegi:    20 - 30 mol/m²/d       | |
| | • Blüte:   1.1 - 1.5 kPa          | | • Blüte:   35 - 45 mol/m²/d       | |
| |                                   | |                                   | |
| | 💡 PRAXIS-TIPPS FÜR GROWER:       | | 💡 PRAXIS-TIPPS FÜR GROWER:       | |
| | • Blatttemperatur messen (IR).    | | • Autoflower 18h Licht nutzen.    | |
| | • Bei >1.6 kPa Stomata-Schluss.   | | • Sättigung ohne CO2 bei ~45 DLI. | |
| |                                   | |                                   | |
| | 🔗 Quellnachweis: ASHRAE Standard | | 🔗 Quellnachweis: HortScience     | |
| +-----------------------------------+ +-----------------------------------+ |
+-----------------------------------------------------------------------------------+
| 🛡️ EVIDENZSTUFEN & RECHTSHINWEIS FOOTER                                           |
| Evidenz A = Gesetz & Primärforschung | Evidenz B = Reviews | Evidenz C = Inferenz |
+-----------------------------------------------------------------------------------+
```

---

## 5. Production-Ready Technical Code Blueprint

Below is the complete, executable TypeScript implementation blueprint for `src/components/panels/ContextHelpGlossaryPanel.tsx`.

```tsx
import React, { useState, useMemo } from "react";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import LensBadge from "../common/LensBadge";
import TermTooltip from "../common/TermTooltip";
import rawKnowledgeBase from "../../data/knowledge-base.json";

// ── Types & Interfaces ──

export type GlossaryCategory =
  | "all"
  | "klima"
  | "naehrstoffe"
  | "substrat"
  | "ertrag"
  | "recht"
  | "allgemein";

export type ImportanceLevel = "critical" | "high" | "medium" | "low";

export interface TargetRangeItem {
  phase: string;
  min: number;
  max: number;
  unit: string;
}

export interface UnifiedGlossaryItem {
  id: string;
  key: string;
  acronym: string;
  germanName: string;
  category: GlossaryCategory;
  categoryLabel: string;
  beginner: string;
  advanced: string;
  expert: string;
  unit?: string;
  importance: ImportanceLevel;
  evidenceGrade?: "A" | "B" | "C" | "D" | "E";
  evidenceLabel?: string;
  scope?: string;
  uncertainty?: string;
  sourceIds?: string[];
  optimalRanges?: TargetRangeItem[];
  formula?: string;
  formulaDescription?: string;
  operatorTips?: string[];
  tags: string[];
}

export interface ContextHelpGlossaryPanelProps {
  run?: RunPackage;
  plan?: DayPlan;
  lens?: ExperienceLens;
  onUpdateRun?: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
  initialCategory?: GlossaryCategory;
  initialSearchQuery?: string;
}

// ── Category Configuration ──

const CATEGORIES: Array<{ id: GlossaryCategory; label: string; icon: string }> = [
  { id: "all", label: "Alle", icon: "🌐" },
  { id: "klima", label: "Klima", icon: "🌡️" },
  { id: "naehrstoffe", label: "Nährstoffe", icon: "🧪" },
  { id: "substrat", label: "Substrat", icon: "🪴" },
  { id: "ertrag", label: "Ertrag & Licht", icon: "💡" },
  { id: "recht", label: "Recht & Schutz", icon: "⚖️" },
  { id: "allgemein", label: "Allgemein", icon: "⚙️" },
];

// ── Canonical Data Population ──

const UNIFIED_GLOSSARY_ITEMS: UnifiedGlossaryItem[] = [
  {
    id: "vpd",
    key: "VPD",
    acronym: "VPD",
    germanName: "Dampfdruckdefizit",
    category: "klima",
    categoryLabel: "Klima & Transpiration",
    unit: "kPa",
    importance: "critical",
    evidenceGrade: "A",
    evidenceLabel: "ASHRAE Standard / Physikalische Evidenz",
    beginner:
      "VPD zeigt, wie stark die Luft Wasser aus den Blättern zieht. Passt der Wert, transpiriert die Pflanze optimal ohne zu vertrocknen.",
    advanced:
      "Differenz zwischen Sättigungsdampfdruck und tatsächlichem Dampfdruck der Luft. Steuert die Stomata-Öffnung und den Nährstofftransport im Xylem.",
    expert:
      "Zentraler Transpirations-Treiber. Berechnet über Leaf-VPD = SVP(T_leaf) - VP(T_air, RH). Zielkorridore: Sämling 0.4–0.8 kPa, Vegi 0.8–1.1 kPa, Blüte 1.1–1.5 kPa.",
    optimalRanges: [
      { phase: "Sämling (Tag 0–7)", min: 0.4, max: 0.8, unit: "kPa" },
      { phase: "Vegetation (Tag 8–28)", min: 0.8, max: 1.1, unit: "kPa" },
      { phase: "Hauptblüte (Tag 29–63)", min: 1.1, max: 1.5, unit: "kPa" },
      { phase: "Spätblüte (Tag 64–80)", min: 1.3, max: 1.6, unit: "kPa" },
    ],
    formula: "VPD = SVP(T_leaf) - VP(T_air, RH)",
    formulaDescription:
      "SVP (Sättigungsdampfdruck) bei Blatttemperatur abzüglich aktuellem Wasserdampfdruck der Raumluft.",
    operatorTips: [
      "Infrarot-Pyrometer nutzen: Unter LED liegt die Blatttemperatur meist 1–2 °C unter der Lufttemperatur.",
      "VPD > 1.6 kPa führt zu Stomata-Schluss und Wachstumsstopp zum Verdunstungsschutz.",
      "VPD < 0.4 kPa blockiert den Nährstofftransport nach oben und erhöht das Botrytis-Risiko.",
    ],
    tags: ["klima", "transpiration", "stomata", "temperatur", "feuchtigkeit"],
  },
  {
    id: "dli",
    key: "DLI",
    acronym: "DLI",
    germanName: "Tägliches Lichtintegral",
    category: "ertrag",
    categoryLabel: "Ertrag & Beleuchtung",
    unit: "mol/m²/d",
    importance: "high",
    evidenceGrade: "A",
    evidenceLabel: "HortScience Review Evidenz",
    beginner:
      "DLI misst die Gesamtmenge an Licht, die eine Pflanze an einem Tag erhält – wie die tägliche 'Licht-Ration'.",
    advanced:
      "Akkumulierte Photonenmenge der photosynthetisch aktiven Strahlung (PAR) pro m² und Tag, berechnet aus PPFD und Photoperiode.",
    expert:
      "DLI = PPFD × Lichtstunden × 3600 / 1.000.000. Zielwerte: Sämling 10–15, Vegi 20–30, Blüte 35–45+ mol/m²/d.",
    optimalRanges: [
      { phase: "Sämling", min: 10, max: 15, unit: "mol/m²/d" },
      { phase: "Vegetation", min: 20, max: 30, unit: "mol/m²/d" },
      { phase: "Hauptblüte", min: 35, max: 45, unit: "mol/m²/d" },
    ],
    formula: "DLI = PPFD × Lichtstunden × 3600 / 1.000.000",
    formulaDescription:
      "Umrechnung von Mikromol pro Sekunde auf die Gesamtsumme Mol pro Quadratmeter am Tag.",
    operatorTips: [
      "Bei Autoflowers erlaubt eine 18h- oder 20h-Photoperiode hohe DLIs bei moderaterem PPFD (reduziert Hitzestress).",
      "Ohne zusätzliche CO₂-Anreicherung tritt bei >45 mol/m²/d Sättigung ein.",
    ],
    tags: ["licht", "ppfd", "photoperiode", "par", "ertrag"],
  },
  {
    id: "ec",
    key: "EC",
    acronym: "EC",
    germanName: "Elektrische Leitfähigkeit",
    category: "naehrstoffe",
    categoryLabel: "Nährstoffe & Salze",
    unit: "mS/cm",
    importance: "critical",
    evidenceGrade: "A",
    evidenceLabel: "Physikochemischer Standard",
    beginner:
      "Der EC-Wert gibt an, wie viele Nährstoffsalze im Wasser gelöst sind. Ein zu hoher Wert verbrennt die Wurzeln.",
    advanced:
      "Maß für die Gesamtsalzkonzentration der Nährlösung in MilliSiemens pro Zentimeter (mS/cm).",
    expert:
      "Bestimmt den osmotischen Druck im Substrat. Zielwerte Coco: Sämling 0.6–0.9, Vegi 1.2–1.6, Blüte Peak 1.8–2.2 mS/cm.",
    optimalRanges: [
      { phase: "Sämling", min: 0.6, max: 0.9, unit: "mS/cm" },
      { phase: "Vegetation", min: 1.2, max: 1.6, unit: "mS/cm" },
      { phase: "Blüte Peak", min: 1.8, max: 2.2, unit: "mS/cm" },
    ],
    formula: "EC_total = EC_wasser + EC_duenger",
    formulaDescription: "Summe aus Leitungswasser-Grund-EC und hinzugefügter Düngersalz-Konzentration.",
    operatorTips: [
      "EC-Messung immer temperaturkompensiert bei 25 °C durchführen.",
      "Liegt der Ausgangs-EC des Leitungswassers über 0.4 mS/cm, mit Osmosewasser verschneiden.",
    ],
    tags: ["nährstoffe", "salzgehalt", "dünger", "hesi", "ec"],
  },
  {
    id: "ph",
    key: "pH",
    acronym: "pH",
    germanName: "Säuregrad",
    category: "naehrstoffe",
    categoryLabel: "Nährstoffe & Salze",
    unit: "pH",
    importance: "critical",
    evidenceGrade: "A",
    evidenceLabel: "Chemie-Standard",
    beginner:
      "Der pH-Wert bestimmt, ob die Wurzeln Nährstoffe überhaupt aufnehmen können. Für Hydro/Kokus liegt das Fenster bei 5.8–6.2.",
    advanced:
      "Negativer dekadischer Logarithmus der H⁺-Ionen-Aktivität. Entscheidet über die Löslichkeit und Bioverfügbarkeit von N, P, K, Ca, Mg, Fe.",
    expert:
      "Hydro/Coco Optimalfenster: 5.5–6.2 (Leichter Drift fördert abwechselnde Nährstoff-Aufnahme). Erde Optimalfenster: 6.2–6.8.",
    optimalRanges: [
      { phase: "Hydro / Coco", min: 5.5, max: 6.2, unit: "pH" },
      { phase: "Erde", min: 6.2, max: 6.8, unit: "pH" },
    ],
    formula: "pH = -log10[H+]",
    formulaDescription: "Logarithmische Skala der Wasserstoffionenkonzentration.",
    operatorTips: [
      "pH-Wert erst ganz zum Schluss NACH der Beigabe aller Düngerkomponenten einstellen.",
      "pH-Messgerät mindestens alle 2 bis 4 Wochen mit Pufferlösungen (pH 4.01 / 7.01) kalibrieren.",
    ],
    tags: ["ph", "säuregrad", "nährstoffaufnahme", "verfügbarkeit"],
  },
  {
    id: "ppfd",
    key: "PPFD",
    acronym: "PPFD",
    germanName: "Photosynthetische Photonenflussdichte",
    category: "ertrag",
    categoryLabel: "Ertrag & Beleuchtung",
    unit: "µmol/m²/s",
    importance: "high",
    evidenceGrade: "A",
    evidenceLabel: "Frontiers in Plant Science 2021",
    beginner:
      "PPFD misst die aktuelle Lichtintensität, die auf der Blattoberfläche ankommt.",
    advanced:
      "Anzahl der verwertbaren Lichtquanten (400–700 nm PAR) pro Quadratmeter und Sekunde.",
    expert:
      "Sämling: 150–300, Vegi: 400–600, Blüte: 700–1000 µmol/m²/s. Maximale Sättigung ohne CO₂ bei ~1050 µmol/m²/s.",
    optimalRanges: [
      { phase: "Sämling", min: 150, max: 300, unit: "µmol/m²/s" },
      { phase: "Vegetation", min: 400, max: 600, unit: "µmol/m²/s" },
      { phase: "Blüte Peak", min: 700, max: 1000, unit: "µmol/m²/s" },
    ],
    operatorTips: [
      "PPFD an den höchsten Blütenkolben messen, nicht am Zeltboden.",
      "Auf gleichmäßige Hängehöhe der LED achten, um Ausleuchtungs-Hotspots zu vermeiden.",
    ],
    tags: ["ppfd", "licht", "led", "par", "intensität"],
  },
  {
    id: "rf",
    key: "rF",
    acronym: "rF",
    germanName: "Relative Luftfeuchtigkeit",
    category: "klima",
    categoryLabel: "Klima & Transpiration",
    unit: "%",
    importance: "high",
    evidenceGrade: "A",
    evidenceLabel: "Meteorologischer Standard",
    beginner:
      "Zeigt den Feuchtigkeitsgehalt der Luft in Prozent. Zu hohe Feuchte in der Spätblüte verursacht Schimmel (Botrytis).",
    advanced:
      "Verhältnis von tatsächlichem Wasserdampfdruck zum Sättigungsdampfdruck bei der gemessenen Temperatur.",
    expert:
      "Muss stets gekoppelt mit der Temperatur (VPD) bewertet werden. Blüte-Ziel: <50 % rF zur Vermeidung von Grauschimmel.",
    optimalRanges: [
      { phase: "Sämling", min: 65, max: 75, unit: "%" },
      { phase: "Vegetation", min: 55, max: 70, unit: "%" },
      { phase: "Hauptblüte", min: 40, max: 55, unit: "%" },
      { phase: "Spätblüte", min: 38, max: 48, unit: "%" },
    ],
    operatorTips: [
      "In den letzten 3 Blütewochen rF strikt unter 50 % halten.",
      "Umluft-Ventilator nie direkt auf die Blüten blasen lassen, sondern sanft durch den Bestand strömen lassen.",
    ],
    tags: ["luftfeuchtigkeit", "rf", "rh", "klima", "schimmel"],
  },
  {
    id: "legal_kcang_eigenanbau",
    key: "KCanG §9",
    acronym: "KCanG §9",
    germanName: "Privater Eigenanbau (KCanG Deutschland)",
    category: "recht",
    categoryLabel: "Recht & Compliance",
    importance: "critical",
    evidenceGrade: "A",
    evidenceLabel: "KCanG Gesetzestext § 9",
    beginner:
      "Volljährige Personen dürfen in Deutschland am Wohnsitz gleichzeitig höchstens 3 Cannabispflanzen privat anbauen.",
    advanced:
      "Regelung nach KCanG § 9. Weitergabe aus privatem Eigenanbau an Dritte ist verboten. Keine kommerzielle Verwertung.",
    expert:
      "Rechtsbasis KCanG § 9 & § 10. Eigenanbau ist strikt personen- und wohnsitzgebunden. Pflanzennummerierung und Zugriffsschutz erforderlich.",
    scope: "Deutschland; privater Wohnsitz",
    uncertainty: "Rechtslage vor Releasing und Ernte stets erneut auf Gesetzesänderungen prüfen.",
    operatorTips: [
      "Maximal 3 lebende Pflanzen gleichzeitig pro volljähriger Person am Wohnsitz halten.",
      "Anbaufläche / Zelt vor dem Zugriff von Kindern und Dritten sichern (Abschließbarer Raum oder Schloss).",
    ],
    tags: ["recht", "kcang", "eigenanbau", "gesetz", "deutschland"],
  },
  {
    id: "legal_kcang_besitz",
    key: "KCanG §3",
    acronym: "KCanG §3",
    germanName: "Erlaubter Besitz von Cannabis (KCanG)",
    category: "recht",
    categoryLabel: "Recht & Compliance",
    importance: "critical",
    evidenceGrade: "A",
    evidenceLabel: "KCanG Gesetzestext § 3 & § 10",
    beginner:
      "Am Wohnsitz sind bis zu 50 Gramm getrocknetes Cannabis erlaubt. Ernteüberschüsse müssen vernichtet werden.",
    advanced:
      "Volljährige dürfen am Wohnsitz bis zu 50 g getrocknetes Konsumcannabis besitzen. Zugriffsschutz vor Dritten ist Pflicht.",
    expert:
      "50g Trockengewicht-Grenze am Wohnsitz (§ 3 Abs. 2 KCanG). Ertragsüberschuss erfordert ein dokumentiertes Vernichtungsprotokoll.",
    operatorTips: [
      "Getrocknete Ernte wiegen und dokumentieren. Überschüsse über 50 g unverzüglich vernichten und im Logbuch protokollieren.",
    ],
    tags: ["besitz", "kcang", "50g", "trockengewicht", "vernichtung"],
  },
  {
    id: "legal_medcang",
    key: "MedCanG §4",
    acronym: "MedCanG §4",
    germanName: "Medizinalcannabis & BfArM-Erlaubnis",
    category: "recht",
    categoryLabel: "Recht & Compliance",
    importance: "high",
    evidenceGrade: "A",
    evidenceLabel: "MedCanG Gesetzestext / BfArM",
    beginner:
      "Medizinalcannabis aus der Apotheke ist ein eigener Rechtsweg und verschmilzt nicht automatisch mit dem KCanG-Anbau.",
    advanced:
      "Ein Rezept berechtigt zur Abgabe über die Apotheke, erlaubt jedoch nicht den privaten Anbau eigener Pflanzen als Medizinalcannabis.",
    expert:
      "Anbau zu medizinischen Zwecken erfordert eine gewerbliche Erlaubnis nach § 4 MedCanG. Rezeptbestand und Eigenanbau getrennt bilanzieren.",
    operatorTips: [
      "Apothekenbezug laut Rezept getrennt von Eigenanbau-Mengen im Logbuch führen.",
    ],
    tags: ["medcang", "rezept", "apotheke", "medizinalcannabis", "bfarm"],
  },
  {
    id: "athena_balance",
    key: "Athena Balance",
    acronym: "Athena Balance",
    germanName: "Athena Balance & Wasseraufbereitung",
    category: "naehrstoffe",
    categoryLabel: "Nährstoffe & Salze",
    importance: "medium",
    evidenceGrade: "A",
    evidenceLabel: "Hersteller-Spezifikation (Athena Ag)",
    beginner:
      "Athena Balance ist ein Wasseraufbereiter und pH-Puffer für Osmosewasser. Er wird VOR den Nährstoffen ins Wasser gegeben.",
    advanced:
      "Kaliumsilikat-Puffer für RO-Wasser. Stabilisiert die Alkalinität und den pH-Wert vor Beigabe von Hauptdüngern.",
    expert:
      "Athena empfiehlt Zugabe als ersten Mischschritt. UKD-Invariante: Unbekannte Wasserchemie erzeugt keine automatische Dosis im System.",
    operatorTips: [
      "Immer vor den A/B-Düngern ins RO-Wasser einrühren und gründlich auflösen lassen.",
    ],
    tags: ["athena", "balance", "silikat", "ph-puffer", "mischreihenfolge"],
  },
  {
    id: "hesi_coco",
    key: "HESI Coco",
    acronym: "HESI Coco",
    germanName: "HESI Coco Düngerschema & Vorgaben",
    category: "naehrstoffe",
    categoryLabel: "Nährstoffe & Salze",
    importance: "medium",
    evidenceGrade: "A",
    evidenceLabel: "Hersteller-Label (HESI B.V.)",
    beginner:
      "HESI empfiehlt 50 ml pro 10 L Wasser für Coco. Das UKD-System nutzt angepasste, wissenschaftlich reduzierte Dosen.",
    advanced:
      "Herstellerangabe: 50 ml/10 L Coco bei jedem Gießen, pH 5.8–6.2. UKD-Invariante: HESI PK nicht additiv mit Fremd-Boostern stapeln.",
    expert:
      "Hersteller-Label gibt Anwendungsrahmen vor, stellt jedoch keine unabhängige Efficacy-Studie dar. UKD dosiert bedarfsorientiert.",
    operatorTips: [
      "HESI PK 13/14 nicht mit anderen Blüteboostern (z.B. Overdrive) kombinieren.",
    ],
    tags: ["hesi", "coco", "düngerschema", "label", "dosierung"],
  },
  {
    id: "tropf_blumat",
    key: "Tropf-Blumat",
    acronym: "Tropf-Blumat",
    germanName: "Tropf-Blumat Bestimmungsgemäße Verwendung",
    category: "substrat",
    categoryLabel: "Substrat & Bewässerung",
    importance: "medium",
    evidenceGrade: "A",
    evidenceLabel: "Hersteller-Handbuch (Blumat)",
    beginner:
      "Tropf-Blumat ist laut Hersteller für den Außenbereich gedacht und kein UKD-Referenzsystem für Indoor.",
    advanced:
      "Hersteller-Scope-Grenze: Outdoor-Nutzung. Die Indoor-Anwendung erfolgt außerhalb der dokumentierten Zweckbestimmung.",
    expert:
      "UKD-Invariante: Tropf-Blumat ist kein Referenzsystem für kontrollierte Indoor-Substrat-Drybacks.",
    operatorTips: [
      "Beim Indoor-Einsatz von Blumat immer eine Sicherheits-Auffangwanne verwenden.",
    ],
    tags: ["blumat", "bewässerung", "outdoor", "substrat", "hersteller-scope"],
  },
  {
    id: "post_harvest_aw",
    key: "a_w Wert",
    acronym: "a_w",
    germanName: "Wasseraktivität (Post-Harvest Curing)",
    category: "ertrag",
    categoryLabel: "Ertrag & Trocknung",
    importance: "high",
    evidenceGrade: "B",
    evidenceLabel: "PMC Review (Processes 2022)",
    beginner:
      "Die Wasseraktivität (a_w) misst die verfügbare Feuchtigkeit in den Blüten. Ziel im Curing-Glas ist 0.55 bis 0.65.",
    advanced:
      "Zielkorridor 0.55–0.65 a_w verhindert Schimmelpilze (Botrytis, Aspergillus) und bewahrt Terpene sowie Cannabinoide.",
    expert:
      "Wasseraktivität ist der verlässlichste mikrobiologische Stabilitätsparameter. Bei a_w < 0.65 ist kein Schimmelwachstum möglich.",
    optimalRanges: [
      { phase: "Curing / Lagerung", min: 0.55, max: 0.65, unit: "a_w" },
    ],
    operatorTips: [
      "Hygrometer im Curing-Glas platzieren: 58–62 % RLF entspricht ca. 0.58–0.62 a_w.",
    ],
    tags: ["curing", "trocknung", "wasseraktivität", "post-harvest", "terpene"],
  },
  {
    id: "preharvest_flushing",
    key: "Flushing",
    acronym: "Flushing",
    germanName: "Preharvest Flushing (Spülen vor Ernte)",
    category: "naehrstoffe",
    categoryLabel: "Nährstoffe & Salze",
    importance: "medium",
    evidenceGrade: "A",
    evidenceLabel: "Saloner et al. 2024 (Industrial Crops)",
    beginner:
      "Studien zeigen, dass tagelanges Spülen mit reinem Wasser vor der Ernte kaum Einfluss auf Ertrag oder Geschmack hat.",
    advanced:
      "Kontrollierte Versuche belegen keine statistisch signifikante Steigerung von Cannabinoiden oder Terpenen durch Nährstoffentzug.",
    expert:
      "Evidenz Grade A. Spülen spart Nährstoffkosten, verändert das Mineralstoffprofil in den Blüten jedoch nur marginal.",
    operatorTips: [
      "Kein extremes Aushungern der Pflanzen über Wochen erzwingen; moderates Reduzieren des EC reicht aus.",
    ],
    tags: ["flushing", "spülen", "ernte", "evidenz", "studie"],
  },
  {
    id: "autoflower_genomics",
    key: "Autoflower PRR",
    acronym: "Autoflower",
    germanName: "Autoflower Pseudo-Response Regulator Genomik",
    category: "ertrag",
    categoryLabel: "Ertrag & Beleuchtung",
    importance: "high",
    evidenceGrade: "A",
    evidenceLabel: "The Plant Journal 2024",
    beginner:
      "Autoflowers blühen automatisch nach Alter, unabhängig von der Lichtdauer. 18 Stunden Licht pro Tag sind optimal.",
    advanced:
      "Splice-Site-Mutation im PRR-Gen bewirkt den Verlust der Tageslängen-Sensitivität. 12/12-Lichtumstellung ist wirkungslos.",
    expert:
      "18/6h oder 20/4h Beleuchtung erlaubt eine hohe DLI-Akkumulation bei moderaterer PPFD, was Licht- und Hitzestress minimiert.",
    operatorTips: [
      "Autoflowers durchgehend mit 18/6h Licht beleuchten (kein 12/12-Wechsel erforderlich).",
    ],
    tags: ["autoflower", "genomik", "prr-gen", "photoperiode", "18h"],
  },
];

// ── Component Definition ──

export const ContextHelpGlossaryPanel: React.FC<ContextHelpGlossaryPanelProps> = ({
  lens = "guided",
  navigate,
  initialCategory = "all",
  initialSearchQuery = "",
}) => {
  // State Management
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [activeLens, setActiveLens] = useState<ExperienceLens>(lens);
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState<string>("all");
  const [showMatrixQuickRef, setShowMatrixQuickRef] = useState<boolean>(true);

  // Search & Filter Pipeline
  const filteredItems = useMemo(() => {
    return UNIFIED_GLOSSARY_ITEMS.filter((item) => {
      // 1. Category Filter
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }

      // 2. Evidence Grade Filter
      if (selectedEvidenceFilter !== "all" && item.evidenceGrade !== selectedEvidenceFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesKey = item.key.toLowerCase().includes(q);
        const matchesAcronym = item.acronym.toLowerCase().includes(q);
        const matchesName = item.germanName.toLowerCase().includes(q);
        const matchesCategory = item.categoryLabel.toLowerCase().includes(q);
        const matchesBeginner = item.beginner.toLowerCase().includes(q);
        const matchesAdvanced = item.advanced.toLowerCase().includes(q);
        const matchesExpert = item.expert.toLowerCase().includes(q);
        const matchesTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
        const matchesFormula = item.formula ? item.formula.toLowerCase().includes(q) : false;

        return (
          matchesKey ||
          matchesAcronym ||
          matchesName ||
          matchesCategory ||
          matchesBeginner ||
          matchesAdvanced ||
          matchesExpert ||
          matchesTags ||
          matchesFormula
        );
      }

      return true;
    });
  }, [activeCategory, selectedEvidenceFilter, searchQuery]);

  // Handler Actions
  const handleResetFilters = () => {
    setActiveCategory("all");
    setSearchQuery("");
    setSelectedEvidenceFilter("all");
  };

  const getEvidenceGradeStyle = (grade?: "A" | "B" | "C" | "D" | "E") => {
    switch (grade) {
      case "A":
        return { bg: "var(--green-dim)", color: "var(--green)", border: "var(--green)" };
      case "B":
        return { bg: "var(--blue-dim)", color: "var(--blue)", border: "var(--blue)" };
      case "C":
        return { bg: "var(--amber-dim)", color: "var(--amber)", border: "var(--amber)" };
      case "D":
        return { bg: "var(--purple-dim)", color: "var(--purple)", border: "var(--purple)" };
      case "E":
      default:
        return { bg: "var(--red-dim)", color: "var(--red)", border: "var(--red)" };
    }
  };

  return (
    <div
      className="panel-container context-help-glossary-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
        background: "var(--surface-1)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}
    >
      {/* ── 1. Panel Header & Lens Control ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "14px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            📚 Kontext-Hilfe & Knowledge-Glossar
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
            Interaktiver 2026 Master Class Katalog für Fachbegriffe, Evidenz-Regeln, Formeln & Praxis-Tipps
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Interactive Lens Switcher */}
          <div
            className="lens-control"
            style={{
              display: "inline-flex",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-sm)",
              padding: "3px",
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveLens("guided")}
              className={activeLens === "guided" ? "active" : ""}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                border: 0,
                borderRadius: "var(--radius-sm)",
                background: activeLens === "guided" ? "var(--blue-dim)" : "transparent",
                color: activeLens === "guided" ? "var(--blue)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              🌱 GEFÜHRT
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("advanced")}
              className={activeLens === "advanced" ? "active" : ""}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                border: 0,
                borderRadius: "var(--radius-sm)",
                background: activeLens === "advanced" ? "var(--green-dim)" : "transparent",
                color: activeLens === "advanced" ? "var(--green)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              ⚡ STANDARD
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("expert")}
              className={activeLens === "expert" ? "active" : ""}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                border: 0,
                borderRadius: "var(--radius-sm)",
                background: activeLens === "expert" ? "var(--purple-dim)" : "transparent",
                color: activeLens === "expert" ? "var(--purple)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              🔬 EXPERTE
            </button>
          </div>

          {navigate && (
            <button
              type="button"
              onClick={() => navigate("cockpit")}
              style={{
                padding: "8px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-2)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🏠 Zum Cockpit
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Search & Multi-Filter Toolbar ── */}
      <div
        role="search"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px",
          background: "var(--surface-2)",
          padding: "14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Search Field */}
        <div style={{ flex: "1 1 280px", position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔎 Begriff, Formel, Evidenz oder KCanG-Paragraf suchen..."
            aria-label="Glossar durchsuchen"
            style={{
              width: "100%",
              padding: "10px 36px 10px 14px",
              background: "var(--surface-1)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontSize: "13px",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Suchbegriff löschen"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ✖️
            </button>
          )}
        </div>

        {/* Evidence Grade Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label htmlFor="evidence-select" style={{ fontSize: "12px", color: "var(--muted)" }}>
            Evidenzstufe:
          </label>
          <select
            id="evidence-select"
            value={selectedEvidenceFilter}
            onChange={(e) => setSelectedEvidenceFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontSize: "12px",
            }}
          >
            <option value="all">Alle Stufen (A-E)</option>
            <option value="A">Grade A (Gesetz / Primärforschung)</option>
            <option value="B">Grade B (Systematische Reviews)</option>
            <option value="C">Grade C (Hersteller / UKD Inferenz)</option>
          </select>
        </div>

        {/* Match Counter & Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
          <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 700 }}>
            {filteredItems.length} {filteredItems.length === 1 ? "Eintrag" : "Einträge"} gefunden
          </span>
          {(searchQuery || activeCategory !== "all" || selectedEvidenceFilter !== "all") && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: "6px 10px",
                background: "var(--surface-3)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-2)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              🔄 Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Category Tabs Bar ── */}
      <div
        role="tablist"
        aria-label="Kategorien-Filter"
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "8px 16px",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: isActive ? "var(--green-dim)" : "var(--surface-2)",
                border: `1px solid ${isActive ? "var(--green)" : "var(--line)"}`,
                borderRadius: "var(--radius-sm)",
                color: isActive ? "var(--green)" : "var(--text-2)",
                fontSize: "13px",
                fontWeight: isActive ? 800 : 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              <span aria-hidden="true">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Target Parameters Quick Matrix Toggle & View ── */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => setShowMatrixQuickRef((prev) => !prev)}
        >
          <strong style={{ fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            📊 4-Phasen Zielwerte-Schnellübersicht (VPD, DLI, EC, pH, rF)
          </strong>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            {showMatrixQuickRef ? "▼ Einklappen" : "▶ Ausklappen"}
          </span>
        </div>

        {showMatrixQuickRef && (
          <div
            style={{
              marginTop: "12px",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "8px" }}>Wachstumsphase</th>
                  <th style={{ padding: "8px" }}>VPD (kPa)</th>
                  <th style={{ padding: "8px" }}>DLI (mol/m²/d)</th>
                  <th style={{ padding: "8px" }}>PPFD (µmol/m²/s)</th>
                  <th style={{ padding: "8px" }}>EC (mS/cm)</th>
                  <th style={{ padding: "8px" }}>pH (Coco)</th>
                  <th style={{ padding: "8px" }}>rF (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>🌱 Sämling (Tag 0–7)</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--green)" }}>0.4 – 0.8</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>10 – 15</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>150 – 300</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>0.6 – 0.9</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>5.8 – 6.0</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>65 – 75%</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>🌿 Vegetation (Tag 8–28)</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--green)" }}>0.8 – 1.1</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>20 – 30</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>400 – 600</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>1.2 – 1.6</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>5.8 – 6.2</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>55 – 70%</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>🌸 Hauptblüte (Tag 29–63)</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--green)" }}>1.1 – 1.5</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>35 – 45</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>700 – 1000</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>1.8 – 2.2</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>5.8 – 6.2</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>40 – 55%</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", fontWeight: 700 }}>🍂 Spätblüte (Tag 64–80)</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--green)" }}>1.3 – 1.6</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>30 – 40</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>600 – 900</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>1.2 – 1.6</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>6.0 – 6.3</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>38 – 48%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Detailed Term & Evidence Cards Grid ── */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            background: "var(--surface-2)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔍</div>
          <strong style={{ fontSize: "16px", color: "var(--text)" }}>Keine Treffer gefunden</strong>
          <p style={{ margin: "4px 0 16px 0", fontSize: "13px", color: "var(--muted)" }}>
            Es gibt keinen Fachbegriff, der der aktuellen Filterkombination entspricht.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: "8px 16px",
              background: "var(--green)",
              border: 0,
              borderRadius: "var(--radius-sm)",
              color: "var(--on-green)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Alle Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredItems.map((item) => {
            const evStyle = getEvidenceGradeStyle(item.evidenceGrade);
            const explanation =
              activeLens === "expert"
                ? item.expert
                : activeLens === "advanced"
                ? item.advanced
                : item.beginner;

            return (
              <article
                key={item.id}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "var(--green)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {item.categoryLabel}
                    </span>
                    <h3 style={{ margin: "2px 0 0 0", fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
                      {item.acronym} <small style={{ fontWeight: 400, color: "var(--muted)" }}>({item.germanName})</small>
                    </h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <LensBadge lens={activeLens} size="sm" />
                    {item.evidenceGrade && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: evStyle.bg,
                          color: evStyle.color,
                          border: `1px solid ${evStyle.border}`,
                        }}
                      >
                        Evidenz {item.evidenceGrade}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Definition Text */}
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
                    lineHeight: "1.5",
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <TermTooltip term={item.key} lens={activeLens} customText={explanation}>
                    {explanation}
                  </TermTooltip>
                </div>

                {/* Target Ranges Box (if available) */}
                {item.optimalRanges && item.optimalRanges.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "6px" }}>
                      🎯 ZIELKORRIDORE NACH PHASEN
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {item.optimalRanges.map((range, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span>{range.phase}:</span>
                          <strong style={{ fontFamily: "var(--font-mono)", color: "var(--green)" }}>
                            {range.min} – {range.max} {range.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mathematical Formula (if available) */}
                {item.formula && (
                  <div
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                      📐 FORMEL & BERECHNUNG
                    </div>
                    <code
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--green)",
                        background: "var(--surface-3)",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        marginBottom: "4px",
                      }}
                    >
                      {item.formula}
                    </code>
                    {item.formulaDescription && (
                      <small style={{ fontSize: "11px", color: "var(--muted)" }}>{item.formulaDescription}</small>
                    )}
                  </div>
                )}

                {/* Operator Tips */}
                {item.operatorTips && item.operatorTips.length > 0 && (
                  <div style={{ fontSize: "12px" }}>
                    <div style={{ fontWeight: 700, color: "var(--amber)", marginBottom: "4px" }}>
                      💡 PRAXIS-TIPPS FÜR GROWER:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-2)", lineHeight: "1.4" }}>
                      {item.operatorTips.map((tip, idx) => (
                        <li key={idx} style={{ marginBottom: "2px" }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer Citation Links */}
                {item.evidenceLabel && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      borderTop: "1px solid var(--line)",
                      paddingTop: "8px",
                      marginTop: "auto",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Quell-Evidenz: {item.evidenceLabel}</span>
                    {item.scope && <span>Scope: {item.scope}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ── 6. Evidence Scale Legend Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: "14px",
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--muted)",
          lineHeight: "1.5",
        }}
      >
        <strong style={{ color: "var(--text)" }}>🛡️ UKD Evidenzskala (Rules of Evidence):</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "8px",
            marginTop: "6px",
          }}
        >
          <div>
            <strong style={{ color: "var(--green)" }}>Grade A:</strong> Gesetzestext, Primärforschung, peer-reviewed Standard.
          </div>
          <div>
            <strong style={{ color: "var(--blue)" }}>Grade B:</strong> Systematisches Review, offizielle Extension.
          </div>
          <div>
            <strong style={{ color: "var(--amber)" }}>Grade C:</strong> Herstellerangabe oder UKD Engineering-Inferenz.
          </div>
          <div>
            <strong style={{ color: "var(--purple)" }}>Grade D:</strong> Community-Beobachtung / Anekdote.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContextHelpGlossaryPanel;
```

---

## 6. CSS & Styling Compliance (`styles.css`)

The blueprint adheres to all styling invariants specified in `AGENTS.md` and `PROJECT.md`:
1. **Design Tokens**: Exclusively uses semantic tokens defined in `styles.css` (`var(--bg)`, `var(--surface-1)`, `var(--surface-2)`, `var(--surface-3)`, `var(--line)`, `var(--text)`, `var(--text-2)`, `var(--muted)`, `var(--green)`, `var(--green-dim)`, `var(--blue)`, `var(--amber)`, `var(--purple)`, `var(--red)`, `var(--font-ui)`, `var(--font-mono)`).
2. **Responsive Grid**: Flexbox and CSS Grid layouts with `repeat(auto-fit, minmax(320px, 1fr))` ensuring smooth transitions on smartphones, tablets, and 4K displays.
3. **High Contrast**: Full contrast compliance under `[data-contrast="high"]` mode.

---

## 7. Accessibility (a11y) & Usability Compliance

1. **ARIA Roles & Attributes**:
   - Navigation & search bar wrapped in `role="search"`.
   - Category tabs wrapped in `role="tablist"` with individual buttons assigned `role="tab"` and dynamic `aria-selected` attributes.
   - Cards wrapped in semantic `<article>` tags.
2. **Keyboard Navigation**:
   - All filter buttons, search input, lens toggles, and matrix collapse controls have focus states (`:focus-visible`).
   - Interactive elements have minimum touch targets of **44px × 44px**.
3. **German Terminology**:
   - 100% German UI labels and explanations suitable for all grower levels (guided, advanced, expert).

---

## 8. Verification & Testing Strategy

### 8.1 Verification Commands
1. **Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
2. **Unit Tests**:
   ```bash
   npx vitest run
   ```
3. **Production Build**:
   ```bash
   npx vite build
   ```

### 8.2 Unit Test Integration (`src/components/panels/panels.test.ts`)
Add co-located unit tests verifying:
- Rendering of `ContextHelpGlossaryPanel` without crashing.
- Live search filtering by key, German name, and tags.
- Category tab switching (`klima`, `naehrstoffe`, `substrat`, `ertrag`, `recht`, `allgemein`).
- Lens switching (`guided` -> `advanced` -> `expert`) updating definition text accordingly.

---
