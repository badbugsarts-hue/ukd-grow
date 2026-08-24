import { stableStringify } from "./backup";
import type { RunPackage } from "./types";

export const AI_EXCHANGE_FORMAT = "ukd-ai-exchange/1" as const;
export const AI_PROPOSAL_FORMAT = "ukd-ai-proposal/1" as const;

const forbiddenKey =
  /(?:legal|patient|email|password|passphrase|token|secret|recovery|authorization|telemetry|ciphertext|privatekey)/i;
const forbiddenTarget =
  /(?:liveAnchor|anchorRevisions|domainEvents|auditEvents|evidence|formula|legal|patient|device|equipment|calculation|configurationSnapshot|schemaVersion|mediaAssets)/i;
const safeTargets = new Set([
  "config.name",
  "config.genetics",
  "config.mediumProduct",
  "config.irrigationSystem",
  "guidance.note",
]);

export interface AiExchangePackage {
  format: typeof AI_EXCHANGE_FORMAT;
  createdAtUtc: string;
  baseRunId: string;
  baseRunSha256: string;
  manifestSha256: string;
  redactions: string[];
  payload: {
    run: Record<string, unknown>;
    plan: unknown;
    knowledge: unknown;
    diagnostics: unknown;
    capabilities: unknown;
  };
  returnContract: {
    format: typeof AI_PROPOSAL_FORMAT;
    instructions: string[];
    requiredProposalFields: string[];
  };
}

export interface AiProposal {
  id: string;
  targetPath: string;
  operation: "replace" | "guidance";
  baseValue: unknown;
  proposedValue: unknown;
  reason: string;
  uncertainty: "low" | "medium" | "high";
  ruleIds: string[];
  claimIds: string[];
  sourceIds: string[];
}

export interface AiProposalFile {
  format: typeof AI_PROPOSAL_FORMAT;
  baseRunId: string;
  baseRunSha256: string;
  proposals: AiProposal[];
}

export interface AiImportFinding {
  severity: "error" | "warning";
  path: string;
  code: string;
  message: string;
  example?: unknown;
}

export interface ValidatedAiProposalFile {
  file: AiProposalFile;
  fileSha256: string;
  findings: AiImportFinding[];
}

export async function createAiExchange(
  run: RunPackage,
  context: {
    plan: unknown;
    knowledge: unknown;
    diagnostics: unknown;
    capabilities: unknown;
  },
  now = new Date(),
): Promise<AiExchangePackage> {
  const safeRun = sanitizeRun(run);
  const baseRunSha256 = await sha256Hex(
    stableStringify(proposalBaseProjection(safeRun)),
  );
  const payload = {
    run: safeRun,
    plan: sanitizeUnknown(context.plan),
    knowledge: sanitizeUnknown(context.knowledge),
    diagnostics: sanitizeUnknown(context.diagnostics),
    capabilities: sanitizeUnknown(context.capabilities),
  };
  const manifestSha256 = await sha256Hex(stableStringify(payload));
  return {
    format: AI_EXCHANGE_FORMAT,
    createdAtUtc: now.toISOString(),
    baseRunId: run.id,
    baseRunSha256,
    manifestSha256,
    redactions: [
      "Rechts-/Patientendaten und Bestandslog",
      "E-Mail, Zugangsdaten, Recovery-Material und Telemetrie-Identifikatoren",
      "Medienbinärdaten und verschlüsselte Payloads",
    ],
    payload,
    returnContract: {
      format: AI_PROPOSAL_FORMAT,
      instructions: [
        "Nur JSON nach ukd-ai-proposal/1 zurückgeben; keine Markdown-Hülle.",
        "Jeder Vorschlag wird einzeln vom Menschen geprüft und ändert niemals Formeln, Evidenz, Live-Anker, Rechtsdaten oder Geräte.",
        "Fehlende Messwerte als Messauftrag kennzeichnen; keine Werte erfinden.",
      ],
      requiredProposalFields: [
        "id",
        "targetPath",
        "operation",
        "baseValue",
        "proposedValue",
        "reason",
        "uncertainty",
        "ruleIds",
        "claimIds",
        "sourceIds",
      ],
    },
  };
}

