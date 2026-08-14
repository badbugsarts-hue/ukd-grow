import { describe, expect, it } from "vitest";
import { createBackupEnvelope, restoreBackup } from "./backup";
import {
	addObservation,
	createDefaultRunPackage,
	createObservation,
} from "./run-state";

describe("verified backup and recovery", () => {
	it("round-trips a valid run without loss", async () => {
		const run = addObservation(
			createDefaultRunPackage(new Date("2026-08-09T10:00:00Z")),
			createObservation(1, new Date("2026-08-09T11:00:00Z")),
		);
		const envelope = await createBackupEnvelope(run, "6.0.0");
		const restored = await restoreBackup(
			JSON.parse(JSON.stringify(envelope)) as unknown,
		);
		expect(restored.ok).toBe(true);
		if (restored.ok) {
			expect(restored.value.id).toBe(run.id);
			expect(restored.value.domainEvents).toHaveLength(run.domainEvents.length);
		}
	});

	it("rejects a corrupted payload before import", async () => {
		const envelope = await createBackupEnvelope(
			createDefaultRunPackage(),
			"6.0.0",
		);
		envelope.payload.config.name = "tampered";
		const restored = await restoreBackup(envelope);
		expect(restored).toEqual({
			ok: false,
			errors: expect.arrayContaining([expect.stringContaining("Prüfsumme")]),
		});
	});

	it("accepts and migrates a legacy raw v2 backup", async () => {
		const legacy = structuredClone(
			createDefaultRunPackage(),
		) as unknown as Record<string, unknown>;
		legacy.schemaVersion = "2.0.0";
		for (const key of [
			"devices",
			"calibrations",
			"domainEvents",
			"privacyClassification",
		])
			delete legacy[key];
		const restored = await restoreBackup(legacy);
		expect(restored.ok).toBe(true);
		if (restored.ok) {
			expect(restored.migrated).toBe(true);
			expect(restored.value.schemaVersion).toBe("4.0.0");
		}
	});
});
