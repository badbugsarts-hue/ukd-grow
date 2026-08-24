import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InlineEditable } from "./InlineEditable";
import { InlineMetricCard } from "./InlineMetricCard";

describe("InlineEditable & InlineMetricCard UI Primitives Suite", () => {
  describe("1. InlineEditable Display Mode & Accessibility", () => {
    it("renders display mode with value, label, unit and >=44px touch target", () => {
      const onSave = vi.fn();
      const el = (
        <InlineEditable
          value={500}
          label="PPFD"
          unit="µmol/m²/s"
          onSave={onSave}
          minTouchTarget={true}
        />
      );

      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.label).toBe("PPFD");
      expect(el.props.value).toBe(500);
      expect(el.props.unit).toBe("µmol/m²/s");
      expect(el.props.minTouchTarget).toBe(true);

      const html = renderToString(el);
      expect(html).toContain("inline-editable-trigger");
      expect(html).toContain("500 µmol/m²/s");
      expect(html).toContain("PPFD: 500 µmol/m²/s (Klicken zum Bearbeiten)");
      expect(html).toContain("min-height:44px");
      expect(html).toContain("min-width:44px");
      expect(html).toContain("✎");
    });

    it("renders custom displayValue if provided", () => {
      const onSave = vi.fn();
      const el = (
        <InlineEditable
          value="CustomVal"
          displayValue={<strong>Styled Display</strong>}
          label="Custom"
          onSave={onSave}
        />
      );

      const html = renderToString(el);
      expect(html).toContain("Styled Display");
    });

    it("renders placeholder dash '—' when value is null or empty", () => {
      const onSave = vi.fn();
      const el = (
        <InlineEditable value={null} label="Missing Field" onSave={onSave} />
      );
      const html = renderToString(el);
      expect(html).toContain("—");
    });
  });

  describe("2. Validation & Custom Error Handling", () => {
    it("enforces numerical min and max constraints", () => {
      const onSave = vi.fn();
      const validator = (val: number) => {
        if (val < 100) return "Wert zu niedrig (<100)";
        if (val > 1000) return "Wert zu hoch (>1000)";
        return true;
      };

      const el = (
        <InlineEditable<number>
          value={500}
          label="PPFD"
          type="number"
          min={100}
          max={1000}
          validator={validator}
          onSave={onSave}
        />
      );

      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.min).toBe(100);
      expect(el.props.max).toBe(1000);

      // Verify custom validator logic
      expect(validator(50)).toBe("Wert zu niedrig (<100)");
      expect(validator(1200)).toBe("Wert zu hoch (>1000)");
      expect(validator(600)).toBe(true);
    });

    it("supports structured object validation with warning", () => {
      const onSave = vi.fn();
      const advancedValidator = (val: number) => {
        if (val > 1.8) {
          return { valid: false, error: "EC über toxischem Grenzwert" };
        }
        if (val > 1.5) {
          return { valid: true, warning: "Hohe Nährstoffkonzentration" };
        }
        return { valid: true };
      };

      const el = (
        <InlineEditable<number>
          value={1.2}
          label="EC"
          type="number"
          validator={advancedValidator}
          onSave={onSave}
        />
      );

      expect(React.isValidElement(el)).toBe(true);
      expect(advancedValidator(2.0)).toEqual({
        valid: false,
        error: "EC über toxischem Grenzwert",
      });
      expect(advancedValidator(1.6)).toEqual({
        valid: true,
        warning: "Hohe Nährstoffkonzentration",
      });
      expect(advancedValidator(1.2)).toEqual({ valid: true });
    });
  });

  describe("3. InlineMetricCard Integration", () => {
    it("renders metric card with target, measured, unit and term tooltip", () => {
      const onSaveMeasurement = vi.fn();
      const onSaveTarget = vi.fn();

      const el = (
        <InlineMetricCard
          label="PPFD"
          targetValue={650}
          measuredValue={620}
          unit="µmol/m²/s"
          tone="blue"
          note="Canopy Dichte"
          lens="advanced"
          onSaveMeasurement={onSaveMeasurement}
          onSaveTarget={onSaveTarget}
        />
      );

      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.label).toBe("PPFD");
      expect(el.props.targetValue).toBe(650);
      expect(el.props.measuredValue).toBe(620);
      expect(el.props.unit).toBe("µmol/m²/s");
      expect(el.props.tone).toBe("blue");

      const html = renderToString(el);
      expect(html).toContain("inline-metric-card");
      expect(html).toContain("PPFD");
      expect(html).toContain("µmol/m²/s");
      expect(html).toContain("IST-WERT");
      expect(html).toContain("Canopy Dichte");
    });

    it("renders tab selector for Ist / Soll when both save handlers are present", () => {
      const onSaveMeasurement = vi.fn();
      const onSaveTarget = vi.fn();

      const el = (
        <InlineMetricCard
          label="EC"
          targetValue={1.4}
          measuredValue={1.5}
          unit="mS/cm"
          tone="green"
          onSaveMeasurement={onSaveMeasurement}
          onSaveTarget={onSaveTarget}
        />
      );

      const html = renderToString(el);
      expect(html).toContain("Ist");
      expect(html).toContain("Soll");
    });

    it("renders static display if editable is false", () => {
      const el = (
        <InlineMetricCard
          label="DLI"
          targetValue={42}
          unit="mol/m²/d"
          editable={false}
        />
      );

      const html = renderToString(el);
      expect(html).toContain("42");
      expect(html).toContain("mol/m²/d");
      expect(html).not.toContain("inline-editable-trigger");
    });
  });
});
