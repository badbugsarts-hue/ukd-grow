import type { RunPackage } from "./types";

export interface DiagnosticSnapshot {
	format: "ukd-diagnostic-bundle";
	version: "1.0.0";
	generatedAt: string;
	privacy: "no-measurements-no-notes-no-legal-profile";
	application: {
		appVersion: string;
		runSchemaVersion: string;
		evidenceVersion: string;
		online: boolean;
		serviceWorkerAvailable: boolean;
		indexedDbAvailable: boolean;
		localStorageWritable: boolean;
	};
	storage: {
		usageMiB: number | null;
		quotaMiB: number | null;
		utilizationPercent: number | null;
		state: RunPackage["storageState"]["state"];
		failureKind: RunPackage["storageState"]["failureKind"];
		unsavedChanges: boolean;
	};
	runShape: {
		status: RunPackage["status"];
		zones: number;
		plants: number;
		measurements: number;
		events: number;
		devices: number;
		calibrations: number;
	};
}

export async function createDiagnosticSnapshot(
	run: RunPackage,
	appVersion: string,
	now = new Date(),
): Promise<DiagnosticSnapshot> {
	let estimate: StorageEstimate = {};
	try {
		estimate = (await navigator.storage?.estimate?.()) ?? {};
	} catch {
		estimate = {};
	}
	const usage = estimate.usage;
	const quota = estimate.quota;
	const usageMiB = bytesToMiB(usage);
	const quotaMiB = bytesToMiB(quota);
	return {
		format: "ukd-diagnostic-bundle",
		version: "1.0.0",
		generatedAt: now.toISOString(),
		privacy: "no-measurements-no-notes-no-legal-profile",
		application: {
			appVersion,
			runSchemaVersion: run.schemaVersion,
			evidenceVersion: run.configurationSnapshot.evidenceVersion,
			online: navigator.onLine,
			serviceWorkerAvailable: "serviceWorker" in navigator,
			indexedDbAvailable: "indexedDB" in globalThis,
			localStorageWritable: canWriteLocalStorage(),
		},
		storage: {
			usageMiB,
			quotaMiB,
			utilizationPercent:
				usageMiB !== null && quotaMiB
					? Math.round((usageMiB / quotaMiB) * 10_000) / 100
					: null,
			state: run.storageState.state,
			failureKind: run.storageState.failureKind,
			unsavedChanges: run.storageState.unsavedChanges,
		},
		runShape: {
			status: run.status,
			zones: run.zones.length,
			plants: run.plants.length,
			measurements: run.measurements.length,
			events: run.domainEvents.length,
			devices: run.devices.length,
			calibrations: run.calibrations.length,
		},
	};
}

function bytesToMiB(value: number | undefined): number | null {
	return value === undefined
		? null
		: Math.round((value / 1_048_576) * 100) / 100;
}

function canWriteLocalStorage(): boolean {
	const key = "ukd:diagnostic-probe";
	try {
		localStorage.setItem(key, "1");
		localStorage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}
