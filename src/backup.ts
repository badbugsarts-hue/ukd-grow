import { RUN_SCHEMA_VERSION, validateRunPackage } from "./run-state";
import type { RunPackage } from "./types";

export interface BackupEnvelope {
	format: "ukd-run-backup";
	envelopeVersion: "1.0.0";
	createdAt: string;
	appVersion: string;
	runSchemaVersion: typeof RUN_SCHEMA_VERSION;
	evidenceVersion: string;
	payloadSha256: string;
	payload: RunPackage;
}

export async function createBackupEnvelope(
	run: RunPackage,
	appVersion: string,
	now = new Date(),
): Promise<BackupEnvelope> {
	return {
		format: "ukd-run-backup",
		envelopeVersion: "1.0.0",
		createdAt: now.toISOString(),
		appVersion,
		runSchemaVersion: RUN_SCHEMA_VERSION,
		evidenceVersion: run.configurationSnapshot.evidenceVersion,
		payloadSha256: await sha256Hex(stableStringify(run)),
		payload: run,
	};
}

export async function restoreBackup(
	value: unknown,
): Promise<
	| { ok: true; value: RunPackage; migrated: boolean }
	| { ok: false; errors: string[] }
> {
	if (isBackupEnvelope(value)) {
		const actualHash = await sha256Hex(stableStringify(value.payload));
		if (actualHash !== value.payloadSha256.toUpperCase()) {
			return {
				ok: false,
				errors: [
					"Backup-Prüfsumme stimmt nicht; Wiederherstellung abgebrochen.",
				],
			};
		}
		const parsed = validateRunPackage(value.payload);
		return parsed.ok
			? {
					ok: true,
					value: parsed.value,
					migrated: value.runSchemaVersion !== RUN_SCHEMA_VERSION,
				}
			: parsed;
	}
	const parsed = validateRunPackage(value);
	return parsed.ok
		? {
				ok: true,
				value: parsed.value,
				migrated:
					(value as { schemaVersion?: unknown })?.schemaVersion !==
					RUN_SCHEMA_VERSION,
			}
		: parsed;
}

export function stableStringify(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

async function sha256Hex(value: string): Promise<string> {
	const hash = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	return [...new Uint8Array(hash)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => [key, sortValue(child)]),
	);
}

function isBackupEnvelope(value: unknown): value is BackupEnvelope {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<BackupEnvelope>;
	return (
		candidate.format === "ukd-run-backup" &&
		candidate.envelopeVersion === "1.0.0" &&
		typeof candidate.payloadSha256 === "string" &&
		Boolean(candidate.payload)
	);
}
