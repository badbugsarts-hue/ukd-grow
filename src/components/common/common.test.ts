import { describe, expect, it } from "vitest";
import { calculateGaugeStatus } from "./MetricGauge";
import {
  DICTIONARY,
  getAllTerms,
  getTermDefinition,
  getTermDescription,
  searchTerms,
} from "./termDictionary";

describe("termDictionary", () => {
  it("resolves canonical term definitions for all required cultivation metrics", () => {
    const requiredTerms = [
      "VPD",
      "DLI",
      "EC",
      "pH",
      "PPFD",
      "rF",
      "Leaf-VPD",
      "BT",
      "BW",
    ];

    for (const termKey of requiredTerms) {
      const def = getTermDefinition(termKey);
      expect(def).toBeDefined();
      expect(def?.key).toBe(termKey);
      expect(def?.acronym).toBeDefined();
      expect(def?.germanName).toBeDefined();
      expect(def?.unit).toBeDefined();
      expect(def?.beginner).toBeDefined();
      expect(def?.advanced).toBeDefined();
      expect(def?.expert).toBeDefined();
    }
  });

  it("handles case-insensitive and alias lookups deterministically", () => {
    expect(getTermDefinition("vpd")?.key).toBe("VPD");
    expect(getTermDefinition("VPD")?.key).toBe("VPD");
    expect(getTermDefinition("Vpd")?.key).toBe("VPD");
    expect(getTermDefinition("dli")?.key).toBe("DLI");
    expect(getTermDefinition("ph")?.key).toBe("pH");
    expect(getTermDefinition("PH")?.key).toBe("pH");
    expect(getTermDefinition("Ph")?.key).toBe("pH");
    expect(getTermDefinition("leaf-vpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("LEAF-VPD")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("leaf_vpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("blattvpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("blatt-vpd")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("rh")?.key).toBe("rF");
    expect(getTermDefinition("RH")?.key).toBe("rF");
    expect(getTermDefinition("drained-ec")?.key).toBe("Drain-EC");
    expect(getTermDefinition("DRAIN-EC")?.key).toBe("Drain-EC");
    expect(getTermDefinition("drainec")?.key).toBe("Drain-EC");
    expect(getTermDefinition("drain-ph")?.key).toBe("Drain-pH");
    expect(getTermDefinition("drainph")?.key).toBe("Drain-pH");
    expect(getTermDefinition("substrat-ec")?.key).toBe("Substrat-EC");
    expect(getTermDefinition("substratec")?.key).toBe("Substrat-EC");
  });

  it("handles untrimmed whitespace and special characters in term lookups", () => {
    expect(getTermDefinition("  vpd  ")?.key).toBe("VPD");
    expect(getTermDefinition("  pH  ")?.key).toBe("pH");
    expect(getTermDefinition("  leaf-vpd \t")?.key).toBe("Leaf-VPD");
    expect(getTermDefinition("")).toBeUndefined();
    expect(getTermDefinition("   ")).toBeUndefined();
    expect(getTermDefinition("<script>alert(1)</script>")).toBeUndefined();
    expect(getTermDefinition("UNKNOWN_TERM_123")).toBeUndefined();
  });

  it("returns appropriate explanations based on the experience lens", () => {
    const term = "VPD";
    const beginnerText = getTermDescription(term, "guided");
    const advancedText = getTermDescription(term, "advanced");
    const expertText = getTermDescription(term, "expert");

    expect(beginnerText).toContain("Verdunstungsdruck");
    expect(advancedText).toContain("Sättigungsdampfdruck");
    expect(expertText).toContain("Formelversion");
  });

  it("returns safe fallback for unknown terms and invalid lens inputs", () => {
    expect(getTermDefinition("UNKNOWN_TERM")).toBeUndefined();
    expect(getTermDescription("UNKNOWN_TERM", "guided")).toBe(
      'Fachbegriff "UNKNOWN_TERM"',
    );
    expect(getTermDescription("UNKNOWN_TERM", "expert")).toBe(
      'Fachbegriff "UNKNOWN_TERM"',
    );
    expect(getTermDescription("", "guided")).toBe('Fachbegriff ""');
    expect(getTermDescription("   ", "guided")).toBe('Fachbegriff "   "');
    // Fallback to guided for unknown lens string
    expect(getTermDescription("VPD", "unknown_lens" as any)).toBe(
      DICTIONARY.VPD!.beginner,
    );
  });

  it("searches terms by query string including empty and special cases", () => {
    const emptyResults = searchTerms("");
    expect(emptyResults.length).toBe(Object.keys(DICTIONARY).length);

    const spaceResults = searchTerms("   ");
    expect(spaceResults.length).toBe(Object.keys(DICTIONARY).length);

    const germanSearch = searchTerms("dampf");
    expect(germanSearch.length).toBeGreaterThan(0);
    expect(germanSearch.some((t) => t.key === "VPD")).toBe(true);

    const acronymSearch = searchTerms("PPFD");
    expect(acronymSearch.some((t) => t.key === "PPFD")).toBe(true);

    const noMatchResults = searchTerms("xyz_non_existent_query_999");
    expect(noMatchResults.length).toBe(0);
  });

  it("retrieves all dictionary terms and checks schema integrity", () => {
    const terms = getAllTerms();
    expect(terms.length).toBe(14);
    for (const item of terms) {
      expect(item.key).toBeTruthy();
      expect(item.acronym).toBeTruthy();
      expect(item.germanName).toBeTruthy();
      expect(item.unit).toBeDefined();
      expect(["climate", "light", "nutrients", "phase", "plant"]).toContain(
        item.category,
      );
      expect(item.beginner).toBeTruthy();
      expect(item.advanced).toBeTruthy();
      expect(item.expert).toBeTruthy();
    }
  });
});

describe("MetricGauge calculateGaugeStatus edge cases", () => {
  const min = 0;
  const max = 3.0;
  const optimalMin = 1.0;
  const optimalMax = 1.5;
  const warnMin = 0.7;
  const warnMax = 1.8;

  it("returns optimal status when value is within optimal range", () => {
    const result = calculateGaugeStatus(
      1.2,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(result.status).toBe("optimal");
    expect(result.colorVar).toBe("var(--green)");
    expect(result.icon).toBe("✓");
    expect(result.labelGerman).toBe("Optimal");
    expect(result.percentage).toBeCloseTo(40, 1);
  });

  it("returns warning status when value is in warning margin", () => {
    const lowWarn = calculateGaugeStatus(
      0.8,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(lowWarn.status).toBe("warning");
    expect(lowWarn.colorVar).toBe("var(--amber)");
    expect(lowWarn.icon).toBe("⚠");
    expect(lowWarn.labelGerman).toBe("Warnung");

    const highWarn = calculateGaugeStatus(
      1.6,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(highWarn.status).toBe("warning");
    expect(highWarn.colorVar).toBe("var(--amber)");
  });

  it("returns alert-low status when value is below warning threshold", () => {
    const result = calculateGaugeStatus(
      0.4,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(result.status).toBe("alert-low");
    expect(result.colorVar).toBe("var(--blue)");
    expect(result.icon).toBe("↓");
    expect(result.labelGerman).toBe("Zu niedrig");
  });

  it("returns alert-high status when value is above warning threshold", () => {
    const result = calculateGaugeStatus(
      2.5,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(result.status).toBe("alert-high");
    expect(result.colorVar).toBe("var(--red)");
    expect(result.icon).toBe("↑");
    expect(result.labelGerman).toBe("Zu hoch");
  });

  it("returns missing status for null, undefined, and NaN values", () => {
    const nullRes = calculateGaugeStatus(
      null,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(nullRes.status).toBe("missing");
    expect(nullRes.colorVar).toBe("var(--muted)");
    expect(nullRes.icon).toBe("?");
    expect(nullRes.labelGerman).toBe("Kein Wert");
    expect(nullRes.percentage).toBe(0);

    const undefinedRes = calculateGaugeStatus(
      undefined,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(undefinedRes.status).toBe("missing");
    expect(undefinedRes.percentage).toBe(0);

    const nanRes = calculateGaugeStatus(
      Number.NaN,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(nanRes.status).toBe("missing");
    expect(nanRes.percentage).toBe(0);
  });

  it("handles exact boundary thresholds", () => {
    const lowerOpt = calculateGaugeStatus(
      optimalMin,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(lowerOpt.status).toBe("optimal");

    const upperOpt = calculateGaugeStatus(
      optimalMax,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(upperOpt.status).toBe("optimal");

    const lowerWarnExact = calculateGaugeStatus(
      warnMin,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(lowerWarnExact.status).toBe("warning");

    const upperWarnExact = calculateGaugeStatus(
      warnMax,
      min,
      max,
      optimalMin,
      optimalMax,
      warnMin,
      warnMax,
    );
    expect(upperWarnExact.status).toBe("warning");
  });

  it("handles negative gauge values and negative ranges correctly", () => {
    // Negative value below min (min=0, max=100) -> percentage clamped to 0
    const negValBelowMin = calculateGaugeStatus(-10, 0, 100, 20, 80);
    expect(negValBelowMin.status).toBe("alert-low");
    expect(negValBelowMin.percentage).toBe(0);

    // Negative range: min=-20, max=-5, value=-12 (optimal range: -15 to -8)
    const negRangeOpt = calculateGaugeStatus(-12, -20, -5, -15, -8);
    expect(negRangeOpt.status).toBe("optimal");
    // (-12 - (-20)) / (-5 - (-20)) * 100 = 8 / 15 * 100 = 53.33%
    expect(negRangeOpt.percentage).toBeCloseTo(53.33, 1);
  });

  it("handles Infinity and -Infinity safely", () => {
    const posInf = calculateGaugeStatus(
      Infinity,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(posInf.status).toBe("alert-high");
    expect(posInf.percentage).toBe(100);

    const negInf = calculateGaugeStatus(
      -Infinity,
      min,
      max,
      optimalMin,
      optimalMax,
    );
    expect(negInf.status).toBe("alert-low");
    expect(negInf.percentage).toBe(0);
  });

  it("handles zero range (min === max) and inverted scale (min > max)", () => {
    // min === max
    const zeroRange = calculateGaugeStatus(5, 5, 5, 4, 6);
    expect(zeroRange.status).toBe("optimal");
    expect(zeroRange.percentage).toBe(0);

    // min > max
    const invertedScale = calculateGaugeStatus(50, 100, 0, 20, 80);
    expect(invertedScale.status).toBe("optimal");
    expect(invertedScale.percentage).toBe(0);
  });

  it("handles omitted warnMin/warnMax bounds", () => {
    // Below optimalMin without warnMin -> immediately alert-low
    const lowNoWarn = calculateGaugeStatus(0.9, min, max, 1.0, 1.5);
    expect(lowNoWarn.status).toBe("alert-low");

    // Above optimalMax without warnMax -> immediately alert-high
    const highNoWarn = calculateGaugeStatus(1.6, min, max, 1.0, 1.5);
    expect(highNoWarn.status).toBe("alert-high");
  });

  it("handles inverted optimal ranges and extreme threshold values", () => {
    // Inverted optimal range (optimalMin > optimalMax)
    const invertedOptimal = calculateGaugeStatus(1.5, min, max, 2.0, 1.0);
    expect(invertedOptimal.status).toBe("alert-low");

    // Extreme scale values
    const extremeScale = calculateGaugeStatus(1e12, -1e9, 1e9, 0, 100);
    expect(extremeScale.status).toBe("alert-high");
    expect(extremeScale.percentage).toBe(100);
  });
});
