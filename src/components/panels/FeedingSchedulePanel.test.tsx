import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkbookSheet } from "../../types";
import { FeedingSchedulePanel } from "./FeedingSchedulePanel";

const sheet: WorkbookSheet = {
  range: "A1:O8",
  formulas: [],
  values: [
    ["Autoflower Feed Map"],
    [],
    ["Role / Product", "Plan state", "Gate / interpretation", "W1"],
    ["HESI Base", "CORE", "Event-gated", "TNT 1.25"],
    ["Alternative", "OFF", "Nicht im Reference-Stack", "—"],
    ["HOW TO READ THE MAP"],
    ["Cells show eligibility, not forced application."],
    ["Source / scope", "URL", "Use"],
  ],
};

describe("FeedingSchedulePanel", () => {
  it("finds the semantic header and keeps appendix rows out of the operational table", () => {
    const html = renderToString(
      <FeedingSchedulePanel sheet={sheet} lens="advanced" />,
    );

    expect(html).toContain("Role / Product");
    expect(html).toContain("HESI Base");
    expect(html).toContain("Alternative");
    expect(html).not.toContain("HOW TO READ THE MAP");
    expect(html).not.toContain("Source / scope");
  });

  it("hides off and experimental paths in Guided without changing active values", () => {
    const html = renderToString(
      <FeedingSchedulePanel sheet={sheet} lens="guided" />,
    );

    expect(html).toContain("TNT 1.25");
    expect(html).not.toContain("Nicht im Reference-Stack");
  });
});