export async function validateAiProposalImport(
  value: unknown,
  rawText: string,
  run: RunPackage,
): Promise<ValidatedAiProposalFile> {
  const findings: AiImportFinding[] = [];
  const fileSha256 = await sha256Hex(rawText);
  if (!value || typeof value !== "object") {
    return {
      file: {
        format: AI_PROPOSAL_FORMAT,
        baseRunId: "",
        baseRunSha256: "",
        proposals: [],
      },
      fileSha256,
      findings: [
        {
          severity: "error",
          path: "$",
          code: "not-object",
          message: "Die Datei enthält kein JSON-Objekt.",
          example: { format: AI_PROPOSAL_FORMAT },
        },
      ],
    };
  }
  const file = value as Partial<AiProposalFile>;
  for (const key of Object.keys(value as Record<string, unknown>))
    if (!["format", "baseRunId", "baseRunSha256", "proposals"].includes(key))
      findings.push({
        severity: "error",
        path: `$.${key}`,
        code: "unknown-field",
        message: "Unbekanntes Root-Feld ist nicht erlaubt.",
      });
  if (file.format !== AI_PROPOSAL_FORMAT)
    findings.push({
      severity: "error",
      path: "$.format",
      code: "wrong-format",
      message: `Erwartet wird ${AI_PROPOSAL_FORMAT}.`,
      example: AI_PROPOSAL_FORMAT,
    });
  if (file.baseRunId !== run.id)
    findings.push({
      severity: "error",
      path: "$.baseRunId",
      code: "wrong-run",
      message: "Die Vorschläge gehören nicht zum aktiven Run.",
    });
  const currentHash = await sha256Hex(
    stableStringify(proposalBaseProjection(sanitizeRun(run))),
  );
  if (file.baseRunSha256 !== currentHash)
    findings.push({
      severity: "error",
      path: "$.baseRunSha256",
      code: "stale-base",
      message:
        "Der Run wurde seit dem AI-Export verändert. Bitte neu exportieren.",
    });
  if (!Array.isArray(file.proposals))
    findings.push({
      severity: "error",
      path: "$.proposals",
      code: "missing-list",
      message: "Die Vorschlagsliste fehlt.",
      example: [],
    });
  const seen = new Set<string>();
  for (const [index, proposal] of (Array.isArray(file.proposals)
    ? file.proposals
    : []
  ).entries()) {
    const path = `$.proposals[${index}]`;
    if (!proposal || typeof proposal !== "object") {
      findings.push({
        severity: "error",
        path,
        code: "invalid-proposal",
        message: "Vorschlag muss ein Objekt sein.",
      });
      continue;
    }
    for (const key of Object.keys(proposal))
      if (
        ![
          "id",
          "targetPath",
          "operation",
          "baseValue",
          "proposedValue",
          "reason",
          "uncertainty",
          "ruleIds",
          "claimIds",
          "sourceIds",
        ].includes(key)
      )
        findings.push({
          severity: "error",
          path: `${path}.${key}`,
          code: "unknown-field",
          message: "Unbekanntes Vorschlagsfeld ist nicht erlaubt.",
        });
    if (typeof proposal.id !== "string" || !proposal.id.trim())
      findings.push({
        severity: "error",
        path: `${path}.id`,
        code: "missing-id",
        message: "Vorschlags-ID fehlt.",
      });
    else if (seen.has(proposal.id))
      findings.push({
        severity: "error",
        path: `${path}.id`,
        code: "duplicate-id",
        message: "Vorschlags-ID ist doppelt.",
      });
    else seen.add(proposal.id);
    if (
      typeof proposal.targetPath !== "string" ||
      forbiddenTarget.test(proposal.targetPath) ||
      !safeTargets.has(proposal.targetPath)
    )
      findings.push({
        severity: "error",
        path: `${path}.targetPath`,
        code: "blocked-target",
        message: "Der Zielpfad ist nicht freigegeben.",
      });
    if (proposal.operation !== "replace" && proposal.operation !== "guidance")
      findings.push({
        severity: "error",
        path: `${path}.operation`,
        code: "invalid-operation",
        message: "Nur replace oder guidance ist erlaubt.",
      });
    if (
      typeof proposal.reason !== "string" ||
      proposal.reason.trim().length < 8
    )
      findings.push({
        severity: "error",
        path: `${path}.reason`,
        code: "missing-reason",
        message: "Eine nachvollziehbare Begründung fehlt.",
      });
    if (!["low", "medium", "high"].includes(proposal.uncertainty))
      findings.push({
        severity: "error",
        path: `${path}.uncertainty`,
        code: "invalid-uncertainty",
        message: "Unsicherheit muss low, medium oder high sein.",
      });
    for (const key of ["ruleIds", "claimIds", "sourceIds"] as const)
      if (!Array.isArray(proposal[key]))
        findings.push({
          severity: "error",
          path: `${path}.${key}`,
          code: "missing-references",
          message: `${key} muss eine Liste sein.`,
        });
    const serialized = JSON.stringify(proposal);
    if (
      /<\/?(?:script|iframe|html)|javascript:|ignore\s+(?:all|previous)|system\s+prompt/i.test(
        serialized,
      )
    )
      findings.push({
        severity: "error",
        path,
        code: "untrusted-content",
        message: "HTML, Script oder Prompt-Injection-Inhalt wurde blockiert.",
      });
  }
  return {
    file: {
      format: AI_PROPOSAL_FORMAT,
      baseRunId: String(file.baseRunId ?? ""),
      baseRunSha256: String(file.baseRunSha256 ?? ""),
      proposals: (Array.isArray(file.proposals)
        ? file.proposals
        : []) as AiProposal[],
    },
    fileSha256,
    findings,
  };
}

export function createAiCorrectionRequest(
  fileSha256: string,
  findings: AiImportFinding[],
) {
  return {
    format: "ukd-ai-correction-request/1",
    fileSha256,
    instruction:
      "Korrigiere ausschließlich die aufgeführten Schemafehler und gib danach nur ukd-ai-proposal/1 JSON zurück.",
    findings,
  };
}

export function sanitizeRun(run: RunPackage): Record<string, unknown> {
  const { inventory: _legalInventory, ...withoutInventory } = run;
  return sanitizeUnknown(withoutInventory) as Record<string, unknown>;
}

function proposalBaseProjection(
  safeRun: Record<string, unknown>,
): Record<string, unknown> {
  const projection = structuredClone(safeRun);
  delete projection.updatedAt;
  delete projection.backupState;
  delete projection.backupCheckpoints;
  if (Array.isArray(projection.domainEvents))
    projection.domainEvents = projection.domainEvents.filter(
      (entry) => (entry as { type?: unknown }).type !== "backup.checkpoint",
    );
  if (Array.isArray(projection.auditEvents))
    projection.auditEvents = projection.auditEvents.filter(
      (entry) => (entry as { action?: unknown }).action !== "backup-checkpoint",
    );
  if (Array.isArray(projection.events))
    projection.events = projection.events.filter(
      (entry) => (entry as { category?: unknown }).category !== "backup",
    );
  return projection;
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (!value || typeof value !== "object") {
    return typeof value === "string"
      ? value.replace(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
          "[redacted-email]",
        )
      : value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !forbiddenKey.test(key))
      .map(([key, child]) => [key, sanitizeUnknown(child)]),
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
