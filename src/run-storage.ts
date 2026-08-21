import { migrateRunPackage, validateRunPackage } from "./run-state";
import type { SyncOperation } from "@ukd/contracts";
import type {
  RunPackage,
  StorageFailureKind,
  StorageHealthState,
  WorkspacePackage,
} from "./types";

const DB_NAME = "ukd-operator-workspace";
const DB_VERSION = 8;
const LEGACY_STORE = "run-packages";
const V2_STORE = "run-packages-v2";
const RUN_STORE = "run-packages-v3";
const META_STORE = "workspace-meta";
const RESTORE_STAGING_STORE = "restore-staging-v2";
const MEDIA_STORE = "media-ciphertexts-v1";
const MEDIA_KEY = "workspace-media-key-v1";
const WORKSPACE_PACKAGE_KEY = "workspace-package-v1";
const SYNC_OUTBOX_STORE = "sync-outbox-v1";
const BACKUP_VAULT_STORE = "backup-vault-v1";
const ACTIVE_KEY = "active-run-id";
const LEGACY_ACTIVE_KEY = "active";

export interface RunRepository {
  createRun(run: RunPackage): Promise<void>;
  loadRun(id: string): Promise<RunPackage | null>;
  saveRun(run: RunPackage): Promise<void>;
  listRuns(): Promise<RunPackage[]>;
  deleteRun(id: string): Promise<void>;
  getActiveRunId(): Promise<string | null>;
  setActiveRun(id: string | null): Promise<void>;
}

export interface StorageFailure {
  kind: StorageFailureKind;
  message: string;
  recoverable: boolean;
  cause?: unknown;
}

export type LocalSyncOperation = Omit<SyncOperation, "workspaceId"> & {
  workspaceId: string | null;
};

export type StorageOperationResult<T> =
  | { ok: true; value: T; state: StorageHealthState }
  | {
      ok: false;
      failure: StorageFailure;
      state: StorageHealthState;
      protectedRun: RunPackage | null;
    };

class CorruptRunStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorruptRunStorageError";
  }
}

export function classifyStorageFailure(cause: unknown): StorageFailure {
  const name = cause instanceof Error ? cause.name : "";
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  const normalized = `${name} ${message}`.toLowerCase();
  if (name === "QuotaExceededError" || normalized.includes("quota")) {
    return {
      kind: "quota",
      message:
        "Der lokale Speicher ist voll. Der letzte Stand bleibt im Arbeitsspeicher geschützt.",
      recoverable: true,
      cause,
    };
  }
  if (normalized.includes("blocked") || name === "VersionError") {
    return {
      kind: "blocked",
      message:
        "Der lokale Speicher wird durch eine andere App-Instanz oder eine ausstehende Migration blockiert.",
      recoverable: true,
      cause,
    };
  }
  if (name === "CorruptRunStorageError" || normalized.includes("corrupt")) {
    return {
      kind: "corrupt",
      message:
        "Gespeicherte Run-Daten sind beschädigt oder schematisch ungültig. Sie wurden nicht aktiviert.",
      recoverable: false,
      cause,
    };
  }
  if (
    name === "SecurityError" ||
    name === "InvalidStateError" ||
    name === "NotSupportedError"
  ) {
    return {
      kind: "unavailable",
      message: "IndexedDB ist in diesem Browser-Kontext nicht verfügbar.",
      recoverable: false,
      cause,
    };
  }
  return {
    kind: "unknown",
    message: "Die lokale Speicherung ist unerwartet fehlgeschlagen.",
    recoverable: true,
    cause,
  };
}

export class ResilientRunRepository {
  private state: StorageHealthState = "healthy";
  private protectedRun: RunPackage | null = null;

  constructor(private readonly persist: (run: RunPackage) => Promise<void>) {}

  getState(): StorageHealthState {
    return this.state;
  }

  getProtectedRun(): RunPackage | null {
    return this.protectedRun;
  }

