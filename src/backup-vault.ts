import { stableStringify } from "./backup";
import {
  deleteBackupCheckpoint,
  getOrCreateWorkspaceMediaKey,
  indexedDbRunRepository,
  listBackupCheckpoints,
  loadEncryptedMedia,
  loadWorkspaceMeta,
  loadWorkspacePackage,
  putBackupCheckpoint,
  saveWorkspaceMeta,
  type StoredBackupCheckpoint,
} from "./run-storage";
import {
  createWorkspaceBackupV2,
  validateWorkspaceBackupV2,
} from "./workspace-backup";
import { createWorkspacePackage } from "./workspace";
import type { RunPackage } from "./types";

const DIRECTORY_HANDLE_KEY = "backup-directory-handle-v1";
const LAST_RESTORE_DRILL_KEY = "last-backup-restore-drill-v1";
const STORAGE_PERMISSION_TIMEOUT_MS = 3_000;

async function settleWithin<T>(
  operation: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

interface WritableFile {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface BackupFileHandle {
  createWritable(): Promise<WritableFile>;
  getFile(): Promise<File>;
}

export interface BackupDirectoryHandle {
  name: string;
  queryPermission(options?: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options?: { mode: "readwrite" }): Promise<PermissionState>;
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<BackupFileHandle>;
}

export interface VaultCheckpointResult {
  id: string;
  createdAtUtc: string;
  sha256: string;
  verified: boolean;
  externalWritten: boolean;
  download: Blob;
}

export interface EncryptedWorkspaceCheckpointEnvelope {
  format: "ukd-encrypted-workspace-checkpoint/1";
  id: string;
  createdAtUtc: string;
  algorithm: "AES-GCM";
  iv: string;
  plaintextSha256: string;
  ciphertext: string;
}

export async function requestPersistentStorage(): Promise<{
  status: "granted" | "denied" | "unknown";
  usageBytes: number | null;
  quotaBytes: number | null;
}> {
  const persist = navigator.storage?.persist;
  // Firefox may leave a permission request pending in non-interactive or
  // restricted contexts. Persistence is an optimisation; it must not freeze
  // the Live preflight or suppress the verified checkpoint fallback.
  const estimate = await settleWithin(
    navigator.storage?.estimate?.().catch(() => null) ?? Promise.resolve(null),
    STORAGE_PERMISSION_TIMEOUT_MS,
    null,
  );
  let status: "granted" | "denied" | "unknown" = "unknown";
  if (persist) {
    const result = await settleWithin<boolean | null>(
      persist.call(navigator.storage).catch(() => false),
      STORAGE_PERMISSION_TIMEOUT_MS,
      null,
    );
    status = result === null ? "unknown" : result ? "granted" : "denied";
  }
  return {
    status,
    usageBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
  };
}

export function storagePressureLevel(
  usageBytes: number | null,
  quotaBytes: number | null,
): 0 | 70 | 85 | 95 {
  if (!usageBytes || !quotaBytes) return 0;
  const ratio = (usageBytes / quotaBytes) * 100;
  return ratio >= 95 ? 95 : ratio >= 85 ? 85 : ratio >= 70 ? 70 : 0;
}

export async function chooseBackupDirectory(): Promise<BackupDirectoryHandle | null> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (options: {
        mode: "readwrite";
      }) => Promise<BackupDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) return null;
  const handle = await picker({ mode: "readwrite" });
  await saveWorkspaceMeta(DIRECTORY_HANDLE_KEY, handle);
  return handle;
}

export async function getBackupDirectory(): Promise<BackupDirectoryHandle | null> {
  return loadWorkspaceMeta<BackupDirectoryHandle>(DIRECTORY_HANDLE_KEY);
}

