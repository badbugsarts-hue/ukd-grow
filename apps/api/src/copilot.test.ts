import { describe, expect, it } from "vitest";
import type { CopilotExplanationResponse } from "@ukd/contracts";
import { enforceGrounding, type ResolvedCopilotContext } from "./copilot.js";

const context: ResolvedCopilotContext = {
  facts: [{ id: "fact-1", value: "EC 1.4", status: "measured" }],
  rules: [{ id: "RULE-1", result: "hold" }],
  claims: [
    { id: "CLAIM-1", statement: "Approved claim", sourceIds: ["SRC-1"] },
  ],
};

function response(
  overrides: Partial<CopilotExplanationResponse> = {},
): CopilotExplanationResponse {
  return {
    answer: "Rule result explained.",
    facts: context.facts,
    ruleIds: ["RULE-1"],
    claimIds: ["CLAIM-1"],
    citations: [{ claimId: "CLAIM-1", sourceIds: ["SRC-1"] }],
    uncertainty: "medium",
    safetyNotices: [],
    blocked: false,
    blockReason: null,
    ...overrides,
  };
}

describe("copilot grounding gate", () => {
  it("accepts only approved facts, rules, claims and sources", () => {
    expect(enforceGrounding(response(), context).blocked).toBe(false);
  });
  it.each([
    { ruleIds: ["invented-rule"] },
    { claimIds: ["invented-claim"] },
    { facts: [{ id: "invented-fact", value: "x", status: "measured" }] },
    { citations: [{ claimId: "CLAIM-1", sourceIds: ["invented-source"] }] },
  ])("blocks invented grounding: %o", (override) => {
    expect(enforceGrounding(response(override), context).blocked).toBe(true);
  });
});
