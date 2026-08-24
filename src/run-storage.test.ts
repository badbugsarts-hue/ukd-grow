import { describe, expect, it, vi } from "vitest";
import { createDefaultRunPackage } from "./run-state";
import { classifyStorageFailure, ResilientRunRepository } from "./run-storage";

describe("storage failure classification", () => {
  it.each([
    ["QuotaExceededError", "quota"],
    ["VersionError", "blocked"],
    ["CorruptRunStorageError", "corrupt"],
    ["SecurityError", "unavailable"],
    ["UnexpectedError", "unknown"],
  ] as const)("maps %s to %s", (name, expected) => {
    const cause = new Error("failure");
    cause.name = name;
    expect(classifyStorageFailure(cause).kind).toBe(expected);
  });
});

describe("ResilientRunRepository", () => {
  it("preserves the latest run and blocks later writes after quota failure", async () => {
    const cause = new Error("quota reached");
    cause.name = "QuotaExceededError";
    const persist = vi.fn().mockRejectedValueOnce(cause);
    const repository = new ResilientRunRepository(persist);
    const run = createDefaultRunPackage();

    const first = await repository.save(run);
    expect(first.ok).toBe(false);
    if (first.ok) throw new Error("expected failure");
    expect(first.failure.kind).toBe("quota");
    expect(first.protectedRun).toBe(run);
    expect(repository.getState()).toBe("read-only");

    const second = await repository.save({ ...run, title: "must not persist" });
    expect(second.ok).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("leaves read-only mode only after a successful explicit retry", async () => {
    const cause = new Error("blocked");
    cause.name = "VersionError";
    const persist = vi
      .fn()
      .mockRejectedValueOnce(cause)
      .mockResolvedValueOnce(undefined);
    const repository = new ResilientRunRepository(persist);
    const run = createDefaultRunPackage();

    await repository.save(run);
    const retried = await repository.retry();

    expect(retried.ok).toBe(true);
    expect(repository.getState()).toBe("healthy");
    expect(persist).toHaveBeenCalledTimes(2);
  });
});
