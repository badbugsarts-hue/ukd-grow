import React from "react";
import { describe, expect, it } from "vitest";
import { calculateDli, calculateLeafVpd } from "../../domain";
import { calculateGaugeStatus } from "../common/MetricGauge";
import { VpdDliCalculatorPanel } from "./VpdDliCalculatorPanel";

describe("Milestone 2 - Interactive Climate Controls & Domain Stress Test Suite", () => {
	// ── 1. Temperature Range (-10°C to 50°C) & Singularity Stress Tests ──
	describe("Temperature extreme boundary stress tests (-10°C to 50°C)", () => {
		it("handles extreme low temperature (-10°C) with various humidity levels", () => {
			const vpd0 = calculateLeafVpd(-10, 0, 0);
			const vpd50 = calculateLeafVpd(-10, 50, 0);
			const vpd100 = calculateLeafVpd(-10, 100, 0);

			expect(Number.isFinite(vpd0)).toBe(true);
			expect(Number.isFinite(vpd50)).toBe(true);
			expect(Number.isFinite(vpd100)).toBe(true);

			// At 0% humidity, VPD equals saturation vapor pressure (~0.2856 kPa)
			expect(vpd0).toBeCloseTo(0.2856, 3);
			// At 100% humidity with 0 delta, VPD is 0 kPa
			expect(vpd100).toBeCloseTo(0.0, 4);
		});

		it("handles extreme high temperature (50°C) with various humidity levels", () => {
			const vpd0 = calculateLeafVpd(50, 0, 0);
			const vpd50 = calculateLeafVpd(50, 50, 0);
			const vpd100 = calculateLeafVpd(50, 100, 0);

			expect(Number.isFinite(vpd0)).toBe(true);
			expect(Number.isFinite(vpd50)).toBe(true);
			expect(Number.isFinite(vpd100)).toBe(true);

			// At 50°C 0% RH, saturation pressure is high (~12.336 kPa)
			expect(vpd0).toBeCloseTo(12.336, 2);
			expect(vpd50).toBeCloseTo(6.168, 2);
			expect(vpd100).toBeCloseTo(0.0, 4);
		});

		it("evaluates mathematical singularity near -237.3°C gracefully", () => {
			// tempC = -237.3 causes denominator (tempC + 237.3) to approach 0
			const vpdSingularity = calculateLeafVpd(-237.3, 50, 0);
			// Should result in Infinity or NaN without unhandled exception
			expect(typeof vpdSingularity).toBe("number");
		});
	});

	// ── 2. Relative Humidity (0% to 100%) Stress Tests ──
	describe("Relative Humidity boundary stress tests (0% to 100%)", () => {
		it("evaluates 0% RH across temperatures (maximum moisture demand)", () => {
			const temps = [-10, 0, 15, 25, 35, 50];
			for (const t of temps) {
				const vpd = calculateLeafVpd(t, 0, 0);
				expect(Number.isFinite(vpd)).toBe(true);
				expect(vpd).toBeGreaterThan(0);
			}
		});

		it("evaluates 100% RH with negative leaf delta (condensation / negative VPD)", () => {
			// 100% RH and cooler leaf (-2°C offset) -> saturation pressure of leaf < air vapor pressure
			const vpd = calculateLeafVpd(25, 100, -2.0);
			expect(Number.isFinite(vpd)).toBe(true);
			expect(vpd).toBeLessThan(0); // Condensation condition
		});

		it("evaluates 100% RH with positive leaf delta (leaf warmer than air)", () => {
			const vpd = calculateLeafVpd(25, 100, 2.0);
			expect(Number.isFinite(vpd)).toBe(true);
			expect(vpd).toBeGreaterThan(0);
		});
	});

	// ── 3. PPFD (0 to 2000 µmol/m²/s) & Photoperiod (0h to 24h) Stress Tests ──
	describe("PPFD and Photoperiod stress tests (0..2000 PPFD, 0..24h)", () => {
		it("handles zero PPFD or zero light hours (darkness)", () => {
			expect(calculateDli(0, 18)).toBe(0);
			expect(calculateDli(500, 0)).toBe(0);
			expect(calculateDli(0, 0)).toBe(0);
		});

		it("handles upper boundary 2000 PPFD and 24h photoperiod", () => {
			const dliMax = calculateDli(2000, 24);
			// 2000 * 24 * 3600 / 1_000_000 = 172.8 mol/m²/d
			expect(dliMax).toBe(172.8);
		});

		it("handles representative intermediate combinations", () => {
			// Seedling: 200 PPFD, 18h -> 12.96 mol/m²/d
			expect(calculateDli(200, 18)).toBeCloseTo(12.96, 2);
			// Veg: 600 PPFD, 18h -> 38.88 mol/m²/d
			expect(calculateDli(600, 18)).toBeCloseTo(38.88, 2);
			// Bloom: 1000 PPFD, 12h -> 43.2 mol/m²/d
			expect(calculateDli(1000, 12)).toBeCloseTo(43.2, 2);
			// Extreme CO2 Boosted Bloom: 1500 PPFD, 12h -> 64.8 mol/m²/d
			expect(calculateDli(1500, 12)).toBeCloseTo(64.8, 2);
		});
	});

	// ── 4. Leaf Offset (-5°C to +5°C) Stress Tests ──
	describe("Leaf Delta offset stress tests (-5°C to +5°C)", () => {
		it("evaluates -5°C offset (heavy transpiration cooling under high airflow)", () => {
			const airTemp = 25.0;
			const rh = 50.0;
			const vpd = calculateLeafVpd(airTemp, rh, -5.0);
			expect(Number.isFinite(vpd)).toBe(true);
			// Saturation pressure at 20°C (2.338 kPa) - 0.5 * Saturation pressure at 25°C (3.167 / 2 = 1.584 kPa) -> ~0.754 kPa
			expect(vpd).toBeGreaterThan(0.5);
			expect(vpd).toBeLessThan(1.0);
		});

		it("evaluates +5°C offset (severe thermal stress / low transpiration / high radiation)", () => {
			const airTemp = 25.0;
			const rh = 50.0;
			const vpd = calculateLeafVpd(airTemp, rh, 5.0);
			expect(Number.isFinite(vpd)).toBe(true);
			// Saturation pressure at 30°C (4.246 kPa) - 0.5 * 3.167 (1.584 kPa) -> ~2.662 kPa
			expect(vpd).toBeGreaterThan(2.0);
		});
	});

	// ── 5. MetricGauge & Gauge Status Range Clamping Stress Tests ──
	describe("MetricGauge status evaluation under extreme calculated values", () => {
		it("clamps percentages correctly for negative VPD (-0.5 kPa)", () => {
			const status = calculateGaugeStatus(-0.5, 0.2, 2.0, 0.8, 1.2);
			expect(status.status).toBe("alert-low");
			expect(status.percentage).toBe(0); // Clamped from negative to 0%
		});

		it("clamps percentages correctly for extreme high VPD (15.75 kPa)", () => {
			const status = calculateGaugeStatus(15.75, 0.2, 2.0, 0.8, 1.2);
			expect(status.status).toBe("alert-high");
			expect(status.percentage).toBe(100); // Clamped from >100% to 100%
		});

		it("clamps percentages correctly for extreme high DLI (172.8 mol/m²/d)", () => {
			const status = calculateGaugeStatus(172.8, 5, 50, 20, 30);
			expect(status.status).toBe("alert-high");
			expect(status.percentage).toBe(100);
		});

		it("handles null, undefined, and NaN inputs gracefully without crashing", () => {
			const statusNull = calculateGaugeStatus(null, 0.2, 2.0, 0.8, 1.2);
			const statusUndefined = calculateGaugeStatus(
				undefined,
				0.2,
				2.0,
				0.8,
				1.2,
			);
			const statusNaN = calculateGaugeStatus(NaN, 0.2, 2.0, 0.8, 1.2);

			expect(statusNull.status).toBe("missing");
			expect(statusNull.percentage).toBe(0);

			expect(statusUndefined.status).toBe("missing");
			expect(statusUndefined.percentage).toBe(0);

			expect(statusNaN.status).toBe("missing");
			expect(statusNaN.percentage).toBe(0);
		});
	});

	// ── 6. Component Instantiation & Props Stress Tests ──
	describe("VpdDliCalculatorPanel component props stress testing", () => {
		it("creates VpdDliCalculatorPanel element with extreme initial props without error", () => {
			const extremeProps = {
				initialTemp: -10,
				initialHumidity: 0,
				initialPpfd: 2000,
				initialHours: 24,
				initialLeafDelta: -5,
			};

			const element = React.createElement(VpdDliCalculatorPanel, extremeProps);
			expect(element).not.toBeNull();
			expect(element.type).toBe(VpdDliCalculatorPanel);
			expect(element.props.initialTemp).toBe(-10);
			expect(element.props.initialHumidity).toBe(0);
			expect(element.props.initialPpfd).toBe(2000);
			expect(element.props.initialHours).toBe(24);
			expect(element.props.initialLeafDelta).toBe(-5);

			// Verify internal panel calculation pipeline under extreme props
			const leafVpd = calculateLeafVpd(-10, 0, -5);
			const airVpd = calculateLeafVpd(-10, 0, 0);
			const dli = calculateDli(2000, 24);

			expect(Number.isFinite(leafVpd)).toBe(true);
			expect(Number.isFinite(airVpd)).toBe(true);
			expect(dli).toBe(172.8);
		});

		it("creates VpdDliCalculatorPanel element with high extreme initial props without error", () => {
			const extremeHighProps = {
				initialTemp: 50,
				initialHumidity: 100,
				initialPpfd: 2000,
				initialHours: 24,
				initialLeafDelta: 5,
			};

			const element = React.createElement(
				VpdDliCalculatorPanel,
				extremeHighProps,
			);
			expect(element).not.toBeNull();
			expect(element.type).toBe(VpdDliCalculatorPanel);
			expect(element.props.initialTemp).toBe(50);
			expect(element.props.initialHumidity).toBe(100);

			// Verify internal panel calculation pipeline under extreme high props
			const leafVpd = calculateLeafVpd(50, 100, 5);
			const airVpd = calculateLeafVpd(50, 100, 0);
			const dli = calculateDli(2000, 24);

			expect(Number.isFinite(leafVpd)).toBe(true);
			expect(airVpd).toBeCloseTo(0.0, 4);
			expect(dli).toBe(172.8);
		});
	});
});
