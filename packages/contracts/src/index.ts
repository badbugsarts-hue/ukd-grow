export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface SyncOperation {
  id: string;
  workspaceId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  baseRevision: number | null;
  operation: "append" | "upsert" | "tombstone";
  payload: unknown;
  createdAt: string;
}

export interface SyncCursor {
  workspaceId: string;
  position: string;
}

export interface SyncConflict {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  localOperationId: string;
  remoteOperationId: string;
  reason: "revision-mismatch" | "concurrent-update" | "tombstone-conflict";
  status: "open" | "resolved";
}

export interface PushRequest {
  workspaceId: string;
  operations: SyncOperation[];
}

export interface PushResponse {
  acceptedOperationIds: string[];
  conflicts: SyncConflict[];
  cursor: SyncCursor;
}

export interface PullResponse {
  operations: SyncOperation[];
  conflicts: SyncConflict[];
  cursor: SyncCursor;
}

export interface CopilotExplanationRequest {
  workspaceId: string;
  question: string;
  language: "de-DE" | "en-US";
  selectedFactIds: string[];
  ruleIds: string[];
  claimIds: string[];
}

export interface CopilotCitation {
  claimId: string;
  sourceIds: string[];
}

export interface CopilotExplanationResponse {
  answer: string;
  facts: Array<{ id: string; value: string; status: string }>;
  ruleIds: string[];
  claimIds: string[];
  citations: CopilotCitation[];
  uncertainty: string;
  safetyNotices: string[];
  blocked: boolean;
  blockReason: string | null;
}

export const emailSchema = {
  type: "string",
  format: "email",
  maxLength: 254,
} as const;

export const magicLinkRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["email"],
  properties: { email: emailSchema },
} as const;

export const magicLinkVerifySchema = {
  type: "object",
  additionalProperties: false,
  required: ["token"],
  properties: {
    token: { type: "string", minLength: 32, maxLength: 512 },
  },
} as const;

export const syncOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "workspaceId",
    "deviceId",
    "entityType",
    "entityId",
    "baseRevision",
    "operation",
    "payload",
    "createdAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    workspaceId: { type: "string", format: "uuid" },
    deviceId: { type: "string", minLength: 1, maxLength: 128 },
    entityType: { type: "string", minLength: 1, maxLength: 128 },
    entityId: { type: "string", minLength: 1, maxLength: 256 },
    baseRevision: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
    },
    operation: { enum: ["append", "upsert", "tombstone"] },
    payload: {},
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

export const pushRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["workspaceId", "operations"],
  properties: {
    workspaceId: { type: "string", format: "uuid" },
    operations: { type: "array", maxItems: 500, items: syncOperationSchema },
  },
} as const;

export const copilotRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "workspaceId",
    "question",
    "language",
    "selectedFactIds",
    "ruleIds",
    "claimIds",
  ],
  properties: {
    workspaceId: { type: "string", format: "uuid" },
    question: { type: "string", minLength: 3, maxLength: 2000 },
    language: { enum: ["de-DE", "en-US"] },
    selectedFactIds: {
      type: "array",
      maxItems: 50,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
    ruleIds: {
      type: "array",
      maxItems: 30,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
    claimIds: {
      type: "array",
      maxItems: 30,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
  },
} as const;

export const copilotResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "answer",
    "facts",
    "ruleIds",
    "claimIds",
    "citations",
    "uncertainty",
    "safetyNotices",
    "blocked",
    "blockReason",
  ],
  properties: {
    answer: { type: "string" },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value", "status"],
        properties: {
          id: { type: "string" },
          value: { type: "string" },
          status: { type: "string" },
        },
      },
    },
    ruleIds: { type: "array", items: { type: "string" } },
    claimIds: { type: "array", items: { type: "string" } },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claimId", "sourceIds"],
        properties: {
          claimId: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    uncertainty: { type: "string" },
    safetyNotices: { type: "array", items: { type: "string" } },
    blocked: { type: "boolean" },
    blockReason: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;
