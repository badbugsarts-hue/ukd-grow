import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  copilotRequestSchema,
  copilotResponseSchema,
  type CopilotExplanationRequest,
  type CopilotExplanationResponse,
} from "@ukd/contracts";
import { authenticate } from "./auth.js";
import type { ApiConfig } from "./config.js";
import type { DatabasePool } from "./database.js";

export interface CopilotFact {
  id: string;
  value: string;
  status: string;
}

export interface ResolvedCopilotContext {
  facts: CopilotFact[];
  rules: Array<{ id: string; result: string }>;
  claims: Array<{ id: string; statement: string; sourceIds: string[] }>;
}

export interface CopilotContextResolver {
  resolve(
    userId: string,
    request: CopilotExplanationRequest,
  ): Promise<ResolvedCopilotContext>;
}

export interface ExplanationProvider {
  explain(
    request: CopilotExplanationRequest,
    context: ResolvedCopilotContext,
    safetyIdentifier: string,
  ): Promise<CopilotExplanationResponse>;
}

export class OpenAiResponsesProvider implements ExplanationProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
  ) {}

  async explain(
    request: CopilotExplanationRequest,
    context: ResolvedCopilotContext,
    safetyIdentifier: string,
  ): Promise<CopilotExplanationResponse> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        safety_identifier: safetyIdentifier,
        max_output_tokens: 1200,
        input: [
          {
            role: "system",
            content:
              "You are UKD's read-only explanation layer. Explain only the supplied deterministic facts, rules, and approved claims. Never calculate a dose, invent a value, mutate data, acknowledge a task, or issue device commands. Preserve uncertainty and cite every claim and rule used. If context is insufficient, return blocked=true.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question: request.question,
              language: request.language,
              ...context,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ukd_copilot_explanation",
            strict: true,
            schema: copilotResponseSchema,
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI Responses API failed with ${response.status}`);
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; refusal?: string; text?: string }>;
      }>;
    };
    const refusal = payload.output
      ?.flatMap((entry) => entry.content ?? [])
      .find((entry) => entry.type === "refusal");
    if (refusal) return blockedResponse(refusal.refusal ?? "Provider refusal");
    const text =
      payload.output_text ??
      payload.output
        ?.flatMap((entry) => entry.content ?? [])
        .find((entry) => entry.type === "output_text")?.text;
    if (!text)
      return blockedResponse("Provider returned no structured explanation.");
    return JSON.parse(text) as CopilotExplanationResponse;
  }
}

export async function registerCopilotRoute(
  app: FastifyInstance,
  pool: DatabasePool,
  config: ApiConfig,
  resolver: CopilotContextResolver,
  provider: ExplanationProvider | null,
) {
  app.post<{ Body: CopilotExplanationRequest }>(
    "/v1/copilot/explain",
    {
      preHandler: authenticate(pool, config),
      schema: {
        body: copilotRequestSchema,
        response: { 200: copilotResponseSchema },
      },
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) => {
      const auth = request.auth;
      if (!auth) return blockedResponse("Authentication required.");
      if (containsRestrictedPersonalData(request.body.question))
        return blockedResponse(
          "Patienten-, Rechtsdokument- oder Kontaktdaten dürfen nicht an den Copilot übertragen werden.",
        );
      const context = await resolver.resolve(auth.userId, request.body);
      if (
        context.rules.length === 0 ||
        context.claims.length === 0 ||
        context.facts.length === 0
      )
        return blockedResponse(
          "Freigegebene Fakten, Rules oder Claims fehlen.",
        );
      if (!provider)
        return blockedResponse("AI-Provider ist nicht konfiguriert.");
      const result = await provider.explain(
        request.body,
        context,
        pseudonymousSafetyId(auth.userId),
      );
      return enforceGrounding(result, context);
    },
  );
}

export function enforceGrounding(
  response: CopilotExplanationResponse,
  context: ResolvedCopilotContext,
): CopilotExplanationResponse {
  const ruleIds = new Set(context.rules.map((entry) => entry.id));
  const claimIds = new Set(context.claims.map((entry) => entry.id));
  const factIds = new Set(context.facts.map((entry) => entry.id));
  const sourcesByClaim = new Map(
    context.claims.map((entry) => [entry.id, new Set(entry.sourceIds)]),
  );
  if (
    response.ruleIds.length === 0 ||
    response.claimIds.length === 0 ||
    response.ruleIds.some((id) => !ruleIds.has(id)) ||
    response.claimIds.some((id) => !claimIds.has(id)) ||
    response.facts.some((fact) => !factIds.has(fact.id)) ||
    response.citations.some(
      (citation) =>
        !claimIds.has(citation.claimId) ||
        citation.sourceIds.some(
          (sourceId) => !sourcesByClaim.get(citation.claimId)?.has(sourceId),
        ),
    )
  )
    return blockedResponse(
      "Antwort enthält fehlende oder nicht freigegebene Rule-/Claim-Referenzen.",
    );
  return response;
}

function blockedResponse(reason: string): CopilotExplanationResponse {
  return {
    answer: "",
    facts: [],
    ruleIds: [],
    claimIds: [],
    citations: [],
    uncertainty: "Nicht bewertbar",
    safetyNotices: [reason],
    blocked: true,
    blockReason: reason,
  };
}

function pseudonymousSafetyId(userId: string): string {
  return `ukd_${createHash("sha256").update(userId).digest("hex")}`;
}

function containsRestrictedPersonalData(value: string): boolean {
  return /\b(patient|patientin|genehmigung|rezept|versichertennummer|aktenzeichen|e-?mail|telefon|adresse)\b/i.test(
    value,
  );
}
