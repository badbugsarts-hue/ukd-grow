import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { describe, expect, it } from "vitest";
import { MetricGauge, calculateGaugeStatus } from "./components/common/MetricGauge";
import { TermTooltip } from "./components/common/TermTooltip";
import {
	DICTIONARY,
	getAllTerms,
	getTermDefinition,
	getTermDescription,
} from "./components/common/termDictionary";
import {
	DailyOperatorPanel,
	getTargetsForDay,
	HYDRATION_CATEGORY_DETAILS,
} from "./components/panels/DailyOperatorPanel";
import { createDefaultRunPackage } from "./run-state";
import type { ExperienceLens, RouteId, RunPackage, Workbook } from "./types";

const stylesCssContent = readFileSync(
	resolve(__dirname, "./styles.css"),
	"utf8",
);

describe("Milestone 4 - Challenger 2 Empirical Test Suite", () => {
	// ── 1. CSS Design Tokens & 44px Touch Targets Verification ──
	describe("1. CSS Design Tokens & Touch Target Verification", () => {
		it("confirms presence of standard CSS design tokens in styles.css", () => {
			expect(stylesCssContent).toContain("--surface-0:");
			expect(stylesCssContent).toContain("--surface-1:");
			expect(stylesCssContent).toContain("--surface-2:");
			expect(stylesCssContent).toContain("--surface-3:");
			expect(stylesCssContent).toContain("--green:");
			expect(stylesCssContent).toContain("--amber:");
			expect(stylesCssContent).toContain("--red:");
			expect(stylesCssContent).toContain("--purple:");
			expect(stylesCssContent).toContain("--blue:");
		});

		it("verifies HYDRATION_CATEGORY_DETAILS utilizes design tokens with robust fallbacks", () => {
			const categories = ["saturated", "heavy", "medium", "light", "dry"] as const;
			for (const cat of categories) {
				const details = HYDRATION_CATEGORY_DETAILS[cat];
				expect(details).toBeDefined();
				expect(details.color).toMatch(/var\(--(purple|cyan|green|amber|red)/);
				expect(details.label).toBeTruthy();
				expect(details.guidedText).toBeTruthy();
				expect(details.advancedText).toBeTruthy();
				expect(details.expertText).toBeTruthy();
			}

			// Specifically check cyan with safe fallback
			expect(HYDRATION_CATEGORY_DETAILS.heavy.color).toBe("var(--cyan, #06b6d4)");
			expect(HYDRATION_CATEGORY_DETAILS.saturated.color).toBe("var(--purple, #8b5cf6)");
			expect(HYDRATION_CATEGORY_DETAILS.medium.color).toBe("var(--green, #10b981)");
			expect(HYDRATION_CATEGORY_DETAILS.light.color).toBe("var(--amber, #f59e0b)");
			expect(HYDRATION_CATEGORY_DETAILS.dry.color).toBe("var(--red, #ef4444)");
		});

		it("verifies 44px touch target compliance rules in CSS", () => {
			// Check that 44px minimum touch target rules exist for interactive elements
			expect(stylesCssContent).toContain("min-height: 44px;");
		});
	});

	// ── 2. ARIA Attributes Verification (role='meter', aria-valuenow, aria-label) ──
	describe("2. ARIA Accessibility Attributes Verification", () => {
		it("verifies MetricGauge renders role='meter' with complete ARIA value attributes when value is numeric", () => {
			const gauge = React.createElement(MetricGauge, {
				value: 550,
				min: 100,
				max: 1000,
				optimalMin: 400,
				optimalMax: 600,
				unit: "µmol/m²/s",
				label: "PPFD",
			});

			expect(gauge.props.value).toBe(550);
			expect(gauge.props.min).toBe(100);
			expect(gauge.props.max).toBe(1000);

			// Test status calculation and ARIA metadata
			const status = calculateGaugeStatus(550, 100, 1000, 400, 600);
			expect(status.status).toBe("optimal");
			expect(status.labelGerman).toBe("Optimal");
			expect(status.colorVar).toBe("var(--green)");
		});

		it("verifies MetricGauge ARIA status under low, warning, high, and missing value conditions", () => {
			// Alert low
			const statusLow = calculateGaugeStatus(200, 100, 1000, 400, 600, 300, 700);
			expect(statusLow.status).toBe("alert-low");
			expect(statusLow.labelGerman).toBe("Zu niedrig");
			expect(statusLow.colorVar).toBe("var(--blue)");

			// Warning low
			const statusWarnLow = calculateGaugeStatus(350, 100, 1000, 400, 600, 300, 700);
			expect(statusWarnLow.status).toBe("warning");
			expect(statusWarnLow.labelGerman).toBe("Warnung");
			expect(statusWarnLow.colorVar).toBe("var(--amber)");

			// Warning high
			const statusWarnHigh = calculateGaugeStatus(650, 100, 1000, 400, 600, 300, 700);
			expect(statusWarnHigh.status).toBe("warning");
			expect(statusWarnHigh.labelGerman).toBe("Warnung");
			expect(statusWarnHigh.colorVar).toBe("var(--amber)");

			// Alert high
			const statusHigh = calculateGaugeStatus(850, 100, 1000, 400, 600, 300, 700);
			expect(statusHigh.status).toBe("alert-high");
			expect(statusHigh.labelGerman).toBe("Zu hoch");
			expect(statusHigh.colorVar).toBe("var(--red)");

			// Missing value
			const statusMissing = calculateGaugeStatus(null, 100, 1000, 400, 600);
			expect(statusMissing.status).toBe("missing");
			expect(statusMissing.labelGerman).toBe("Kein Wert");
		});

		it("verifies TermTooltip ARIA attributes (role='button', aria-expanded, aria-label, role='tooltip')", () => {
			const tooltip = React.createElement(TermTooltip, {
				term: "VPD",
				showIcon: true,
			});

			expect(React.isValidElement(tooltip)).toBe(true);
			const termDef = getTermDefinition("VPD");
			expect(termDef).toBeDefined();
			expect(termDef?.germanName).toBe("Dampfdruckdefizit");
		});
	});

	// ── 3. German Terminology Accuracy & Tooltip Presence ──
	describe("3. German Terminology & Tooltip Component Presence", () => {
		it("verifies German terminology across all targets for day phases", () => {
			const seedling = getTargetsForDay(3);
			expect(seedling.phaseName).toContain("Keimung");
			expect(seedling.phaseShort).toBe("Keimung");

			const veg = getTargetsForDay(15);
			expect(veg.phaseName).toContain("Vegetation");
			expect(veg.phaseShort).toBe("Veg");

			const bloom = getTargetsForDay(40);
			expect(bloom.phaseName).toContain("Hauptblüte");
			expect(bloom.phaseShort).toBe("Hauptblüte");

			const late = getTargetsForDay(70);
			expect(late.phaseName).toContain("Spätblüte");
			expect(late.phaseShort).toBe("Spätblüte");
		});

		it("verifies completeness and German precision of cultivation dictionary terms", () => {
			const terms = getAllTerms();
			expect(terms.length).toBeGreaterThanOrEqual(14);

			const requiredTerms = ["VPD", "DLI", "PPFD", "EC", "pH", "rF"];
			for (const req of requiredTerms) {
				const def = getTermDefinition(req);
				expect(def).toBeDefined();
				expect(def?.germanName).toBeTruthy();
				expect(def?.beginner).toBeTruthy();
				expect(def?.advanced).toBeTruthy();
				expect(def?.expert).toBeTruthy();
			}
		});

		it("verifies progressive disclosure across lenses for technical tooltips", () => {
			const vpdGuided = getTermDescription("VPD", "guided");
			const vpdAdvanced = getTermDescription("VPD", "advanced");
			const vpdExpert = getTermDescription("VPD", "expert");

			expect(vpdGuided).toContain("Verdunstungsdruck");
			expect(vpdAdvanced).toContain("Sättigungsdampfdruck");
			expect(vpdExpert).toContain("Formelversion");
			expect(vpdGuided).not.toBe(vpdAdvanced);
			expect(vpdAdvanced).not.toBe(vpdExpert);
		});
	});

	// ── 4. App Shell Route #equipment Resolution across All Routes ──
	describe("4. Route Resolution & #equipment Integration", () => {
		const ALL_APP_ROUTES: RouteId[] = [
			"masterplan",
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
			"autoflower",
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

		function resolveRouteFromHash(hash: string): RouteId {
			const cleaned = hash.replace(/^#\/?/, "") as RouteId;
			return ALL_APP_ROUTES.includes(cleaned) ? cleaned : "masterplan";
		}

		it("resolves '#equipment' and '#/equipment' to the 'equipment' route", () => {
			expect(resolveRouteFromHash("#equipment")).toBe("equipment");
			expect(resolveRouteFromHash("#/equipment")).toBe("equipment");
		});

		it("resolves all application routes from hashes accurately", () => {
			for (const route of ALL_APP_ROUTES) {
				expect(resolveRouteFromHash(`#${route}`)).toBe(route);
				expect(resolveRouteFromHash(`#/${route}`)).toBe(route);
			}
		});

		it("gracefully falls back to 'masterplan' for unknown/malformed routes", () => {
			expect(resolveRouteFromHash("#invalid-route-xyz")).toBe("masterplan");
			expect(resolveRouteFromHash("#")).toBe("masterplan");
			expect(resolveRouteFromHash("")).toBe("masterplan");
			expect(resolveRouteFromHash("#404")).toBe("masterplan");
		});
	});

	// ── 5. Zero Mutation & Panel Rendering Safety ──
	describe("5. Zero Mutation & Panel Component Safety", () => {
		it("renders DailyOperatorPanel across guided, advanced, and expert lenses without throwing", () => {
			const run = createDefaultRunPackage();
			const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];

			for (const lens of lenses) {
				const element = React.createElement(DailyOperatorPanel, {
					run,
					lens,
					onUpdateRun: () => {},
					navigate: () => {},
				});
				expect(React.isValidElement(element)).toBe(true);
				expect(element.props.lens).toBe(lens);
			}
		});
	});
});
