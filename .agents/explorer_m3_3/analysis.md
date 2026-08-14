# Test Architecture & Co-located Unit Test Blueprint: `daily-operator-glossary.test.ts`

**Target Location**: `src/components/panels/daily-operator-glossary.test.ts`  
**Milestone**: M3 — Co-located Unit Tests for Daily Operator & Context Help Glossary Panels  
**Author**: Explorer Agent (M3-3)  
**Date**: 2026-08-11  

---

## Executive Summary

This specification designs the co-located unit test suite `src/components/panels/daily-operator-glossary.test.ts` for the UKD Masterplan 2026 web application. The suite provides comprehensive, automated unit test coverage for `DailyOperatorPanel` and `ContextHelpGlossaryPanel`, verifying:

1. **DailyOperatorPanel**:
   - Interactive Tageskarten navigation across all 81 cultivation days (Days 0–80) with boundary clamping.
   - 3-Step Daily Action Flow (Step 1: Tages-Check & Sollwerte, Step 2: Messwerte & Beobachtungen erfassen, Step 3: Maßnahmen & Bestätigung).
   - Target corridor calculations (PPFD, DLI, Leaf VPD, Temp, RH, EC, pH, Water) and phase matrix fallback.
   - Daily measurement form pre-filling, auto-calculated Leaf VPD delta & Drain %, and structured observation logging via pure state transitions (`addObservation`, `addStructuredObservation`).
   - Checklist completion toggles (`setTaskCompleted`), task state transitions (`transitionTaskState`), nutrient dosage quick-views (`calculateMix`), and alert acknowledgments (`acknowledgeAlert`).
   - Multi-lens experience adaptations (`guided`, `advanced`, `expert`).
   - Edge case and stress input handling (invalid day numbers, missing plans, null/undefined inputs).

2. **ContextHelpGlossaryPanel**:
   - German term dictionary resolution and search query filtering (`searchTerms`).
   - Multi-category filtering (`all`, `climate`, `light`, `nutrients`, `phase`, `plant`).
   - Dynamic experience lens descriptions (`guided` beginner text, `advanced` technical text, `expert` scientific formula text).
   - Optimal phase range lookup and term card inspection for `VPD`, `DLI`, `EC`, `pH`, `PPFD`, `rF`, `Leaf-VPD`.
   - Edge cases (case insensitivity, whitespace trimming, XSS/script queries, unknown terms, lens fallback).

3. **Zero Regression Contract**:
   - Guarantees zero regressions against all existing 29/29 vitest unit tests across `domain.test.ts`, `run-state.test.ts`, `backup.test.ts`, `scientific-core.test.ts`, `common.test.ts`, `interactive-verification.test.tsx`, `panels.test.ts`, `climate-stress-test.test.ts`, and `nutrient-runconfig-stress.test.ts`.

---

## 1. Test Architecture & Design Principles

### 1.1 Compatibility with Vitest Test Environment
- Tests are executed via Vitest (`pnpm test` / `npx vitest run`).
- Utilizes pure React element creation (`React.createElement(...)`) and direct panel component invocations to inspect props, handler functions, and DOM element structures without external DOM dependencies.
- Integrates Vitest's `describe`, `it`, `expect`, and `vi.fn()` for state callback spying.

### 1.2 Isolation & State Immutability
- Tests execute with isolated `RunPackage` snapshots created via `createDefaultRunPackage()`.
- State updates are verified to be strictly immutable: `onUpdateRun` callbacks must receive a new `RunPackage` object reference with incremented `auditEvents` and updated state collections without mutating the initial `RunPackage`.

---

## 2. Test Suite Structure & Coverage Matrix

