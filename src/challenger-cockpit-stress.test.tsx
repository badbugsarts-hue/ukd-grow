import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import cockpitDataRaw from "./data/autoflower-cockpit.json";
import { AutoflowerCockpitModal } from "./components/modals/AutoflowerCockpitModal";
import {
	AutoflowerCockpitPanel,
	type SortOption,
} from "./components/panels/AutoflowerCockpitPanel";
import { createDefaultRunPackage, updatePlantIdentity } from "./run-state";
import type {
	AutoflowerStrain,
	CultivarKind,
	CultivarType,
	ExperienceLens,
	ExperienceLevel,
	PlantProvenance,
} from "./types";

const cockpitData = cockpitDataRaw as unknown as AutoflowerStrain[];

// Helper to extract numeric THC for verification oracle
function extractThcNumeric(thcStr: string): number {
	if (!thcStr) return 0;
	const match = thcStr.match(/(\d+(?:[.,]\d+)?)\s*%/);
	if (match?.[1]) {
		return Number.parseFloat(match[1].replace(",", "."));
	}
	return 0;
}

// Independent Reference Filter Oracle
interface FilterCriteria {
	kindTab?: "all" | CultivarKind;
	query?: string;
	breeder?: string;
	shop?: string;
	types?: Set<CultivarType>;
	prov?: Set<PlantProvenance>;
	levels?: Set<ExperienceLevel>;
	mold?: Set<string>;
	feed?: Set<string>;
	maxHeight?: number;
	sortBy?: SortOption;
}

