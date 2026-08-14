# Analysis & Implementation Blueprint: `DailyOperatorPanel.tsx`

**Component**: `src/components/panels/DailyOperatorPanel.tsx`  
**Milestone**: M3 — Daily Operator Panel  
**Author**: Explorer Agent  
**Date**: 2026-08-11  

---

## Executive Summary

The `DailyOperatorPanel` component serves as the central operational hub for daily cultivation workflows in the UKD Masterplan 2026 application. It enables growers across all experience levels (`guided`, `advanced`, `expert`) to navigate through all 81 growth cycle days (Day 0–80), review phase-specific environmental and nutrient target corridors, record daily physical measurements and structured plant observations, execute daily tasks with audit tracking, and inspect daily nutrient dosage recipes—all while strictly preserving domain state immutability.

---

## Interface Contract Compliance

As defined in `PROJECT.md`, the component adheres to the standard `PanelProps` interface:

```typescript
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";

export interface DailyOperatorPanelProps {
  run: RunPackage;
  plan?: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
}
```

---

## Core Capabilities & Features

### 1. Interactive Tageskarten Navigation (Days 0–80)
- **Phase Group Quick-Tabs**: 
  - Keimung / Sämling (Tag 0–7)
  - Vegetation (Tag 8–28)
  - Hauptblüte (Tag 29–63)
  - Spätblüte & Abreife (Tag 64–80)
- **Day Navigation Bar**:
  - `[ ◄ Vorheriger Tag ]` button
  - `[ Heute (Tag X) ]` jump-to-active-day button
  - `[ Nächster Tag ► ]` button
  - Direct range slider (`0` to `80`)
- **Tageskarten Visual Carousel / Strip**:
  - Horizontal scrollable card strip displaying days around the currently selected day (`selectedDay ± 3`).
  - Displays day number, growth phase badge, photoperiod schedule (`18/6` vs `12/12`), measurement status icon (`✓ Gemessen`), and daily task completion counter (e.g. `3/5 Tasks`).
  - Highlights active selected day card with `border: 2px solid var(--green)`.

---

### 2. 3-Step Daily Action Workflow

The panel organizes daily operations into 3 sequential, interactive steps:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 1: Tages-Check & Sollwerte                                             │
│ ➔ Target corridors (PPFD, DLI, VPD, Temp, RH, EC, pH, Water) + Gauges      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Step 2: Messwerte & Beobachtungen erfassen                                  │
│ ➔ Form for temp, RH, PPFD, leaf temp, EC/pH in & drain, water/drain volume  │
│ ➔ Auto-calculated Leaf VPD delta & Drain %                                  │
│ ➔ Structured observation logging (category, severity, tags, notes)          │
│ ➔ Save button -> invokes addObservation & addStructuredObservation         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Step 3: Maßnahmen & Bestätigung                                             │
│ ➔ Interactive daily task checklist (toggle completed, transition states)     │
│ ➔ Daily nutrient dosage quick-view (Athena Balance, Hesi, Boost, PK13/14)  │
│ ➔ Fail-closed safety rule checks & alert acknowledgments                    │
│ ➔ Daily completion summary & audit record gate                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### **Step 1: Tages-Check & Sollwerte**
- Displays active phase, target photoperiod (hours), fixture power (W), and height (cm).
- Renders `MetricGauge` components for:
  - **PPFD** (µmol/m²/s)
  - **DLI** (mol/m²/d)
  - **Leaf VPD** (kPa)
  - **Air Temperature** (°C)
  - **Relative Humidity** (%)
  - **Nutrient EC** (mS/cm)
  - **Nutrient pH** (pH)
- Integrates `TermTooltip` for scientific terms: `VPD`, `DLI`, `PPFD`, `EC`, `pH`.
- Renders phase guidance cards:
  - Training instructions (e.g., LST, Topping, Defoliation)
  - Quality assurance guardrails & stop rules
  - Scientific context & evidence classification

