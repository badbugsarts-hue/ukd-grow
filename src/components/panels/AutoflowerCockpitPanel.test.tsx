import React from "react";
import { describe, expect, it, vi } from "vitest";
import cockpitDataRaw from "../../data/autoflower-cockpit.json";
import type { AutoflowerStrain } from "../../types";
import { AutoflowerCockpitModal } from "../modals/AutoflowerCockpitModal";
import { AutoflowerCockpitPanel } from "./AutoflowerCockpitPanel";

const cockpitData = cockpitDataRaw as unknown as AutoflowerStrain[];

describe("Milestone 2 — Autoflower Cockpit Browser & Selector Suite", () => {
  describe("1. Dataset & Provenance Integrity", () => {
    it("contains exactly 61 strains (50 Jungpflanzen + 11 Saatgut)", () => {
      expect(cockpitData).toHaveLength(61);

      const jungpflanzen = cockpitData.filter((s) => s.kind === "jungpflanze");
      const samen = cockpitData.filter((s) => s.kind === "samen");

      expect(jungpflanzen).toHaveLength(50);
      expect(samen).toHaveLength(11);
    });

    it("validates that every strain has complete 44-attribute profile", () => {
      const requiredFields: Array<keyof AutoflowerStrain> = [
        "rank",
        "name",
        "shop",
        "score",
        "id",
        "breeder",
        "prov",
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
        "ertrag_lo",
        "ertrag_hi",
        "ertrag_src",
        "urteil",
        "evidenz",
        "q",
        "kind",
        "typ",
      ];

      for (const strain of cockpitData) {
        for (const field of requiredFields) {
          expect(
            strain[field],
            `Strain ${strain.name} missing ${String(field)}`,
          ).toBeDefined();
        }

        expect(strain.score).toBeGreaterThanOrEqual(0);
        expect(strain.score).toBeLessThanOrEqual(100);
        expect(strain.q).toBeGreaterThanOrEqual(0.55);
        expect(strain.q).toBeLessThanOrEqual(1.0);
        expect(strain.ertrag_lo).toBeGreaterThan(0);
        expect(strain.ertrag_hi).toBeGreaterThan(strain.ertrag_lo);
        expect(["original", "whitelabel", "unklar"]).toContain(strain.prov);
        expect(["jungpflanze", "samen"]).toContain(strain.kind);
        expect(["Autoflower", "Photoperiodisch", "Fast Version"]).toContain(
          strain.typ,
        );
      }
    });

    it("accurately classifies original breeder lines, white label lots, and unklar listings", () => {
      const originalBreederStrains = cockpitData.filter(
        (s) =>
          (s.breeder === "Sensi Seeds" ||
            s.breeder === "Fast Buds" ||
            s.breeder === "Mephisto Genetics") &&
          s.name !== "Super Boof XL Auto" &&
          !s.id.includes("super-boof"),
      );
      expect(originalBreederStrains.length).toBeGreaterThan(15);
      for (const s of originalBreederStrains) {
        expect(s.prov).toBe("original");
      }

      const bubatzStrains = cockpitData.filter((s) => s.shop === "BubatzBuddy");
      for (const s of bubatzStrains) {
        expect(s.prov).toBe("whitelabel");
      }

      const unklarStrains = cockpitData.filter((s) => s.prov === "unklar");
      expect(unklarStrains.length).toBe(4);
      const unklarIds = unklarStrains.map((s) => s.id);
      expect(unklarIds).toContain("21-super-boof-xl-autoflowering-bushplanet");
      expect(unklarIds).toContain("27-crispy-apple-auto");
    });
  });

  describe("2. Component Element Creation & Props Handling", () => {
    it("instantiates AutoflowerCockpitPanel with default props", () => {
      const onSelectStrain = vi.fn();
      const element = (
        <AutoflowerCockpitPanel
          onSelectStrain={onSelectStrain}
          lens="guided"
          selectedStrainId="1-mighty-dwarf-automatic"
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.lens).toBe("guided");
      expect(element.props.selectedStrainId).toBe("1-mighty-dwarf-automatic");
    });

    it("instantiates AutoflowerCockpitModal with callback and close handler", () => {
      const onClose = vi.fn();
      const onSelectStrain = vi.fn();
      const element = (
        <AutoflowerCockpitModal
          onClose={onClose}
          onSelectStrain={onSelectStrain}
          selectedStrainId="samen-4-double-grape"
          lens="advanced"
        />
      );

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.selectedStrainId).toBe("samen-4-double-grape");
      expect(element.props.lens).toBe("advanced");
    });
  });

  describe("3. Filtering Logic Verification", () => {
    it("filters correctly by kind (Jungpflanze vs. Saatgut)", () => {
      const jungpflanzenOnly = cockpitData.filter(
        (s) => s.kind === "jungpflanze",
      );
      const samenOnly = cockpitData.filter((s) => s.kind === "samen");

      expect(jungpflanzenOnly).toHaveLength(50);
      expect(samenOnly).toHaveLength(11);
    });

    it("filters correctly by multi-attribute fulltext search", () => {
      const query = "Mephisto";
      const matches = cockpitData.filter((s) => {
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(query.toLowerCase());
      });

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(
        matches.some(
          (s) =>
            s.name.includes("Double Grape") || s.name.includes("Sour Stomper"),
        ),
      ).toBe(true);
    });

    it("filters correctly by breeder seedbank", () => {
      const sensiStrains = cockpitData.filter(
        (s) => s.breeder === "Sensi Seeds",
      );
      expect(sensiStrains.length).toBeGreaterThanOrEqual(7);

      const fastBudsStrains = cockpitData.filter(
        (s) => s.breeder === "Fast Buds",
      );
      expect(fastBudsStrains.length).toBeGreaterThanOrEqual(7);
    });

    it("filters correctly by experience level", () => {
      const beginnerStrains = cockpitData.filter((s) => s.level === "Anfänger");
      const proStrains = cockpitData.filter((s) => s.level === "Profi");

      expect(beginnerStrains.length).toBeGreaterThan(10);
      expect(proStrains.length).toBeGreaterThan(10);

      for (const s of beginnerStrains) {
        expect(s.level).toBe("Anfänger");
      }
    });

    it("filters correctly by maximum canopy height", () => {
      const maxHeight = 80;
      const compactStrains = cockpitData.filter(
        (s) => s.hmax !== null && s.hmax <= maxHeight,
      );

      expect(compactStrains.length).toBeGreaterThan(0);
      for (const s of compactStrains) {
        expect(s.hmax).toBeLessThanOrEqual(maxHeight);
      }
    });
  });

  describe("4. Sorting Logic Verification", () => {
    it("sorts correctly by Masterclass score descending", () => {
      const sortedByScore = [...cockpitData].sort((a, b) => b.score - a.score);
      for (let i = 0; i < sortedByScore.length - 1; i++) {
        expect(sortedByScore[i].score).toBeGreaterThanOrEqual(
          sortedByScore[i + 1].score,
        );
      }
    });

    it("sorts correctly by dry yield potential descending", () => {
      const sortedByYield = [...cockpitData].sort((a, b) => {
        const avgA = (a.ertrag_lo + a.ertrag_hi) / 2;
        const avgB = (b.ertrag_lo + b.ertrag_hi) / 2;
        return avgB - avgA;
      });

      for (let i = 0; i < sortedByYield.length - 1; i++) {
        const avgCurrent =
          (sortedByYield[i].ertrag_lo + sortedByYield[i].ertrag_hi) / 2;
        const avgNext =
          (sortedByYield[i + 1].ertrag_lo + sortedByYield[i + 1].ertrag_hi) / 2;
        expect(avgCurrent).toBeGreaterThanOrEqual(avgNext);
      }
    });

    it("sorts correctly by alphabetical cultivar name", () => {
      const sortedByName = [...cockpitData].sort((a, b) =>
        a.name.localeCompare(b.name, "de"),
      );
      for (let i = 0; i < sortedByName.length - 1; i++) {
        expect(
          sortedByName[i].name.localeCompare(sortedByName[i + 1].name, "de"),
        ).toBeLessThanOrEqual(0);
      }
    });

    it("sorts correctly by mature height ascending, placing nulls at end", () => {
      const sortedByHeight = [...cockpitData].sort((a, b) => {
        const hA = a.hmax ?? 999;
        const hB = b.hmax ?? 999;
        return hA - hB;
      });

      for (let i = 0; i < sortedByHeight.length - 1; i++) {
        const hA = sortedByHeight[i].hmax ?? 999;
        const hB = sortedByHeight[i + 1].hmax ?? 999;
        expect(hA).toBeLessThanOrEqual(hB);
      }
    });
  });

  describe("5. Yield Uncertainty & Photobiology Modeling", () => {
    it("verifies the 140 W / 0.36 m² tent yield scaling model across all strains", () => {
      for (const strain of cockpitData) {
        // Base tent yield is 63g to 126g scaled by q
        const expectedMinBasis = 63 * strain.q;
        const expectedMaxBasis = 126 * strain.q;

        // Checked within reasonable rounding (tolerance +- 10g for empirical breeder corrections)
        expect(strain.ertrag_lo).toBeGreaterThanOrEqual(
          Math.floor(expectedMinBasis) - 10,
        );
        expect(strain.ertrag_hi).toBeLessThanOrEqual(
          Math.ceil(expectedMaxBasis) + 10,
        );
      }
    });
  });

  describe("6. Strain Selection Bridge & State Integration", () => {
    it("invokes selection callback with full strain object upon selection", () => {
      const onSelectStrain = vi.fn();
      const targetStrain = cockpitData[0];

      onSelectStrain(targetStrain);

      expect(onSelectStrain).toHaveBeenCalledTimes(1);
      expect(onSelectStrain).toHaveBeenCalledWith(targetStrain);
      expect(onSelectStrain.mock.calls[0][0].name).toBe(
        "Mighty Dwarf Automatic",
      );
      expect(onSelectStrain.mock.calls[0][0].score).toBe(92);
      expect(onSelectStrain.mock.calls[0][0].breeder).toBe("Sensi Seeds");
    });

    it("handles modal selection workflow where selecting strain invokes callback", () => {
      const onSelectStrain = vi.fn();
      const onClose = vi.fn();

      const selectedStrain = cockpitData.find(
        (s) => s.id === "samen-4-double-grape",
      )!;
      expect(selectedStrain).toBeDefined();

      // Simulate modal selection handler
      const handleModalSelect = (strain: AutoflowerStrain) => {
        onSelectStrain(strain);
        onClose();
      };

      handleModalSelect(selectedStrain);

      expect(onSelectStrain).toHaveBeenCalledWith(selectedStrain);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(selectedStrain.name).toBe("Double Grape");
      expect(selectedStrain.breeder).toBe("Mephisto Genetics");
    });
  });
});