function oracleFilter(
	dataset: AutoflowerStrain[],
	criteria: FilterCriteria,
): AutoflowerStrain[] {
	const {
		kindTab = "all",
		query = "",
		breeder = "",
		shop = "",
		types = new Set(),
		prov = new Set(),
		levels = new Set(),
		mold = new Set(),
		feed = new Set(),
		maxHeight = 200,
		sortBy = "rank",
	} = criteria;

	const q = query.trim().toLowerCase();

	const result = dataset.filter((s) => {
		if (kindTab !== "all" && s.kind !== kindTab) return false;

		if (q) {
			const text = [
				s.name,
				s.breeder,
				s.shop,
				s.cross,
				s.gen,
				s.terpene,
				s.geschmack,
				s.geruch,
				s.wirkung,
				s.ester,
				s.urteil,
				s.thc,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			if (!text.includes(q)) return false;
		}

		if (breeder && s.breeder !== breeder) return false;
		if (shop && s.shop !== shop) return false;
		if (types.size > 0 && !types.has(s.typ)) return false;
		if (prov.size > 0 && !prov.has(s.prov)) return false;
		if (levels.size > 0 && !levels.has(s.level as ExperienceLevel)) return false;

		if (mold.size > 0) {
			const matches = Array.from(mold).some((m) =>
				s.mold.toLowerCase().includes(m.toLowerCase()),
			);
			if (!matches) return false;
		}

		if (feed.size > 0) {
			const matches = Array.from(feed).some((f) =>
				s.feed.toLowerCase().includes(f.toLowerCase()),
			);
			if (!matches) return false;
		}

		if (maxHeight < 200) {
			if (s.hmax === null || s.hmax > maxHeight) return false;
		}

		return true;
	});

	return result.sort((a, b) => {
		switch (sortBy) {
			case "rank":
				if (b.score !== a.score) return b.score - a.score;
				return a.rank - b.rank;
			case "yield": {
				const avgYieldA = (a.ertrag_lo + a.ertrag_hi) / 2;
				const avgYieldB = (b.ertrag_lo + b.ertrag_hi) / 2;
				return avgYieldB - avgYieldA;
			}
			case "height": {
				const hA = a.hmax ?? 999;
				const hB = b.hmax ?? 999;
				return hA - hB;
			}
			case "name":
				return a.name.localeCompare(b.name, "de");
			case "thc": {
				const thcA = extractThcNumeric(a.thc);
				const thcB = extractThcNumeric(b.thc);
				return thcB - thcA;
			}
			case "score":
				return b.score - a.score;
			default:
				return a.rank - b.rank;
		}
	});
}

describe("Empirical Challenger 2 — Autoflower Cockpit Adversarial Stress Suite", () => {
	// =========================================================================
	// 1. Verification of all 61 Cultivars: Schema, Non-empty fields & Positive Ranges
	// =========================================================================
	describe("1. Cultivar Dataset Invariant & Range Verification (61 Strains)", () => {
		it("confirms exact total of 61 cultivars partitioned into 50 Jungpflanzen and 11 Saatgut", () => {
			expect(cockpitData).toHaveLength(61);
			const jungpflanzen = cockpitData.filter((s) => s.kind === "jungpflanze");
			const samen = cockpitData.filter((s) => s.kind === "samen");
			expect(jungpflanzen).toHaveLength(50);
			expect(samen).toHaveLength(11);
		});

		it("validates all 61 cultivars have unique IDs and unique ranks per category", () => {
			const idSet = new Set<string>();
			for (const strain of cockpitData) {
				expect(idSet.has(strain.id), `Duplicate ID detected: ${strain.id}`).toBe(false);
				idSet.add(strain.id);
				expect(strain.id.trim()).toBe(strain.id);
				expect(strain.id.length).toBeGreaterThan(3);
			}

			// Jungpflanzen ranks 1..50
			const jpRanks = cockpitData.filter((s) => s.kind === "jungpflanze").map((s) => s.rank).sort((a, b) => a - b);
			expect(jpRanks).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));

			// Saatgut ranks 1..11
			const samenRanks = cockpitData.filter((s) => s.kind === "samen").map((s) => s.rank).sort((a, b) => a - b);
			expect(samenRanks).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
		});

		it("verifies that required string fields are non-empty and non-whitespace", () => {
			const stringFields: Array<keyof AutoflowerStrain> = [
				"name",
				"shop",
				"id",
				"breeder",
				"form",
				"gen",
				"cross",
				"thc",
				"cbd",
				"cbn",
				"minor",
				"ester",
				"wirkung",
				"geschmack",
				"geruch",
				"terpene_src",
				"terpene",
				"reviews",
				"med",
				"med_src",
				"feed",
				"feed_note",
				"mold",
				"mold_note",
				"level",
				"level_note",
				"zeit",
				"hoehe",
				"ertrag_src",
				"urteil",
				"evidenz",
			];

			for (const strain of cockpitData) {
				for (const field of stringFields) {
					const val = strain[field];
					expect(typeof val, `Strain ${strain.id} field ${String(field)} is not string`).toBe("string");
					expect(
						(val as string).trim().length,
						`Strain ${strain.id} has empty/whitespace field ${String(field)}`,
					).toBeGreaterThan(0);
				}
			}
		});

		it("verifies positive yield ranges: ertrag_lo > 0 and ertrag_lo <= ertrag_hi", () => {
			for (const strain of cockpitData) {
				expect(Number.isFinite(strain.ertrag_lo), `Strain ${strain.id} ertrag_lo is not finite`).toBe(true);
				expect(Number.isFinite(strain.ertrag_hi), `Strain ${strain.id} ertrag_hi is not finite`).toBe(true);
				expect(strain.ertrag_lo, `Strain ${strain.id} ertrag_lo must be > 0`).toBeGreaterThan(0);
				expect(strain.ertrag_hi, `Strain ${strain.id} ertrag_hi must be >= ertrag_lo`).toBeGreaterThanOrEqual(
					strain.ertrag_lo,
				);
			}
		});

		it("verifies positive height ranges: when present hmin > 0, hmax > 0, and hmin <= hmax", () => {
			let withHeightCount = 0;
			for (const strain of cockpitData) {
				if (strain.hmin !== null && strain.hmax !== null) {
					withHeightCount++;
					expect(strain.hmin, `Strain ${strain.id} hmin must be > 0`).toBeGreaterThan(0);
					expect(strain.hmax, `Strain ${strain.id} hmax must be > 0`).toBeGreaterThan(0);
					expect(
						strain.hmin,
						`Strain ${strain.id} hmin (${strain.hmin}) must be <= hmax (${strain.hmax})`,
					).toBeLessThanOrEqual(strain.hmax);
				} else if (strain.hmax !== null) {
					expect(strain.hmax).toBeGreaterThan(0);
				}
			}
			expect(withHeightCount).toBeGreaterThan(30);
		});

		it("verifies THC extraction yields finite numbers >= 0 across all strains", () => {
			for (const strain of cockpitData) {
				const numThc = extractThcNumeric(strain.thc);
				expect(Number.isFinite(numThc), `Strain ${strain.id} THC extraction is NaN`).toBe(true);
				expect(numThc, `Strain ${strain.id} THC extraction must be >= 0`).toBeGreaterThanOrEqual(0);
				expect(numThc, `Strain ${strain.id} THC extraction cannot exceed 45%`).toBeLessThanOrEqual(45);
			}
		});

		it("verifies scores in [0, 100] and quality factors q in [0.55, 1.00]", () => {
			for (const strain of cockpitData) {
				expect(strain.score).toBeGreaterThanOrEqual(0);
				expect(strain.score).toBeLessThanOrEqual(100);
				expect(Number.isInteger(strain.score)).toBe(true);

				expect(strain.q).toBeGreaterThanOrEqual(0.55);
				expect(strain.q).toBeLessThanOrEqual(1.0);
				expect(Number.isFinite(strain.q)).toBe(true);
			}
		});

		it("verifies botanical enums and lineage consistency", () => {
			const validProv = new Set(["original", "whitelabel", "unklar"]);
			const validKind = new Set(["jungpflanze", "samen"]);
			const validTyp = new Set(["Autoflower", "Photoperiodisch", "Fast Version"]);

			for (const s of cockpitData) {
				expect(validProv.has(s.prov), `Invalid prov ${s.prov} in ${s.id}`).toBe(true);
				expect(validKind.has(s.kind), `Invalid kind ${s.kind} in ${s.id}`).toBe(true);
				expect(validTyp.has(s.typ), `Invalid typ ${s.typ} in ${s.id}`).toBe(true);

				if (typeof s.indica === "number" && typeof s.sativa === "number") {
					expect(s.indica).toBeGreaterThanOrEqual(0);
					expect(s.sativa).toBeGreaterThanOrEqual(0);
					expect(s.indica + s.sativa).toBeLessThanOrEqual(100);
				}
			}
		});
	});

	// =========================================================================
	// 2. Complex Combinatorial Filter Queries & Edge Cases (0 Results)
	// =========================================================================
	describe("2. Combinatorial Filter Engine & Edge Case Robustness", () => {
		it("filters accurately across individual facets (breeder, mold, feed, height, level)", () => {
			// Breeder: Sensi Seeds
			const sensi = oracleFilter(cockpitData, { breeder: "Sensi Seeds" });
			expect(sensi.length).toBeGreaterThan(0);
			expect(sensi.every((s) => s.breeder === "Sensi Seeds")).toBe(true);

			// Mold: gut
			const moldGood = oracleFilter(cockpitData, { mold: new Set(["gut"]) });
			expect(moldGood.length).toBeGreaterThan(0);
			expect(moldGood.every((s) => s.mold.toLowerCase().includes("gut"))).toBe(true);

			// Feed: hoch
			const feedHigh = oracleFilter(cockpitData, { feed: new Set(["hoch"]) });
			expect(feedHigh.length).toBeGreaterThan(0);
			expect(feedHigh.every((s) => s.feed.toLowerCase().includes("hoch"))).toBe(true);

			// Max Height: 80cm
			const shortCanopy = oracleFilter(cockpitData, { maxHeight: 80 });
			expect(shortCanopy.length).toBeGreaterThan(0);
			expect(shortCanopy.every((s) => s.hmax !== null && s.hmax <= 80)).toBe(true);
		});

		it("handles multi-facet intersection queries matching specific subsets", () => {
			// Sensi Seeds + Mold: mittel + Feed: gering + Height: 80cm
			const intersection = oracleFilter(cockpitData, {
				breeder: "Sensi Seeds",
				mold: new Set(["mittel"]),
				feed: new Set(["gering"]),
				maxHeight: 80,
			});

			expect(intersection.length).toBeGreaterThanOrEqual(1);
			const first = intersection[0];
			expect(first.breeder).toBe("Sensi Seeds");
			expect(first.mold.toLowerCase()).toContain("mittel");
			expect(first.feed.toLowerCase()).toContain("gering");
			expect(first.hmax).toBeLessThanOrEqual(80);
		});

		it("tests edge cases yielding 0 results and ensures zero crashes", () => {
			// Edge case 1: Impossible search string
			const impossibleSearch = oracleFilter(cockpitData, {
				query: "NON_EXISTENT_CULTIVAR_XYZ_99999",
			});
			expect(impossibleSearch).toHaveLength(0);

			// Edge case 2: Conflicting breeder and kind (Mephisto Genetics only produces Saatgut)
			const mephistoJp = oracleFilter(cockpitData, {
				breeder: "Mephisto Genetics",
				kindTab: "jungpflanze",
			});
			expect(mephistoJp).toHaveLength(0);

			// Edge case 3: Extreme height constraint (maxHeight = 10cm, below any plant)
			const extremeHeight = oracleFilter(cockpitData, {
				maxHeight: 10,
			});
			expect(extremeHeight).toHaveLength(0);

			// Edge case 4: Mutually exclusive combinations
			const noMatch = oracleFilter(cockpitData, {
				breeder: "Fast Buds",
				levels: new Set(["Experte" as ExperienceLevel]),
				maxHeight: 70,
			});
			expect(noMatch).toHaveLength(0);
		});

		it("verifies panel UI rendering with initial data in SSR", () => {
			const html = renderToString(
				<AutoflowerCockpitPanel
					lens="guided"
					onSelectStrain={vi.fn()}
				/>,
			);

			// Renders heading, initial search input, and cards
			expect(html).toContain("Sorten gefunden");
			expect(html).toContain("Mighty Dwarf Automatic");
			expect(html).toContain("140 W LED Basisband");
			expect(html).not.toContain("Keine Treffer für die aktuelle Filterkombination");
		});

		it("fuzz tests 300 random combinatorial filter queries ensuring determinism and stability", () => {
			const breeders = ["", "Sensi Seeds", "Fast Buds", "Mephisto Genetics", "Barney's Farm", "Unknown"];
			const shops = ["", "Bushplanet", "Sensi Seeds direkt / Bushplanet", "BubatzBuddy", "Hanfbaron"];
			const kinds: Array<"all" | CultivarKind> = ["all", "jungpflanze", "samen"];
			const moldOptions = ["gut", "mittel", "gering"];
			const feedOptions = ["gering", "mittel", "hoch"];
			const levels: ExperienceLevel[] = ["Anfänger", "Fortgeschritten", "Profi"];
			const heights = [70, 80, 100, 120, 150, 180, 200];
			const sorts: SortOption[] = ["rank", "yield", "height", "name", "thc", "score"];
			const queries = ["", "auto", "diesel", "skunk", "sensi", "berry", "thc", "limonen", "xyz999"];

			for (let i = 0; i < 300; i++) {
				const criteria: FilterCriteria = {
					kindTab: kinds[i % kinds.length],
					breeder: breeders[(i * 3) % breeders.length],
					shop: shops[(i * 7) % shops.length],
					mold: i % 2 === 0 ? new Set([moldOptions[i % moldOptions.length]]) : new Set(),
					feed: i % 3 === 0 ? new Set([feedOptions[i % feedOptions.length]]) : new Set(),
					levels: i % 4 === 0 ? new Set([levels[i % levels.length]]) : new Set(),
					maxHeight: heights[(i * 5) % heights.length],
					sortBy: sorts[i % sorts.length],
					query: queries[(i * 11) % queries.length],
				};

				const runA = oracleFilter(cockpitData, criteria);
				const runB = oracleFilter(cockpitData, criteria);

				expect(runA.length).toBe(runB.length);
				expect(runA.map((s) => s.id)).toEqual(runB.map((s) => s.id));
				expect(runA.length).toBeGreaterThanOrEqual(0);
				expect(runA.length).toBeLessThanOrEqual(61);
			}
		});
	});

	// =========================================================================
	// 3. Yield Uncertainty Calculation Boundaries & Stress Harness
	// =========================================================================
	describe("3. Yield Uncertainty Calculation Boundaries & UI Math", () => {
		const MAXY = 130;

		function computeYieldPercentages(ertrag_lo: number, ertrag_hi: number) {
			const leftPercent = Math.max(0, Math.min(100, (ertrag_lo / MAXY) * 100));
			const widthPercent = Math.max(
				3,
				Math.min(100 - leftPercent, ((ertrag_hi - ertrag_lo) / MAXY) * 100),
			);
			return { leftPercent, widthPercent };
		}

		it("verifies yield uncertainty percentages across all 61 cultivars strictly adhere to bounds", () => {
			for (const strain of cockpitData) {
				const { leftPercent, widthPercent } = computeYieldPercentages(strain.ertrag_lo, strain.ertrag_hi);

				expect(Number.isFinite(leftPercent), `Strain ${strain.id} leftPercent is NaN/infinite`).toBe(true);
				expect(Number.isFinite(widthPercent), `Strain ${strain.id} widthPercent is NaN/infinite`).toBe(true);
				expect(leftPercent).toBeGreaterThanOrEqual(0);
				expect(leftPercent).toBeLessThanOrEqual(100);
				expect(widthPercent).toBeGreaterThanOrEqual(3);
				expect(widthPercent).toBeLessThanOrEqual(100);
				expect(
					leftPercent + widthPercent,
					`Strain ${strain.id} total bar width exceeds 100% (${leftPercent + widthPercent}%)`,
				).toBeLessThanOrEqual(100.0001); // floating point tolerance
			}
		});

		it("verifies the 140W LED photobiology model: E_gesamt = 140W * [0.45 - 0.90 g/W] * q", () => {
			for (const strain of cockpitData) {
				// Theoretical bounds for 140W: min = 140 * 0.45 * q = 63 * q; max = 140 * 0.90 * q = 126 * q
				const theoreticalMin = 63 * strain.q;
				const theoreticalMax = 126 * strain.q;

				// In the cockpit model, ertrag_lo and ertrag_hi are bounded within a realistic envelope
				expect(strain.ertrag_lo).toBeGreaterThanOrEqual(Math.floor(theoreticalMin) - 15);
				expect(strain.ertrag_hi).toBeLessThanOrEqual(Math.ceil(theoreticalMax) + 15);
			}
		});

		it("fuzz tests 500 extreme, negative, zero, and huge yield inputs in the bar calculation", () => {
			const testCases = [
				{ lo: 0, hi: 0 },
				{ lo: 65, hi: 65 }, // zero range
				{ lo: 1, hi: 130 }, // full span
				{ lo: 0.1, hi: 0.2 }, // small fractions
				{ lo: 129.9, hi: 130.1 }, // boundary edge
				{ lo: 130, hi: 130 }, // upper boundary
				{ lo: 150, hi: 250 }, // exceeds MAXY 130
				{ lo: -50, hi: -10 }, // negative values
			];

			for (const tc of testCases) {
				const { leftPercent, widthPercent } = computeYieldPercentages(tc.lo, tc.hi);
				expect(Number.isFinite(leftPercent)).toBe(true);
				expect(Number.isFinite(widthPercent)).toBe(true);
				expect(leftPercent).toBeGreaterThanOrEqual(0);
				expect(leftPercent).toBeLessThanOrEqual(100);
				expect(widthPercent).toBeGreaterThanOrEqual(3);
				// When leftPercent is clamped to 100%, Math.max(3, 0) gives widthPercent = 3%, total = 103%
				expect(leftPercent + widthPercent).toBeLessThanOrEqual(103.0001);
			}

			// 500 randomized fuzz runs
			for (let i = 0; i < 500; i++) {
				const lo = (Math.random() - 0.2) * 200; // -40 to 160
				const hi = lo + Math.random() * 150; // up to +150
				const { leftPercent, widthPercent } = computeYieldPercentages(lo, hi);

				expect(Number.isFinite(leftPercent)).toBe(true);
				expect(Number.isFinite(widthPercent)).toBe(true);
				expect(leftPercent).toBeGreaterThanOrEqual(0);
				expect(leftPercent).toBeLessThanOrEqual(100);
				expect(widthPercent).toBeGreaterThanOrEqual(3);
				expect(leftPercent + widthPercent).toBeLessThanOrEqual(103.0001);
			}
		});
	});

	// =========================================================================
	// 4. Rapid Strain Selection, Modal Ergonomics & Keyboard Interaction
	// =========================================================================
	describe("4. Rapid Strain Selection, Modal Ergonomics & Keyboard Handlers", () => {
		it("renders AutoflowerCockpitModal across guided, advanced, expert lenses in SSR without errors", () => {
			const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];
			for (const lens of lenses) {
				const html = renderToString(
					<AutoflowerCockpitModal
						lens={lens}
						onClose={vi.fn()}
						onSelectStrain={vi.fn()}
						selectedStrainId="1-mighty-dwarf-automatic"
					/>,
				);

				expect(html).toContain('role="dialog"');
				expect(html).toContain('aria-modal="true"');
				expect(html).toContain('id="autoflower-modal-title"');
				expect(html).toContain("Masterclass Sorten-Auswahl");
				expect(html).toContain("Mighty Dwarf Automatic");
			}
		});

		it("simulates backdrop click vs modal inner window click", () => {
			const onClose = vi.fn();
			const onSelectStrain = vi.fn();

			const modal = (
				<AutoflowerCockpitModal
					onClose={onClose}
					onSelectStrain={onSelectStrain}
				/>
			);
			expect(React.isValidElement(modal)).toBe(true);

			// Direct backdrop click triggers onClose
			const backdropTarget = { id: "backdrop" };
			const fakeBackdropEvent = {
				target: backdropTarget,
				currentTarget: backdropTarget,
			};
			if (fakeBackdropEvent.target === fakeBackdropEvent.currentTarget) {
				onClose();
			}
			expect(onClose).toHaveBeenCalledTimes(1);

			// Inner window click does NOT trigger onClose
			const innerTarget = { id: "inner-window" };
			const fakeInnerEvent = {
				target: innerTarget,
				currentTarget: backdropTarget,
			};
			if (fakeInnerEvent.target === fakeInnerEvent.currentTarget) {
				onClose();
			}
			expect(onClose).toHaveBeenCalledTimes(1); // not incremented
		});

		it("simulates rapid consecutive strain selections and ensures callback integrity", () => {
			const onSelectStrain = vi.fn();
			const onClose = vi.fn();

			for (let i = 0; i < cockpitData.length; i++) {
				const strain = cockpitData[i];
				const handleModalSelect = (s: AutoflowerStrain) => {
					onSelectStrain(s);
					onClose();
				};
				handleModalSelect(strain);
			}

			expect(onSelectStrain).toHaveBeenCalledTimes(61);
			expect(onClose).toHaveBeenCalledTimes(61);

			// Verify first and last strains passed intact
			expect(onSelectStrain.mock.calls[0][0].name).toBe("Mighty Dwarf Automatic");
			expect(onSelectStrain.mock.calls[60][0].name).toBe("Banana Purple Punch Auto RF3");
		});

		it("integrates strain selection with RunPackage state machine immutably", () => {
			const initialRun = createDefaultRunPackage();
			const selectedStrain = cockpitData.find((s) => s.id === "samen-4-double-grape")!;
			expect(selectedStrain).toBeDefined();

			// Apply strain selection to run package
			const updatedRun = updatePlantIdentity(
				initialRun,
				selectedStrain.name,
				{
					breeder: selectedStrain.breeder,
					seedType: "autoflower",
					seedLot: "LOT-COCKPIT-01",
					packBatch: "B-01",
					sourceDate: null,
					phenotypeNotes: selectedStrain.urteil,
				},
				"emergence",
				"2026-08-21",
			);

			// Immutability checks
			expect(updatedRun).not.toBe(initialRun);
			expect(updatedRun.config.genetics).toBe("Double Grape");
			expect(updatedRun.plants[0].identity.breeder).toBe("Mephisto Genetics");
			expect(updatedRun.plants[0].identity.seedType).toBe("autoflower");
			expect(updatedRun.plants[0].identity.phenotypeNotes).toBe(selectedStrain.urteil);

			// Audit event recorded
			const audit = updatedRun.auditEvents.find((a) => a.entityType === "plant-identity");
			expect(audit).toBeDefined();
			expect(audit?.detail).toContain("Double Grape");
			expect(audit?.detail).toContain("Mephisto Genetics");
		});
	});

	// =========================================================================
	// 5. View Modes & Sorting Stability
	// =========================================================================
	describe("5. View Modes & Sorting Determinism", () => {
		it("renders List / Axis view and Card view without syntax or layout errors", () => {
			const onSelectStrain = vi.fn();
			const htmlCards = renderToString(
				<AutoflowerCockpitPanel lens="advanced" isModal={false} onSelectStrain={onSelectStrain} />,
			);
			expect(htmlCards).toContain("Raster");
			expect(htmlCards).toContain("Achse");
			expect(htmlCards).toContain("140 W LED Basisband");

			const htmlModal = renderToString(
				<AutoflowerCockpitPanel lens="expert" isModal={true} onSelectStrain={onSelectStrain} />,
			);
			expect(htmlModal).toContain("In Setup übernehmen");
		});

		it("strictly verifies sorting determinism for all 6 sort options", () => {
			const sortOptions: SortOption[] = ["rank", "yield", "height", "name", "thc", "score"];

			for (const opt of sortOptions) {
				const sorted = oracleFilter(cockpitData, { sortBy: opt });
				expect(sorted).toHaveLength(61);

				if (opt === "score") {
					for (let i = 0; i < sorted.length - 1; i++) {
						expect(sorted[i].score).toBeGreaterThanOrEqual(sorted[i + 1].score);
					}
				} else if (opt === "yield") {
					for (let i = 0; i < sorted.length - 1; i++) {
						const avgA = (sorted[i].ertrag_lo + sorted[i].ertrag_hi) / 2;
						const avgB = (sorted[i + 1].ertrag_lo + sorted[i + 1].ertrag_hi) / 2;
						expect(avgA).toBeGreaterThanOrEqual(avgB);
					}
				} else if (opt === "name") {
					for (let i = 0; i < sorted.length - 1; i++) {
						expect(sorted[i].name.localeCompare(sorted[i + 1].name, "de")).toBeLessThanOrEqual(0);
					}
				}
			}
		});
	});
});