#### **Step 2: Messwerte & Beobachtung erfassen**
- Pre-fills form fields if an observation for `selectedDay` already exists in `run.observations`.
- Input fields with real-time feedback:
  - Air Temp Max & Min (°C)
  - Humidity Max & Min (%)
  - Leaf Temp (°C) — previews Leaf Delta & calculated Leaf VPD
  - Light PPFD (µmol/m²/s) — previews calculated DLI
  - Water pH (in) & Water EC (mS/cm in)
  - Drain pH & Drain EC (mS/cm drain)
  - Applied Water (L) & Drain Volume (L) — auto-calculates Drain %
  - Pot Mass (g), Plant Height (cm), Stress Score (0–10)
  - Freeform notes field
- Structured Observation sub-form:
  - Category: `foliage`, `root-zone`, `structure`, `pest`, `environment`, `general`
  - Severity: `info`, `mild`, `moderate`, `severe`
  - Observation text & hashtag tags (e.g. `#gelbe_blaetter #untere_zonen`)
- Primary action `[ 💾 Messung & Beobachtung speichern ]`:
  - Calls `addObservation(run, obs)` and `addStructuredObservation(run, structuredObs)`.
  - Dispatches `onUpdateRun(updatedRun)` immutably.

#### **Step 3: Maßnahmen & Bestätigung**
- **Daily Checklist**:
  - Computes daily tasks derived from plan and `run.tasks`.
  - Toggling completion checkbox invokes `setTaskCompleted(run, selectedDay, title, completed)`.
  - State transition selector allows setting task state to `blocked` or `skipped` with mandatory reason via `transitionTaskState(run, taskId, nextState, reason)`.
- **Nutrient Dosage Quick-View**:
  - Calculates scaled dosages for `selectedDay` via `calculateMix(plan, batchLiters)`.
  - Displays product list, mix order, and dosage warnings.
  - Quick-navigation button `[ 🧪 Zum Nährstoff-Mixer ]` to jump to `mix` route if `navigate` is provided.
- **Alerts & Readiness Summary**:
  - Computes `deriveRunAlerts(run, currentPlan)`.
  - Displays persistent warning cards for missing/stale measurements or pH/EC deviations with `acknowledgeAlert` support.
- **Final Completion Card**:
  - Displays summary of daily activities (e.g. `Messung erfasst: Ja | Tasks: 4/5`).
  - Button to mark day as complete.

---

### 3. Experience Lens Adaptations (`guided`, `advanced`, `expert`)

- `guided` (🌱 GEFÜHRT):
  - Simplifies terminology with explicit tooltips.
  - Highlights step-by-step instructions and practical grower advice.
  - Hides complex formula details.
- `advanced` (⚡ STANDARD):
  - Shows detailed target corridors, leaf VPD delta calculations, and drain percentage targets.
  - Enables full task state management and structured observation tagging.
- `expert` (🔬 EXPERTE):
  - Displays raw target formulas, precise scientific bounds, evidence levels (Evidence A/B/C), audit trail event IDs, and domain event payload previews.

---

## Pure State Functions & Immutability Matrix

| Action | Function in `src/run-state.ts` | Target Field in `RunPackage` |
|---|---|---|
| Record Daily Measurement | `addObservation(run, obs)` | `observations`, `measurements`, `events`, `auditEvents`, `domainEvents` |
| Record Observation | `addStructuredObservation(run, structuredObs)` | `structuredObservations`, `events`, `auditEvents`, `domainEvents` |
| Toggle Task Done/Undone | `setTaskCompleted(run, day, task, completed)` | `completedTasks`, `tasks`, `auditEvents`, `domainEvents` |
| Change Task State | `transitionTaskState(run, taskId, nextState, reason)` | `tasks`, `auditEvents`, `domainEvents` |
| Acknowledge Alert | `acknowledgeAlert(run, alertId)` | `acknowledgedAlertIds` |

---

## Detailed Implementation Code Blueprint

Below is the complete design code structure for `src/components/panels/DailyOperatorPanel.tsx`:

