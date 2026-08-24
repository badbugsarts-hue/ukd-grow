import { describe, expect, it } from "vitest";
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

describe("Prediction Engine Suite", () => {
  describe("1. Genetics Metadata Prediction (predictGeneticsMetadata)", () => {
    it("matches exact strain name from catalog", () => {
      const result = predictGeneticsMetadata("Mighty Dwarf Automatic");
      expect(result).not.toBeNull();
      expect(result?.breeder).toBe("Sensi Seeds");
      expect(result?.seedType).toBe("autoflower");
      expect(result?.score).toBe(92);
      expect(result?.matchType).toBe("exact");
      expect(result?.heightRangeCm).toEqual([25, 80]);
      expect(result?.yieldRangeG).toEqual([60, 120]);
    });

    it("matches strain name case-insensitively and with extra whitespace", () => {
      const result = predictGeneticsMetadata("  blueberry candiez automatic  ");
      expect(result).not.toBeNull();
      expect(result?.breeder).toBe("Sensi Seeds");
      expect(result?.seedType).toBe("autoflower");
    });

    it("matches strain with partial / token fuzzy search", () => {
      const result = predictGeneticsMetadata("Mighty Dwarf");
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Mighty Dwarf Automatic");
      expect(result?.matchType).toBe("fuzzy");
    });

    it("falls back to smart heuristics for unlisted autoflower strains", () => {
      const result = predictGeneticsMetadata("Cybernetic Gorilla Auto");
      expect(result).not.toBeNull();
      expect(result?.seedType).toBe("autoflower");
      expect(result?.matchType).toBe("heuristic");
    });

    it("detects well-known breeders via heuristics", () => {
      const resultMephisto = predictGeneticsMetadata(
        "Sour Stomper by Mephisto",
      );
      expect(resultMephisto?.breeder).toBe("Mephisto Genetics");

      const resultFastBuds = predictGeneticsMetadata(
        "Strawberry Banana Fast Buds",
      );
      expect(resultFastBuds?.breeder).toBe("Fast Buds");
      expect(resultFastBuds?.seedType).toBe("autoflower");

      const resultBarneys = predictGeneticsMetadata(
        "Wedding Cake Barney's Farm",
      );
      expect(resultBarneys?.breeder).toBe("Barney's Farm");
    });

    it("returns null for empty or too short queries", () => {
      expect(predictGeneticsMetadata("")).toBeNull();
      expect(predictGeneticsMetadata("a")).toBeNull();
      expect(predictGeneticsMetadata("   ")).toBeNull();
    });
  });

  describe("2. Emergence Date Prediction (predictEmergenceDate)", () => {
    it("predicts emergence date exactly +3 calendar days from potting date", () => {
      expect(predictEmergenceDate("2026-08-10")).toBe("2026-08-13");
      expect(predictEmergenceDate("2026-01-30")).toBe("2026-02-02");
    });

    it("returns null for invalid or empty dates", () => {
      expect(predictEmergenceDate("")).toBeNull();
      expect(predictEmergenceDate("invalid-date")).toBeNull();
    });
  });

  describe("3. Environmental Corridor Prediction (predictEnvironmentalCorridor)", () => {
    it("resolves correct corridors for day numbers", () => {
      const seedling = predictEnvironmentalCorridor(2);
      expect(seedling.stage).toBe("seedling");
      expect(seedling.humidityPct.opt).toBeGreaterThanOrEqual(70);
      expect(seedling.ppfd.opt).toBeLessThanOrEqual(250);

      const veg = predictEnvironmentalCorridor(20);
      expect(veg.stage).toBe("vegetative");
      expect(veg.ppfd.opt).toBe(500);
      expect(veg.leafVpdKpa.opt).toBeGreaterThan(0.9);

      const peakBloom = predictEnvironmentalCorridor(50);
      expect(peakBloom.stage).toBe("peak_bloom");
      expect(peakBloom.humidityPct.opt).toBeLessThanOrEqual(50);
      expect(peakBloom.ppfd.opt).toBe(800);

      const flush = predictEnvironmentalCorridor(77);
      expect(flush.stage).toBe("flush");
      expect(flush.tempLightC.opt).toBeLessThanOrEqual(22);
    });

    it("resolves correct corridors for German and English stage names", () => {
      const earlyBloom = predictEnvironmentalCorridor("Frühe Blüte");
      expect(earlyBloom.stage).toBe("early_bloom");

      const bloom = predictEnvironmentalCorridor("peak_bloom");
      expect(bloom.stage).toBe("peak_bloom");
    });

    it("emits warning if light intensity is outside safe corridor", () => {
      const lowLight = predictEnvironmentalCorridor(20, 200);
      expect(lowLight.notes).toContain("Warnung");
      expect(lowLight.notes).toContain("unter dem Minimum");

      const excessLight = predictEnvironmentalCorridor(20, 900);
      expect(excessLight.notes).toContain("Warnung");
      expect(excessLight.notes).toContain("überschreitet das Maximum");
    });
  });

  describe("4. Physical VPD Calculation (calculateLiveVpd & calculateLiveVpdDetailed)", () => {
    it("calculates accurate Leaf VPD using Magnus-Tetens formula", () => {
      // 25 °C air temp, 60% RH, -1°C leaf delta
      // T_leaf = 24 °C -> VPS_leaf = 2.985 kPa
      // T_air = 25 °C -> VPS_air = 3.169 kPa -> VPA = 1.901 kPa
      // Leaf VPD = 2.985 - 1.901 = 1.08 kPa
      const vpd = calculateLiveVpd(25, 60, -1.0);
      expect(vpd).toBeGreaterThanOrEqual(1.0);
      expect(vpd).toBeLessThanOrEqual(1.2);
    });

    it("evaluates detailed VPD with safety classifications", () => {
      // Extreme humidity / low VPD
      const lowVpd = calculateLiveVpdDetailed(22, 90, -1.0);
      expect(lowVpd.status).toBe("danger-low");
      expect(lowVpd.guidance).toContain("Schimmel");

      // Healthy corridor
      const optVpd = calculateLiveVpdDetailed(25, 55, -1.0);
      expect(optVpd.status).toBe("optimal");
      expect(optVpd.guidance).toContain("Optimaler Bereich");

      // Excessive dryness / high VPD
      const highVpd = calculateLiveVpdDetailed(30, 25, -1.0);
      expect(highVpd.status).toBe("danger-high");
      expect(highVpd.guidance).toContain("Trockenstress");
    });

    it("handles zero or invalid numerical inputs safely", () => {
      expect(calculateLiveVpd(Number.NaN as any, 50)).toBe(0);
      expect(calculateLiveVpd(25, Number.NaN as any)).toBe(0);
    });
  });

  describe("5. Nutrient Titration Prediction (predictNutrientTitration)", () => {
    it("recommends adding base nutrients when current EC < target EC", () => {
      const result = predictNutrientTitration(0.8, 1.4, 6.0, 6.0, 10);
      expect(result.actionEc).toBe("add_nutrients");
      expect(result.ecDelta).toBe(0.6);
      expect(result.recommendedBaseNutrientMl).toBe(0);
      expect(result.calibrationRequired).toBe(true);
      expect(result.recommendedWaterDilutionL).toBe(0);
    });

    it("recommends water dilution when current EC > target EC", () => {
      const result = predictNutrientTitration(2.0, 1.5, 6.0, 6.0, 10);
      expect(result.actionEc).toBe("dilute_water");
      expect(result.ecDelta).toBe(-0.5);
      expect(result.recommendedWaterDilutionL).toBe(0);
      expect(result.calibrationRequired).toBe(true);
    });

    it("recommends pH Down when current pH > target pH", () => {
      const result = predictNutrientTitration(1.4, 1.4, 6.8, 5.8, 10);
      expect(result.actionPh).toBe("add_ph_down");
      expect(result.phDelta).toBe(1.0);
      expect(result.recommendedPhDownMl).toBe(0);
      expect(result.calibrationRequired).toBe(true);
    });

    it("recommends pH Up when current pH < target pH", () => {
      const result = predictNutrientTitration(1.4, 1.4, 5.0, 6.0, 10);
      expect(result.actionPh).toBe("add_ph_up");
      expect(result.recommendedPhUpMl).toBe(0);
      expect(result.calibrationRequired).toBe(true);
    });

    it("warns about titration sensitivity on small reservoir volumes", () => {
      const result = predictNutrientTitration(1.0, 1.4, 7.0, 5.8, 2);
      expect(result.warning).toContain("Kleines Tankvolumen");
    });

    it("scales only explicitly calibrated EC and pH test-batch responses", () => {
      const result = predictNutrientTitration(1.0, 1.4, 6.6, 6.0, 10, {
        baseEcRisePerMlPerL: 0.2,
        dilutionWaterEc: 0.1,
        phDownMlPerLPerPh: 0.03,
      });
      expect(result.recommendedBaseNutrientMl).toBe(20);
      expect(result.recommendedPhDownMl).toBe(0.18);
      expect(result.calibrationRequired).toBe(false);

      const dilution = predictNutrientTitration(2.0, 1.5, 6.0, 6.0, 10, {
        dilutionWaterEc: 0.5,
      });
      expect(dilution.recommendedWaterDilutionL).toBe(5);
      expect(dilution.calibrationRequired).toBe(false);
    });
  });

  describe("6. Substrate Dryback Prediction (predictDrybackDuration)", () => {
    it("calculates current dryback percentage and hydration state", () => {
      // 5000g sat, 3500g current -> 1500g loss = 30% dryback
      const result = predictDrybackDuration(5000, 3500, 45);
      expect(result.currentDrybackPct).toBe(30);
      expect(result.targetDrybackPct).toBe(45);
      expect(result.remainingDrybackPct).toBe(15);
      expect(result.isReadyForWatering).toBe(false);
      expect(result.urgency).toBe("wait");
      expect(result.recommendedIrrigationVolumeL).toBe(1.5);
    });

    it("signals water_now when target dryback is reached", () => {
      // 5000g sat, 2750g current -> 2250g loss = 45% dryback
      const result = predictDrybackDuration(5000, 2750, 45);
      expect(result.currentDrybackPct).toBe(45);
      expect(result.isReadyForWatering).toBe(true);
      expect(result.urgency).toBe("water_now");
    });

    it("detects severe overdry condition", () => {
      // 5000g sat, 1800g current -> 3200g loss = 64% dryback (target 45%)
      const result = predictDrybackDuration(5000, 1800, 45);
      expect(result.urgency).toBe("overdry");
      expect(result.recommendation).toContain("übertrocknet");
    });
  });

  describe("7. Live Field Suggestions Hook (getLiveFieldSuggestions)", () => {
    it("executes within <5ms latency limit", () => {
      const t0 = performance.now();
      for (let i = 0; i < 50; i++) {
        getLiveFieldSuggestions("genetics", "dwarf", { day: 21 });
        getLiveFieldSuggestions("ppfd", "", { day: 21 });
        getLiveFieldSuggestions("ec", "", { day: 21 });
      }
      const t1 = performance.now();
      const avgMs = (t1 - t0) / 150;
      expect(avgMs).toBeLessThan(5.0);
    });

    it("returns ranked strain suggestions for genetics field", () => {
      const suggestions = getLiveFieldSuggestions("genetics", "dwarf");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].label).toContain("Dwarf");
      expect(suggestions[0].badge).toBe("Katalog");
    });

    it("returns environmental targets for PPFD, Temp, RH, and EC", () => {
      const ppfdSuggestions = getLiveFieldSuggestions("ppfd", "", { day: 21 });
      expect(ppfdSuggestions.some((s) => s.badge === "Optimal")).toBe(true);

      const ecSuggestions = getLiveFieldSuggestions("ec", "", { day: 21 });
      expect(ecSuggestions.some((s) => s.badge === "Plan")).toBe(true);

      const phSuggestions = getLiveFieldSuggestions("ph", "");
      expect(phSuggestions.some((s) => s.value === 5.8)).toBe(true);
    });

    it("returns pot weight dryback suggestions", () => {
      const potSuggestions = getLiveFieldSuggestions("potWeight", "", {
        potSatG: 5000,
        potTareG: 2000,
      });
      expect(potSuggestions.some((s) => s.value === 5000)).toBe(true);
      expect(potSuggestions.some((s) => s.value === 3500)).toBe(true); // 50% dryback
    });
  });
});