  async save(run: RunPackage): Promise<StorageOperationResult<RunPackage>> {
    if (this.state === "read-only" || this.state === "recovery-required") {
      return {
        ok: false,
        failure: {
          kind: "blocked",
          message:
            "Schreibzugriffe bleiben bis zu einer erfolgreichen Speicherprüfung gesperrt.",
          recoverable: true,
        },
        state: this.state,
        protectedRun: this.protectedRun,
      };
    }
    this.protectedRun = run;
    try {
      await this.persist(run);
      this.state = "healthy";
      return { ok: true, value: run, state: this.state };
    } catch (cause) {
      const failure = classifyStorageFailure(cause);
      this.state =
        failure.kind === "corrupt" ? "recovery-required" : "read-only";
      return {
        ok: false,
        failure,
        state: this.state,
        protectedRun: this.protectedRun,
      };
    }
  }

  async retry(
    run = this.protectedRun,
  ): Promise<StorageOperationResult<RunPackage>> {
    if (!run) {
      return {
        ok: false,
        failure: {
          kind: "unknown",
          message:
            "Kein geschützter Run für einen erneuten Schreibversuch vorhanden.",
          recoverable: false,
        },
        state: this.state,
        protectedRun: null,
      };
    }
    this.state = "degraded";
    return this.save(run);
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE))
        database.createObjectStore(LEGACY_STORE);
      const runStore = database.objectStoreNames.contains(RUN_STORE)
        ? request.transaction?.objectStore(RUN_STORE)
        : database.createObjectStore(RUN_STORE);
      if (!database.objectStoreNames.contains(META_STORE))
        database.createObjectStore(META_STORE);
      if (!database.objectStoreNames.contains(RESTORE_STAGING_STORE))
        database.createObjectStore(RESTORE_STAGING_STORE);
      if (!database.objectStoreNames.contains(MEDIA_STORE))
        database.createObjectStore(MEDIA_STORE);
      if (!database.objectStoreNames.contains(SYNC_OUTBOX_STORE))
        database.createObjectStore(SYNC_OUTBOX_STORE);
      if (!database.objectStoreNames.contains(BACKUP_VAULT_STORE))
        database.createObjectStore(BACKUP_VAULT_STORE);
      if (database.objectStoreNames.contains(V2_STORE) && runStore) {
        const cursorRequest = request.transaction
          ?.objectStore(V2_STORE)
          .openCursor();
        if (cursorRequest) {
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const migrated = migrateRunPackage(cursor.value);
            if (migrated) runStore.put(migrated, migrated.id);
            cursor.continue();
          };
        }
      }
    };
    request.onblocked = () =>
      reject(new DOMException("IndexedDB upgrade blocked", "VersionError"));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStore<T>(
  storeName: string,
  read: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestValue(read(transaction.objectStore(storeName)));
  } finally {
    database.close();
  }
}

