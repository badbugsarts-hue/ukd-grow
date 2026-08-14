import type {
	CalibrationRecord,
	Measurement,
	MeasurementDevice,
	MeasurementMetric,
	MeasurementTrustStatus,
} from "./types";

export interface ProviderHealth {
	state: "ready" | "degraded" | "offline" | "error";
	checkedAt: string;
	detail: string;
}

export interface MeasurementProvider {
	readonly id: string;
	discover(): Promise<MeasurementDevice[]>;
	capabilities(): Promise<MeasurementMetric[]>;
	health(): Promise<ProviderHealth>;
	read(): Promise<Measurement[]>;
}

export interface TrustPolicy {
	freshnessMs: number;
	conflictTolerance: number;
	plausibleMin?: number;
	plausibleMax?: number;
	calibrationRequired: boolean;
}

export interface TrustAssessment {
	status: MeasurementTrustStatus;
	reasons: string[];
	interpretationAllowed: boolean;
}

export function assessMeasurementTrust(
	measurement: Measurement,
	device: MeasurementDevice | undefined,
	calibrations: CalibrationRecord[],
	peers: Measurement[],
	policy: TrustPolicy,
	now = new Date(),
): TrustAssessment {
	const reasons: string[] = [];
	const value = measurement.reading.value;
	if (value === null || !Number.isFinite(value)) {
		return blocked("missing", "Kein endlicher Messwert vorhanden.");
	}
	if (!device || device.health === "unknown")
		reasons.push("Geräteidentität oder Gerätezustand ist nicht verifiziert.");
	if (device?.health === "offline" || device?.health === "degraded")
		return blocked("suspect", `Gerätezustand ist ${device.health}.`);
	const ageMs = now.getTime() - new Date(measurement.measuredAt).getTime();
	if (!Number.isFinite(ageMs) || ageMs > policy.freshnessMs)
		return blocked("stale", "Messwert liegt außerhalb des Frischefensters.");
	if (
		(policy.plausibleMin !== undefined && value < policy.plausibleMin) ||
		(policy.plausibleMax !== undefined && value > policy.plausibleMax)
	)
		return blocked(
			"outlier",
			"Messwert liegt außerhalb der Plausibilitätsgrenze.",
		);
	const calibration = calibrations
		.filter(
			(entry) =>
				entry.deviceId === measurement.deviceId &&
				entry.metric === measurement.metric &&
				entry.result !== "failed",
		)
		.sort((left, right) =>
			right.performedAt.localeCompare(left.performedAt),
		)[0];
	if (policy.calibrationRequired && !calibration)
		return blocked("unverified", "Erforderliche Kalibrierung fehlt.");
	if (
		calibration?.validUntil &&
		new Date(calibration.validUntil).getTime() < now.getTime()
	)
		return blocked("calibration-due", "Kalibrierungsintervall ist abgelaufen.");
	const conflict = peers.some(
		(peer) =>
			peer.id !== measurement.id &&
			peer.metric === measurement.metric &&
			peer.reading.value !== null &&
			Math.abs(peer.reading.value - value) > policy.conflictTolerance,
	);
	if (conflict)
		return blocked(
			"conflicting",
			"Parallelmessungen widersprechen sich; Interpretation ist ausgesetzt.",
		);
	if (reasons.length > 0)
		return { status: "unverified", reasons, interpretationAllowed: false };
	return { status: "valid", reasons: [], interpretationAllowed: true };
}

export function negotiatedCapabilities(
	devices: MeasurementDevice[],
): MeasurementMetric[] {
	return [
		...new Set(
			devices.flatMap((device) =>
				device.health === "offline"
					? []
					: device.capabilities.map((capability) => capability.metric),
			),
		),
	].sort();
}

function blocked(
	status: MeasurementTrustStatus,
	reason: string,
): TrustAssessment {
	return { status, reasons: [reason], interpretationAllowed: false };
}
