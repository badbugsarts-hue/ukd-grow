import { describe, expect, it } from "vitest";
import { createDefaultRunPackage } from "./run-state";
import { createWorkspacePackage } from "./workspace";
import {
  createRecoveryKit,
  createWorkspaceBackupV2,
  restoreWorkspaceKey,
  validateWorkspaceBackupV2,
} from "./workspace-backup";

describe("workspace backup v2", () => {
  it("validates a manifested run roundtrip and rejects corruption", async () => {
    const workspace = createWorkspacePackage("Backup Test");
    const run = createDefaultRunPackage();
    const backup = await createWorkspaceBackupV2(
      { ...workspace, runIds: [run.id] },
      [run],
    );
    const restored = await validateWorkspaceBackupV2(backup);
    expect(restored.ok).toBe(true);
    const corrupted = structuredClone(backup);
    corrupted.files[`runs/${run.id}.json`] = "AAAA";
    expect((await validateWorkspaceBackupV2(corrupted)).ok).toBe(false);
  });
  it("wraps and restores the workspace media key with a passphrase", async () => {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    const kit = await createRecoveryKit(key, "correct horse battery staple");
    const restored = await restoreWorkspaceKey(
      kit,
      "correct horse battery staple",
    );
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", key),
    );
    await expect(
      restoreWorkspaceKey(kit, "incorrect passphrase"),
    ).rejects.toThrow();
  }, 60_000);
});