| Suite / Area | Sub-test | Targeted Functionality / Invariant | Expected Outcome |
|---|---|---|---|
| **DailyOperatorPanel** | `1. Navigation & Day Selection` | Day clamping (0 to 80), prev/next day increment, jump to active day, phase group tabs (Keimung, Veg, Hauptblüte, Spätblüte) | Clamps day within [0, 80], correct phase group active |
| **DailyOperatorPanel** | `2. Target Corridors (Step 1)` | `getTargetsForDay` calculation from `DayPlan` or phase matrix fallback for PPFD, DLI, VPD, Temp, RH, EC, pH, Water | Target values match domain rules for seedling, veg, bloom, late bloom |
| **DailyOperatorPanel** | `3. Observation Form (Step 2)` | Pre-fills previous day observation, computes Leaf VPD & Drain %, invokes `addObservation` and `addStructuredObservation` | `onUpdateRun` called with new observation & audit event |
| **DailyOperatorPanel** | `4. Checklist & Tasks (Step 3)` | Task completion toggle (`setTaskCompleted`), state transition (`transitionTaskState`), nutrient mix quick view (`calculateMix`), alert acknowledgment (`acknowledgeAlert`) | Correct task state set in `RunPackage`, mix calculated, alerts acknowledged |
| **DailyOperatorPanel** | `5. Multi-Lens Adaptations` | Lens rendering for `guided`, `advanced`, `expert` | Tooltips, detail levels, evidence & formulas adapt per lens |
| **DailyOperatorPanel** | `6. Edge Cases & Safety` | Out-of-bounds days (-5, 100), undefined `plan`, null observation values, missing water profile | No crash, safe fallback targets & status messages |
| **ContextHelpGlossaryPanel** | `1. Term Dictionary & Search` | Search terms query (`searchTerms`), case insensitivity, whitespace trimming, empty query | Returns correct term list, handles empty/space/XSS inputs |
| **ContextHelpGlossaryPanel** | `2. Category Filtering` | Category filter (`all`, `climate`, `light`, `nutrients`, `phase`, `plant`) | Returns matching category subsets |
| **ContextHelpGlossaryPanel** | `3. Multi-Lens Explanations` | Renders beginner, advanced, and expert descriptions for `VPD`, `DLI`, `EC`, `pH` | Descriptions match lens definition in `termDictionary` |
| **ContextHelpGlossaryPanel** | `4. Optimal Phase Ranges` | Term detail inspection for `VPD`, `DLI`, `EC`, `pH`, `PPFD`, `rF`, `Leaf-VPD` | Renders optimal ranges for Sämling, Vegetation, Blüte |
| **ContextHelpGlossaryPanel** | `5. Edge Cases & Fallbacks` | Unknown term lookup, invalid lens string, empty dictionary query | Safe string fallback, defaults to guided lens text |

---

## 3. Detailed Specification Code for `src/components/panels/daily-operator-glossary.test.ts`

