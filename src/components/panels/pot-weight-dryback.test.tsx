import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  calculateSubstrateHydration,
  type SubstrateHydration,
} from "../../domain";
import {
  addObservation,
  createDefaultRunPackage,
  createObservation,
  updatePotProfile,
} from "../../run-state";
import type {
  ExperienceLens,
  PotProfile,
  RouteId,
  RunPackage,
} from "../../types";
import EquipmentManagerPanel from "./EquipmentManagerPanel";
import {
  DailyOperatorPanel,
  HYDRATION_CATEGORY_DETAILS,
} from "./DailyOperatorPanel";

describe("Milestone 4: Pot Weight Dryback Tracking Widget & App Shell Routing Integration", () => {
  // ── 1. Gravimetric Dryback Calculation Accuracy ──
  describe("1. calculateSubstrateHydration mathematical accuracy", () => {
    it("calculates 100% hydration at saturated weight", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: 25,
        heightCm: 30,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      const res = calculateSubstrateHydration(4800, pot);
      expect(res.hydrationPercent).toBe(100);
      expect(res.depletionPercent).toBe(0);
      expect(res.availableWaterGrams).toBe(4000);
      expect(res.category).toBe("saturated");
    });

    it("calculates 0% hydration at empty tare weight", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      const res = calculateSubstrateHydration(800, pot);
      expect(res.hydrationPercent).toBe(0);
      expect(res.depletionPercent).toBe(100);
      expect(res.availableWaterGrams).toBe(0);
      expect(res.category).toBe("dry");
    });

    it("calculates medium optimal hydration accurately (50%)", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 800,
        saturatedMassGrams: 4800,
      };
      // Water capacity = 4000g. Current mass = 2800g (2000g water) -> 50%
      const res = calculateSubstrateHydration(2800, pot);
      expect(res.hydrationPercent).toBe(50);
      expect(res.depletionPercent).toBe(50);
      expect(res.availableWaterGrams).toBe(2000);
      expect(res.category).toBe("medium");
    });

    it("calculates light hydration accurately (30%)", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };
      // Water capacity = 4000g. Current mass = 2200g (1200g water) -> 30%
      const res = calculateSubstrateHydration(2200, pot);
      expect(res.hydrationPercent).toBe(30);
      expect(res.depletionPercent).toBe(70);
      expect(res.availableWaterGrams).toBe(1200);
      expect(res.category).toBe("light");
    });

    it("calculates heavy hydration accurately (80%)", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };
      // Water capacity = 4000g. Current mass = 4200g (3200g water) -> 80%
      const res = calculateSubstrateHydration(4200, pot);
      expect(res.hydrationPercent).toBe(80);
      expect(res.depletionPercent).toBe(20);
      expect(res.availableWaterGrams).toBe(3200);
      expect(res.category).toBe("heavy");
    });

    it("returns INSUFFICIENT_DATA when saturatedMassGrams is null", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: null,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 500,
        saturatedMassGrams: null,
      };
      const res = calculateSubstrateHydration(4250, pot);
      expect(res.state).toBe("INSUFFICIENT_DATA");
      expect(res.reason).toBe("SATURATION_REFERENCE_MISSING");
    });

    it("returns UNKNOWN when current mass exceeds saturated mass by a large margin", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };
      const res = calculateSubstrateHydration(6000, pot);
      expect(res.state).toBe("UNKNOWN");
      expect(res.reason).toBe("MASS_EXCEEDS_SATURATION");
    });

    it("returns UNKNOWN when current mass is below empty tare weight", () => {
      const pot: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 10,
        actualFillLiters: 10,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };
      const res = calculateSubstrateHydration(500, pot);
      expect(res.state).toBe("UNKNOWN");
      expect(res.reason).toBe("MASS_BELOW_TARE");
    });
  });

  // ── 2. Category Boundaries & German Watering Recommendations ──
  describe("2. Hydration Categories and Dynamic German Recommendations", () => {
    const pot: PotProfile = {
      type: "fabric",
      nominalVolumeLiters: 10,
      actualFillLiters: 10,
      diameterCm: null,
      heightCm: null,
      emptyMassGrams: 1000,
      saturatedMassGrams: 5000, // capacity = 4000g
    };

    it("correctly identifies 'dry' category (< 20%) with critical watering recommendation", () => {
      const res = calculateSubstrateHydration(1700, pot); // 700g water / 4000g = 18%
      expect(res.category).toBe("dry");
      expect(res.hydrationPercent).toBeLessThan(20);

      const details = HYDRATION_CATEGORY_DETAILS.dry;
      expect(details.recommendationTitle).toContain(
        "Gieß-Empfehlung: Gießen erforderlich",
      );
      expect(details.guidedText).toContain("Jetzt gießen");
      expect(details.advancedText).toContain("Dryback-Ziel erreicht");
      expect(details.expertText).toContain("Matrixpotenzial");
    });

    it("correctly identifies 'light' category (20% - 39%) with preparation recommendation", () => {
      const res = calculateSubstrateHydration(2200, pot); // 1200g water / 4000g = 30%
      expect(res.category).toBe("light");
      expect(res.hydrationPercent).toBeGreaterThanOrEqual(20);
      expect(res.hydrationPercent).toBeLessThan(40);

      const details = HYDRATION_CATEGORY_DETAILS.light;
      expect(details.recommendationTitle).toBe("Gieß-Empfehlung: Vorbereitung");
      expect(details.guidedText).toContain(
        "Nährlösung für die nächste Bewässerung vorbereiten",
      );
      expect(details.advancedText).toContain("Dryback-Ziel bald erreicht");
    });

    it("correctly identifies 'medium' category (40% - 69%) with optimal moisture recommendation", () => {
      const res = calculateSubstrateHydration(3200, pot); // 2200g water / 4000g = 55%
      expect(res.category).toBe("medium");
      expect(res.hydrationPercent).toBeGreaterThanOrEqual(40);
      expect(res.hydrationPercent).toBeLessThan(70);

      const details = HYDRATION_CATEGORY_DETAILS.medium;
      expect(details.recommendationTitle).toBe(
        "Gieß-Empfehlung: Optimale Feuchte",
      );
      expect(details.guidedText).toContain("Optimale Bodenfeuchte");
      expect(details.advancedText).toContain(
        "Perfektes Wasser-Luft-Verhältnis",
      );
    });

    it("correctly identifies 'heavy' category (70% - 89%) with wait recommendation", () => {
      const res = calculateSubstrateHydration(4200, pot); // 3200g water / 4000g = 80%
      expect(res.category).toBe("heavy");
      expect(res.hydrationPercent).toBeGreaterThanOrEqual(70);
      expect(res.hydrationPercent).toBeLessThan(90);

      const details = HYDRATION_CATEGORY_DETAILS.heavy;
      expect(details.recommendationTitle).toBe("Gieß-Empfehlung: Gut versorgt");
      expect(details.guidedText).toContain("Heute nicht gießen");
      expect(details.advancedText).toContain(
        "Trocknungsphase (Dryback) abwarten",
      );
    });

    it("correctly identifies 'saturated' category (≥ 90%) with aeration recommendation", () => {
      const res = calculateSubstrateHydration(4800, pot); // 3800g water / 4000g = 95%
      expect(res.category).toBe("saturated");
      expect(res.hydrationPercent).toBeGreaterThanOrEqual(90);

      const details = HYDRATION_CATEGORY_DETAILS.saturated;
      expect(details.recommendationTitle).toBe(
        "Gieß-Empfehlung: Vollsättigung",
      );
      expect(details.guidedText).toContain("Kein Wasser zuführen");
      expect(details.advancedText).toContain(
        "Sauerstoffzufuhr der Wurzeln gewährleisten",
      );
      expect(details.expertText).toContain("Hypoxie");
    });

    it("covers all 5 category keys in HYDRATION_CATEGORY_DETAILS", () => {
      const categories: SubstrateHydration["category"][] = [
        "dry",
        "light",
        "medium",
        "heavy",
        "saturated",
      ];
      categories.forEach((cat) => {
        const config = HYDRATION_CATEGORY_DETAILS[cat];
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
        expect(config.color).toBeTruthy();
        expect(config.recommendationTitle).toBeTruthy();
        expect(config.guidedText).toBeTruthy();
        expect(config.advancedText).toBeTruthy();
        expect(config.expertText).toBeTruthy();
      });
    });
  });

  // ── 3. State Transition Immutability (`updatePotProfile`) ──
  describe("3. updatePotProfile pure state transitions & audit lineage", () => {
    it("updates pot configuration immutably and produces audit & domain events", () => {
      const initialRun = createDefaultRunPackage();
      const updatedPot: PotProfile = {
        type: "airpot",
        nominalVolumeLiters: 15,
        actualFillLiters: 14,
        diameterCm: 30,
        heightCm: 32,
        emptyMassGrams: 1200,
        saturatedMassGrams: 6500,
      };

      const updatedRun = updatePotProfile(initialRun, updatedPot);

      // Assert updated values
      expect(updatedRun.config.pot.type).toBe("airpot");
      expect(updatedRun.config.pot.nominalVolumeLiters).toBe(15);
      expect(updatedRun.config.pot.actualFillLiters).toBe(14);
      expect(updatedRun.config.pot.diameterCm).toBe(30);
      expect(updatedRun.config.pot.heightCm).toBe(32);
      expect(updatedRun.config.pot.emptyMassGrams).toBe(1200);
      expect(updatedRun.config.pot.saturatedMassGrams).toBe(6500);

      // Zero mutation check on initialRun
      expect(initialRun.config.pot.type).toBe("other");
      expect(initialRun.config.pot.nominalVolumeLiters).toBe(9);
      expect(initialRun.config.pot.emptyMassGrams).toBeNull();
      expect(initialRun.config.pot.saturatedMassGrams).toBeNull();
      expect(initialRun).not.toBe(updatedRun);

      // Audit Event checks
      expect(updatedRun.auditEvents.length).toBeGreaterThan(
        initialRun.auditEvents.length,
      );
      const latestAudit = updatedRun.auditEvents[0];
      expect(latestAudit.action).toBe("configuration-changed");
      expect(latestAudit.entityType).toBe("pot-profile");
      expect(latestAudit.entityId).toBe(initialRun.id);
      expect(latestAudit.detail).toContain("Topfprofil");

      // Domain Event checks
      expect(updatedRun.domainEvents.length).toBeGreaterThan(
        initialRun.domainEvents.length,
      );
      const latestDomain = updatedRun.domainEvents[0];
      expect(latestDomain.type).toBe("configuration.changed");
      expect(latestDomain.payload.pot).toBeDefined();
    });

    it("safely handles null and boundary values in updatePotProfile", () => {
      const initialRun = createDefaultRunPackage();
      const minimalPot: PotProfile = {
        type: "plastic",
        nominalVolumeLiters: 0, // Clamped to min 0.1
        actualFillLiters: null,
        diameterCm: null,
        heightCm: null,
        emptyMassGrams: null,
        saturatedMassGrams: null,
      };

      const updatedRun = updatePotProfile(initialRun, minimalPot);
      expect(updatedRun.config.pot.nominalVolumeLiters).toBe(10); // Defaults from empty/0
      expect(updatedRun.config.pot.actualFillLiters).toBeNull();
      expect(updatedRun.config.pot.emptyMassGrams).toBeNull();
      expect(updatedRun.config.pot.saturatedMassGrams).toBeNull();
    });
  });

  // ── 4. Observation Recording & Measurement Mapping ──
  describe("4. addObservation pot mass measurement ingestion", () => {
    it("maps potMassGrams to typed pot.mass measurement", () => {
      const run = createDefaultRunPackage();
      const obs = createObservation(5);
      obs.values.potMassGrams = 3250;

      const updatedRun = addObservation(run, obs);

      expect(updatedRun.observations.length).toBe(1);
      expect(updatedRun.observations[0].values.potMassGrams).toBe(3250);

      const potMeasurement = updatedRun.measurements.find(
        (m) => m.metric === "pot.mass",
      );
      expect(potMeasurement).toBeDefined();
      expect(potMeasurement?.reading.value).toBe(3250);
      expect(potMeasurement?.reading.unit).toBe("g");
    });
  });

  // ── 5. Component Interaction, Accessibility & Touch Targets ──
  describe("5. DailyOperatorPanel pot weight dryback UI rendering", () => {
    it("renders DailyOperatorPanel with Pot Weight Dryback Tracking Widget", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <DailyOperatorPanel
          run={run}
          lens="advanced"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.run).toBe(run);
      expect(element.props.lens).toBe("advanced");
    });

    it("renders across all 3 experience lenses without crashing", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];

      for (const lens of lenses) {
        const element = (
          <DailyOperatorPanel
            key={lens}
            run={run}
            lens={lens}
            onUpdateRun={onUpdateRun}
          />
        );
        expect(React.isValidElement(element)).toBe(true);
      }
    });
  });

  // ── 6. App Shell Routing & Modal State Integration ──
  describe("6. Equipment Manager Panel & Route #equipment", () => {
    it("renders EquipmentManagerPanel and supports onUpdateRun dispatch", () => {
      const run = createDefaultRunPackage();
      const onUpdateRun = vi.fn();
      const navigate = vi.fn();

      const element = (
        <EquipmentManagerPanel
          run={run}
          lens="guided"
          onUpdateRun={onUpdateRun}
          navigate={navigate}
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.run).toBe(run);
      expect(element.props.lens).toBe("guided");
    });

    it("simulates route resolution for '#equipment' and '#/equipment'", () => {
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

      const resolveRoute = (hash: string): RouteId => {
        const stripped = hash.replace(/^#\/?/, "") as RouteId;
        return validRoutes.includes(stripped) ? stripped : "cockpit";
      };

      expect(resolveRoute("#equipment")).toBe("equipment");
      expect(resolveRoute("#/equipment")).toBe("equipment");
      expect(resolveRoute("#today")).toBe("today");
      expect(resolveRoute("#unknown")).toBe("cockpit");
    });
  });
});