async function writeStores(
  storeNames: string[],
  write: (transaction: IDBTransaction) => void,
): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, "readwrite");
    write(transaction);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export const indexedDbRunRepository: RunRepository = {
  async createRun(run) {
    await writeStores([RUN_STORE, META_STORE], (transaction) => {
      transaction.objectStore(RUN_STORE).add(run, run.id);
      transaction.objectStore(META_STORE).put(run.id, ACTIVE_KEY);
    });
  },

  async loadRun(id) {
    const value = await readStore(RUN_STORE, (store) => store.get(id));
    if (!value) return null;
    const parsed = validateRunPackage(value);
    if (!parsed.ok)
      throw new CorruptRunStorageError(
        `Run ${id} ist ungültig: ${parsed.errors.join(" ")}`,
      );
    return parsed.value;
  },

  async saveRun(run) {
    await writeStores([RUN_STORE], (transaction) => {
      transaction.objectStore(RUN_STORE).put(run, run.id);
    });
  },

  async listRuns() {
    const values = await readStore<unknown[]>(RUN_STORE, (store) =>
      store.getAll(),
    );
    const parsed = values.map((value) => validateRunPackage(value));
    const invalid = parsed.find((result) => !result.ok);
    if (invalid && !invalid.ok)
      throw new CorruptRunStorageError(invalid.errors.join(" "));
    return parsed
      .filter((result) => result.ok)
      .map((result) => result.value)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },

  async deleteRun(id) {
    await writeStores([RUN_STORE, META_STORE], (transaction) => {
      transaction.objectStore(RUN_STORE).delete(id);
      const meta = transaction.objectStore(META_STORE);
      const activeRequest = meta.get(ACTIVE_KEY);
      activeRequest.onsuccess = () => {
        if (activeRequest.result === id) meta.delete(ACTIVE_KEY);
      };
    });
  },

  async getActiveRunId() {
    return (
      (await readStore<string | undefined>(META_STORE, (store) =>
        store.get(ACTIVE_KEY),
      )) ?? null
    );
  },

  async setActiveRun(id) {
    await writeStores([META_STORE], (transaction) => {
      const store = transaction.objectStore(META_STORE);
      if (id === null) store.delete(ACTIVE_KEY);
      else store.put(id, ACTIVE_KEY);
    });
  },
};

export async function loadActiveRun(): Promise<RunPackage | null> {
  const activeId = await indexedDbRunRepository.getActiveRunId();
  if (activeId) return indexedDbRunRepository.loadRun(activeId);

  const legacy = await readStore<unknown>(LEGACY_STORE, (store) =>
    store.get(LEGACY_ACTIVE_KEY),
  );
  if (!legacy) return null;
  const parsed = validateRunPackage(legacy);
  if (!parsed.ok) return null;
  await writeStores([RUN_STORE, META_STORE, LEGACY_STORE], (transaction) => {
    transaction.objectStore(RUN_STORE).put(parsed.value, parsed.value.id);
    transaction.objectStore(META_STORE).put(parsed.value.id, ACTIVE_KEY);
    transaction.objectStore(LEGACY_STORE).delete(LEGACY_ACTIVE_KEY);
  });
  return parsed.value;
}

export async function saveActiveRun(run: RunPackage): Promise<void> {
  await writeStores(
    [RUN_STORE, META_STORE, SYNC_OUTBOX_STORE],
    (transaction) => {
      transaction.objectStore(RUN_STORE).put(run, run.id);
      transaction.objectStore(META_STORE).put(run.id, ACTIVE_KEY);
      const outbox = transaction.objectStore(SYNC_OUTBOX_STORE);
      for (const event of run.domainEvents) {
        const operation: LocalSyncOperation = {
          id: event.id,
          workspaceId: null,
          deviceId: "local-browser",
          entityType: "domain-event",
          entityId: event.id,
          baseRevision: null,
          operation: "append",
          payload: event,
          createdAt: event.occurredAt,
        };
        outbox.put(operation, operation.id);
      }
    },
  );
}

export const resilientRunRepository = new ResilientRunRepository(saveActiveRun);

export async function stageAndActivateRestoredRun(
  run: RunPackage,
): Promise<RunPackage> {
  const parsed = validateRunPackage(run);
  if (!parsed.ok) throw new CorruptRunStorageError(parsed.errors.join(" "));
  const stagingKey = `restore:${parsed.value.id}:${crypto.randomUUID()}`;
  await writeStores([RESTORE_STAGING_STORE], (transaction) => {
    transaction
      .objectStore(RESTORE_STAGING_STORE)
      .add(parsed.value, stagingKey);
  });
  try {
    const staged = await readStore<unknown>(RESTORE_STAGING_STORE, (store) =>
      store.get(stagingKey),
    );
    const verified = validateRunPackage(staged);
    if (!verified.ok)
      throw new CorruptRunStorageError(verified.errors.join(" "));
    await writeStores(
      [RESTORE_STAGING_STORE, RUN_STORE, META_STORE],
      (transaction) => {
        transaction
          .objectStore(RUN_STORE)
          .put(verified.value, verified.value.id);
        transaction.objectStore(META_STORE).put(verified.value.id, ACTIVE_KEY);
        transaction.objectStore(RESTORE_STAGING_STORE).delete(stagingKey);
      },
    );
    return verified.value;
  } catch (cause) {
    await writeStores([RESTORE_STAGING_STORE], (transaction) => {
      transaction.objectStore(RESTORE_STAGING_STORE).delete(stagingKey);
    }).catch(() => undefined);
    throw cause;
  }
}