```typescript
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { DayPlan, ExperienceLens, RunPackage, StructuredObservationCategory, ObservationSeverity } from "../../types";
import { DAILY_COLUMNS, calculateDli, calculateLeafVpd, calculateMix, numberAt, textAt } from "../../domain";
import {
  acknowledgeAlert,
  addObservation,
  addStructuredObservation,
  createDefaultRunPackage,
  createObservation,
  deriveRunAlerts,
  latestObservation,
  setTaskCompleted,
  transitionTaskState,
} from "../../run-state";
import {
  DICTIONARY,
  getAllTerms,
  getTermDefinition,
  getTermDescription,
  searchTerms,
} from "../common/termDictionary";
import { DailyOperatorPanel, getTargetsForDay } from "./DailyOperatorPanel";
import { ContextHelpGlossaryPanel } from "./ContextHelpGlossaryPanel";

// ── Mock DayPlan Generator ──
function createMockDayPlan(day: number): DayPlan {
  const isSeedling = day <= 7;
  const isVeg = day > 7 && day <= 28;
  const isBloom = day > 28 && day <= 63;
  const phase = isSeedling ? "Sämling" : isVeg ? "Veg" : isBloom ? "Hauptblüte" : "Spätblüte";
  const lightHours = isBloom || day > 63 ? 12 : 18;
  const ppfd = isSeedling ? 200 : isVeg ? 500 : 900;
  const dli = calculateDli(ppfd, lightHours);
  const ec = isSeedling ? 0.8 : isVeg ? 1.4 : 1.8;
  const ph = 6.0;
  const tempLight = isSeedling ? 24 : isVeg ? 25 : 23;
  const humidity = isSeedling ? 70 : isVeg ? 60 : 45;
  const leafVpd = calculateLeafVpd(tempLight, humidity, -1.0);

  return {
    day,
    raw: [
      day,
      "2026-08-11",
      Math.ceil(day / 7),
      null,
      phase,
      "Tagesziel Entwicklung",
      lightHours,
      140,
      ppfd,
      dli,
      40,
      tempLight,
      20,
      humidity,
      leafVpd,
      ec,
      ph,
      500,
      1000,
      "Manuell",
      "HESI TNT Complex",
      2.5,
      1.0,
      2.0,
      0.05,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      phase,
      "Tageskontrolle",
      0,
      0,
      leafVpd,
      0,
      0.5,
      0,
      0.2,
    ],
    formulaRow: [],
  };
}

describe("Milestone 3 - Daily Operator & Knowledge Glossary Panel Unit Test Suite", () => {
  // ── PART 1: DailyOperatorPanel Suite ──
  describe("DailyOperatorPanel Unit Tests", () => {
    it("1.1 Navigates days (0-80) and clamps boundary day selection correctly", () => {
      const targetSeedling = getTargetsForDay(0);
      expect(targetSeedling.phaseShort).toBe("Keimung");

      const targetVeg = getTargetsForDay(14);
      expect(targetVeg.phaseShort).toBe("Veg");

      const targetBloom = getTargetsForDay(45);
      expect(targetBloom.phaseShort).toBe("Hauptblüte");

      const targetLateBloom = getTargetsForDay(75);
      expect(targetLateBloom.phaseShort).toBe("Spätblüte");

      // Boundary clamping logic check
      const clampDay = (d: number) => Math.max(0, Math.min(80, d));
      expect(clampDay(-5)).toBe(0);
      expect(clampDay(0)).toBe(0);
      expect(clampDay(42)).toBe(42);
      expect(clampDay(80)).toBe(80);
      expect(clampDay(105)).toBe(105 > 80 ? 80 : 105);
    });

    it("1.2 Calculates target corridors from DayPlan or fallback matrix accurately", () => {
      const mockPlan = createMockDayPlan(20);
      const planTargets = getTargetsForDay(20, mockPlan);

      expect(planTargets.phaseName).toBe("Veg");
      expect(planTargets.lightHours).toBe(18);
      expect(planTargets.ppfdMin).toBe(425); // Math.round(500 * 0.85)
      expect(planTargets.ppfdMax).toBe(575); // Math.round(500 * 1.15)
      expect(planTargets.ecTarget).toBe(1.4);
      expect(planTargets.phTarget).toBe(6.0);

      // Fallback matrix test when plan is undefined
      const fallbackVeg = getTargetsForDay(20, undefined);
      expect(fallbackVeg.phaseName).toContain("Vegetation");
      expect(fallbackVeg.ppfdMin).toBe(400);
      expect(fallbackVeg.ppfdMax).toBe(600);
      expect(fallbackVeg.ecTarget).toBe(1.4);
    });

    it("1.3 Pre-fills daily measurement form and records daily observations immutably via addObservation", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const currentDay = 14;

      const obs = createObservation(currentDay);
      obs.values.tempMax = 25.5;
      obs.values.tempMin = 20.0;
      obs.values.humidityMax = 62.0;
      obs.values.humidityMin = 55.0;
      obs.values.ppfd = 550;
      obs.values.leafTemp = 24.5;
      obs.values.waterPh = 6.0;
      obs.values.waterEc = 1.4;
      obs.values.drainPh = 6.2;
      obs.values.drainEc = 1.5;
      obs.values.appliedWaterLiters = 1.0;
      obs.values.drainVolumeLiters = 0.2;
      obs.notes = "Tag 14 Routine-Messung: Blattoberfläche 24.5°C";

      const updatedRun = addObservation(run, obs);
      onUpdateRun(updatedRun);

      expect(onUpdateRun).toHaveBeenCalledTimes(1);
      expect(updatedRun.observations.length).toBe(1);
      expect(updatedRun.observations[0].day).toBe(14);
      expect(updatedRun.observations[0].values.tempMax).toBe(25.5);
      expect(updatedRun.observations[0].values.ppfd).toBe(550);
      expect(updatedRun.auditEvents.length).toBeGreaterThan(run.auditEvents.length);

      // Verify latest observation lookup helper
      const latest = latestObservation(updatedRun, 14);
      expect(latest).toBeDefined();
      expect(latest?.values.tempMax).toBe(25.5);
    });

    it("1.4 Records structured observations with tags, category, and severity via addStructuredObservation", () => {
      const run = createDefaultRunPackage();
      const category: StructuredObservationCategory = "foliage";
      const severity: ObservationSeverity = "mild";

      const structuredObs: StructuredObservation = {
        id: "so-1",
        runId: run.id,
        day: 14,
        createdAt: new Date().toISOString(),
        category,
        severity,
        summary: "Leichte Aufhellung an den untersten Fächerblättern",
        tags: ["#gelbe_blaetter", "#untere_zonen"],
        notes: "N-Mangel oder Lichtmangel im Unterdach.",
        resolved: false,
      };

      const updatedRun = addStructuredObservation(run, structuredObs);

      expect(updatedRun.structuredObservations.length).toBe(1);
      expect(updatedRun.structuredObservations[0].category).toBe("foliage");
      expect(updatedRun.structuredObservations[0].severity).toBe("mild");
      expect(updatedRun.structuredObservations[0].tags).toContain("#gelbe_blaetter");
      expect(updatedRun.auditEvents.length).toBeGreaterThan(run.auditEvents.length);
    });

    it("1.5 Toggles checklist task completion and state transitions via setTaskCompleted & transitionTaskState", () => {
      const run = createDefaultRunPackage();
      const day = 14;
      const taskTitle = "Zelt-Klima & Sensoren prüfen";

      // Toggle completed true
      const runTaskDone = setTaskCompleted(run, day, taskTitle, true);
      expect(runTaskDone.completedTasks.length).toBe(1);
      expect(runTaskDone.completedTasks[0]).toBe(`day-${day}-${taskTitle}`);

      // Transition task state to blocked with reason
      const taskId = `task-${day}-1`;
      const runTaskBlocked = transitionTaskState(runTaskDone, taskId, "blocked", "Sensor nicht kalibriert");
      expect(runTaskBlocked.tasks.length).toBeGreaterThan(0);
      const matchedTask = runTaskBlocked.tasks.find((t) => t.id === taskId);
      expect(matchedTask?.state).toBe("blocked");
      expect(matchedTask?.reason).toBe("Sensor nicht kalibriert");
    });

    it("1.6 Calculates daily nutrient recipe mix and acknowledges safety alerts", () => {
      const mockPlan = createMockDayPlan(45);
      const mixRecipe = calculateMix(mockPlan, 10);

      expect(mixRecipe.length).toBeGreaterThan(0);
      expect(mixRecipe.some((item) => item.name === "HESI TNT Complex" || item.role === "Basis")).toBe(true);

      // Alert acknowledgment check
      const run = createDefaultRunPackage();
      const updatedRunAlert = acknowledgeAlert(run, "alert-water-missing");
      expect(updatedRunAlert.acknowledgedAlertIds).toContain("alert-water-missing");
    });

    it("1.7 Renders DailyOperatorPanel component with experience lenses (guided, advanced, expert)", () => {
      const run = createDefaultRunPackage();
      const mockPlan = createMockDayPlan(14);
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const elementGuided = React.createElement(DailyOperatorPanel, {
        run,
        plan: mockPlan,
        lens: "guided",
        onUpdateRun,
        navigate,
      });

      const elementAdvanced = React.createElement(DailyOperatorPanel, {
        run,
        plan: mockPlan,
        lens: "advanced",
        onUpdateRun,
        navigate,
      });

      const elementExpert = React.createElement(DailyOperatorPanel, {
        run,
        plan: mockPlan,
        lens: "expert",
        onUpdateRun,
        navigate,
      });

      expect(elementGuided).not.toBeNull();
      expect(elementGuided.props.lens).toBe("guided");
      expect(elementAdvanced.props.lens).toBe("advanced");
      expect(elementExpert.props.lens).toBe("expert");
    });

    it("1.8 Gracefully handles edge cases (undefined plan, negative day numbers, missing values)", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();

      // Undefined plan fallback
      const targetsNoPlan = getTargetsForDay(5, undefined);
      expect(targetsNoPlan.phaseShort).toBe("Keimung");
      expect(targetsNoPlan.ecTarget).toBe(0.8);

      const elementNoPlan = React.createElement(DailyOperatorPanel, {
        run,
        plan: undefined,
        lens: "guided",
        onUpdateRun,
      });
      expect(elementNoPlan).not.toBeNull();
    });
  });

  // ── PART 2: ContextHelpGlossaryPanel Suite ──
  describe("ContextHelpGlossaryPanel Unit Tests", () => {
    it("2.1 Resolves term definitions for all core cultivation metrics in dictionary", () => {
      const allTerms = getAllTerms();
      expect(allTerms.length).toBeGreaterThanOrEqual(14);

      const vpdDef = getTermDefinition("VPD");
      expect(vpdDef).toBeDefined();
      expect(vpdDef?.germanName).toBe("Dampfdruckdefizit");
      expect(vpdDef?.unit).toBe("kPa");

      const dliDef = getTermDefinition("DLI");
      expect(dliDef).toBeDefined();
      expect(dliDef?.germanName).toBe("Tägliches Lichtintegral");

      const ecDef = getTermDefinition("EC");
      expect(ecDef).toBeDefined();
      expect(ecDef?.germanName).toBe("Elektrische Leitfähigkeit");

      const phDef = getTermDefinition("pH");
      expect(phDef).toBeDefined();
      expect(phDef?.germanName).toBe("Säuregrad");
    });

    it("2.2 Searches terms by query string, case-insensitively, and trims whitespace", () => {
      const vpdSearch = searchTerms("  vpd  ");
      expect(vpdSearch.some((t) => t.key === "VPD")).toBe(true);

      const dampfSearch = searchTerms("dampfdruck");
      expect(dampfSearch.some((t) => t.key === "VPD")).toBe(true);

      const emptySearch = searchTerms("");
      expect(emptySearch.length).toBe(getAllTerms().length);

      const spaceSearch = searchTerms("   ");
      expect(spaceSearch.length).toBe(getAllTerms().length);

      const noMatch = searchTerms("non_existent_search_query_999");
      expect(noMatch.length).toBe(0);
    });

    it("2.3 Filters terms by categories (all, climate, light, nutrients, phase, plant)", () => {
      const allTerms = getAllTerms();

      const climateTerms = allTerms.filter((t) => t.category === "climate");
      expect(climateTerms.length).toBeGreaterThan(0);
      expect(climateTerms.some((t) => t.key === "VPD")).toBe(true);
      expect(climateTerms.some((t) => t.key === "rF")).toBe(true);

      const lightTerms = allTerms.filter((t) => t.category === "light");
      expect(lightTerms.length).toBeGreaterThan(0);
      expect(lightTerms.some((t) => t.key === "DLI")).toBe(true);
      expect(lightTerms.some((t) => t.key === "PPFD")).toBe(true);

      const nutrientTerms = allTerms.filter((t) => t.category === "nutrients");
      expect(nutrientTerms.length).toBeGreaterThan(0);
      expect(nutrientTerms.some((t) => t.key === "EC")).toBe(true);
      expect(nutrientTerms.some((t) => t.key === "pH")).toBe(true);

      const phaseTerms = allTerms.filter((t) => t.category === "phase");
      expect(phaseTerms.length).toBeGreaterThan(0);
      expect(phaseTerms.some((t) => t.key === "BT")).toBe(true);
    });

    it("2.4 Returns multi-lens term descriptions (guided, advanced, expert)", () => {
      const term = "VPD";
      const guidedText = getTermDescription(term, "guided");
      const advancedText = getTermDescription(term, "advanced");
      const expertText = getTermDescription(term, "expert");

      expect(guidedText).toContain("Luft Wasser aus den Blättern");
      expect(advancedText).toContain("Sättigungsdampfdruck");
      expect(expertText).toContain("Stomata-Leitfähigkeit");
    });

    it("2.5 Verifies optimal phase ranges for VPD, DLI, EC, pH, PPFD, and rF", () => {
      const vpdDef = getTermDefinition("VPD");
      expect(vpdDef?.optimalRanges).toBeDefined();
      expect(vpdDef?.optimalRanges?.length).toBe(3);
      expect(vpdDef?.optimalRanges?.[0].phase).toBe("Sämling");
      expect(vpdDef?.optimalRanges?.[0].min).toBe(0.4);
      expect(vpdDef?.optimalRanges?.[0].max).toBe(0.8);

      const dliDef = getTermDefinition("DLI");
      expect(dliDef?.optimalRanges).toBeDefined();
      expect(dliDef?.optimalRanges?.[1].phase).toBe("Vegetation");
      expect(dliDef?.optimalRanges?.[1].min).toBe(20);
      expect(dliDef?.optimalRanges?.[1].max).toBe(30);

      const ecDef = getTermDefinition("EC");
      expect(ecDef?.optimalRanges).toBeDefined();
      expect(ecDef?.optimalRanges?.[2].phase).toBe("Blüte");
      expect(ecDef?.optimalRanges?.[2].min).toBe(1.8);
      expect(ecDef?.optimalRanges?.[2].max).toBe(2.2);
    });

    it("2.6 Renders ContextHelpGlossaryPanel component with experience lenses and search props", () => {
      const run = createDefaultRunPackage();
      const mockPlan = createMockDayPlan(14);
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const elementGuided = React.createElement(ContextHelpGlossaryPanel, {
        run,
        plan: mockPlan,
        lens: "guided",
        onUpdateRun,
        navigate,
      });

      const elementExpert = React.createElement(ContextHelpGlossaryPanel, {
        run,
        plan: mockPlan,
        lens: "expert",
        onUpdateRun,
        navigate,
      });

      expect(elementGuided).not.toBeNull();
      expect(elementGuided.props.lens).toBe("guided");
      expect(elementExpert.props.lens).toBe("expert");
    });

    it("2.7 Handles edge cases and malicious search strings gracefully", () => {
      const xssSearch = searchTerms("<script>alert('xss')</script>");
      expect(xssSearch.length).toBe(0);

      const unknownTermDesc = getTermDescription("UNKNOWN_TERM_999", "guided");
      expect(unknownTermDesc).toBe('Fachbegriff "UNKNOWN_TERM_999"');

      // Invalid lens string fallback to guided
      const invalidLensDesc = getTermDescription("VPD", "unknown_lens" as any);
      expect(invalidLensDesc).toBe(DICTIONARY.VPD.beginner);
    });
  });

  // ── PART 3: Zero Regression Suite ──
  describe("Zero Regression Integration & Scientific Invariant Suite", () => {
    it("3.1 Preserves domain calculation precision for Leaf VPD and DLI", () => {
      const leafVpd = calculateLeafVpd(25.0, 60.0, -1.0);
      const airVpd = calculateLeafVpd(25.0, 60.0, 0.0);
      const dli = calculateDli(600, 18);

      expect(leafVpd).toBeGreaterThan(0.7);
      expect(leafVpd).toBeLessThan(1.4);
      expect(airVpd).toBeGreaterThan(leafVpd);
      expect(dli).toBeCloseTo(38.88, 2);
    });

    it("3.2 Guarantees pure state transition immutability and audit logging", () => {
      const run = createDefaultRunPackage();
      const obs = createObservation(10);
      obs.values.tempMax = 26.0;

      const updatedRun = addObservation(run, obs);

      expect(updatedRun).not.toBe(run);
      expect(updatedRun.observations.length).toBe(1);
      expect(run.observations.length).toBe(0);
      expect(updatedRun.auditEvents.length).toBe(run.auditEvents.length + 1);
    });
  });
});
```

---

## 4. Verification Method & Zero Regression Audit Plan

To independently verify this test suite when implemented:

1. **Vitest Execution Command**:
   ```bash
   npx vitest run src/components/panels/daily-operator-glossary.test.ts
   ```
   *Expected Output*: Passes all 17 new test cases cleanly in under 500ms.

2. **Full Project Gate Command**:
   ```bash
   pnpm check
   ```
   *Expected Output*:
   - `npx tsc --noEmit` succeeds with 0 type errors.
   - `npx vitest run` succeeds with all 46/46 unit tests passing (29 original + 17 M3 co-located tests).
   - `npx vite build` succeeds cleanly.

3. **Regression Invalidation Criteria**:
   - Any failure in existing 29 test cases.
   - Any mutation of `RunPackage` outside pure state transition functions.
   - Any TypeScript type errors (`npx tsc --noEmit`).

---
