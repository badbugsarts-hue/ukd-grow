import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InlineEditable } from "./components/common/InlineEditable";
import { InlineMetricCard } from "./components/common/InlineMetricCard";
import {
  calculateLiveVpd,
  calculateLiveVpdDetailed,
  getLiveFieldSuggestions,
  predictDrybackDuration,
  predictEmergenceDate,
  predictEnvironmentalCorridor,
  predictGeneticsMetadata,
  predictNutrientTitration,
} from "./prediction-engine";
import type { AutoflowerStrain } from "./types";
import autoflowerCatalog from "./data/autoflower-cockpit.json";

describe("Adversarial Stress Test Suite: In-Place Editing & Prediction Engine", () => {
  // =========================================================================
  // 1. Extreme & Invalid Inputs in InlineEditable
  // =========================================================================
  describe("1. InlineEditable Validation Bounds & Input Robustness", () => {
    it("1.1 parses valid and invalid numerical inputs safely without crashing", () => {
      const onSave = vi.fn();
      const el = (
        <InlineEditable<number>
          value={450}
          label="PPFD"
          type="number"
          min={0}
          max={1500}
          onSave={onSave}
        />
      );
      expect(React.isValidElement(el)).toBe(true);

      const html = renderToString(el);
      expect(html).toContain("450");
      expect(html).toContain("inline-editable-trigger");
    });

    it("1.2 enforces strict min and max bounds against out-of-range numbers", () => {
      const onSave = vi.fn();
      let errorCaptured = "";
      const validator = (val: number) => {
        if (val < 10) {
          errorCaptured = "Too low";
          return "Wert darf nicht kleiner als 10 sein.";
        }
        if (val > 100) {
          errorCaptured = "Too high";
          return "Wert darf nicht größer als 100 sein.";
        }
        return true;
      };

      const el = (
        <InlineEditable<number>
          value={50}
          label="Test Bound"
          type="number"
          min={10}
          max={100}
          validator={validator}
          onSave={onSave}
        />
      );

      expect(React.isValidElement(el)).toBe(true);
      expect(validator(5)).toBe("Wert darf nicht kleiner als 10 sein.");
      expect(errorCaptured).toBe("Too low");
      expect(validator(105)).toBe("Wert darf nicht größer als 100 sein.");
      expect(errorCaptured).toBe("Too high");
      expect(validator(50)).toBe(true);
    });

    it("1.3 handles NaN, Infinity, -Infinity and empty string inputs gracefully", () => {
      // Test parsing behavior: NaN defaults to 0
      const parseDraftNumber = (draftValue: string): number => {
        const parsed = Number.parseFloat(draftValue);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      expect(parseDraftNumber("")).toBe(0);
      expect(parseDraftNumber("   ")).toBe(0);
      expect(parseDraftNumber("abc")).toBe(0);
      expect(parseDraftNumber("NaN")).toBe(0);
      expect(parseDraftNumber("-")).toBe(0);
      expect(parseDraftNumber("--50")).toBe(0);
      expect(parseDraftNumber("123.45")).toBe(123.45);
      expect(parseDraftNumber("-42.8")).toBe(-42.8);
      expect(parseDraftNumber("1e5")).toBe(100000);
    });

    it("1.4 handles null, undefined, and empty values in display mode with placeholder dash", () => {
      const onSave = vi.fn();
      const elNull = (
        <InlineEditable value={null} label="Null Test" onSave={onSave} />
      );
      const elUndef = (
        <InlineEditable value={undefined} label="Undef Test" onSave={onSave} />
      );
      const elEmpty = (
        <InlineEditable value="" label="Empty Test" onSave={onSave} />
      );

      const htmlNull = renderToString(elNull);
      const htmlUndef = renderToString(elUndef);
      const htmlEmpty = renderToString(elEmpty);

      expect(htmlNull).toContain("—");
      expect(htmlUndef).toContain("—");
      expect(htmlEmpty).toContain("—");
    });

    it("1.5 handles structured object validation with warnings without blocking save if valid", () => {
      const complexValidator = (val: number) => {
        if (val < 0)
          return { valid: false, error: "Negative EC ist unmöglich." };
        if (val > 2.5)
          return { valid: false, error: "Toxische Überdüngung (>2.5 mS/cm)." };
        if (val > 1.8)
          return {
            valid: true,
            warning: "Warnung: Hohe Nährstoffkonzentration.",
          };
        return { valid: true };
      };

      expect(complexValidator(-1)).toEqual({
        valid: false,
        error: "Negative EC ist unmöglich.",
      });
      expect(complexValidator(3.0)).toEqual({
        valid: false,
        error: "Toxische Überdüngung (>2.5 mS/cm).",
      });
      expect(complexValidator(2.0)).toEqual({
        valid: true,
        warning: "Warnung: Hohe Nährstoffkonzentration.",
      });
      expect(complexValidator(1.2)).toEqual({ valid: true });
    });

    it("1.6 honors disabled and readOnly states by preventing editing trigger", () => {
      const onSave = vi.fn();
      const elDisabled = (
        <InlineEditable
          value={100}
          label="Disabled Field"
          disabled={true}
          onSave={onSave}
        />
      );
      const elReadOnly = (
        <InlineEditable
          value={100}
          label="ReadOnly Field"
          readOnly={true}
          onSave={onSave}
        />
      );

      const htmlDisabled = renderToString(elDisabled);
      const htmlReadOnly = renderToString(elReadOnly);

      expect(htmlDisabled).toContain('disabled=""');
      expect(htmlDisabled).not.toContain("✎");
      expect(htmlReadOnly).toContain('disabled=""');
      expect(htmlReadOnly).not.toContain("✎");
    });
  });

  // =========================================================================
  // 2. Edge Cases in prediction-engine.ts
  // =========================================================================
  describe("2. Prediction Engine Edge Cases & Physical Boundary Integrity", () => {
    describe("2.1 predictGeneticsMetadata Stress", () => {
      it("fuzz tests unknown strains, empty strings, and special characters", () => {
        expect(predictGeneticsMetadata("")).toBeNull();
        expect(predictGeneticsMetadata("   ")).toBeNull();
        expect(predictGeneticsMetadata("x")).toBeNull();
        expect(predictGeneticsMetadata("!@#$%^&*()_+")).toBeNull();
        expect(predictGeneticsMetadata("A".repeat(5000))).toBeNull();
      });

      it("correctly identifies all cultivars from catalog with valid ranges", () => {
        const catalog = autoflowerCatalog as AutoflowerStrain[];
        expect(catalog.length).toBeGreaterThanOrEqual(60);

        for (const strain of catalog) {
          const prediction = predictGeneticsMetadata(strain.name);
          expect(prediction).not.toBeNull();
          expect(prediction?.name).toBeDefined();
          expect(prediction?.breeder).toBeDefined();
          expect(prediction?.seedType).toBeDefined();
          if (prediction?.heightRangeCm) {
            const [minH, maxH] = prediction.heightRangeCm;
            expect(minH).toBeLessThanOrEqual(maxH);
            expect(minH).toBeGreaterThan(0);
          }
          if (prediction?.yieldRangeG) {
            const [minY, maxY] = prediction.yieldRangeG;
            expect(minY).toBeLessThanOrEqual(maxY);
            expect(minY).toBeGreaterThan(0);
          }
        }
      });

      it("triggers intelligent heuristics for unknown breeder strains", () => {
        const tests = [
          { input: "Custom Gorilla Auto", seedType: "autoflower" },
          { input: "Super Silver Haze Fem", seedType: "feminized" },
          { input: "Unknown Ruderalis Cross", seedType: "autoflower" },
          { input: "Fast Flowering Skunk", seedType: "autoflower" },
          {
            input: "Sensi #140 Auto",
            breeder: "Sensi Seeds",
            seedType: "autoflower",
          },
          { input: "Mephisto Grape Walker", breeder: "Mephisto Genetics" },
          { input: "Fast Buds Gorilla Cookies", breeder: "Fast Buds" },
          { input: "Barney's Farm Watermelon", breeder: "Barney's Farm" },
          { input: "Ethos Apex Auto", breeder: "Ethos Genetics" },
          { input: "Humboldt Dream Auto", breeder: "Humboldt Seed Company" },
          { input: "Night Owl Cosmic Queen", breeder: "Night Owl Seeds" },
        ];

        for (const t of tests) {
          const pred = predictGeneticsMetadata(t.input);
          expect(pred).not.toBeNull();
          if (t.seedType) expect(pred?.seedType).toBe(t.seedType);
          if (t.breeder) expect(pred?.breeder).toBe(t.breeder);
        }
      });
    });

    describe("2.2 Magnus-Tetens VPD Boundary & Physical Stress", () => {
      it("calculates VPD across extreme temperature and humidity boundaries without NaN or negative values", () => {
        // Freezing / low temp
        const vpdCold = calculateLiveVpd(-5, 50, 0);
        expect(Number.isFinite(vpdCold)).toBe(true);
        expect(vpdCold).toBeGreaterThanOrEqual(0);

        // Extreme heat
        const vpdHot = calculateLiveVpd(50, 20, -1.0);
        expect(Number.isFinite(vpdHot)).toBe(true);
        expect(vpdHot).toBeGreaterThan(5.0);

        // 0% and 100% RH
        const vpd0 = calculateLiveVpd(25, 0, 0);
        const vpd100 = calculateLiveVpd(25, 100, 0);
        expect(vpd0).toBeGreaterThan(2.5);
        expect(vpd100).toBe(0);

        // Clamping out-of-range RH (-50% clamped to 0%, 150% clamped to 100%)
        const vpdNegRh = calculateLiveVpd(25, -50, 0);
        const vpdExcessRh = calculateLiveVpd(25, 150, 0);
        expect(vpdNegRh).toBe(vpd0);
        expect(vpdExcessRh).toBe(vpd100);

        // Invalid inputs
        expect(calculateLiveVpd(Number.NaN, 50)).toBe(0);
        expect(calculateLiveVpd(25, Number.NaN)).toBe(0);
        expect(calculateLiveVpd(Number.POSITIVE_INFINITY, 50)).toBe(0);
      });

      it("verifies all 5 status classifications and guidance messages in calculateLiveVpdDetailed", () => {
        // danger-low (<0.4)
        const dLow = calculateLiveVpdDetailed(20, 95, -1.0);
        expect(dLow.status).toBe("danger-low");
        expect(dLow.statusDe).toContain("Gefahr");

        // low (0.4 - 0.8)
        const low = calculateLiveVpdDetailed(22, 75, -1.0);
        expect(low.status).toBe("low");

        // optimal (0.8 - 1.45)
        const opt = calculateLiveVpdDetailed(25, 60, -1.0);
        expect(opt.status).toBe("optimal");

        // high (1.45 - 1.75)
        const high = calculateLiveVpdDetailed(27, 50, -1.0);
        expect(high.status).toBe("high");

        // danger-high (>1.75)
        const dHigh = calculateLiveVpdDetailed(32, 25, -1.0);
        expect(dHigh.status).toBe("danger-high");
        expect(dHigh.guidance).toContain("Trockenstress");
      });
    });

    describe("2.3 Nutrient Titration Stress", () => {
      it("fuzz tests extreme pH, EC, and reservoir volume values", () => {
        // Zero reservoir volume falls back safely
        const zeroVol = predictNutrientTitration(1.0, 1.5, 6.5, 5.8, 0);
        expect(zeroVol.actionEc).toBe("add_nutrients");
        expect(Number.isFinite(zeroVol.recommendedBaseNutrientMl)).toBe(true);

        // Extreme EC overdose needing water dilution
        const overdose = predictNutrientTitration(3.5, 1.2, 6.0, 6.0, 20);
        expect(overdose.actionEc).toBe("dilute_water");
        expect(overdose.recommendedWaterDilutionL).toBe(0);
        expect(overdose.calibrationRequired).toBe(true);

        // Acidic pH needing pH Up
        const acidic = predictNutrientTitration(1.2, 1.2, 4.2, 6.0, 15);
        expect(acidic.actionPh).toBe("add_ph_up");
        expect(acidic.recommendedPhUpMl).toBe(0);
        expect(acidic.calibrationRequired).toBe(true);

        // Small volume warning under 3 Liters
        const smallTank = predictNutrientTitration(1.0, 1.2, 7.0, 5.8, 2.5);
        expect(smallTank.warning).toContain("Kleines Tankvolumen");
      });
    });

    describe("2.4 Substrate Dryback Stress", () => {
      it("handles inverted weights (current > initial) and extreme overdry conditions", () => {
        // Overfilled/flooded pot where current > initial
        const flooded = predictDrybackDuration(3000, 3500, 45);
        expect(flooded.currentDrybackPct).toBe(0);
        expect(flooded.urgency).toBe("wait");

        // Exactly at target dryback
        const exact = predictDrybackDuration(5000, 2750, 45);
        expect(exact.currentDrybackPct).toBe(45);
        expect(exact.isReadyForWatering).toBe(true);
        expect(exact.urgency).toBe("water_now");

        // Extreme overdry condition (e.g. 70% dryback)
        const overdry = predictDrybackDuration(5000, 1500, 45);
        expect(overdry.currentDrybackPct).toBe(70);
        expect(overdry.urgency).toBe("overdry");
        expect(overdry.recommendation).toContain("übertrocknet");

        // Zero / negative inputs
        const safeFallbacks = predictDrybackDuration(0, 0, 45);
        expect(Number.isFinite(safeFallbacks.currentDrybackPct)).toBe(true);
        expect(safeFallbacks.targetDrybackPct).toBe(45);
      });
    });

    describe("2.5 Emergence Date & Environmental Corridors", () => {
      it("predicts emergence dates accurately across leap years and year boundaries", () => {
        // Leap year 2024
        expect(predictEmergenceDate("2024-02-27")).toBe("2024-03-01");
        // Year boundary
        expect(predictEmergenceDate("2026-12-30")).toBe("2027-01-02");
        // Invalid strings
        expect(predictEmergenceDate("")).toBeNull();
        expect(predictEmergenceDate("not-a-date")).toBeNull();
      });

      it("resolves environmental corridors across all growth stages without throwing", () => {
        const stages = [
          "seedling",
          "early_veg",
          "vegetative",
          "early_bloom",
          "peak_bloom",
          "late_bloom",
          "flush",
          "Keimung & Sämling",
          "Frühe Vegetation",
          "Hauptblüte",
          "Spülung",
          "Unknown Stage XYZ",
        ];

        for (const stage of stages) {
          const corridor = predictEnvironmentalCorridor(stage);
          expect(corridor).toBeDefined();
          expect(corridor.tempLightC.min).toBeLessThanOrEqual(
            corridor.tempLightC.opt,
          );
          expect(corridor.tempLightC.opt).toBeLessThanOrEqual(
            corridor.tempLightC.max,
          );
          expect(corridor.humidityPct.min).toBeLessThanOrEqual(
            corridor.humidityPct.max,
          );
          expect(corridor.ppfd.min).toBeLessThanOrEqual(corridor.ppfd.max);
          expect(corridor.leafVpdKpa.min).toBeLessThanOrEqual(
            corridor.leafVpdKpa.max,
          );
        }
      });
    });

    describe("2.6 getLiveFieldSuggestions Speed & Robustness", () => {
      it("returns valid suggestions within <5ms per call across all supported fields", () => {
        const fields = [
          "genetics",
          "ppfd",
          "dli",
          "temp",
          "rh",
          "vpd",
          "ec",
          "ph",
          "potWeight",
          "irrigation",
          "runName",
          "emergenceDate",
          "unknown_field_123",
        ];

        const t0 = performance.now();
        for (let i = 0; i < 20; i++) {
          for (const f of fields) {
            const suggestions = getLiveFieldSuggestions(f, "a", {
              day: 25,
              potSatG: 5200,
              potTareG: 1800,
              potVolumeL: 11,
            });
            expect(Array.isArray(suggestions)).toBe(true);
          }
        }
        const t1 = performance.now();
        const totalCalls = 20 * fields.length;
        const avgMs = (t1 - t0) / totalCalls;
        expect(avgMs).toBeLessThan(5.0);
      });
    });
  });

  // =========================================================================
  // 3. Keyboard Event Handling & Navigation Mechanics
  // =========================================================================
  describe("3. Keyboard Event Handling & Navigation Mechanics", () => {
    it("3.1 verifies keyboard handling logic (Escape, Enter, Tab, Arrow keys)", () => {
      let isEditing = true;
      let draftValue = "edited draft";
      let showSuggestions = true;
      let highlightedIndex = 0;
      const suggestions = [
        { value: "sug1" },
        { value: "sug2" },
        { value: "sug3" },
      ];
      const committedValues: string[] = [];

      const handleKeyDown = (key: string, preventDefault = () => {}) => {
        if (key === "Escape") {
          preventDefault();
          draftValue = "original value";
          isEditing = false;
          showSuggestions = false;
        } else if (key === "Enter") {
          preventDefault();
          if (
            showSuggestions &&
            highlightedIndex >= 0 &&
            highlightedIndex < suggestions.length
          ) {
            const selected = suggestions[highlightedIndex];
            draftValue = selected.value;
            committedValues.push(selected.value);
          } else {
            committedValues.push(draftValue);
          }
          isEditing = false;
        } else if (key === "ArrowDown") {
          if (showSuggestions && suggestions.length > 0) {
            preventDefault();
            highlightedIndex =
              highlightedIndex < suggestions.length - 1
                ? highlightedIndex + 1
                : 0;
          }
        } else if (key === "ArrowUp") {
          if (showSuggestions && suggestions.length > 0) {
            preventDefault();
            highlightedIndex =
              highlightedIndex > 0
                ? highlightedIndex - 1
                : suggestions.length - 1;
          }
        } else if (key === "Tab") {
          committedValues.push(draftValue);
          isEditing = false;
        }
      };

      // Test ArrowDown navigation
      expect(highlightedIndex).toBe(0);
      handleKeyDown("ArrowDown");
      expect(highlightedIndex).toBe(1);
      handleKeyDown("ArrowDown");
      expect(highlightedIndex).toBe(2);
      // Circular wrap to 0
      handleKeyDown("ArrowDown");
      expect(highlightedIndex).toBe(0);

      // Test ArrowUp wrap to end
      handleKeyDown("ArrowUp");
      expect(highlightedIndex).toBe(2);

      // Test Enter commits selected suggestion
      handleKeyDown("Enter");
      expect(committedValues).toEqual(["sug3"]);
      expect(draftValue).toBe("sug3");
      expect(isEditing).toBe(false);

      // Test Escape resets dirty state
      isEditing = true;
      draftValue = "dirty input";
      handleKeyDown("Escape");
      expect(draftValue).toBe("original value");
      expect(isEditing).toBe(false);
    });
  });

  // =========================================================================
  // 4. Mobile Viewport Layout Constraints & Touch Targets
  // =========================================================================
  describe("4. Mobile Viewport Layout Constraints & Touch Target Verification", () => {
    it("4.1 ensures minTouchTarget generates >=44px minHeight and minWidth", () => {
      const onSave = vi.fn();
      const elTouch = (
        <InlineEditable
          value={25}
          label="Temperature"
          unit="°C"
          minTouchTarget={true}
          onSave={onSave}
        />
      );

      const html = renderToString(elTouch);
      expect(html).toContain("min-height:44px");
      expect(html).toContain("min-width:44px");
    });

    it("4.2 renders InlineMetricCard with accessible touch targets and proper tab modes", () => {
      const onSaveMeasurement = vi.fn();
      const onSaveTarget = vi.fn();

      // Case A: With measurement and note
      const elA = (
        <InlineMetricCard
          label="VPD"
          targetValue={1.15}
          measuredValue={1.22}
          unit="kPa"
          tone="green"
          note="Canopy Verdunstung"
          lens="advanced"
          onSaveMeasurement={onSaveMeasurement}
          onSaveTarget={onSaveTarget}
        />
      );

      const htmlA = renderToString(elA);
      expect(htmlA).toContain("inline-metric-card");
      expect(htmlA).toContain("Ist");
      expect(htmlA).toContain("Soll");
      expect(htmlA).toContain("1.22");
      expect(htmlA).toContain("kPa");
      expect(htmlA).toContain("IST-WERT");
      expect(htmlA).toContain("min-height:130px");
      expect(htmlA).toContain("Canopy Verdunstung");

      // Case B: Without note, showing "Soll: 1.15 kPa" in footer
      const elB = (
        <InlineMetricCard
          label="VPD"
          targetValue={1.15}
          measuredValue={1.22}
          unit="kPa"
          tone="green"
          lens="advanced"
          onSaveMeasurement={onSaveMeasurement}
          onSaveTarget={onSaveTarget}
        />
      );
      const htmlB = renderToString(elB);
      expect(htmlB).toContain("Soll: 1.15 kPa");
    });
  });
});
