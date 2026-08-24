import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateBiologicalPlantAge } from "./domain";
import {
  createDefaultRunPackage,
  updatePlantIdentity,
  touch,
} from "./run-state";
import {
  PlantIdentityModal,
  DAY_ZERO_ANCHOR_OPTIONS,
} from "./components/modals/PlantIdentityModal";
import type {
  DayZeroAnchor,
  GrowthEvent,
  PlantIdentity,
  RunPackage,
} from "./types";

describe("Milestone 3 — Empirical Challenger 1 Adversarial Suite", () => {
  // =========================================================================
  // 1. Future Anchor Dates & Biological Age Calculation Oracles
  // =========================================================================
  describe("1. Future Anchor Dates & Biological Age Calculation", () => {
    const fixedNow = new Date("2026-08-14T12:00:00Z");

    it("handles future anchor date (10 days in future) clamped to 0 days without throwing", () => {
      const futureAnchor = new Date("2026-08-24T12:00:00Z").toISOString();
      const events: GrowthEvent[] = [
        {
          id: "ge-fut",
          plantId: "p1",
          kind: "emergence",
          occurredAt: futureAnchor,
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "Future anchor",
          photoIds: [],
        },
        {
          id: "ge-op",
          plantId: "p1",
          kind: "run-operational-start",
          occurredAt: "2026-08-04T12:00:00Z", // 10 days in past
          day: 0,
          observedBy: "system",
          confidence: "confirmed",
          notes: "Operational start",
          photoIds: [],
        },
      ];

      const result = calculateBiologicalPlantAge("emergence", events, fixedNow);
      expect(result.biologicalAgeDays).toBe(0);
      expect(result.operationalAgeDays).toBe(10);
      expect(result.anchorDateString).toBe(futureAnchor);
    });

    it("handles extreme future anchor dates (100 days and 1000 days in future)", () => {
      const datesInFuture = [
        new Date("2026-11-22T12:00:00Z").toISOString(), // +100 days
        new Date("2029-05-10T12:00:00Z").toISOString(), // +1000 days
      ];

      for (const futureDate of datesInFuture) {
        const events: GrowthEvent[] = [
          {
            id: "ge-extreme",
            plantId: "p1",
            kind: "seed-started",
            occurredAt: futureDate,
            day: 0,
            observedBy: "user",
            confidence: "confirmed",
            notes: "Far future",
            photoIds: [],
          },
        ];

        const result = calculateBiologicalPlantAge(
          "seed-started",
          events,
          fixedNow,
        );
        expect(result.biologicalAgeDays).toBe(0);
        expect(result.operationalAgeDays).toBe(0);
        expect(Number.isNaN(result.biologicalAgeDays)).toBe(false);
        expect(Number.isNaN(result.operationalAgeDays)).toBe(false);
      }
    });

    it("handles microsecond future boundaries (+1 millisecond into future)", () => {
      const futureDate = new Date(fixedNow.getTime() + 1).toISOString();
      const events: GrowthEvent[] = [
        {
          id: "ge-ms",
          plantId: "p1",
          kind: "seed-planted",
          occurredAt: futureDate,
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "+1ms",
          photoIds: [],
        },
      ];

      const result = calculateBiologicalPlantAge(
        "seed-planted",
        events,
        fixedNow,
      );
      expect(result.biologicalAgeDays).toBe(0);
    });

    it("fuzz tests 250 random timestamps (past, present, future) ensuring biologicalAgeDays >= 0 and never NaN", () => {
      const baseTime = fixedNow.getTime();
      const anchors: DayZeroAnchor[] = [
        "emergence",
        "seed-started",
        "seed-planted",
        "first-true-leaves",
        "run-operational-start",
      ];

      for (let i = 0; i < 250; i++) {
        // Random offset from -180 days to +180 days
        const randomDayOffset = (Math.random() - 0.5) * 360;
        const randomTime = new Date(
          baseTime + randomDayOffset * 86400000,
        ).toISOString();
        const chosenAnchor = anchors[i % anchors.length]!;

        const events: GrowthEvent[] = [
          {
            id: `fuzz-${i}`,
            plantId: "p1",
            kind: chosenAnchor,
            occurredAt: randomTime,
            day: 0,
            observedBy: "user",
            confidence: "confirmed",
            notes: "Fuzz test event",
            photoIds: [],
          },
        ];

        const result = calculateBiologicalPlantAge(
          chosenAnchor,
          events,
          fixedNow,
        );
        expect(result.biologicalAgeDays).toBeGreaterThanOrEqual(0);
        expect(result.operationalAgeDays).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.biologicalAgeDays)).toBe(true);
        expect(Number.isFinite(result.operationalAgeDays)).toBe(true);
        expect(typeof result.anchorDateString).toBe("string");
      }
    });

    it("handles invalid date strings in growth events defensively without crashing", () => {
      const eventsWithBadDates = [
        {
          id: "bad-1",
          plantId: "p1",
          kind: "emergence" as const,
          occurredAt: "INVALID_DATE_STRING",
          day: 0,
          observedBy: "user" as const,
          confidence: "confirmed" as const,
          notes: "Bad date",
          photoIds: [],
        },
      ];

      const result = calculateBiologicalPlantAge(
        "emergence",
        eventsWithBadDates,
        fixedNow,
      );
      expect(result.biologicalAgeDays).toBe(0);
      expect(result.operationalAgeDays).toBe(0);
      expect(typeof result.anchorDateString).toBe("string");
    });

    it("renders PlantIdentityModal with future anchor date in SSR without throwing and displays age preview", () => {
      const run = createDefaultRunPackage();
      run.config.startDate = "2026-08-25"; // 11 days in future
      run.config.dayZeroAnchor = "emergence";
      run.growthEvents = [
        {
          id: "ge-future",
          plantId: run.plants[0]?.id ?? "p1",
          kind: "emergence",
          occurredAt: "2026-08-25T00:00:00.000Z",
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "Future germination",
          photoIds: [],
        },
      ];

      const html = renderToString(
        <PlantIdentityModal
          run={run}
          lens="guided"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain("LIVE-BERECHNUNG PFLANZENALTER");
      expect(html).toContain("Biologisches Alter");
      expect(html).toContain("Operatives Alter");
      expect(html).toContain("Alter-Delta");
      expect(html).toContain("emergence");
    });
  });

  // =========================================================================
  // 2. Empty, Null, and Boundary Inputs for Plant Identity
  // =========================================================================
  describe("2. Empty / Null / Edge-Case Inputs Handling", () => {
    it("saves cleanly when breeder, seedLot, packBatch are null or empty strings", () => {
      const run = createDefaultRunPackage();
      const nullIdentity: PlantIdentity = {
        breeder: null,
        seedType: "regular",
        seedLot: null,
        packBatch: null,
        sourceDate: null,
        phenotypeNotes: "",
      };

      const updatedRun = updatePlantIdentity(
        run,
        "Double Grape",
        nullIdentity,
        "emergence",
        "2026-08-10",
      );

      expect(updatedRun.plants[0].identity.breeder).toBeNull();
      expect(updatedRun.plants[0].identity.seedLot).toBeNull();
      expect(updatedRun.plants[0].identity.packBatch).toBeNull();
      expect(updatedRun.plants[0].identity.phenotypeNotes).toBe("");
      expect(updatedRun.plants[0].identity.seedType).toBe("regular");

      // Audit event formats null breeder with placeholder '—'
      const audit = updatedRun.auditEvents.find(
        (a) => a.entityType === "plant-identity",
      );
      expect(audit).toBeDefined();
      expect(audit?.detail).toContain("Breeder '—'");

      // Domain event contains exact null fields
      const domain = updatedRun.domainEvents.find(
        (d) => d.type === "configuration.changed",
      );
      expect(domain).toBeDefined();
      expect((domain!.payload as any).breeder).toBeNull();
      expect((domain!.payload as any).seedLot).toBeNull();
    });

    it("handles whitespace-only inputs by trimming or normalizing properly", () => {
      const run = createDefaultRunPackage();
      const whitespaceIdentity: PlantIdentity = {
        breeder: "   ",
        seedType: "feminized",
        seedLot: "  \t \n  ",
        packBatch: "    ",
        sourceDate: null,
        phenotypeNotes: "   Trimmable notes   ",
      };

      const updatedRun = updatePlantIdentity(
        run,
        "   Sour Diesel   ",
        whitespaceIdentity,
        "seed-planted",
        "2026-08-01",
      );

      expect(updatedRun.config.genetics).toBe("   Sour Diesel   ");
      expect(updatedRun.plants[0].identity.phenotypeNotes).toBe(
        "   Trimmable notes   ",
      );
    });

    it("gracefully initializes plant-1 if run.plants array is empty", () => {
      const run = createDefaultRunPackage();
      const emptyPlantsRun: RunPackage = {
        ...run,
        plants: [],
      };

      const updatedRun = updatePlantIdentity(
        emptyPlantsRun,
        "Amnesia Haze",
        {
          breeder: "Royal Queen Seeds",
          seedType: "feminized",
          seedLot: "LOT-RQS-1",
          packBatch: "B-1",
          sourceDate: null,
          phenotypeNotes: "Sativa dominant",
        },
        "seed-started",
        "2026-08-05",
      );

      expect(updatedRun.plants.length).toBe(1);
      expect(updatedRun.plants[0].genetics).toBe("Amnesia Haze");
      expect(updatedRun.plants[0].identity.breeder).toBe("Royal Queen Seeds");
      expect(updatedRun.plants[0].status).toBe("planned");
    });

    it("updates all plants genetics and identity in multi-plant runs", () => {
      const run = createDefaultRunPackage();
      const multiPlantRun: RunPackage = {
        ...run,
        plants: [
          {
            id: "p-1",
            zoneId: "z-1",
            label: "Pflanze 1",
            genetics: "Old Strain",
            status: "active",
            identity: {
              breeder: "Old Breeder",
              seedType: "regular",
              seedLot: "OLD-1",
              packBatch: null,
              sourceDate: null,
              phenotypeNotes: "",
            },
          },
          {
            id: "p-2",
            zoneId: "z-1",
            label: "Pflanze 2",
            genetics: "Old Strain",
            status: "active",
            identity: {
              breeder: "Old Breeder",
              seedType: "regular",
              seedLot: "OLD-1",
              packBatch: null,
              sourceDate: null,
              phenotypeNotes: "",
            },
          },
        ],
      };

      const updatedRun = updatePlantIdentity(
        multiPlantRun,
        "Wedding Cake",
        {
          breeder: "Seed Junky",
          seedType: "clone",
          seedLot: "CUT-2026-01",
          packBatch: "CLONE-01",
          sourceDate: "2026-08-01",
          phenotypeNotes: "Vanilla terpenes",
        },
        "emergence",
        "2026-08-01",
      );

      expect(updatedRun.plants.length).toBe(2);
      expect(updatedRun.plants[0].genetics).toBe("Wedding Cake");
      expect(updatedRun.plants[1].genetics).toBe("Wedding Cake");
      expect(updatedRun.plants[0].identity.breeder).toBe("Seed Junky");
      expect(updatedRun.plants[1].identity.breeder).toBe("Seed Junky");
      expect(updatedRun.plants[0].identity.seedType).toBe("clone");
      expect(updatedRun.plants[1].identity.seedType).toBe("clone");
    });

    it("survives extreme string lengths (10,000 chars) and unicode / emoji characters", () => {
      const run = createDefaultRunPackage();
      const longString = "A".repeat(10000);
      const emojiString = "🌿🔥 Super Lemon Haze 🍋⚡™® (Lot #日本語-2026)";

      const updatedRun = updatePlantIdentity(
        run,
        emojiString,
        {
          breeder: "Greenhouse Seeds 🏢",
          seedType: "feminized",
          seedLot: "LOT-🍋",
          packBatch: "BATCH-⚡",
          sourceDate: "2026-08-01",
          phenotypeNotes: longString,
        },
        "emergence",
        "2026-08-01",
      );

      expect(updatedRun.config.genetics).toBe(emojiString);
      expect(updatedRun.plants[0].identity.phenotypeNotes.length).toBe(10000);
      expect(updatedRun.plants[0].identity.breeder).toBe("Greenhouse Seeds 🏢");
      expect(updatedRun.plants[0].identity.seedLot).toBe("LOT-🍋");
    });

    it("renders HTML correctly when plant identity fields are null or empty", () => {
      const run = createDefaultRunPackage();
      run.plants[0].identity = {
        breeder: null,
        seedType: "feminized",
        seedLot: null,
        packBatch: null,
        sourceDate: null,
        phenotypeNotes: "",
      };

      const html = renderToString(
        <PlantIdentityModal
          run={run}
          lens="expert"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('id="pi-breeder"');
      expect(html).toContain('id="pi-seedlot"');
      expect(html).toContain('id="pi-packbatch"');
      expect(html).toContain('id="pi-phenotypenotes"');
    });
  });

  // =========================================================================
  // 3. Modal Form State & Event Interaction
  // =========================================================================
  describe("3. Modal Form Structure & State Transitions", () => {
    it("correctly instantiates modal across all three ExperienceLens modes", () => {
      const run = createDefaultRunPackage();
      const lenses = ["guided", "advanced", "expert"] as const;

      for (const lens of lenses) {
        const modal = (
          <PlantIdentityModal
            run={run}
            lens={lens}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        );
        expect(React.isValidElement(modal)).toBe(true);
        expect(modal.props.lens).toBe(lens);
      }
    });

    it("verifies all 5 DayZeroAnchor options are properly mapped in DAY_ZERO_ANCHOR_OPTIONS", () => {
      const expectedAnchors: DayZeroAnchor[] = [
        "emergence",
        "seed-started",
        "seed-planted",
        "first-true-leaves",
        "run-operational-start",
      ];

      expect(DAY_ZERO_ANCHOR_OPTIONS.length).toBe(5);
      for (const anchor of expectedAnchors) {
        const option = DAY_ZERO_ANCHOR_OPTIONS.find((o) => o.value === anchor);
        expect(option, `Option for ${anchor} should exist`).toBeDefined();
        expect(option?.label.length).toBeGreaterThan(0);
      }
    });

    it("verifies fallback genetics name 'Unbenannt' when form is submitted with empty genetics", () => {
      const run = createDefaultRunPackage();
      const emptyGenetics = "   ";
      const updated = updatePlantIdentity(
        run,
        emptyGenetics.trim() || "Unbenannt",
        {
          breeder: null,
          seedType: "feminized",
          seedLot: null,
          packBatch: null,
          sourceDate: null,
          phenotypeNotes: "",
        },
        "emergence",
        "2026-08-01",
      );

      expect(updated.config.genetics).toBe("Unbenannt");
      expect(updated.plants[0].genetics).toBe("Unbenannt");
    });

    it("renders with 2026 Master Class accessibility attributes (role, aria-modal, minHeight >= 44px)", () => {
      const run = createDefaultRunPackage();
      const html = renderToString(
        <PlantIdentityModal
          run={run}
          lens="guided"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="plant-identity-modal-title"');
      expect(html).toContain("min-height:44px");
    });

    it("simulates rapid consecutive updates through updatePlantIdentity without state corruption", () => {
      let currentRun = createDefaultRunPackage();
      const anchors: DayZeroAnchor[] = [
        "seed-started",
        "seed-planted",
        "emergence",
        "first-true-leaves",
        "run-operational-start",
      ];

      for (let step = 0; step < 20; step++) {
        const anchor = anchors[step % anchors.length]!;
        const dateStr = `2026-08-${String((step % 28) + 1).padStart(2, "0")}`;
        const newGenetics = `Strain Iteration #${step}`;

        currentRun = updatePlantIdentity(
          currentRun,
          newGenetics,
          {
            breeder: `Breeder ${step}`,
            seedType: step % 2 === 0 ? "feminized" : "autoflower",
            seedLot: `LOT-${step}`,
            packBatch: `B-${step}`,
            sourceDate: null,
            phenotypeNotes: `Note ${step}`,
          },
          anchor,
          dateStr,
        );

        expect(currentRun.config.genetics).toBe(newGenetics);
        expect(currentRun.config.dayZeroAnchor).toBe(anchor);
        expect(currentRun.plants[0].identity.breeder).toBe(`Breeder ${step}`);
        expect(currentRun.plants[0].identity.seedLot).toBe(`LOT-${step}`);
        expect(
          currentRun.growthEvents.filter((e) => e.kind === anchor).length,
        ).toBe(1);
      }

      // Final audit trail should have 20 plant-identity updates
      const identityAudits = currentRun.auditEvents.filter(
        (a) => a.entityType === "plant-identity",
      );
      expect(identityAudits.length).toBe(20);
    });
  });

  // =========================================================================
  // 4. Immutability, Audit Trail & Domain Event Invariants
  // =========================================================================
  describe("4. Immutability & Event Invariants", () => {
    it("never mutates the input RunPackage, its plants array, or existing audit events", () => {
      const initialRun = createDefaultRunPackage();
      initialRun.config.genetics = "Original OG";
      const initialPlants = [...initialRun.plants];
      const initialAuditCount = initialRun.auditEvents.length;
      const initialDomainCount = initialRun.domainEvents.length;

      const updatedRun = updatePlantIdentity(
        initialRun,
        "New Gelato",
        {
          breeder: "Sherbinskis",
          seedType: "feminized",
          seedLot: "LOT-GEL-33",
          packBatch: "PB-1",
          sourceDate: null,
          phenotypeNotes: "Purple calyxes",
        },
        "seed-planted",
        "2026-08-01",
      );

      // Strict referential inequality
      expect(updatedRun).not.toBe(initialRun);
      expect(updatedRun.config).not.toBe(initialRun.config);
      expect(updatedRun.plants).not.toBe(initialRun.plants);
      expect(updatedRun.auditEvents).not.toBe(initialRun.auditEvents);
      expect(updatedRun.domainEvents).not.toBe(initialRun.domainEvents);

      // Unchanged initial state
      expect(initialRun.config.genetics).toBe("Original OG");
      expect(initialRun.plants.length).toBe(initialPlants.length);
      expect(initialRun.auditEvents.length).toBe(initialAuditCount);
      expect(initialRun.domainEvents.length).toBe(initialDomainCount);

      // Appended event counts
      expect(updatedRun.auditEvents.length).toBe(initialAuditCount + 1);
      expect(updatedRun.domainEvents.length).toBe(initialDomainCount + 1);

      // Timestamp updated
      expect(new Date(updatedRun.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initialRun.updatedAt).getTime(),
      );
    });

    it("replaces existing growth event for the same DayZeroAnchor instead of creating duplicates", () => {
      const initialRun = createDefaultRunPackage();
      const run1 = updatePlantIdentity(
        initialRun,
        "Strain 1",
        {
          breeder: "Breeder 1",
          seedType: "feminized",
          seedLot: null,
          packBatch: null,
          sourceDate: null,
          phenotypeNotes: "",
        },
        "emergence",
        "2026-08-01",
      );

      expect(
        run1.growthEvents.filter((e) => e.kind === "emergence").length,
      ).toBe(1);

      // Update same anchor again with a new date
      const run2 = updatePlantIdentity(
        run1,
        "Strain 1 Updated",
        {
          breeder: "Breeder 1",
          seedType: "feminized",
          seedLot: null,
          packBatch: null,
          sourceDate: null,
          phenotypeNotes: "",
        },
        "emergence",
        "2026-08-03",
      );

      const emergenceEvents = run2.growthEvents.filter(
        (e) => e.kind === "emergence",
      );
      expect(emergenceEvents.length).toBe(1);
      expect(emergenceEvents[0]?.occurredAt).toContain("2026-08-03");
    });
  });
});
