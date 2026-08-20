import { validateRunPackage } from "./run-state";
import type { RunPackage } from "./types";

const DB_NAME = "ukd-operator-workspace";
const DB_VERSION = 2;
const LEGACY_STORE = "run-packages";
const RUN_STORE = "run-packages-v2";
const META_STORE = "workspace-meta";
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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE))
        database.createObjectStore(LEGACY_STORE);
      if (!database.objectStoreNames.contains(RUN_STORE))
        database.createObjectStore(RUN_STORE);
      if (!database.objectStoreNames.contains(META_STORE))
        database.createObjectStore(META_STORE);
    };
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
    return parsed.ok ? parsed.value : null;
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
    return values
      .map((value) => validateRunPackage(value))
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
  await writeStores([RUN_STORE, META_STORE], (transaction) => {
    transaction.objectStore(RUN_STORE).put(run, run.id);
    transaction.objectStore(META_STORE).put(run.id, ACTIVE_KEY);
  });
}

export async function clearActiveRun(): Promise<void> {
  await indexedDbRunRepository.setActiveRun(null);
}