export async function createVaultCheckpoint(
  activeRun: RunPackage,
  kind: StoredBackupCheckpoint["kind"],
  now = new Date(),
): Promise<VaultCheckpointResult> {
  const createdAtUtc = now.toISOString();
  const workspace =
    (await loadWorkspacePackage()) ??
    createWorkspacePackage("Lokaler UKD Workspace", now);
  const allRuns = await indexedDbRunRepository.listRuns();
  const runs = allRuns.some((entry) => entry.id === activeRun.id)
    ? allRuns.map((entry) => (entry.id === activeRun.id ? activeRun : entry))
    : [activeRun, ...allRuns];
  const media = [] as Array<{ assetId: string; ciphertext: ArrayBuffer }>;
  for (const asset of runs.flatMap((entry) => entry.mediaAssets)) {
    const ciphertext = await loadEncryptedMedia(asset.id);
    if (ciphertext) media.push({ assetId: asset.id, ciphertext });
  }
  const normalizedWorkspace = {
    ...workspace,
    runIds: runs.map((entry) => entry.id),
    updatedAt: createdAtUtc,
  };
  const backup = await createWorkspaceBackupV2(
    normalizedWorkspace,
    runs,
    media,
    now,
  );
  const plaintext = new TextEncoder().encode(stableStringify(backup));
  const sha256 = await sha256Hex(plaintext.buffer);
  const key = await getOrCreateWorkspaceMediaKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const id = crypto.randomUUID();
  const stored: StoredBackupCheckpoint = {
    id,
    createdAtUtc,
    runId: activeRun.id,
    kind,
    iv: bytesToBase64(iv),
    sha256,
    ciphertext,
    verified: false,
  };
  await putBackupCheckpoint(stored);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  const parsed = JSON.parse(new TextDecoder().decode(decrypted));
  const validation = await validateWorkspaceBackupV2(parsed);
  if (!validation.ok || (await sha256Hex(decrypted)) !== sha256) {
    await deleteBackupCheckpoint(id);
    throw new Error(
      `Backup-Readback fehlgeschlagen: ${validation.ok ? "Hash stimmt nicht" : validation.errors.join(" ")}`,
    );
  }
  stored.verified = true;
  await putBackupCheckpoint(stored);
  const envelope = {
    format: "ukd-encrypted-workspace-checkpoint/1",
    id,
    createdAtUtc,
    algorithm: "AES-GCM",
    iv: stored.iv,
    plaintextSha256: sha256,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  const serialized = stableStringify(envelope);
  const download = new Blob([serialized], { type: "application/json" });
  const externalWritten = await writeExternalCheckpoint(
    serialized,
    createdAtUtc,
    id,
  );
  await rotateVault();
  return {
    id,
    createdAtUtc,
    sha256,
    verified: true,
    externalWritten,
    download,
  };
}

export async function validateLatestCheckpointInStaging(
  now = new Date(),
): Promise<{ ok: boolean; detail: string }> {
  const last = await loadWorkspaceMeta<string>(LAST_RESTORE_DRILL_KEY);
  if (last && now.getTime() - Date.parse(last) < 7 * 86_400_000)
    return { ok: true, detail: "Wöchentlicher Restore-Drill ist noch gültig." };
  const latest = (await listBackupCheckpoints()).sort((a, b) =>
    b.createdAtUtc.localeCompare(a.createdAtUtc),
  )[0];
  if (!latest)
    return { ok: false, detail: "Noch kein Backup-Checkpoint vorhanden." };
  try {
    const key = await getOrCreateWorkspaceMediaKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(latest.iv) },
      key,
      latest.ciphertext,
    );
    if ((await sha256Hex(plain)) !== latest.sha256)
      return { ok: false, detail: "Checkpoint-Hash ist beschädigt." };
    const validation = await validateWorkspaceBackupV2(
      JSON.parse(new TextDecoder().decode(plain)),
    );
    if (!validation.ok)
      return { ok: false, detail: validation.errors.join(" ") };
    await saveWorkspaceMeta(LAST_RESTORE_DRILL_KEY, now.toISOString());
    return {
      ok: true,
      detail: `${validation.runs.length} Run(s) isoliert validiert; aktive Daten unverändert.`,
    };
  } catch (error) {
    return {
      ok: false,
      detail:
        error instanceof Error
          ? error.message
          : "Restore-Drill fehlgeschlagen.",
    };
  }
}

export async function decryptWorkspaceCheckpoint(
  value: unknown,
  key: CryptoKey,
): Promise<unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    (value as EncryptedWorkspaceCheckpointEnvelope).format !==
      "ukd-encrypted-workspace-checkpoint/1"
  )
    throw new Error("Verschlüsseltes UKD-Checkpoint-Format fehlt.");
  const envelope = value as EncryptedWorkspaceCheckpointEnvelope;
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.ciphertext),
    );
  } catch {
    throw new Error(
      "Checkpoint-Key ist ungültig. Auf einem neuen Gerät zuerst Recovery-Kit und getrennte Passphrase verwenden.",
    );
  }
  if ((await sha256Hex(plaintext)) !== envelope.plaintextSha256)
    throw new Error("Checkpoint-Prüfsumme stimmt nicht.");
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function writeExternalCheckpoint(
  serialized: string,
  createdAtUtc: string,
  id: string,
): Promise<boolean> {
  const handle = await getBackupDirectory();
  if (!handle) return false;
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted")
    permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") return false;
  const fileName = `ukd-${createdAtUtc.replace(/[:.]/g, "-")}-${id.slice(0, 8)}.ukdbackup`;
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(serialized);
  await writable.close();
  const readback = await (await fileHandle.getFile()).text();
  if (readback !== serialized)
    throw new Error("Externes Backup-Readback stimmt nicht überein.");
  return true;
}

async function rotateVault(): Promise<void> {
  const checkpoints = (await listBackupCheckpoints()).sort((a, b) =>
    b.createdAtUtc.localeCompare(a.createdAtUtc),
  );
  const keep = new Set(
    checkpoints
      .filter((entry) => entry.kind === "completion")
      .map((entry) => entry.id),
  );
  for (const entry of checkpoints.slice(0, 20)) keep.add(entry.id);
  for (const entry of uniqueByPeriod(checkpoints, (value) =>
    value.createdAtUtc.slice(0, 10),
  ).slice(0, 30))
    keep.add(entry.id);
  for (const entry of uniqueByPeriod(checkpoints, (value) =>
    value.createdAtUtc.slice(0, 7),
  ).slice(0, 12))
    keep.add(entry.id);
  for (const entry of checkpoints)
    if (!keep.has(entry.id)) await deleteBackupCheckpoint(entry.id);
}

function uniqueByPeriod(
  items: StoredBackupCheckpoint[],
  key: (item: StoredBackupCheckpoint) => string,
) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const period = key(item);
    if (seen.has(period)) return false;
    seen.add(period);
    return true;
  });
}

export function downloadCheckpoint(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function sha256Hex(value: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