export async function stageAndActivateWorkspace(
  workspace: WorkspacePackage,
  runs: RunPackage[],
  media: Array<{ assetId: string; ciphertext: ArrayBuffer }>,
): Promise<RunPackage> {
  const migratedWorkspace = migrateWorkspacePackage(workspace);
  if (!migratedWorkspace)
    throw new CorruptRunStorageError("WorkspacePackage ist ungültig.");
  if (runs.length === 0)
    throw new CorruptRunStorageError("Workspace-Backup enthält keinen Run.");
  const verifiedRuns = runs.map((run) => {
    const parsed = validateRunPackage(run);
    if (!parsed.ok) throw new CorruptRunStorageError(parsed.errors.join(" "));
    return parsed.value;
  });
  const uniqueRunIds = new Set(verifiedRuns.map((run) => run.id));
  if (uniqueRunIds.size !== verifiedRuns.length)
    throw new CorruptRunStorageError("Workspace enthält doppelte Run-IDs.");
  const active =
    verifiedRuns.find((run) => migratedWorkspace.runIds[0] === run.id) ??
    verifiedRuns[0];
  if (!active) throw new CorruptRunStorageError("Aktiver Restore-Run fehlt.");
  const restoredWorkspace: WorkspacePackage = {
    ...migratedWorkspace,
    updatedAt: new Date().toISOString(),
    runIds: verifiedRuns.map((run) => run.id),
  };
  await writeStores([RUN_STORE, META_STORE, MEDIA_STORE], (transaction) => {
    const runStore = transaction.objectStore(RUN_STORE);
    for (const run of verifiedRuns) runStore.put(run, run.id);
    const meta = transaction.objectStore(META_STORE);
    meta.put(active.id, ACTIVE_KEY);
    meta.put(restoredWorkspace, WORKSPACE_PACKAGE_KEY);
    const mediaStore = transaction.objectStore(MEDIA_STORE);
    for (const entry of media) mediaStore.put(entry.ciphertext, entry.assetId);
  });
  return active;
}

export async function clearActiveRun(): Promise<void> {
  await indexedDbRunRepository.setActiveRun(null);
}

export async function getOrCreateWorkspaceMediaKey(): Promise<CryptoKey> {
  const existing = await readStore<CryptoKey | undefined>(META_STORE, (store) =>
    store.get(MEDIA_KEY),
  );
  if (existing) return existing;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  await writeStores([META_STORE], (transaction) => {
    transaction.objectStore(META_STORE).put(key, MEDIA_KEY);
  });
  return key;
}

export async function saveWorkspaceMediaKey(key: CryptoKey): Promise<void> {
  await writeStores([META_STORE], (transaction) => {
    transaction.objectStore(META_STORE).put(key, MEDIA_KEY);
  });
}

export async function saveEncryptedMedia(
  assetId: string,
  ciphertext: ArrayBuffer,
): Promise<void> {
  await writeStores([MEDIA_STORE], (transaction) => {
    transaction.objectStore(MEDIA_STORE).put(ciphertext, assetId);
  });
}

export async function loadEncryptedMedia(
  assetId: string,
): Promise<ArrayBuffer | null> {
  return (
    (await readStore<ArrayBuffer | undefined>(MEDIA_STORE, (store) =>
      store.get(assetId),
    )) ?? null
  );
}

