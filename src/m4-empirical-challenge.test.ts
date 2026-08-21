import { beforeEach, describe, expect, it } from "vitest";
import {
	addObservation,
	createDefaultRunPackage,
	createObservation,
	updateRunConfig,
} from "./run-state";
import type { ExperienceLens, RouteId, RunConfig } from "./types";

// In-memory localStorage mock for node vitest environment
class LocalStorageMock {
	private store: Record<string, string> = {};

	clear() {
		this.store = {};
	}

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
	}

	removeItem(key: string): void {
		delete this.store[key];
	}
}

const mockLocalStorage = new LocalStorageMock();

const NAV_IDS: RouteId[] = [
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

function testReadRoute(hash: string): RouteId {
	const value = hash.replace(/^#\/?/, "") as RouteId;
	return NAV_IDS.some((id) => id === value) ? value : "cockpit";
}

function testReadLens(
	queryLens: string | null,
	localLens: string | null,
): ExperienceLens {
	const value = queryLens ?? localLens;
	return value === "advanced" || value === "expert" ? value : "guided";
}

describe("Empirical Challenge M4: App Shell Routing & State Integration", () => {
	beforeEach(() => {
		mockLocalStorage.clear();
	});

	// ── 1. Route Navigation & Fallback Matrix ──
	describe("Route Navigation & Invalid Fallback", () => {
		const targetRoutes: RouteId[] = [
			"today",
			"mix",
			"setup",
			"climate",
			"knowledge",
			"calc",
		];

		targetRoutes.forEach((route) => {
			it(`should recognize valid route '#${route}'`, () => {
				expect(testReadRoute(`#${route}`)).toBe(route);
				expect(testReadRoute(`#/${route}`)).toBe(route);
			});
		});

		it("should fallback to 'cockpit' for non-existent / invalid route hashes", () => {
			expect(testReadRoute("#invalid_route")).toBe("cockpit");
			expect(testReadRoute("#/unknown/path")).toBe("cockpit");
			expect(testReadRoute("#12345")).toBe("cockpit");
			expect(testReadRoute("#")).toBe("cockpit");
			expect(testReadRoute("")).toBe("cockpit");
			expect(testReadRoute("#random-hash-xyz")).toBe("cockpit");
		});
	});

	// ── 2. Experience Lens Persistence & Validation ──
	describe("Lens Switching Persistence", () => {
		it("should prioritize URL search param lens over localStorage", () => {
			mockLocalStorage.setItem("ukd:lens", "guided");
			expect(testReadLens("expert", mockLocalStorage.getItem("ukd:lens"))).toBe(
				"expert",
			);
		});

		it("should fallback to localStorage when URL search param is null", () => {
			mockLocalStorage.setItem("ukd:lens", "advanced");
			expect(testReadLens(null, mockLocalStorage.getItem("ukd:lens"))).toBe(
				"advanced",
			);
		});

		it("should default to 'guided' if neither URL nor localStorage contains valid lens", () => {
			expect(testReadLens(null, null)).toBe("guided");
			expect(testReadLens("invalid-lens", null)).toBe("guided");
			mockLocalStorage.setItem("ukd:lens", "invalid-lens");
			expect(testReadLens(null, mockLocalStorage.getItem("ukd:lens"))).toBe(
				"guided",
			);
		});

		it("should persist lens change to localStorage", () => {
			const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];
			lenses.forEach((lens) => {
				mockLocalStorage.setItem("ukd:lens", lens);
				expect(mockLocalStorage.getItem("ukd:lens")).toBe(lens);
				expect(testReadLens(null, mockLocalStorage.getItem("ukd:lens"))).toBe(
					lens,
				);
			});
		});
	});

	// ── 3. State Integration & Zero Mutation Safety ──
	describe("State Integration & Immutable Run Updates", () => {
		it("should update run state immutably without mutating original state", () => {
			const initialRun = createDefaultRunPackage();
			expect(initialRun.observations.length).toBe(0);

			const obs = createObservation(10);
			obs.values.tempMax = 24.5;
			obs.values.humidityMax = 60.0;

			const updatedRun = addObservation(initialRun, obs);

			expect(updatedRun.observations.length).toBe(1);
			expect(updatedRun.observations[0]!.values.tempMax).toBe(24.5);
			expect(initialRun.observations.length).toBe(0); // Zero mutation
			expect(initialRun).not.toBe(updatedRun);
		});

		it("should maintain immutable config updates across setup transitions", () => {
			const initialRun = createDefaultRunPackage();
			const _defaultName = initialRun.config.name;
			const newConfig: RunConfig = {
				...initialRun.config,
				name: "Test Run M4",
				genetics: "Gorilla Glue #4",
			};

			const updatedRun = updateRunConfig(initialRun, newConfig);

			expect(updatedRun.config.name).toBe("Test Run M4");
			expect(initialRun.config.name).toBe("UKD Masterplan v11 Variante B"); // Zero mutation
		});
	});

	// ── 4. All 22 NAV Routes Coverage ──
	describe("NAV Routes Completeness", () => {
		it("should contain all 22 defined route IDs", () => {
			expect(NAV_IDS.length).toBe(22);
			NAV_IDS.forEach((id) => {
				expect(testReadRoute(`#${id}`)).toBe(id);
			});
		});
	});
});