```tsx
import React, { useState, useEffect, useMemo } from "react";
import type {
  DayPlan,
  DailyObservation,
  ExperienceLens,
  RouteId,
  RunPackage,
  RunTask,
  StructuredObservation,
} from "../../types";
import {
  DAILY_COLUMNS,
  calculateDli,
  calculateLeafVpd,
  calculateMix,
  numberAt,
  textAt,
} from "../../domain";
import {
  acknowledgeAlert,
  addObservation,
  addStructuredObservation,
  createObservation,
  deriveRunAlerts,
  latestObservation,
  setTaskCompleted,
  transitionTaskState,
} from "../../run-state";
import LensBadge from "../common/LensBadge";
import MetricGauge from "../common/MetricGauge";
import TermTooltip from "../common/TermTooltip";

export interface DailyOperatorPanelProps {
  run: RunPackage;
  plan?: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
}

// ── Phase Target Resolver Helper ──
export interface CalculatedDayTargets {
  phaseName: string;
  phaseShort: string;
  goal: string;
  lightHours: number;
  ledWatts: number;
  distanceCm: number;
  ppfdMin: number;
  ppfdMax: number;
  dliMin: number;
  dliMax: number;
  tempMin: number;
  tempMax: number;
  rhMin: number;
  rhMax: number;
  vpdMin: number;
  vpdMax: number;
  ecTarget: number;
  phTarget: number;
  waterMinL: number;
  waterMaxL: number;
  trainingNotes: string;
  qaNotes: string;
  stopRules: string;
}

export function getTargetsForDay(day: number, plan?: DayPlan): CalculatedDayTargets {
  if (plan && plan.day === day) {
    const lightHours = numberAt(plan, DAILY_COLUMNS.lightHours) || 18;
    const ppfd = numberAt(plan, DAILY_COLUMNS.ppfd) || 500;
    const dli = numberAt(plan, DAILY_COLUMNS.dli) || calculateDli(ppfd, lightHours);
    const ec = numberAt(plan, DAILY_COLUMNS.ec) || 1.4;
    const ph = numberAt(plan, DAILY_COLUMNS.ph) || 6.0;
    const tempLight = numberAt(plan, DAILY_COLUMNS.tempLight) || 24;
    const rh = numberAt(plan, DAILY_COLUMNS.humidity) || 60;
    const leafVpd = numberAt(plan, DAILY_COLUMNS.leafVpd) || 0.95;

    return {
      phaseName: textAt(plan, DAILY_COLUMNS.phase) || "Vegetation",
      phaseShort: day <= 7 ? "Keimung" : day <= 28 ? "Veg" : day <= 63 ? "Hauptblüte" : "Spätblüte",
      goal: textAt(plan, DAILY_COLUMNS.goal) || "Tagesentwicklung fördern",
      lightHours,
      ledWatts: numberAt(plan, DAILY_COLUMNS.watts) || 140,
      distanceCm: numberAt(plan, DAILY_COLUMNS.distance) || 40,
      ppfdMin: Math.max(100, Math.round(ppfd * 0.85)),
      ppfdMax: Math.round(ppfd * 1.15),
      dliMin: Math.max(5, Math.round((dli * 0.85) * 10) / 10),
      dliMax: Math.round((dli * 1.15) * 10) / 10,
      tempMin: Math.max(18, tempLight - 2),
      tempMax: tempLight + 2,
      rhMin: Math.max(35, rh - 5),
      rhMax: Math.min(80, rh + 5),
      vpdMin: Math.max(0.4, Math.round((leafVpd - 0.2) * 100) / 100),
      vpdMax: Math.round((leafVpd + 0.2) * 100) / 100,
      ecTarget: ec,
      phTarget: ph,
      waterMinL: numberAt(plan, DAILY_COLUMNS.waterMin) || 0.5,
      waterMaxL: numberAt(plan, DAILY_COLUMNS.waterMax) || 1.0,
      trainingNotes: textAt(plan, DAILY_COLUMNS.training) || "Canopy prüfen",
      qaNotes: textAt(plan, DAILY_COLUMNS.qa) || "Messwerte verifizieren",
      stopRules: textAt(plan, DAILY_COLUMNS.stop) || "Keine Überdüngung",
    };
  }

  // Fallback target matrix based on day ranges
  if (day <= 7) {
    return {
      phaseName: "Keimung & Sämling (Tag 0–7)",
      phaseShort: "Keimung",
      goal: "Wurzelbildung & frühe Sämlingsentwicklung",
      lightHours: 18,
      ledWatts: 40,
      distanceCm: 50,
      ppfdMin: 150,
      ppfdMax: 300,
      dliMin: 10,
      dliMax: 15,
      tempMin: 22,
      tempMax: 26,
      rhMin: 65,
      rhMax: 75,
      vpdMin: 0.4,
      vpdMax: 0.8,
      ecTarget: 0.8,
      phTarget: 5.8,
      waterMinL: 0.2,
      waterMaxL: 0.4,
      trainingNotes: "Kein mechanisches Training. Hohe Luftfeuchtigkeit wahren.",
      qaNotes: "Substrat feucht halten, Stauwasser vermeiden.",
      stopRules: "Keine Starkdüngung vor dem ersten echten Blattpaar.",
    };
  } else if (day <= 28) {
    return {
      phaseName: "Vegetation (Tag 8–28)",
      phaseShort: "Veg",
      goal: "Kräftiges vegetatives Wuchstum & Triebverzweigung",
      lightHours: 18,
      ledWatts: 140,
      distanceCm: 40,
      ppfdMin: 400,
      ppfdMax: 600,
      dliMin: 20,
      dliMax: 30,
      tempMin: 23,
      tempMax: 27,
      rhMin: 55,
      rhMax: 70,
      vpdMin: 0.8,
      vpdMax: 1.1,
      ecTarget: 1.4,
      phTarget: 6.0,
      waterMinL: 0.5,
      waterMaxL: 1.0,
      trainingNotes: "LST & Topping ab 4. Nodie. Canopy flach halten.",
      qaNotes: "Tägliche Zunahme der Blattfläche beobachten.",
      stopRules: "Bei Verbrennungen EC um 20% reduzieren.",
    };
  } else if (day <= 63) {
    return {
      phaseName: "Hauptblüte (Tag 29–63)",
      phaseShort: "Hauptblüte",
      goal: "Generative Entwicklung & maximale Blütenbiomasse",
      lightHours: 12,
      ledWatts: 140,
      distanceCm: 35,
      ppfdMin: 700,
      ppfdMax: 1000,
      dliMin: 35,
      dliMax: 45,
      tempMin: 21,
      tempMax: 25,
      rhMin: 40,
      rhMax: 55,
      vpdMin: 1.1,
      vpdMax: 1.5,
      ecTarget: 1.8,
      phTarget: 6.2,
      waterMinL: 1.0,
      waterMaxL: 2.0,
      trainingNotes: "Canopy ausrichten, schattige Untertriebe entlauben.",
      qaNotes: "Luftzirkulation im Zelt maximieren, Schimmelkontrolle.",
      stopRules: "Luftfeuchtigkeit > 60% in dichter Blüte strikt vermeiden.",
    };
  } else {
    return {
      phaseName: "Spätblüte & Abreife (Tag 64–80)",
      phaseShort: "Spätblüte",
      goal: "Abreife, Trichom-Aushärtung & Spülen",
      lightHours: 12,
      ledWatts: 100,
      distanceCm: 45,
      ppfdMin: 500,
      ppfdMax: 800,
      dliMin: 25,
      dliMax: 35,
      tempMin: 19,
      tempMax: 23,
      rhMin: 38,
      rhMax: 48,
      vpdMin: 1.2,
      vpdMax: 1.6,
      ecTarget: 0.4,
      phTarget: 6.2,
      waterMinL: 0.8,
      waterMaxL: 1.5,
      trainingNotes: "Kein Schneiden mehr. Schwere Blütenstände stützen.",
      qaNotes: "Trichomfärbung mit Mikroskop/Lupe (Milchig / Bernstein) prüfen.",
      stopRules: "Kein Nährstoffdünger mehr in den letzten 7–10 Tagen.",
    };
  }
}
```

---

## Verification & Quality Strategy

To ensure strict compliance with project guidelines, the following checklist will be executed upon file implementation:

1. **Type Safety**:
   - `npx tsc --noEmit` runs with 0 errors.
2. **Unit Test Gate**:
   - `npx vitest run` passes all 29/29 tests.
3. **Build Gate**:
   - `npx vite build` finishes cleanly.
4. **CSS Token & Layout Compliance**:
   - Uses only CSS variables defined in `styles.css`.
   - Accessible ARIA labels and focus handling for interactive Tageskarten controls.

---

Write this blueprint to `.agents/explorer_m3_1/analysis.md`.
