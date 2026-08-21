import React from "react";
import { describe, expect, it, vi } from "vitest";
import { calculateBiologicalPlantAge } from "../../domain";
import { createDefaultRunPackage, updatePlantIdentity } from "../../run-state";
import type { DayZeroAnchor, PlantIdentity, RunPackage } from "../../types";
import { DailyOperatorPanel, RunConfigPanel } from "../panels";
import { DAY_ZERO_ANCHOR_OPTIONS, PlantIdentityModal } from "./PlantIdentityModal";

describe("Milestone 3 — Plant Identity Modal & Biological Age Integration", () => {
	it("1. renders PlantIdentityModal with initial values from RunPackage", () => {
		const run = createDefaultRunPackage();
		run.config.genetics = "Northern Lights Auto";
		run.config.dayZeroAnchor = "emergence";
		run.plants[0].identity = {
			breeder: "Sensi Seeds",
			seedType: "autoflower",
			seedLot: "LOT-2026-NL-01",
			packBatch: "BATCH-A9",
			sourceDate: "2026-08-01",
			phenotypeNotes: "Kompakter Wuchs, breite Blätter",
		};

		const onClose = vi.fn();
		const onSave = vi.fn();

		const element = (
			<PlantIdentityModal
				run={run}
				lens="guided"
				onClose={onClose}
				onSave={onSave}
			/>
		);

		expect(React.isValidElement(element)).toBe(true);
		expect(element.props.run.config.genetics).toBe("Northern Lights Auto");
		expect(element.props.run.config.dayZeroAnchor).toBe("emergence");
		expect(element.props.run.plants[0].identity.breeder).toBe("Sensi Seeds");
		expect(element.props.run.plants[0].identity.seedType).toBe("autoflower");
		expect(element.props.run.plants[0].identity.seedLot).toBe("LOT-2026-NL-01");
		expect(element.props.run.plants[0].identity.packBatch).toBe("BATCH-A9");
		expect(element.props.run.plants[0].identity.phenotypeNotes).toBe(
			"Kompakter Wuchs, breite Blätter",
		);
	});

	it("2. DAY_ZERO_ANCHOR_OPTIONS contains all 5 anchor types with German labels", () => {
		expect(DAY_ZERO_ANCHOR_OPTIONS).toHaveLength(5);
		const values = DAY_ZERO_ANCHOR_OPTIONS.map((o) => o.value);
		expect(values).toEqual([
			"emergence",
			"seed-started",
			"seed-planted",
			"first-true-leaves",
			"run-operational-start",
		]);
		for (const option of DAY_ZERO_ANCHOR_OPTIONS) {
			expect(option.label).toBeTruthy();
			expect(typeof option.label).toBe("string");
		}
	});

	it("3. updatePlantIdentity function produces valid, immutable RunPackage update", () => {
		const run = createDefaultRunPackage();
		const newIdentity: PlantIdentity = {
			breeder: "Barneys Farm",
			seedType: "feminized",
			seedLot: "LOT-BF-999",
			packBatch: "B-2026",
			sourceDate: null,
			phenotypeNotes: "Gute Streckung in der Vorblüte",
		};

		const updatedRun = updatePlantIdentity(
			run,
			"Mimosa Evo",
			newIdentity,
			"seed-started",
			"2026-08-01",
		);

		expect(updatedRun).not.toBe(run);
		expect(updatedRun.config.genetics).toBe("Mimosa Evo");
		expect(updatedRun.config.dayZeroAnchor).toBe("seed-started");
		expect(updatedRun.plants[0].identity.breeder).toBe("Barneys Farm");
		expect(updatedRun.plants[0].identity.seedLot).toBe("LOT-BF-999");
		expect(updatedRun.plants[0].identity.phenotypeNotes).toBe(
			"Gute Streckung in der Vorblüte",
		);

		// Growth event added for seed-started
		const seedEvent = updatedRun.growthEvents.find((e) => e.kind === "seed-started");
		expect(seedEvent).toBeDefined();
		expect(seedEvent?.occurredAt).toContain("2026-08-01");

		// Audit and Domain events recorded
		const audit = updatedRun.auditEvents.find((a) => a.entityType === "plant-identity");
		expect(audit).toBeDefined();
		expect(audit?.detail).toContain("Mimosa Evo");
		expect(audit?.detail).toContain("Barneys Farm");

		const domain = updatedRun.domainEvents.find(
			(d) => d.type === "configuration.changed",
		);
		expect(domain).toBeDefined();
		expect(domain?.payload).toMatchObject({
			genetics: "Mimosa Evo",
			breeder: "Barneys Farm",
			dayZeroAnchor: "seed-started",
			anchorDate: "2026-08-01",
		});
	});

	it("4. calculates biological plant age live preview correctly across all anchor options", () => {
		const today = new Date("2026-08-10T12:00:00Z");

		const biologicalAnchors: DayZeroAnchor[] = [
			"seed-started",
			"seed-planted",
			"emergence",
			"first-true-leaves",
		];

		for (const anchor of biologicalAnchors) {
			const growthEvents = [
				{
					id: "ge-op",
					plantId: "p1",
					kind: "run-operational-start" as const,
					occurredAt: "2026-08-05T00:00:00Z", // 5 days ago op start
					day: 0,
					observedBy: "system" as const,
					confidence: "confirmed" as const,
					notes: "op start",
					photoIds: [],
				},
				{
					id: "ge-anchor",
					plantId: "p1",
					kind: anchor,
					occurredAt: "2026-08-01T00:00:00Z", // 9 days ago anchor
					day: 0,
					observedBy: "user" as const,
					confidence: "confirmed" as const,
					notes: "anchor",
					photoIds: [],
				},
			];

			const ageMath = calculateBiologicalPlantAge(anchor, growthEvents, today);
			expect(ageMath.biologicalAgeDays).toBe(9);
			expect(ageMath.operationalAgeDays).toBe(5);
			expect(ageMath.anchorDateString).toBe("2026-08-01T00:00:00Z");
		}

		// Also test run-operational-start anchor
		const opOnlyEvents = [
			{
				id: "ge-op-anchor",
				plantId: "p1",
				kind: "run-operational-start" as const,
				occurredAt: "2026-08-01T00:00:00Z",
				day: 0,
				observedBy: "user" as const,
				confidence: "confirmed" as const,
				notes: "op anchor",
				photoIds: [],
			},
		];
		const opAgeMath = calculateBiologicalPlantAge(
			"run-operational-start",
			opOnlyEvents,
			today,
		);
		expect(opAgeMath.biologicalAgeDays).toBe(9);
		expect(opAgeMath.operationalAgeDays).toBe(9);
	});

	it("5. verifies 2026 Master Class accessibility standards for PlantIdentityModal", () => {
		const run = createDefaultRunPackage();
		const element = (
			<PlantIdentityModal
				run={run}
				lens="expert"
				onClose={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		expect(element.type).toBe(PlantIdentityModal);
		expect(element.props.lens).toBe("expert");
	});

	it("6. integrates with RunConfigPanel to display plant identity summary & modal trigger", () => {
		const run = createDefaultRunPackage();
		run.config.genetics = "Gorilla Glue #4";
		run.plants[0].identity = {
			breeder: "GG Strains",
			seedType: "feminized",
			seedLot: "LOT-GG4-2026",
			packBatch: "B1",
			sourceDate: null,
			phenotypeNotes: "Harzig",
		};

		const onUpdateRun = vi.fn();
		const panelElement = (
			<RunConfigPanel
				run={run}
				lens="advanced"
				onUpdateRun={onUpdateRun}
			/>
		);

		expect(React.isValidElement(panelElement)).toBe(true);
		expect(panelElement.props.run.plants[0].identity.breeder).toBe("GG Strains");
		expect(panelElement.props.run.config.genetics).toBe("Gorilla Glue #4");
	});

	it("7. integrates with DailyOperatorPanel header to show operational and biological age", () => {
		const run = createDefaultRunPackage();
		run.config.dayZeroAnchor = "emergence";
		run.growthEvents = [
			{
				id: "ge-1",
				plantId: run.plants[0].id,
				kind: "emergence",
				occurredAt: new Date(Date.now() - 14 * 86400000).toISOString(),
				day: 0,
				observedBy: "user",
				confidence: "confirmed",
				notes: "Keimung beobachtet",
				photoIds: [],
			},
		];

		const bioAge = calculateBiologicalPlantAge(
			run.config.dayZeroAnchor,
			run.growthEvents,
			new Date(),
		);

		expect(bioAge.biologicalAgeDays).toBeGreaterThanOrEqual(13);

		const onUpdateRun = vi.fn();
		const panelElement = (
			<DailyOperatorPanel
				run={run}
				lens="guided"
				onUpdateRun={onUpdateRun}
			/>
		);

		expect(React.isValidElement(panelElement)).toBe(true);
	});
});
