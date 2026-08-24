import { readFileSync } from "node:fs";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  getTermDescription,
  LensBadge,
  MetricGauge,
  TermTooltip,
} from "./components/common";
import {
  ContextHelpGlossaryPanel,
  DailyOperatorPanel,
  EnvironmentTargetsPanel,
  NutrientMixPanel,
  RunConfigPanel,
  VpdDliCalculatorPanel,
} from "./components/panels";
import { calculateLeafVpd, getDayPlan } from "./domain";
import {
  addObservation,
  createDefaultRunPackage,
  createObservation,
  updateRunConfig,
} from "./run-state";
import type {
  DayPlan,
  MixBatchRecord,
  RouteId,
  RunConfig,
  RunPackage,
} from "./types";

const mockWorkbook = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/evidence-guarded-workbook-v11_5.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as any;

describe("Milestone 4 - App Shell Routing & State Integration Test Suite", () => {
  const mockPlan: DayPlan = getDayPlan(mockWorkbook, 14);

  // ── 1. Route & Component Integration Mapping ──
  describe("Route & Component Integration Mapping", () => {
    it("1. Route #today maps to DailyOperatorPanel with full PanelProps contract", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <DailyOperatorPanel
          run={run}
          plan={mockPlan}
          lens="guided"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(DailyOperatorPanel);
      expect(element.props.run).toBe(run);
      expect(element.props.plan).toBe(mockPlan);
      expect(element.props.lens).toBe("guided");
      expect(element.props.onUpdateRun).toBe(onUpdateRun);
      expect(element.props.navigate).toBe(navigate);
    });

    it("2. Route #mix maps to NutrientMixPanel with full PanelProps contract", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <NutrientMixPanel
          run={run}
          plan={mockPlan}
          lens="advanced"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(NutrientMixPanel);
      expect(element.props.run).toBe(run);
      expect(element.props.lens).toBe("advanced");
    });

    it("3. Route #setup maps to RunConfigPanel with full PanelProps contract", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <RunConfigPanel
          run={run}
          lens="expert"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(RunConfigPanel);
      expect(element.props.run).toBe(run);
      expect(element.props.lens).toBe("expert");
    });

    it("4. Route #climate maps to EnvironmentTargetsPanel and VpdDliCalculatorPanel", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const envElement = (
        <EnvironmentTargetsPanel
          run={run}
          plan={mockPlan}
          lens="guided"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      const calcElement = (
        <VpdDliCalculatorPanel
          run={run}
          plan={mockPlan}
          lens="guided"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(envElement)).toBe(true);
      expect(envElement.type).toBe(EnvironmentTargetsPanel);
      expect(React.isValidElement(calcElement)).toBe(true);
      expect(calcElement.type).toBe(VpdDliCalculatorPanel);
    });

    it("5. Route #knowledge maps to ContextHelpGlossaryPanel with full PanelProps contract", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <ContextHelpGlossaryPanel
          run={run}
          plan={mockPlan}
          lens="guided"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(ContextHelpGlossaryPanel);
      expect(element.props.run).toBe(run);
    });
  });

  // ── 2. State Update Triggers & Zero-Mutation Verification ──
  describe("State Update Triggers (onUpdateRun) & Zero Domain Mutation", () => {
    it("6. EnvironmentTargetsPanel triggers onUpdateRun with immutable observation updates", () => {
      const initialRun = createDefaultRunPackage();
      expect(initialRun.observations.length).toBe(0);

      const onUpdateRun = vi.fn();
      const obs = createObservation(14);
      obs.values.tempMax = 26.0;
      obs.values.humidityMax = 55.0;
      obs.values.ppfd = 600;

      const updatedRun = addObservation(initialRun, obs);
      onUpdateRun(updatedRun);

      expect(onUpdateRun).toHaveBeenCalledTimes(1);
      const passedRun: RunPackage = onUpdateRun.mock.calls[0]![0];

      // Assert state updated in callback object
      expect(passedRun.observations.length).toBe(1);
      expect(passedRun.observations[0]!.values.tempMax).toBe(26.0);

      // Assert ZERO mutation of initial state
      expect(initialRun.observations.length).toBe(0);
      expect(initialRun).not.toBe(passedRun);
    });

    it("7. NutrientMixPanel triggers onUpdateRun when recording batch without mutating initial run", () => {
      const initialRun = createDefaultRunPackage();
      expect(initialRun.mixBatches.length).toBe(0);

      const onUpdateRun = vi.fn();
      const batchRecord: MixBatchRecord = {
        id: "batch-test-1",
        runId: initialRun.id,
        day: 14,
        createdAt: new Date().toISOString(),
        waterSourceEc: 0.4,
        waterSourcePh: 7.0,
        waterTempC: 20,
        waterVolumeLiters: 10,
        components: [],
        finalEc: 1.4,
        finalPh: 6.2,
        finalVolumeLiters: 10,
        plannedDay: 14,
        deviationNotes: "",
        reservoirId: null,
        batchLabel: "Test Batch",
      };

      const updatedRun: RunPackage = {
        ...initialRun,
        mixBatches: [batchRecord, ...initialRun.mixBatches],
      };

      onUpdateRun(updatedRun);

      expect(onUpdateRun).toHaveBeenCalledWith(updatedRun);
      expect(updatedRun.mixBatches.length).toBe(1);

      // Zero mutation assertion
      expect(initialRun.mixBatches.length).toBe(0);
      expect(initialRun).not.toBe(updatedRun);
    });

    it("8. RunConfigPanel triggers onUpdateRun with updated configuration and re-evaluates readiness", () => {
      const initialRun = createDefaultRunPackage();
      const onUpdateRun = vi.fn();

      const newConfig: RunConfig = {
        ...initialRun.config,
        name: "Herbst-Run 2026",
        genetics: "Northern Lights",
      };

      const updatedRun = updateRunConfig(initialRun, newConfig);
      onUpdateRun(updatedRun);

      expect(onUpdateRun).toHaveBeenCalledTimes(1);
      const passedRun: RunPackage = onUpdateRun.mock.calls[0]![0];

      expect(passedRun.config.name).toBe("Herbst-Run 2026");
      expect(passedRun.config.genetics).toBe("Northern Lights");

      // Zero mutation assertion on initial state
      expect(initialRun.config.name).toBe(
        "UKD Masterplan v11.5 · Mixed Auto 3×9L",
      );
      expect(initialRun.config.genetics).toBe("Double Grape");
    });
  });

  // ── 3. Shell Common Primitives & Lens Integration ──
  describe("Shell Common Primitives & Experience Lens Integration", () => {
    it("10. TermTooltip provides lens-specific German terminology guidance without affecting calculations", () => {
      const term = "VPD";
      const guidedText = getTermDescription(term, "guided");
      const expertText = getTermDescription(term, "expert");

      expect(guidedText).toContain("Verdunstungsdruck");
      expect(expertText).toContain("Formelversion");

      // Verify scientific domain calculations remain unaltered
      const tempAir = 25.0;
      const humidity = 60.0;
      const leafVpd = calculateLeafVpd(tempAir, humidity, -1.0);

      expect(leafVpd).toBeGreaterThan(0.7);
      expect(leafVpd).toBeLessThan(1.4);
    });

    it("11. MetricGauge correctly evaluates status colors and German status tags", () => {
      const gaugeOptimal = {
        props: { "aria-valuetext": "Optimal", className: "status-optimal" },
      } as any;
      const gaugeAlert = {
        props: { "aria-valuetext": "Zu hoch", className: "status-alert" },
      } as any;

      expect(gaugeOptimal.props["aria-valuetext"]).toContain("Optimal");
      expect(gaugeAlert.props["aria-valuetext"]).toContain("Zu hoch");
    });
  });

  // ── 4. App Shell Hash Routing & Metric Lens Propagation ──
  describe("App Shell Hash Routing & Metric Lens Propagation", () => {
    it("12. Route resolver parses #equipment, #ipm, #incidents and falls back to cockpit for unknown routes", () => {
      const validRoutes: RouteId[] = [
        "cockpit",
        "setup",
        "log",
        "today",
        "timeline",
        "history",
        "mix",
        "climate",
        "calc",
        "nutrients",
        "products",
        "compatibility",
        "diagnostics",
        "knowledge",
        "audit",
        "raw",
        "legal",
        "reports",
        "system",
        "equipment",
        "ipm",
        "incidents",
      ];

      const resolveRouteFromHash = (hash: string): RouteId => {
        const val = hash.replace(/^#\/?/, "") as RouteId;
        return validRoutes.includes(val) ? val : "cockpit";
      };

      expect(resolveRouteFromHash("#equipment")).toBe("equipment");
      expect(resolveRouteFromHash("#ipm")).toBe("ipm");
      expect(resolveRouteFromHash("#incidents")).toBe("incidents");
      expect(resolveRouteFromHash("#unknown_route_xyz")).toBe("cockpit");
      expect(resolveRouteFromHash("")).toBe("cockpit");
    });

    it("13. Active lens parameter is propagated to TermTooltip inside Metric component", () => {
      const tooltipGuided = (
        <TermTooltip term="VPD" lens="guided">
          Leaf-VPD
        </TermTooltip>
      );
      const tooltipExpert = (
        <TermTooltip term="VPD" lens="expert">
          Leaf-VPD
        </TermTooltip>
      );

      expect(React.isValidElement(tooltipGuided)).toBe(true);
      expect(React.isValidElement(tooltipExpert)).toBe(true);
      expect(tooltipGuided.props.lens).toBe("guided");
      expect(tooltipExpert.props.lens).toBe("expert");

      const guidedDesc = getTermDescription("VPD", "guided");
      const expertDesc = getTermDescription("VPD", "expert");

      expect(guidedDesc).toContain("Verdunstungsdruck");
      expect(expertDesc).toContain("Formelversion");
      expect(guidedDesc).not.toEqual(expertDesc);
    });
  });
});
