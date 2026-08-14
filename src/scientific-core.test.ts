import { describe, expect, it } from "vitest";
import {
	assessMeasurementTrust,
	negotiatedCapabilities,
} from "./scientific-core";
import type { Measurement, MeasurementDevice } from "./types";

const device: MeasurementDevice = {
	id: "sensor-a",
	providerId: "fixture",
	manufacturer: "Test",
	model: "A",
	health: "online",
	capabilities: [
		{ metric: "humidity.relative.max", unit: "%", resolution: 0.1 },
	],
};

const measurement = (id: string, value: number): Measurement => ({
	id,
	runId: "run",
	zoneId: "zone",
	deviceId: device.id,
	metric: "humidity.relative.max",
	measuredAt: "2026-08-09T12:00:00Z",
	trustStatus: "unverified",
	reading: {
		value,
		unit: "%",
		semantic: "measured",
		source: { kind: "sensor", reference: device.id },
	},
});

const policy = {
	freshnessMs: 60 * 60 * 1000,
	conflictTolerance: 5,
	plausibleMin: 0,
	plausibleMax: 100,
	calibrationRequired: true,
};

describe("scientific measurement trust", () => {
	it("blocks conflicting parallel measurements", () => {
		const current = measurement("a", 58);
		const assessment = assessMeasurementTrust(
			current,
			device,
			[
				{
					id: "cal-1",
					deviceId: device.id,
					metric: current.metric,
					performedAt: "2026-08-01T00:00:00Z",
					validUntil: "2026-09-01T00:00:00Z",
					method: "reference",
					result: "passed",
				},
			],
			[current, measurement("b", 71)],
			policy,
			new Date("2026-08-09T12:05:00Z"),
		);
		expect(assessment.status).toBe("conflicting");
		expect(assessment.interpretationAllowed).toBe(false);
	});

	it("blocks stale and calibration-due values", () => {
		expect(
			assessMeasurementTrust(
				measurement("a", 58),
				device,
				[],
				[],
				policy,
				new Date("2026-08-09T14:00:00Z"),
			).status,
		).toBe("stale");
		expect(
			assessMeasurementTrust(
				measurement("a", 58),
				device,
				[
					{
						id: "old",
						deviceId: device.id,
						metric: "humidity.relative.max",
						performedAt: "2026-07-01T00:00:00Z",
						validUntil: "2026-08-01T00:00:00Z",
						method: "reference",
						result: "passed",
					},
				],
				[],
				policy,
				new Date("2026-08-09T12:05:00Z"),
			).status,
		).toBe("calibration-due");
	});

	it("negotiates capabilities without manufacturer branches", () => {
		expect(negotiatedCapabilities([device])).toEqual(["humidity.relative.max"]);
		expect(negotiatedCapabilities([{ ...device, health: "offline" }])).toEqual(
			[],
		);
	});
});
