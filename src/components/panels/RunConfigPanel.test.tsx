import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import waterPresets from "../../data/water-presets.json";
import { calculateDli } from "../../domain";
import {
  activateRun,
  createDefaultRunPackage,
  updateExecutionMode,
  updatePlantIdentity,
  updatePlantMilestones,
  updatePotProfile,
  updateRunConfig,
} from "../../run-state";
import type {
  PotProfile,
  RunConfig,
  RunPackage,
  WaterProfile,
} from "../../types";
import { RunConfigPanel, calculateReadinessScore } from "./RunConfigPanel";

describe("Milestone 3 — RunConfigPanel 8-Card Master Class Setup View Suite", () => {
  const createSampleRun = (): RunPackage => {
    const base = createDefaultRunPackage();
    return {
      ...base,
      config: {
        ...base.config,
        name: "UKD Master Run #1",
        genetics: "Sweet Mandarin Zkittlez Auto",
        startDate: "2026-08-10",
        endDay: 80,
        plantCount: 1,
        dayZeroAnchor: "emergence",
        tentWidthCm: 60,
        tentDepthCm: 60,
        tentHeightCm: 180,
        ledMaxW: 140,
        lightHours: 18,
        medium: "Coco",
        mediumProduct: "UGro Rhiza Coco",
        irrigationSystem: "Manuell (Hand)",
        nutrientSystem: "UKD HESI Conservative",
        exhaustM3h: 220,
        pot: {
          type: "fabric",
          nominalVolumeLiters: 11,
          actualFillLiters: 10,
          diameterCm: 25,
          heightCm: 28,
          emptyMassGrams: 1850,
          saturatedMassGrams: 5200,
        },
        water: {
          sourceType: "municipal",
          sourceDescription: "Leitungswasser",
          sourcePh: 7.2,
          sourceEc: 0.4,
          calciumMgL: 60,
          magnesiumMgL: 15,
          alkalinityMgL: 180,
          sodiumMgL: 10,
          chlorideMgL: 15,
          sulfateMgL: 20,
          analysisDate: "2026-08-01",
          analysisSource: "Stadtwerke",
          analysisMethod: "lab-report",
          verified: true,
        },
        light: null,
      },
      plants: [
        {
          id: "plant-1",
          zoneId: "zone-1",
          label: "Pflanze A1",
          genetics: "Sweet Mandarin Zkittlez Auto",
          status: "active",
          identity: {
            breeder: "Sweet Seeds",
            seedType: "autoflower",
            seedLot: "LOT-2026-SS-01",
            packBatch: "BATCH-A",
            sourceDate: "2026-08-01",
            phenotypeNotes: "Vitaler Wuchs, kompakte Internodien",
            pottingDateIso: "2026-08-10",
            emergenceDateIso: "2026-08-13",
            dayZeroAnchorDate: "2026-08-13",
          },
        },
      ],
      growthEvents: [
        {
          id: "event-1",
          plantId: "plant-1",
          kind: "seed-planted",
          occurredAt: "2026-08-10T12:00:00Z",
          day: null,
          observedBy: "user",
          confidence: "confirmed",
          notes: "Aussaat in Quelltopf",
          photoIds: [],
        },
        {
          id: "event-2",
          plantId: "plant-1",
          kind: "emergence",
          occurredAt: "2026-08-13T08:00:00Z",
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "Keimung / Durchstoß (Day Zero)",
          photoIds: [],
        },
      ],
      equipment: [
        {
          id: "exhaust-1",
          category: "exhaust",
          manufacturer: "Prima Klima",
          model: "PK125-EC",
          serialOrAssetId: "PK-991",
          ratedPowerW: 68,
          exhaustM3h: 220,
          airflowM3h: 220,
          installedAt: "2026-08-10T00:00:00Z",
          position: "Top Exhaust",
          notes: "Hauptabluft",
          status: "active",
        },
      ],
    };
  };

  // ── 1. 8-Card Layout & Rendering Verification ──
  describe("1. 8-Card Layout & Parameter Visibility Rendering", () => {
    it("renders all 8 categorized setup cards cleanly with headings", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="advanced" onUpdateRun={onUpdateRun} />,
      );

      // Check all 8 Card headings
      expect(html).toContain("1. Genetik &amp; Cultivar-Auswahl");
      expect(html).toContain("2. Zeitachse, Modus &amp; Meilensteine");
      expect(html).toContain("3. Zelt-Geometrie &amp; Raum-Dimensionen");
      expect(html).toContain("4. Beleuchtung &amp; Photobiologie");
      expect(html).toContain("5. Pflanztopf &amp; Substrat-Hydratation");
      expect(html).toContain("6. Abluft, Umluft &amp; Klimasteuerung");
      expect(html).toContain("7. Wasserchemie &amp; Ausgangswasser");
      expect(html).toContain("8. Nährstofflinie &amp; KCanG-Konformität");
    });

    it("displays computed tent area (0.36 m²), volume (0.65 m³), plant density (2.8 Pflanzen/m²) and KCanG compliance badge", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="advanced" onUpdateRun={onUpdateRun} />,
      );

      expect(html).toContain("0.36");
      expect(html).toContain("m²");
      expect(html).toContain("0.65");
      expect(html).toContain("m³");
      expect(html).toContain("2.8");
      expect(html).toContain("Pflanzen/m²");
      expect(html).toContain("✓ Konform");
    });

    it("displays calculated DLI, estimated PPFD, and air turnover rate", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="expert" onUpdateRun={onUpdateRun} />,
      );

      // DLI and PPFD
      expect(html).toContain("mol/m²/d");
      expect(html).toContain("µmol/m²/s");

      // Air turnover: 220 m³/h / 0.648 m³ = 340x/h (5.7x/min)
      expect(html).toContain("340");
      expect(html).toContain("pro Stunde");
      expect(html).toContain("Optimaler Luftwechsel");
    });

    it("displays Ca:Mg ratio calculation (4.0:1) and ideal guidance", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="advanced" onUpdateRun={onUpdateRun} />,
      );

      // 60 Ca / 15 Mg => 4.0:1
      expect(html).toContain("4.0");
      expect(html).toContain("✓ Ideal (3:1 bis 4:1)");
    });

    it("displays pot hydration calibration badge and available water volume when tare weights are configured", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="advanced" onUpdateRun={onUpdateRun} />,
      );

      expect(html).toContain("✓ Kalibriert");
      expect(html).toContain("Verfügbares Wasser");
      expect(html).toContain("3.35");
    });

    it("renders across all 3 experience lenses (guided, advanced, expert) without crashing", () => {
      const run = createSampleRun();
      const onUpdateRun = vi.fn();

      const lenses = ["guided", "advanced", "expert"] as const;
      for (const lens of lenses) {
        const html = renderToString(
          <RunConfigPanel run={run} lens={lens} onUpdateRun={onUpdateRun} />,
        );
        expect(html).toContain("⚙️ Run-Konfiguration &amp; Systemgrenzen");
        expect(html).toContain(run.config.genetics);
      }
    });
  });

  // ── 2. Direct State Updates & Event Lineage ──
  describe("2. Direct State Updates & Event Lineage", () => {
    it("updates executionMode via updateExecutionMode helper", () => {
      const run = createSampleRun();
      expect(run.executionMode).toBe("simulation");

      const liveRun = updateExecutionMode(run, "live");
      expect(liveRun.executionMode).toBe("live");
      expect(liveRun.auditEvents.some((a) => a.action === "live-started")).toBe(
        true,
      );
      expect(liveRun.domainEvents.some((d) => d.type === "live.started")).toBe(
        true,
      );

      const simRun = updateExecutionMode(liveRun, "simulation");
      expect(simRun.executionMode).toBe("simulation");
    });

    it("updates retroactive milestone dates via updatePlantMilestones helper", () => {
      const run = createSampleRun();
      const updated = updatePlantMilestones(
        run,
        {
          pottingDateIso: "2026-08-08",
          emergenceDateIso: "2026-08-11",
          dayZeroAnchor: "emergence",
        },
        "Retroactive germination correction",
      );

      expect(updated.plants[0]?.identity.pottingDateIso).toBe("2026-08-08");
      expect(updated.plants[0]?.identity.emergenceDateIso).toBe("2026-08-11");
      expect(
        updated.growthEvents.some(
          (e) =>
            e.kind === "seed-planted" && e.occurredAt.includes("2026-08-08"),
        ),
      ).toBe(true);
      expect(
        updated.growthEvents.some(
          (e) => e.kind === "emergence" && e.occurredAt.includes("2026-08-11"),
        ),
      ).toBe(true);
      expect(
        updated.auditEvents.some(
          (a) =>
            a.action === "milestone-adjusted" ||
            a.action === "configuration-changed",
        ),
      ).toBe(true);
    });

    it("updates pot tare weights and profile via updatePotProfile helper", () => {
      const run = createSampleRun();
      const newPot: PotProfile = {
        type: "air-pot",
        nominalVolumeLiters: 15,
        actualFillLiters: 14,
        diameterCm: 30,
        heightCm: 30,
        emptyMassGrams: 2100,
        saturatedMassGrams: 7500,
      };

      const updated = updatePotProfile(run, newPot);
      expect(updated.config.pot.type).toBe("air-pot");
      expect(updated.config.pot.nominalVolumeLiters).toBe(15);
      expect(updated.config.pot.emptyMassGrams).toBe(2100);
      expect(updated.config.pot.saturatedMassGrams).toBe(7500);
      expect(
        updated.auditEvents.some((a) => a.entityType === "pot-profile"),
      ).toBe(true);
    });

    it("updates run config with tent dimensions and exhaust capacity", () => {
      const run = createSampleRun();
      const updatedConfig: RunConfig = {
        ...run.config,
        tentWidthCm: 80,
        tentDepthCm: 80,
        tentHeightCm: 200,
        plantCount: 2,
        exhaustM3h: 350,
      };

      const updated = updateRunConfig(run, updatedConfig);
      expect(updated.config.tentWidthCm).toBe(80);
      expect(updated.config.tentDepthCm).toBe(80);
      expect(updated.config.tentHeightCm).toBe(200);
      expect(updated.config.plantCount).toBe(2);
      expect(updated.config.exhaustM3h).toBe(350);
    });

    it("updates water profile and respects city water presets", () => {
      const run = createSampleRun();
      const berlinPreset = waterPresets.find((p) => p.id === "berlin");
      expect(berlinPreset).toBeDefined();

      const newWater: WaterProfile = {
        ...run.config.water,
        sourceDescription: `Stadtwasser (${berlinPreset?.name})`,
        calciumMgL: berlinPreset?.calciumMgL ?? 105,
        magnesiumMgL: berlinPreset?.magnesiumMgL ?? 15,
        alkalinityMgL: berlinPreset?.alkalinityMgL ?? 250,
      };

      const updated = updateRunConfig(run, {
        ...run.config,
        water: newWater,
      });

      expect(updated.config.water.calciumMgL).toBe(105);
      expect(updated.config.water.magnesiumMgL).toBe(15);
      expect(updated.config.water.alkalinityMgL).toBe(250);
      expect(updated.config.water.sourceDescription).toContain("Berlin");
    });

    it("updates primary plant identity and strain via updatePlantIdentity helper", () => {
      const run = createSampleRun();
      const updated = updatePlantIdentity(
        run,
        "Mimosa x Orange Punch Auto",
        {
          breeder: "Barneys Farm",
          seedType: "autoflower",
          seedLot: "LOT-2026-BF-01",
          packBatch: "BATCH-99",
          sourceDate: "2026-08-01",
          phenotypeNotes: "Intensive Zitrus-Terpene",
        },
        "emergence",
        "2026-08-13",
      );

      expect(updated.config.genetics).toBe("Mimosa x Orange Punch Auto");
      expect(updated.plants[0]?.identity.breeder).toBe("Barneys Farm");
      expect(updated.plants[0]?.identity.seedLot).toBe("LOT-2026-BF-01");
      expect(updated.plants[0]?.identity.phenotypeNotes).toBe(
        "Intensive Zitrus-Terpene",
      );
    });
  });

  // ── 3. Readiness Gate & Fail-Closed Invariants ──
  describe("3. Readiness Gate Calculation & Activation", () => {
    it("calculates readiness score 100% for full valid config", () => {
      const run = createSampleRun();
      const readiness = calculateReadinessScore(run.config);

      expect(readiness.score).toBe(100);
      expect(readiness.isReady).toBe(true);
      expect(readiness.missingItems.length).toBe(0);
    });

    it("calculates readiness score < 100% and lists missing items when water or tent data is incomplete", () => {
      const run = createSampleRun();
      const incompleteConfig: RunConfig = {
        ...run.config,
        tentWidthCm: 0,
        water: {
          ...run.config.water,
          sourcePh: null,
          sourceEc: null,
          calciumMgL: null,
          magnesiumMgL: null,
        },
      };

      const readiness = calculateReadinessScore(incompleteConfig);
      expect(readiness.score).toBeLessThan(100);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain(
        "Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig",
      );
      expect(readiness.missingItems).toContain("Wasser-pH fehlt");
      expect(readiness.missingItems).toContain("Wasser-EC fehlt");
      expect(readiness.missingItems).toContain("Calcium (mg/L) fehlt");
      expect(readiness.missingItems).toContain("Magnesium (mg/L) fehlt");
    });

    it("activates run and generates immutable configuration snapshot when 100% ready", () => {
      const run = createSampleRun();
      run.status = "draft";

      const activatedRun = activateRun(run);
      expect(activatedRun.status).toBe("active");
      expect(activatedRun.configurationSnapshot.version).toBeGreaterThan(0);
      expect(
        activatedRun.auditEvents.some((a) => a.action === "run-activated"),
      ).toBe(true);
    });
  });

  // ── 4. Calculation Invariants & Consistency ──
  describe("4. Mathematical Calculation Invariants", () => {
    it("computes accurate DLI across photoperiods", () => {
      expect(calculateDli(500, 18)).toBeCloseTo(32.4, 1);
      expect(calculateDli(600, 18)).toBeCloseTo(38.88, 1);
      expect(calculateDli(500, 20)).toBeCloseTo(36.0, 1);
    });

    it("maintains KCanG possession warning and plant count invariants", () => {
      const run = createSampleRun();
      run.config.plantCount = 4; // Above limit of 3
      const onUpdateRun = vi.fn();

      const html = renderToString(
        <RunConfigPanel run={run} lens="advanced" onUpdateRun={onUpdateRun} />,
      );

      expect(html).toContain("⚠️ &gt;3 Pflanzen");
      expect(html).toContain("Besitzgrenze von 50 g");
    });
  });
});
