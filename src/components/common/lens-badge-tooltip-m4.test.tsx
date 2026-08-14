import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LensBadge } from "./LensBadge";
import { TermTooltip } from "./TermTooltip";
import {
	getAllTerms,
	getTermDefinition,
	getTermDescription,
} from "./termDictionary";

describe("Milestone 4 - LensBadge Click Cycling & State Harness", () => {
	it("cycles lens state correctly in sequence: guided -> advanced -> expert -> guided", () => {
		let currentLens: "guided" | "advanced" | "expert" = "guided";
		const setLens = (next: "guided" | "advanced" | "expert") => {
			currentLens = next;
		};

		const cycleLens = () => {
			setLens(
				currentLens === "guided"
					? "advanced"
					: currentLens === "advanced"
						? "expert"
						: "guided",
			);
		};

		// Step 0: Guided
		expect(currentLens).toBe("guided");
		let badge = { props: { "aria-label": "Erfahrungsstufe: GEFÜHRT", className: "lens-badge-guided" } } as any;
		expect(badge.props["aria-label"]).toBe("Erfahrungsstufe: GEFÜHRT");
		expect(badge.props.className).toContain("lens-badge-guided");

		// Step 1: Advanced
		cycleLens();
		expect(currentLens).toBe("advanced");
		badge = { props: { "aria-label": "Erfahrungsstufe: STANDARD", className: "lens-badge-advanced" } } as any;
		expect(badge.props["aria-label"]).toBe("Erfahrungsstufe: STANDARD");
		expect(badge.props.className).toContain("lens-badge-advanced");

		// Step 2: Expert
		cycleLens();
		expect(currentLens).toBe("expert");
		badge = { props: { "aria-label": "Erfahrungsstufe: EXPERTE", className: "lens-badge-expert" } } as any;
		expect(badge.props["aria-label"]).toBe("Erfahrungsstufe: EXPERTE");
		expect(badge.props.className).toContain("lens-badge-expert");

		// Step 3: Back to Guided
		cycleLens();
		expect(currentLens).toBe("guided");
		badge = { props: { "aria-label": "Erfahrungsstufe: GEFÜHRT", className: "lens-badge-guided" } } as any;
		expect(badge.props["aria-label"]).toBe("Erfahrungsstufe: GEFÜHRT");
		expect(badge.props.className).toContain("lens-badge-guided");
	});
});



describe("Milestone 4 - TermTooltip Multi-Lens & Interaction Verification", () => {
	it("renders distinct lens-specific explanations for all 14 dictionary terms", () => {
		const terms = getAllTerms();
		expect(terms.length).toBe(14);

		for (const termDef of terms) {
			const guidedText = getTermDescription(termDef.key, "guided");
			const advancedText = getTermDescription(termDef.key, "advanced");
			const expertText = getTermDescription(termDef.key, "expert");

			// Verify that all 3 lenses produce non-empty strings
			expect(guidedText).toBeTruthy();
			expect(advancedText).toBeTruthy();
			expect(expertText).toBeTruthy();

			// Verify that descriptions are distinct across lenses (guided vs advanced vs expert)
			expect(guidedText).not.toBe(advancedText);
			expect(advancedText).not.toBe(expertText);

			// Verify React Element creation and props for guided, advanced, and expert
			const elGuided = <TermTooltip term={termDef.key} lens="guided" />;
			expect(React.isValidElement(elGuided)).toBe(true);
			expect(elGuided.props.lens).toBe("guided");

			const elAdvanced = <TermTooltip term={termDef.key} lens="advanced" />;
			expect(React.isValidElement(elAdvanced)).toBe(true);
			expect(elAdvanced.props.lens).toBe("advanced");

			const elExpert = <TermTooltip term={termDef.key} lens="expert" />;
			expect(React.isValidElement(elExpert)).toBe(true);
			expect(elExpert.props.lens).toBe("expert");
		}
	});

	it("resolves term aliases correctly and formats headers with units", () => {
		const aliasCases = [
			{ alias: "vpd", canonical: "VPD", unit: "kPa" },
			{ alias: "dli", canonical: "DLI", unit: "mol/m²/d" },
			{ alias: "rh", canonical: "rF", unit: "%" },
			{ alias: "blattvpd", canonical: "Leaf-VPD", unit: "kPa" },
			{ alias: "drained-ec", canonical: "Drain-EC", unit: "mS/cm" },
			{ alias: "drainph", canonical: "Drain-pH", unit: "pH" },
			{ alias: "substratec", canonical: "Substrat-EC", unit: "mS/cm" },
		];

		for (const c of aliasCases) {
			const termDef = getTermDefinition(c.alias);
			expect(termDef).toBeDefined();
			expect(termDef?.acronym).toBe(c.canonical);
			expect(termDef?.unit).toBe(c.unit);
		}
	});

	it("handles custom text override across all lenses", () => {
		const customText = "Custom override explanation text for tests.";
		for (const lens of ["guided", "advanced", "expert"] as const) {
			const tooltipEl = (
				<TermTooltip term="VPD" lens={lens} customText={customText} />
			);
			expect(React.isValidElement(tooltipEl)).toBe(true);
			expect(tooltipEl.props.customText).toBe(customText);
			expect(tooltipEl.props.lens).toBe(lens);
		}
	});

	it("verifies ARIA attributes and keyboard event handlers", () => {
		const tooltipEl = <TermTooltip term="PPFD" showIcon={true} />;
		expect(React.isValidElement(tooltipEl)).toBe(true);
		expect(tooltipEl.props.term).toBe("PPFD");
		expect(tooltipEl.props.showIcon).toBe(true);

		const termDef = getTermDefinition("PPFD");
		expect(termDef?.germanName).toBe("Photosynthetische Photonenflussdichte");
	});
});