export async function listSyncOutbox(): Promise<LocalSyncOperation[]> {
  return readStore<LocalSyncOperation[]>(SYNC_OUTBOX_STORE, (store) =>
    store.getAll(),
  );
}

export async function acknowledgeSyncOperations(ids: string[]): Promise<void> {
  await writeStores([SYNC_OUTBOX_STORE], (transaction) => {
    const store = transaction.objectStore(SYNC_OUTBOX_STORE);
    for (const id of ids) store.delete(id);
  });
}

export interface StoredBackupCheckpoint {
  id: string;
  createdAtUtc: string;
  runId: string;
  kind: "automatic" | "critical" | "manual" | "completion";
  iv: string;
  sha256: string;
  ciphertext: ArrayBuffer;
  verified: boolean;
}

export async function putBackupCheckpoint(
  checkpoint: StoredBackupCheckpoint,
): Promise<void> {
  await writeStores([BACKUP_VAULT_STORE], (transaction) => {
    transaction.objectStore(BACKUP_VAULT_STORE).put(checkpoint, checkpoint.id);
  });
}

export async function listBackupCheckpoints(): Promise<
  StoredBackupCheckpoint[]
> {
  return readStore<StoredBackupCheckpoint[]>(BACKUP_VAULT_STORE, (store) =>
    store.getAll(),
  );
}

export async function deleteBackupCheckpoint(id: string): Promise<void> {
  await writeStores([BACKUP_VAULT_STORE], (transaction) =>
    transaction.objectStore(BACKUP_VAULT_STORE).delete(id),
  );
}

export async function saveWorkspaceMeta<T>(
  key: string,
  value: T,
): Promise<void> {
  await writeStores([META_STORE], (transaction) =>
    transaction.objectStore(META_STORE).put(value, key),
  );
}

export async function loadWorkspaceMeta<T>(key: string): Promise<T | null> {
  return (
    (await readStore<T | undefined>(META_STORE, (store) => store.get(key))) ??
    null
  );
}

export async function loadWorkspacePackage(): Promise<WorkspacePackage | null> {
  const value = await readStore<unknown>(META_STORE, (store) =>
    store.get(WORKSPACE_PACKAGE_KEY),
  );
  return migrateWorkspacePackage(value);
}

export async function saveWorkspacePackage(
  workspace: WorkspacePackage,
): Promise<void> {
  if (!isWorkspacePackage(workspace))
    throw new Error("WorkspacePackage ist ungültig.");
  await writeStores([META_STORE], (transaction) => {
    transaction.objectStore(META_STORE).put(workspace, WORKSPACE_PACKAGE_KEY);
  });
}

function isWorkspacePackage(value: unknown): value is WorkspacePackage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkspacePackage>;
  return (
    candidate.format === "ukd-workspace-package" &&
    candidate.schemaVersion === "2.0.0" &&
    typeof candidate.id === "string" &&
    Array.isArray(candidate.setupProfiles) &&
    Array.isArray(candidate.runTemplates) &&
    Boolean(candidate.preferences) &&
    Boolean(candidate.backupPolicy)
  );
}

export function migrateWorkspacePackage(
  value: unknown,
): WorkspacePackage | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.format !== "ukd-workspace-package" ||
    typeof candidate.id !== "string"
  )
    return null;
  if (candidate.schemaVersion === "1.0.0") {
    return {
      ...(candidate as unknown as Omit<
        WorkspacePackage,
        "schemaVersion" | "backupPolicy"
      >),
      schemaVersion: "2.0.0",
      backupPolicy: {
        debounceSeconds: 30,
        maxRecent: 20,
        maxDaily: 30,
        maxMonthly: 12,
        reminderDays: 7,
      },
    };
  }
  return isWorkspacePackage(value) ? value : null;
}
