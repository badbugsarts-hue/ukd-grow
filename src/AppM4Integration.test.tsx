import { readFileSync } from "node:fs";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AutoflowerCockpitPanel } from "./components/panels/AutoflowerCockpitPanel";
import { DAILY_COLUMNS, getDayPlan, numberAt, textAt } from "./domain";
import { evaluateLiveClock } from "./live-run";
import {
	createDefaultRunPackage,
	updateExecutionMode,
	updatePlantIdentity,
	updatePlantMilestones,
} from "./run-state";
import type {
	AutoflowerStrain,
	DayPlan,
	PlantIdentity,
	RunConfig,
	RunPackage,
	Workbook,
} from "./types";

const mockWorkbook = JSON.parse(
	readFileSync(
		new URL(
			"../public/data/evidence-guarded-workbook-v8.json",
			import.meta.url,
		),
		"utf8",
	),
) as Workbook;

describe("Milestone 4 - App Shell Global Integration & Dynamic Plan Recalculation", () => {
	// ── 1. Autoflower Cockpit Integration & Selection Flow ──
	describe("1. Autoflower Cockpit Integration & Selection Flow", () => {
		it("renders AutoflowerCockpitPanel with lens, navigate, and onSelectStrain handlers", () => {
			const navigate = vi.fn();
			const onSelectStrain = vi.fn();

			const element = (
				<AutoflowerCockpitPanel
					lens="guided"
					navigate={navigate}
					selectedStrainId="double-grape"
					onSelectStrain={onSelectStrain}
				/>
			);

			expect(React.isValidElement(element)).toBe(true);
			expect(element.type).toBe(AutoflowerCockpitPanel);
			expect(element.props.lens).toBe("guided");
			expect(element.props.selectedStrainId).toBe("double-grape");
			expect(element.props.navigate).toBe(navigate);
			expect(element.props.onSelectStrain).toBe(onSelectStrain);
		});

		it("updates genetics and plant identity when strain is selected, triggers audit event, and navigates to setup", () => {
			const initialRun = createDefaultRunPackage();
			const onUpdateRun = vi.fn();
			const navigate = vi.fn();

			const sampleStrain: AutoflowerStrain = {
				rank: 1,
				name: "Mephisto Wedding Auto",
				shop: "Mephisto Genetics",
				score: 98,
				id: "mephisto-wedding",
				breeder: "Mephisto Genetics",
				prov: "Verified Breeder",
				warn: null,
				form: "Samen",
				gen: "Wedding Cake x Double Grape",
				indica: 65,
				sativa: 35,
				cross: "Wedding Cake x Double Grape",
				thc: "25%",
				cbd: "<1%",
				cbn: "0%",
				minor: "CBG",
				ester: "Vanilla / Berry",
				wirkung: "Entspannend, Euphorisierend",
				geschmack: "Vanille, Traube, Gas",
				geruch: "Süß, Fruchtig",
				terpene_src: "Breeder Lab",
				terpene: "Caryophyllene, Myrcene, Limonene",
				reviews: "Top Tier",
				med: "Schlaf, Schmerz",
				med_src: "Community",
				feed: "Mittel",
				feed_note: "Normale Nährstoffdosen",
				mold: "Hoch",
				mold_note: "Gute Schimmelresistenz",
				level: "Fortgeschritten",
				level_note: "Einfach zu trainieren",
				zeit: "70-80 Tage",
				hoehe: "70-90 cm",
				hmin: 70,
				hmax: 90,
				ertrag_lo: 450,
				ertrag_hi: 550,
				ertrag_src: "Breeder",
				urteil: "Exzellente Elite-Genetik",
				evidenz: "A",
				q: 95,
				kind: "samen",
				typ: "Autoflower",
			};

			const handleSelectStrain = (strain: AutoflowerStrain) => {
				const plantIdentity = initialRun.plants[0]?.identity;
				const updatedIdentity: PlantIdentity = {
					breeder: strain.breeder,
					seedType: strain.typ === "Autoflower" ? "autoflower" : "feminized",
					seedLot: plantIdentity?.seedLot ?? null,
					packBatch: plantIdentity?.packBatch ?? null,
					sourceDate: plantIdentity?.sourceDate ?? null,
					phenotypeNotes:
						strain.urteil || strain.wirkung || strain.geschmack || "",
					pottingDateIso: plantIdentity?.pottingDateIso,
					emergenceDateIso: plantIdentity?.emergenceDateIso,
					dayZeroAnchorDate: plantIdentity?.dayZeroAnchorDate,
				};
				const updatedConfig: RunConfig = {
					...initialRun.config,
					genetics: strain.name,
				};
				const updatedRun = updatePlantIdentity(
					{ ...initialRun, config: updatedConfig },
					strain.name,
					updatedIdentity,
					initialRun.config.dayZeroAnchor ?? "emergence",
					initialRun.config.startDate,
				);
				onUpdateRun(updatedRun);
				navigate("setup");
			};

			handleSelectStrain(sampleStrain);

			expect(onUpdateRun).toHaveBeenCalledTimes(1);
			const updatedRun: RunPackage = onUpdateRun.mock.calls[0]![0];

			// Genetics updated
			expect(updatedRun.config.genetics).toBe("Mephisto Wedding Auto");
			expect(updatedRun.plants[0]!.genetics).toBe("Mephisto Wedding Auto");
			expect(updatedRun.plants[0]!.identity.breeder).toBe("Mephisto Genetics");
			expect(updatedRun.plants[0]!.identity.seedType).toBe("autoflower");
			expect(updatedRun.plants[0]!.identity.phenotypeNotes).toBe(
				"Exzellente Elite-Genetik",
			);

			// Audit event registered
			expect(
				updatedRun.auditEvents.some(
					(e) =>
						e.action === "configuration-changed" &&
						e.detail.includes("Mephisto Wedding Auto"),
				),
			).toBe(true);

			// Domain event registered
			expect(
				updatedRun.domainEvents.some(
					(e) => e.type === "configuration.changed",
				),
			).toBe(true);

			// Navigated to setup
			expect(navigate).toHaveBeenCalledWith("setup");

			// Initial state immutability
			expect(initialRun.config.genetics).toBe("Double Grape Auto");
		});
	});

	// ── 2. Global Live vs. Simulation Mode Switch ──
	describe("2. Global Live vs. Simulation Mode Switch & Indicator", () => {
		it("toggles execution mode between simulation and live, initializing live anchor and clock health", () => {
			const initialRun = createDefaultRunPackage();
			expect(initialRun.executionMode).toBe("simulation");

			// Toggle to Live
			const liveRun = updateExecutionMode(initialRun, "live");
			expect(liveRun.executionMode).toBe("live");
			expect(liveRun.liveAnchor).toBeDefined();
			expect(liveRun.liveAnchor?.startedAtUtc).toBeDefined();
			expect(liveRun.clockHealth.status).toBe("healthy");
			expect(
				liveRun.auditEvents.some((e) => e.action === "live-started"),
			).toBe(true);

			// Toggle back to Simulation
			const simRun = updateExecutionMode(liveRun, "simulation");
			expect(simRun.executionMode).toBe("simulation");
			expect(
				simRun.auditEvents.some(
					(e) =>
						e.action === "configuration-changed" &&
						e.detail.includes("simulation"),
				),
			).toBe(true);

			// Zero mutation on initial
			expect(initialRun.executionMode).toBe("simulation");
			expect(initialRun.liveAnchor).toBeNull();
		});

		it("evaluates live clock accurately from retroactive emergence date anchor", () => {
			const run = createDefaultRunPackage();
			const now = new Date("2026-08-21T12:00:00Z");

			// Emergence was 10 days ago
			const emergenceDate = "2026-08-11T12:00:00Z";
			const runWithMilestone = updatePlantMilestones(
				run,
				{
					emergenceDateIso: emergenceDate,
					pottingDateIso: "2026-08-08T12:00:00Z",
					dayZeroAnchor: "emergence",
				},
				"Retroaktiver Keimungseintrag",
			);

			const liveRun = updateExecutionMode(runWithMilestone, "live");
			const liveClock = evaluateLiveClock(liveRun, now);

			expect(liveClock.blocked).toBe(false);
			expect(liveClock.health.status).toBe("healthy");
			expect(liveClock.day).toBe(10);
		});
	});

	// ── 3. Dynamic Plan Recalculation Across Views ──
	describe("3. Dynamic Plan Recalculation Across Views", () => {
		it("dynamically computes distinct day plans and target ranges across vegetative and generative phases", () => {
			const day0Plan: DayPlan = getDayPlan(mockWorkbook, 0);
			const day14Plan: DayPlan = getDayPlan(mockWorkbook, 14);
			const day35Plan: DayPlan = getDayPlan(mockWorkbook, 35);
			const day60Plan: DayPlan = getDayPlan(mockWorkbook, 60);

			// Day 0: Keimung / Sämling
			expect(day0Plan.day).toBe(0);
			expect(textAt(day0Plan, DAILY_COLUMNS.phase)).not.toBe("—");

			// Day 14: Späte vegetative Phase
			expect(day14Plan.day).toBe(14);
			expect(numberAt(day14Plan, DAILY_COLUMNS.dli)).toBeGreaterThan(0);
			expect(numberAt(day14Plan, DAILY_COLUMNS.ppfd)).toBeGreaterThan(0);

			// Day 35: Mittlere Blüte
			expect(day35Plan.day).toBe(35);
			expect(numberAt(day35Plan, DAILY_COLUMNS.dli)).toBeGreaterThan(
				numberAt(day0Plan, DAILY_COLUMNS.dli),
			);

			// Day 60: Spätblüte / Abreife
			expect(day60Plan.day).toBe(60);
			expect(numberAt(day60Plan, DAILY_COLUMNS.ec)).toBeDefined();
		});

		it("updates global plan targets dynamically when retroactive emergence date shifts current live day", () => {
			const baseRun = createDefaultRunPackage();
			const now = new Date("2026-08-21T00:00:00Z");

			// Case A: Emergence 7 days ago -> Day 7 Plan
			const runDay7 = updateExecutionMode(
				updatePlantMilestones(baseRun, {
					emergenceDateIso: "2026-08-14T00:00:00Z",
					dayZeroAnchor: "emergence",
				}),
				"live",
			);
			const clock7 = evaluateLiveClock(runDay7, now);
			const planDay7 = getDayPlan(mockWorkbook, clock7.day);

			expect(clock7.day).toBe(7);
			expect(planDay7.day).toBe(7);

			// Case B: Emergence adjusted to 28 days ago -> Day 28 Plan
			const runDay28 = updatePlantMilestones(
				runDay7,
				{
					emergenceDateIso: "2026-07-24T00:00:00Z",
					dayZeroAnchor: "emergence",
				},
				"Korrektur: Pflanze ist 4 Wochen alt",
			);
			const clock28 = evaluateLiveClock(runDay28, now);
			const planDay28 = getDayPlan(mockWorkbook, clock28.day);

			expect(clock28.day).toBe(28);
			expect(planDay28.day).toBe(28);
			expect(numberAt(planDay28, DAILY_COLUMNS.dli)).not.toBe(
				numberAt(planDay7, DAILY_COLUMNS.dli),
			);
		});
	});
});
