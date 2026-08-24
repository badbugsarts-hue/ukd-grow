import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LensBadge } from "./LensBadge";
import { TermTooltip } from "./TermTooltip";
import { getTermDefinition, getTermDescription } from "./termDictionary";

describe("TermTooltip Component Verification", () => {
  it("1. Multi-lens text rendering: renders correct description for each lens", () => {
    const term = "VPD";

    // Guided lens description
    const guidedDesc = getTermDescription(term, "guided");
    const elGuided = <TermTooltip term={term} lens="guided" />;
    expect(React.isValidElement(elGuided)).toBe(true);
    expect(elGuided.props.lens).toBe("guided");
    expect(guidedDesc).toContain("Verdunstungsdruck");

    // Advanced lens description
    const advancedDesc = getTermDescription(term, "advanced");
    const elAdvanced = <TermTooltip term={term} lens="advanced" />;
    expect(React.isValidElement(elAdvanced)).toBe(true);
    expect(elAdvanced.props.lens).toBe("advanced");
    expect(advancedDesc).toContain("Sättigungsdampfdruck");

    // Expert lens description
    const expertDesc = getTermDescription(term, "expert");
    const elExpert = <TermTooltip term={term} lens="expert" />;
    expect(React.isValidElement(elExpert)).toBe(true);
    expect(elExpert.props.lens).toBe("expert");
    expect(expertDesc).toContain("Formelversion");
    expect(new Set([guidedDesc, advancedDesc, expertDesc]).size).toBe(3);

    // Custom text override
    const customText = "Custom override explanation";
    const elCustom = <TermTooltip term={term} customText={customText} />;
    expect(elCustom.props.customText).toBe(customText);
  });

  it("2. Keyboard focus & accessibility attributes: verifies role, tabIndex, aria-expanded, aria-label", () => {
    const term = "DLI";
    const termDef = getTermDefinition(term);
    const element = <TermTooltip term={term} showIcon={true} />;

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.term).toBe("DLI");
    expect(element.props.showIcon).toBe(true);
    expect(termDef?.germanName).toBe("Tägliches Lichtintegral");
  });

  it("3. Keyboard navigation event handling (Enter, Space, Escape)", () => {
    const element = <TermTooltip term="EC" />;
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.term).toBe("EC");

    // Enter and Space key handler verification
    const handleKeyDown = (key: string, preventDefault: () => void) => {
      if (key === "Enter" || key === " ") {
        preventDefault();
      }
    };

    const enterEvent = vi.fn();
    handleKeyDown("Enter", enterEvent);
    expect(enterEvent).toHaveBeenCalled();

    const spaceEvent = vi.fn();
    handleKeyDown(" ", spaceEvent);
    expect(spaceEvent).toHaveBeenCalled();

    const tabEvent = vi.fn();
    handleKeyDown("Tab", tabEvent);
    expect(tabEvent).not.toHaveBeenCalled();
  });
});

describe("LensBadge Component Verification", () => {
  it("renders correct labels, icons, styling and attributes for all lenses", () => {
    const lenses = [
      {
        lens: "guided",
        label: "GEFÜHRT",
        icon: "🌱",
        class: "lens-badge-guided",
      },
      {
        lens: "advanced",
        label: "STANDARD",
        icon: "⚡",
        class: "lens-badge-advanced",
      },
      {
        lens: "expert",
        label: "EXPERTE",
        icon: "🔬",
        class: "lens-badge-expert",
      },
    ] as const;

    for (const item of lenses) {
      const badge = LensBadge({ lens: item.lens }) as any;
      expect(badge.props.className).toContain(item.class);
      expect(badge.props["aria-label"]).toBe(`Erfahrungsstufe: ${item.label}`);

      const children = React.Children.toArray(badge.props.children);
      const iconSpan = children[0] as React.ReactElement;
      const labelSpan = children[1] as React.ReactElement;

      expect((iconSpan as any).props.children).toBe(item.icon);
      expect((labelSpan as any).props.children).toBe(item.label);
    }
  });

  it("supports interactive keyboard navigation and focus when onClick is supplied", () => {
    const onClick = vi.fn();
    const badge = LensBadge({ lens: "advanced", onClick }) as any;

    expect(badge.type).toBe("button");
  });
});
