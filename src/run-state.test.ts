import { describe, expect, it } from "vitest";
import { DAILY_COLUMNS, type DayPlan as DomainDayPlan } from "./domain";
import {
	acknowledgeAlert,
	activateRun,
	addInventoryEvent,
	addObservation,
	addRunOverride,
	addStructuredObservation,
	createDefaultRunPackage,
	createObservation,
	deriveRunAlerts,
	effectiveRunConfig,
	inventoryBalance,
	migrateRunPackage,
	projectDomainEvents,
	runToCsv,
	setTaskCompleted,
	supersedeMeasurement,
	transitionTaskState,
	updateRunConfig,
	validateRunPackage,
} from "./run-state";

function plan(day = 4): DomainDayPlan {
	const raw: DomainDayPlan["raw"] = Array.from({ length: 45 }, () => null);
	raw[DAILY_COLUMNS.day] = day;
	raw[DAILY_COLUMNS.ph] = 5.9;
	raw[DAILY_COLUMNS.ec] = 0.8;
	return { day, raw, formulaRow: [] };
}

describe("versioned run state", () => {
	it("creates a complete v3 package with event, device and lineage stores", () => {
		const run = createDefaultRunPackage(new Date("2026-08-09T12:00:00Z"));
		expect(run.schemaVersion).toBe("4.0.0");
		expect(run.status).toBe("draft");
		expect(run.configurationSnapshot.immutable).toBe(true);
		expect(run.zones).toHaveLength(1);
		expect(run.plants).toHaveLength(1);
		expect(run.config.startDate).toBe("2026-08-09");
		expect(run.config.water.sourcePh).toBeNull();
		expect(run.domainEvents[0]?.type).toBe("run.created");
		expect(run.devices).toEqual([]);
		expect(validateRunPackage(run).ok).toBe(true);
	});

	it("rejects incompatible or incomplete imports", () => {
		expect(validateRunPackage({ schemaVersion: "9.0.0" })).toEqual({
			ok: false,
			errors: expect.arrayContaining([
				expect.stringContaining("nicht unterstützt"),
			]),
		});
	});

	it("persists observations as measurements and log events", () => {
		const run = createDefaultRunPackage();
		const observation = createObservation(4, new Date("2026-08-09T13:00:00Z"));
		observation.values.phIn = 6.5;
		const next = addObservation(run, observation);
		expect(next.observations).toHaveLength(1);
		expect(next.measurements[0]?.metric).toBe("water.ph");
		expect(next.measurements[0]?.reading.semantic).toBe("measured");
		expect(next.measurements[0]?.reading.source.kind).toBe("manual");
		expect(next.measurements[0]?.trustStatus).toBe("valid");
		expect(next.events[0]?.category).toBe("measurement");
		expect(projectDomainEvents(next.domainEvents).measurementsRecorded).toBe(1);
	});

	it("derives missing baseline and critical pH alerts", () => {
		let run = createDefaultRunPackage();
		const observation = createObservation(4);
		observation.values.phIn = 6.5;
		run = addObservation(run, observation);
		const alerts = deriveRunAlerts(run, plan(), new Date());
		expect(alerts.map((alert) => alert.id)).toContain("day-4-ph-deviation");
		expect(alerts.map((alert) => alert.id)).toContain("water-baseline-missing");
	});

	it("stores checklist and acknowledgement state without duplicates", () => {
		let run = createDefaultRunPackage();
		run = setTaskCompleted(run, 4, "Drain prüfen", true);
		run = setTaskCompleted(run, 4, "Drain prüfen", true);
		run = acknowledgeAlert(run, "alert-1");
		run = acknowledgeAlert(run, "alert-1");
		expect(run.completedTasks["4"]).toEqual(["Drain prüfen"]);
		expect(run.tasks[0]).toMatchObject({
			title: "Drain prüfen",
			requirement: "required",
			state: "completed",
		});
		expect(run.acknowledgedAlertIds).toEqual(["alert-1"]);
	});

	it("calculates separated inventory transitions", () => {
		let run = createDefaultRunPackage();
		run = addInventoryEvent(run, {
			id: "in",
			occurredAt: "2026-08-09T12:00:00Z",
			type: "harvest-dry",
			grams: 20,
			legalBasis: "kcang-private",
			note: "",
			evidenceReference: "",
		});
		run = addInventoryEvent(run, {
			id: "out",
			occurredAt: "2026-08-09T13:00:00Z",
			type: "destruction",
			grams: 7.5,
			legalBasis: "kcang-private",
			note: "",
			evidenceReference: "",
		});
		expect(inventoryBalance(run)).toBe(12.5);
	});

	it("exports observations as escaped CSV", () => {
		let run = createDefaultRunPackage();
		const observation = createObservation(1);
		observation.notes = 'A, "B"';
		run = addObservation(run, observation);
		const csv = runToCsv(run);
		expect(csv).toContain('"day"');
		expect(csv).toContain('"A, ""B"""');
	});

	it("freezes the active snapshot while later profile edits stay separate", () => {
		let run = createDefaultRunPackage();
		run = updateRunConfig(run, { ...run.config, genetics: "Snapshot A" });
		run = activateRun(run, new Date("2026-08-09T14:00:00Z"));
		expect(effectiveRunConfig(run).genetics).toBe("Snapshot A");
		run = updateRunConfig(run, { ...run.config, genetics: "Profile B" });
		expect(run.config.genetics).toBe("Profile B");
		expect(effectiveRunConfig(run).genetics).toBe("Snapshot A");
	});

	it("migrates a legacy v1 package without losing observations", () => {
		const current = createDefaultRunPackage();
		const observation = createObservation(2);
		observation.values.ecIn = 0.9;
		const legacy = structuredClone(
			addObservation(current, observation),
		) as unknown as Record<string, unknown>;
		legacy.schemaVersion = "1.0.0";
		for (const key of [
			"status",
			"configurationSnapshot",
			"zones",
			"plants",
			"measurements",
			"structuredObservations",
			"tasks",
			"overrides",
			"auditEvents",
		])
			delete legacy[key];
		const migrated = migrateRunPackage(legacy);
		expect(migrated?.schemaVersion).toBe("4.0.0");
		expect(migrated?.observations).toHaveLength(1);
		expect(migrated?.measurements[0]?.metric).toBe("water.ec");
		expect(validateRunPackage(legacy).ok).toBe(true);
	});

	it("migrates v2 and records the schema transition", () => {
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
		const migrated = migrateRunPackage(legacy);
		expect(migrated?.schemaVersion).toBe("4.0.0");
		expect(migrated?.domainEvents[0]?.payload).toMatchObject({
			fromSchema: "3.0.0",
			toSchema: "4.0.0",
		});
	});

	it("enforces explicit task state transitions", () => {
		let run = setTaskCompleted(createDefaultRunPackage(), 2, "Messung", false);
		const taskId = run.tasks[0]?.id ?? "";
		const invalid = transitionTaskState(
			run,
			taskId,
			"completed",
			"",
			new Date(),
		);
		expect(invalid.ok).toBe(false);
		const due = transitionTaskState(run, taskId, "ready", "Inputs geprüft");
		expect(due.ok).toBe(true);
		if (!due.ok) return;
		run = due.run;
		const completed = transitionTaskState(
			run,
			taskId,
			"completed",
			"Ausgeführt",
		);
		expect(completed.ok).toBe(true);
		if (completed.ok)
			expect(
				projectDomainEvents(completed.run.domainEvents).taskTransitions,
			).toBe(3);
	});

	it("supersedes a bad measurement without deleting its history", () => {
		let run = createDefaultRunPackage();
		const observation = createObservation(3);
		observation.values.ecIn = 14;
		run = addObservation(run, observation);
		const original = run.measurements[0];
		expect(original).toBeDefined();
		run = supersedeMeasurement(
			run,
			original?.id ?? "",
			1.4,
			"decimal-entry-error",
			new Date("2026-08-09T15:00:00Z"),
		);
		expect(run.measurements).toHaveLength(2);
		expect(
			run.measurements.find((entry) => entry.id === original?.id)?.supersededBy,
		).toBeTruthy();
		expect(run.measurements[0]?.reading.value).toBe(1.4);
		expect(run.auditEvents[0]?.action).toBe("measurement-superseded");
	});

	it("records structured observations and reversible expert overrides", () => {
		let run = createDefaultRunPackage();
		run = addStructuredObservation(run, {
			id: "obs-1",
			runId: run.id,
			zoneId: run.zones[0]?.id ?? "zone",
			observedAt: "2026-08-09T16:00:00Z",
			category: "foliage",
			severity: "mild",
			text: "Blattspitzen leicht heller",
			tags: [],
			photoIds: [],
		});
		run = addRunOverride(run, {
			id: "override-1",
			field: "ec.target",
			canonicalValue: 0.8,
			overrideValue: 0.9,
			evidenceConflict: "outside-plan",
			reason: "Dokumentierter Versuch",
			createdAt: "2026-08-09T16:05:00Z",
			reversible: true,
		});
		expect(run.structuredObservations[0]?.category).toBe("foliage");
		expect(run.overrides[0]?.reason).toBe("Dokumentierter Versuch");
		expect(run.events.map((entry) => entry.category)).toEqual(
			expect.arrayContaining(["observation", "override"]),
		);
	});
});
