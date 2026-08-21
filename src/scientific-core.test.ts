import { describe, expect, it } from "vitest";
import {
	assessMeasurementTrust,
	getSensorCalibrationStatus,
	negotiatedCapabilities,
} from "./scientific-core";
import type { CalibrationRecord, Measurement, MeasurementDevice } from "./types";

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

describe("getSensorCalibrationStatus", () => {
	it("returns valid status within 30 days for pH sensor", () => {
		const calibrations: CalibrationRecord[] = [
			{
				id: "c1",
				deviceId: "ph-meter-1",
				metric: "water.ph",
				performedAt: "2026-08-01T10:00:00Z",
				method: "2-point",
				result: "passed",
			},
		];
		const status = getSensorCalibrationStatus(
			"ph-meter-1",
			"water.ph",
			calibrations,
			new Date("2026-08-14T10:00:00Z"),
		);
		expect(status).toBe("VALID");
	});

	it("returns expired status after 30 days for pH sensor", () => {
		const calibrations: CalibrationRecord[] = [
			{
				id: "c1",
				deviceId: "ph-meter-1",
				metric: "water.ph",
				performedAt: "2026-06-01T10:00:00Z",
				method: "2-point",
				result: "passed",
			},
		];
		const status = getSensorCalibrationStatus(
			"ph-meter-1",
			"water.ph",
			calibrations,
			new Date("2026-08-14T10:00:00Z"),
		);
		expect(status).toBe("CALIBRATION_DUE");
	});

	it("returns valid status within 60 days for EC sensor", () => {
		const calibrations: CalibrationRecord[] = [
			{
				id: "c2",
				deviceId: "ec-meter-1",
				metric: "water.ec",
				performedAt: "2026-07-01T10:00:00Z",
				method: "1-point",
				result: "passed",
			},
		];
		const status = getSensorCalibrationStatus(
			"ec-meter-1",
			"water.ec",
			calibrations,
			new Date("2026-08-14T10:00:00Z"),
		);
		expect(status).toBe("VALID");
	});

	it("returns failed status when latest calibration failed", () => {
		const calibrations: CalibrationRecord[] = [
			{
				id: "c3",
				deviceId: "ph-meter-1",
				metric: "water.ph",
				performedAt: "2026-08-10T10:00:00Z",
				method: "2-point",
				result: "failed",
			},
		];
		const status = getSensorCalibrationStatus(
			"ph-meter-1",
			"water.ph",
			calibrations,
			new Date("2026-08-14T10:00:00Z"),
		);
		expect(status).toBe("FAILED");
	});
});
