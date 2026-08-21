import type {
  RunConfig,
  RunTemplate,
  SetupProfile,
  UserPreferences,
  WorkspacePackage,
} from "./types";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  schemaVersion: "1.0.0",
  language: "de-DE",
  unitSystem: "si",
  theme: "system",
  contrast: "normal",
  experienceLens: "guided",
  helpIntensity: "contextual",
  favorites: ["today", "log", "mix"],
  tableColumns: {},
  layout: {},
};

export function createWorkspacePackage(
  name = "Lokaler UKD Workspace",
  now = new Date(),
): WorkspacePackage {
  const timestamp = now.toISOString();
  return {
    format: "ukd-workspace-package",
    schemaVersion: "2.0.0",
    id: crypto.randomUUID(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    setupProfiles: [],
    runTemplates: [],
    preferences: DEFAULT_USER_PREFERENCES,
    runIds: [],
    backupPolicy: {
      debounceSeconds: 30,
      maxRecent: 20,
      maxDaily: 30,
      maxMonthly: 12,
      reminderDays: 7,
    },
  };
}

export function resolveRunConfiguration(
  canonicalDefaults: RunConfig,
  workspacePreferences: Partial<RunConfig>,
  setupProfile: SetupProfile | null,
  runTemplate: RunTemplate | null,
): RunConfig {
  return mergeRunConfig(
    mergeRunConfig(
      mergeRunConfig(canonicalDefaults, workspacePreferences),
      setupProfile?.config ?? {},
    ),
    runTemplate?.configOverrides ?? {},
  );
}

export function mergeRunConfig(
  base: RunConfig,
  override: Partial<RunConfig>,
): RunConfig {
  return {
    ...base,
    ...defined(override),
    water: { ...base.water, ...defined(override.water ?? {}) },
    light:
      override.light === undefined
        ? base.light
        : override.light === null
          ? null
          : base.light
            ? { ...base.light, ...defined(override.light) }
            : override.light,
  };
}

export function upsertSetupProfile(
  workspace: WorkspacePackage,
  profile: Omit<SetupProfile, "version" | "createdAt" | "updatedAt">,
  now = new Date(),
): WorkspacePackage {
  const existing = workspace.setupProfiles.find(
    (entry) => entry.id === profile.id,
  );
  const timestamp = now.toISOString();
  const next: SetupProfile = {
    ...profile,
    version: (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  return {
    ...workspace,
    updatedAt: timestamp,
    setupProfiles: existing
      ? workspace.setupProfiles.map((entry) =>
          entry.id === next.id ? next : entry,
        )
      : [next, ...workspace.setupProfiles],
  };
}

export function upsertRunTemplate(
  workspace: WorkspacePackage,
  template: Omit<RunTemplate, "version" | "createdAt" | "updatedAt">,
  now = new Date(),
): WorkspacePackage {
  const existing = workspace.runTemplates.find(
    (entry) => entry.id === template.id,
  );
  if (
    template.setupProfileId &&
    !workspace.setupProfiles.some(
      (entry) => entry.id === template.setupProfileId,
    )
  )
    throw new Error("Setup-Profil für Run-Template wurde nicht gefunden.");
  const timestamp = now.toISOString();
  const next: RunTemplate = {
    ...template,
    version: (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  return {
    ...workspace,
    updatedAt: timestamp,
    runTemplates: existing
      ? workspace.runTemplates.map((entry) =>
          entry.id === next.id ? next : entry,
        )
      : [next, ...workspace.runTemplates],
  };
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
