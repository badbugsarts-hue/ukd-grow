import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	calculateDli,
	calculateLeafVpd,
	calculateMix,
	DAILY_COLUMNS,
	numberAt,
	textAt,
} from "../../domain";
import {
	acknowledgeAlert,
	addObservation,
	addStructuredObservation,
	createObservation,
	deriveRunAlerts,
	latestObservation,
	setTaskCompleted,
	transitionTaskState,
} from "../../run-state";
import type {
	DailyObservation,
	DayPlan,
	ExperienceLens,
	ObservationSeverity,
	RouteId,
	RunPackage,
	StructuredObservation,
	StructuredObservationCategory,
	TaskState,
} from "../../types";
import LensBadge from "../common/LensBadge";
import MetricGauge from "../common/MetricGauge";
import TermTooltip from "../common/TermTooltip";

export interface DailyOperatorPanelProps {
	run: RunPackage;
	plan?: DayPlan;
	lens: ExperienceLens;
	onUpdateRun: (updatedRun: RunPackage) => void;
	navigate?: (route: RouteId) => void;
}

// ── Target Corridor Resolver Interface & Function ──
export interface CalculatedDayTargets {
	phaseName: string;
	phaseShort: string;
	goal: string;
	lightHours: number;
	ledWatts: number;
	distanceCm: number;
	ppfdMin: number;
	ppfdMax: number;
	dliMin: number;
	dliMax: number;
	tempMin: number;
	tempMax: number;
	rhMin: number;
	rhMax: number;
	vpdMin: number;
	vpdMax: number;
	ecTarget: number;
	phTarget: number;
	waterMinL: number;
	waterMaxL: number;
	trainingNotes: string;
	qaNotes: string;
	stopRules: string;
}

export function getTargetsForDay(
	day: number,
	plan?: DayPlan,
): CalculatedDayTargets {
	if (plan && plan.day === day) {
		const lightHours =
			numberAt(plan, DAILY_COLUMNS.lightHours) || (day <= 28 ? 18 : 12);
		const ppfd =
			numberAt(plan, DAILY_COLUMNS.ppfd) ||
			(day <= 7 ? 200 : day <= 28 ? 500 : 900);
		const dli =
			numberAt(plan, DAILY_COLUMNS.dli) || calculateDli(ppfd, lightHours);
		const ec =
			numberAt(plan, DAILY_COLUMNS.ec) ||
			(day <= 7 ? 0.8 : day <= 28 ? 1.4 : 1.8);
		const ph = numberAt(plan, DAILY_COLUMNS.ph) || 6.0;
		const tempLight = numberAt(plan, DAILY_COLUMNS.tempLight) || 24;
		const rh =
			numberAt(plan, DAILY_COLUMNS.humidity) ||
			(day <= 7 ? 70 : day <= 28 ? 60 : 45);
		const leafVpd =
			numberAt(plan, DAILY_COLUMNS.leafVpd) ||
			calculateLeafVpd(tempLight, rh, -1.0);

		return {
			phaseName:
				textAt(plan, DAILY_COLUMNS.phase) ||
				(day <= 7
					? "Keimung & Sämling"
					: day <= 28
						? "Vegetation"
						: day <= 63
							? "Hauptblüte"
							: "Spätblüte"),
			phaseShort:
				day <= 7
					? "Keimung"
					: day <= 28
						? "Veg"
						: day <= 63
							? "Hauptblüte"
							: "Spätblüte",
			goal: textAt(plan, DAILY_COLUMNS.goal) || "Tagesentwicklung fördern",
			lightHours,
			ledWatts: numberAt(plan, DAILY_COLUMNS.watts) || 140,
			distanceCm: numberAt(plan, DAILY_COLUMNS.distance) || 40,
			ppfdMin: Math.max(100, Math.round(ppfd * 0.85)),
			ppfdMax: Math.round(ppfd * 1.15),
			dliMin: Math.max(5, Math.round(dli * 0.85 * 10) / 10),
			dliMax: Math.round(dli * 1.15 * 10) / 10,
			tempMin: Math.max(18, tempLight - 2),
			tempMax: tempLight + 2,
			rhMin: Math.max(35, rh - 5),
			rhMax: Math.min(80, rh + 5),
			vpdMin: Math.max(0.4, Math.round((leafVpd - 0.2) * 100) / 100),
			vpdMax: Math.round((leafVpd + 0.2) * 100) / 100,
			ecTarget: ec,
			phTarget: ph,
			waterMinL: numberAt(plan, DAILY_COLUMNS.waterMin) || 0.5,
			waterMaxL: numberAt(plan, DAILY_COLUMNS.waterMax) || 1.0,
			trainingNotes: textAt(plan, DAILY_COLUMNS.training) || "Canopy prüfen",
			qaNotes: textAt(plan, DAILY_COLUMNS.qa) || "Messwerte verifizieren",
			stopRules: textAt(plan, DAILY_COLUMNS.stop) || "Keine Überdüngung",
		};
	}

	// Fallback target matrix based on day ranges
	if (day <= 7) {
		return {
			phaseName: "Keimung & Sämling (Tag 0–7)",
			phaseShort: "Keimung",
			goal: "Wurzelbildung & frühe Sämlingsentwicklung",
			lightHours: 18,
			ledWatts: 40,
			distanceCm: 50,
			ppfdMin: 150,
			ppfdMax: 300,
			dliMin: 10,
			dliMax: 15,
			tempMin: 22,
			tempMax: 26,
			rhMin: 65,
			rhMax: 75,
			vpdMin: 0.4,
			vpdMax: 0.8,
			ecTarget: 0.8,
			phTarget: 5.8,
			waterMinL: 0.2,
			waterMaxL: 0.4,
			trainingNotes:
				"Kein mechanisches Training. Hohe Luftfeuchtigkeit wahren.",
			qaNotes: "Substrat feucht halten, Stauwasser vermeiden.",
			stopRules: "Keine Starkdüngung vor dem ersten echten Blattpaar.",
		};
	} else if (day <= 28) {
		return {
			phaseName: "Vegetation (Tag 8–28)",
			phaseShort: "Veg",
			goal: "Kräftiges vegetatives Wachstum & Triebverzweigung",
			lightHours: 18,
			ledWatts: 140,
			distanceCm: 40,
			ppfdMin: 400,
			ppfdMax: 600,
			dliMin: 20,
			dliMax: 30,
			tempMin: 23,
			tempMax: 27,
			rhMin: 55,
			rhMax: 70,
			vpdMin: 0.8,
			vpdMax: 1.1,
			ecTarget: 1.4,
			phTarget: 6.0,
			waterMinL: 0.5,
			waterMaxL: 1.0,
			trainingNotes: "LST & Topping ab 4. Nodie. Canopy flach halten.",
			qaNotes: "Tägliche Zunahme der Blattfläche beobachten.",
			stopRules: "Bei Verbrennungen EC um 20% reduzieren.",
		};
	} else if (day <= 63) {
		return {
			phaseName: "Hauptblüte (Tag 29–63)",
			phaseShort: "Hauptblüte",
			goal: "Generative Entwicklung & maximale Blütenbiomasse",
			lightHours: 12,
			ledWatts: 140,
			distanceCm: 35,
			ppfdMin: 700,
			ppfdMax: 1000,
			dliMin: 35,
			dliMax: 45,
			tempMin: 21,
			tempMax: 25,
			rhMin: 40,
			rhMax: 55,
			vpdMin: 1.1,
			vpdMax: 1.5,
			ecTarget: 1.8,
			phTarget: 6.2,
			waterMinL: 1.0,
			waterMaxL: 2.0,
			trainingNotes: "Canopy ausrichten, schattige Untertriebe entlauben.",
			qaNotes: "Luftzirkulation im Zelt maximieren, Schimmelkontrolle.",
			stopRules: "Luftfeuchtigkeit > 60% in dichter Blüte strikt vermeiden.",
		};
	} else {
		return {
			phaseName: "Spätblüte & Abreife (Tag 64–80)",
			phaseShort: "Spätblüte",
			goal: "Abreife, Trichom-Aushärtung & Spülen",
			lightHours: 12,
			ledWatts: 100,
			distanceCm: 45,
			ppfdMin: 500,
			ppfdMax: 800,
			dliMin: 25,
			dliMax: 35,
			tempMin: 19,
			tempMax: 23,
			rhMin: 38,
			rhMax: 48,
			vpdMin: 1.2,
			vpdMax: 1.6,
			ecTarget: 0.4,
			phTarget: 6.2,
			waterMinL: 0.8,
			waterMaxL: 1.5,
			trainingNotes: "Kein Schneiden mehr. Schwere Blütenstände stützen.",
			qaNotes:
				"Trichomfärbung mit Mikroskop/Lupe (Milchig / Bernstein) prüfen.",
			stopRules: "Kein Nährstoffdünger mehr in den letzten 7–10 Tagen.",
		};
	}
}

export const DailyOperatorPanel: React.FC<DailyOperatorPanelProps> = ({
	run,
	plan,
	lens,
	onUpdateRun,
	navigate,
}) => {
	// Current active day selection state
	const initialDay = Math.max(0, Math.min(80, plan?.day ?? 14));
	const [selectedDay, setSelectedDay] = useState<number>(initialDay);
	const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

	// Sync selectedDay if plan.day changes externally
	useEffect(() => {
		if (plan && plan.day !== undefined) {
			setSelectedDay(Math.max(0, Math.min(80, plan.day)));
		}
	}, [plan?.day, plan]);

	// Derived phase targets for selectedDay
	const targets = useMemo(
		() =>
			getTargetsForDay(
				selectedDay,
				plan?.day === selectedDay ? plan : undefined,
			),
		[selectedDay, plan],
	);

	// Existing observation lookup for selectedDay
	const existingObs = useMemo(
		() => latestObservation(run, selectedDay),
		[run, selectedDay],
	);

	// Step 2: Form Inputs for Daily Measurement & Observations
	const [tempAirMax, setTempAirMax] = useState<string>("");
	const [tempAirMin, setTempAirMin] = useState<string>("");
	const [rhMax, setRhMax] = useState<string>("");
	const [rhMin, setRhMin] = useState<string>("");
	const [leafTemp, setLeafTemp] = useState<string>("");
	const [ppfdInput, setPpfdInput] = useState<string>("");
	const [waterPh, setWaterPh] = useState<string>("");
	const [waterEc, setWaterEc] = useState<string>("");
	const [drainPh, setDrainPh] = useState<string>("");
	const [drainEc, setDrainEc] = useState<string>("");
	const [appliedWaterL, setAppliedWaterL] = useState<string>("");
	const [drainVolumeL, setDrainVolumeL] = useState<string>("");
	const [potMassG, setPotMassG] = useState<string>("");
	const [plantHeightCm, setPlantHeightCm] = useState<string>("");
	const [stressScore, setStressScore] = useState<string>("0");
	const [obsNotes, setObsNotes] = useState<string>("");

	// Structured observation subform state
	const [structCategory, setStructCategory] =
		useState<StructuredObservationCategory>("foliage");
	const [structSeverity, setStructSeverity] =
		useState<ObservationSeverity>("info");
	const [structSummary, setStructSummary] = useState<string>("");
	const [structTags, setStructTags] = useState<string>("");

	const [saveStatus, setSaveStatus] = useState<string | null>(null);
	const [batchLiters, setBatchLiters] = useState<number>(10);
	const [taskReasonMap, setTaskReasonMap] = useState<Record<string, string>>(
		{},
	);

	// Pre-fill form when selectedDay or existingObs changes
	useEffect(() => {
		if (existingObs?.values) {
			const v = existingObs.values;
			setTempAirMax(
				v.tempMax !== null ? String(v.tempMax) : String(targets.tempMax),
			);
			setTempAirMin(
				v.tempMin !== null ? String(v.tempMin) : String(targets.tempMin),
			);
			setRhMax(
				v.humidityMax !== null ? String(v.humidityMax) : String(targets.rhMax),
			);
			setRhMin(
				v.humidityMin !== null ? String(v.humidityMin) : String(targets.rhMin),
			);
			setLeafTemp(
				v.leafTemp !== null ? String(v.leafTemp) : String(targets.tempMax - 1),
			);
			setPpfdInput(
				v.ppfd !== null
					? String(v.ppfd)
					: String(
							targets.ppfdMin +
								Math.round((targets.ppfdMax - targets.ppfdMin) / 2),
						),
			);
			setWaterPh(v.phIn !== null ? String(v.phIn) : String(targets.phTarget));
			setWaterEc(v.ecIn !== null ? String(v.ecIn) : String(targets.ecTarget));
			setDrainPh(v.phDrain !== null ? String(v.phDrain) : "");
			setDrainEc(v.ecDrain !== null ? String(v.ecDrain) : "");
			setAppliedWaterL(
				v.waterLiters !== null
					? String(v.waterLiters)
					: String(targets.waterMinL),
			);
			setDrainVolumeL(v.drainLiters !== null ? String(v.drainLiters) : "");
			setPotMassG(v.potMassGrams !== null ? String(v.potMassGrams) : "");
			setPlantHeightCm(v.plantHeightCm !== null ? String(v.plantHeightCm) : "");
			setStressScore(v.stress !== null ? String(v.stress) : "0");
			setObsNotes(existingObs.notes || "");
		} else {
			// Default initializers derived from targets
			setTempAirMax(String(targets.tempMax));
			setTempAirMin(String(targets.tempMin));
			setRhMax(String(targets.rhMax));
			setRhMin(String(targets.rhMin));
			setLeafTemp(String(targets.tempMax - 1));
			setPpfdInput(String(Math.round((targets.ppfdMin + targets.ppfdMax) / 2)));
			setWaterPh(String(targets.phTarget));
			setWaterEc(String(targets.ecTarget));
			setDrainPh("");
			setDrainEc("");
			setAppliedWaterL(String(targets.waterMinL));
			setDrainVolumeL("");
			setPotMassG("");
			setPlantHeightCm("");
			setStressScore("0");
			setObsNotes("");
		}
		setSaveStatus(null);
	}, [existingObs, targets]);

	// Derived real-time calculations
	const numTempMax = parseFloat(tempAirMax) || targets.tempMax;
	const numRhMax = parseFloat(rhMax) || targets.rhMax;
	const numLeafTemp = parseFloat(leafTemp) || numTempMax - 1.0;
	const leafDelta = numLeafTemp - numTempMax;
	const calculatedLeafVpd = calculateLeafVpd(numTempMax, numRhMax, leafDelta);

	const numPpfd = parseFloat(ppfdInput) || targets.ppfdMin;
	const calculatedDli = calculateDli(numPpfd, targets.lightHours);

	const numAppliedWater = parseFloat(appliedWaterL) || 0;
	const numDrainVolume = parseFloat(drainVolumeL) || 0;
	const calculatedDrainPercent =
		numAppliedWater > 0
			? Math.round((numDrainVolume / numAppliedWater) * 100)
			: 0;

	// Day Clamping Handler
	const handleDaySelect = (day: number) => {
		const clamped = Math.max(0, Math.min(80, day));
		setSelectedDay(clamped);
	};

	// Phase Quick Tab Switch Handler
	const handlePhaseQuickTab = (
		phase: "seedling" | "veg" | "bloom" | "late",
	) => {
		switch (phase) {
			case "seedling":
				setSelectedDay(0);
				break;
			case "veg":
				setSelectedDay(8);
				break;
			case "bloom":
				setSelectedDay(29);
				break;
			case "late":
				setSelectedDay(64);
				break;
		}
	};

	// Save Observation & Measurement Handler
	const handleSaveObservation = (e: React.FormEvent) => {
		e.preventDefault();
		const obs: DailyObservation = createObservation(selectedDay);
		obs.values = {
			tempMax: parseFloat(tempAirMax) || null,
			tempMin: parseFloat(tempAirMin) || null,
			humidityMax: parseFloat(rhMax) || null,
			humidityMin: parseFloat(rhMin) || null,
			leafTemp: parseFloat(leafTemp) || null,
			ppfd: parseFloat(ppfdInput) || null,
			phIn: parseFloat(waterPh) || null,
			ecIn: parseFloat(waterEc) || null,
			phDrain: parseFloat(drainPh) || null,
			ecDrain: parseFloat(drainEc) || null,
			waterLiters: parseFloat(appliedWaterL) || null,
			drainLiters: parseFloat(drainVolumeL) || null,
			drainPercent: numAppliedWater > 0 ? calculatedDrainPercent : null,
			potMassGrams: parseFloat(potMassG) || null,
			plantHeightCm: parseFloat(plantHeightCm) || null,
			stress: parseFloat(stressScore) || 0,
		};
		obs.notes = obsNotes.trim();

		let updatedRun = addObservation(run, obs);

		// If structured observation input is filled, add structured observation
		if (structSummary.trim()) {
			const parsedTags = structTags
				.split(" ")
				.map((t) => t.trim())
				.filter((t) => t.length > 0)
				.map((t) => (t.startsWith("#") ? t : `#${t}`));

			const structuredObs: StructuredObservation = {
				id: `so-${Date.now()}`,
				runId: run.id,
				zoneId: run.zones[0]?.id || "tent-main",
				observedAt: new Date().toISOString(),
				category: structCategory,
				severity: structSeverity,
				text: structSummary.trim(),
				tags: parsedTags,
				photoIds: [],
			};
			updatedRun = addStructuredObservation(updatedRun, structuredObs);
		}

		onUpdateRun(updatedRun);
		setSaveStatus(
			`✓ Messung & Beobachtung für Tag ${selectedDay} gespeichert!`,
		);
		setTimeout(() => setSaveStatus(null), 4000);
	};

	// Task Checklist & Task State Transition Handlers
	const _dayTaskKeyPrefix = `day-${selectedDay}-`;
	const defaultTasksForDay = useMemo(() => {
		const list = [
			{ id: `task-${selectedDay}-1`, title: "Zelt-Klima & Sensoren pruefen" },
			{
				id: `task-${selectedDay}-2`,
				title: "Blattgesundheit & Schaedlings-Check",
			},
			{
				id: `task-${selectedDay}-3`,
				title: "Wurzelzone & Substratfeuchte kontrollieren",
			},
			{
				id: `task-${selectedDay}-4`,
				title: "Naehrstoffloesung anmischen & messen",
			},
			{
				id: `task-${selectedDay}-5`,
				title: "Pflanzenhoehe & Canopy-Abstand messen",
			},
		];
		return list;
	}, [selectedDay]);

	const completedTaskList = run.completedTasks?.[selectedDay] || [];

	const handleToggleTask = (taskTitle: string, currentCompleted: boolean) => {
		const updatedRun = setTaskCompleted(
			run,
			selectedDay,
			taskTitle,
			!currentCompleted,
		);
		onUpdateRun(updatedRun);
	};

	const handleTransitionTaskState = (
		taskTitle: string,
		nextState: TaskState,
	) => {
		const reason =
			taskReasonMap[taskTitle] ||
			(nextState === "blocked"
				? "Blockiert durch Messwert-Abweichung"
				: "Manuell übersprungen");

		// Ensure task is in run.tasks
		let currentRun = run;
		let existingRunTask = currentRun.tasks?.find(
			(t) => t.day === selectedDay && t.title === taskTitle,
		);
		if (!existingRunTask) {
			currentRun = setTaskCompleted(run, selectedDay, taskTitle, false);
			existingRunTask = currentRun.tasks?.find(
				(t) => t.day === selectedDay && t.title === taskTitle,
			);
		}

		if (existingRunTask) {
			const result = transitionTaskState(
				currentRun,
				existingRunTask.id,
				nextState,
				reason,
			);
			if (result.ok) {
				onUpdateRun(result.run);
			}
		}
	};

	// Alert acknowledgment handler
	const activeAlerts = useMemo(() => deriveRunAlerts(run, plan!), [run, plan]);
	const unacknowledgedAlerts = activeAlerts.filter(
		(a) => !run.acknowledgedAlertIds?.includes(a.id),
	);

	const handleAcknowledgeAlert = (alertId: string) => {
		const updatedRun = acknowledgeAlert(run, alertId);
		onUpdateRun(updatedRun);
	};

	// Recipe Mix preview for selectedDay
	const currentDayPlan: DayPlan = useMemo(() => {
		if (plan && plan.day === selectedDay) return plan;
		// Fallback DayPlan mock for mix calculation if plan is for another day
		return {
			day: selectedDay,
			raw: [
				selectedDay,
				"",
				Math.ceil((selectedDay + 1) / 7),
				null,
				targets.phaseShort,
				targets.goal,
				targets.lightHours,
				targets.ledWatts,
				targets.ppfdMin,
				targets.dliMin,
				targets.distanceCm,
				targets.tempMin,
				20,
				targets.rhMin,
				targets.vpdMin,
				targets.ecTarget,
				targets.phTarget,
				500,
				1000,
				"Manuell",
				selectedDay <= 7
					? "Sämlingsnahrung"
					: selectedDay <= 28
						? "HESI TNT Complex"
						: "HESI Bloom Complex",
				targets.ecTarget,
				1.0,
				2.0,
				0.05,
			],
			formulaRow: [],
		};
	}, [selectedDay, plan, targets]);

	const recipeMix = useMemo(() => {
		return calculateMix(currentDayPlan, batchLiters);
	}, [currentDayPlan, batchLiters]);

	// Strip cards calculation (selectedDay ± 3)
	const carouselDays = useMemo(() => {
		const start = Math.max(0, selectedDay - 3);
		const end = Math.min(80, selectedDay + 3);
		const result: number[] = [];
		for (let d = start; d <= end; d++) {
			result.push(d);
		}
		return result;
	}, [selectedDay]);

	return (
		<div
			className="panel-container daily-operator-panel"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "24px",
				padding: "20px",
				background: "var(--surface-1)",
				borderRadius: "var(--radius-md)",
				border: "1px solid var(--line)",
			}}
		>
			{/* ── 1. Panel Header ── */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "14px",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "16px",
				}}
			>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<h2
							style={{
								margin: 0,
								fontSize: "22px",
								fontWeight: 800,
								color: "var(--text)",
							}}
						>
							📅 Tägliches Operator-Cockpit
						</h2>
						<LensBadge lens={lens} />
					</div>
					<p
						style={{
							margin: "4px 0 0 0",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						Tag {selectedDay} / 80 — {targets.phaseName} ({targets.goal})
					</p>
				</div>

				{/* Phase Quick-Tabs */}
				<div
					style={{
						display: "flex",
						gap: "6px",
						background: "var(--surface-2)",
						padding: "4px",
						borderRadius: "var(--radius-sm)",
						border: "1px solid var(--line)",
					}}
				>
					<button
						type="button"
						onClick={() => handlePhaseQuickTab("seedling")}
						style={{
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: 700,
							border: 0,
							borderRadius: "var(--radius-sm)",
							background: selectedDay <= 7 ? "var(--green-dim)" : "transparent",
							color: selectedDay <= 7 ? "var(--green)" : "var(--muted)",
							cursor: "pointer",
						}}
					>
						🌱 Keimung (0–7)
					</button>
					<button
						type="button"
						onClick={() => handlePhaseQuickTab("veg")}
						style={{
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: 700,
							border: 0,
							borderRadius: "var(--radius-sm)",
							background:
								selectedDay >= 8 && selectedDay <= 28
									? "var(--green-dim)"
									: "transparent",
							color:
								selectedDay >= 8 && selectedDay <= 28
									? "var(--green)"
									: "var(--muted)",
							cursor: "pointer",
						}}
					>
						🌿 Veg (8–28)
					</button>
					<button
						type="button"
						onClick={() => handlePhaseQuickTab("bloom")}
						style={{
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: 700,
							border: 0,
							borderRadius: "var(--radius-sm)",
							background:
								selectedDay >= 29 && selectedDay <= 63
									? "var(--green-dim)"
									: "transparent",
							color:
								selectedDay >= 29 && selectedDay <= 63
									? "var(--green)"
									: "var(--muted)",
							cursor: "pointer",
						}}
					>
						🌸 Hauptblüte (29–63)
					</button>
					<button
						type="button"
						onClick={() => handlePhaseQuickTab("late")}
						style={{
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: 700,
							border: 0,
							borderRadius: "var(--radius-sm)",
							background:
								selectedDay >= 64 ? "var(--green-dim)" : "transparent",
							color: selectedDay >= 64 ? "var(--green)" : "var(--muted)",
							cursor: "pointer",
						}}
					>
						🍂 Spätblüte (64–80)
					</button>
				</div>
			</div>

			{/* ── 2. Interactive Day Navigation Strip & Carousel ── */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					background: "var(--surface-2)",
					padding: "16px",
					borderRadius: "var(--radius)",
					border: "1px solid var(--line)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "10px",
					}}
				>
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						<button
							type="button"
							onClick={() => handleDaySelect(selectedDay - 1)}
							disabled={selectedDay <= 0}
							style={{
								padding: "8px 14px",
								fontSize: "13px",
								fontWeight: 700,
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--line)",
								background: "var(--surface-3)",
								color: selectedDay <= 0 ? "var(--muted)" : "var(--text)",
								cursor: selectedDay <= 0 ? "not-allowed" : "pointer",
							}}
						>
							◄ Vorheriger Tag
						</button>
						<button
							type="button"
							onClick={() => handleDaySelect(plan?.day ?? 14)}
							style={{
								padding: "8px 14px",
								fontSize: "13px",
								fontWeight: 700,
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--green)",
								background: "var(--green-dim)",
								color: "var(--green)",
								cursor: "pointer",
							}}
						>
							🎯 Aktiver Tag (Tag {plan?.day ?? 14})
						</button>
						<button
							type="button"
							onClick={() => handleDaySelect(selectedDay + 1)}
							disabled={selectedDay >= 80}
							style={{
								padding: "8px 14px",
								fontSize: "13px",
								fontWeight: 700,
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--line)",
								background: "var(--surface-3)",
								color: selectedDay >= 80 ? "var(--muted)" : "var(--text)",
								cursor: selectedDay >= 80 ? "not-allowed" : "pointer",
							}}
						>
							Nächster Tag ►
						</button>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "10px",
							flex: 1,
							maxWidth: "400px",
						}}
					>
						<span
							style={{
								fontSize: "12px",
								color: "var(--muted)",
								fontWeight: 600,
							}}
						>
							Tag:
						</span>
						<input
							aria-label="Run-Tag auswählen"
							type="range"
							min={0}
							max={80}
							value={selectedDay}
							onChange={(e) => handleDaySelect(parseInt(e.target.value, 10))}
							style={{ flex: 1, accentColor: "var(--green)" }}
						/>
						<span
							style={{
								fontSize: "14px",
								fontWeight: 800,
								color: "var(--green)",
								fontFamily: "var(--font-mono)",
								width: "32px",
								textAlign: "right",
							}}
						>
							{selectedDay}
						</span>
					</div>
				</div>

				{/* Carousel Strip */}
				<div
					style={{
						display: "flex",
						gap: "10px",
						overflowX: "auto",
						paddingBottom: "4px",
					}}
				>
					{carouselDays.map((d) => {
						const hasObs = run.observations?.some((o) => o.day === d);
						const isSelected = d === selectedDay;
						const dayPhase = getTargetsForDay(d).phaseShort;
						const tasksDoneCount = (run.completedTasks?.[d] || []).length;

						return (
							<button
								key={d}
								type="button"
								onClick={() => handleDaySelect(d)}
								style={{
									minWidth: "120px",
									flex: "0 0 auto",
									padding: "10px 12px",
									borderRadius: "var(--radius-sm)",
									border: isSelected
										? "2px solid var(--green)"
										: "1px solid var(--line)",
									background: isSelected
										? "var(--surface-3)"
										: "var(--surface-1)",
									cursor: "pointer",
									textAlign: "left",
									transition: "all 0.15s ease",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<span
										style={{
											fontSize: "14px",
											fontWeight: 800,
											color: isSelected ? "var(--green)" : "var(--text)",
										}}
									>
										Tag {d}
									</span>
									{hasObs && (
										<span
											style={{ fontSize: "11px", color: "var(--green)" }}
											title="Messung erfasst"
										>
											✓
										</span>
									)}
								</div>
								<div
									style={{
										fontSize: "11px",
										color: "var(--muted)",
										marginTop: "4px",
									}}
								>
									{dayPhase}
								</div>
								<div
									style={{
										fontSize: "10px",
										color: "var(--text-2)",
										marginTop: "4px",
										fontFamily: "var(--font-mono)",
									}}
								>
									📋 {tasksDoneCount}/5 Tasks
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── 3. Workflow Step Navigation ── */}
			<div
				style={{
					display: "flex",
					gap: "12px",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "12px",
				}}
			>
				<button
					type="button"
					onClick={() => setActiveStep(1)}
					style={{
						flex: 1,
						padding: "12px 16px",
						borderRadius: "var(--radius-sm)",
						border:
							activeStep === 1
								? "1px solid var(--green)"
								: "1px solid var(--line)",
						background:
							activeStep === 1 ? "var(--green-dim)" : "var(--surface-2)",
						color: activeStep === 1 ? "var(--green)" : "var(--text)",
						fontWeight: 700,
						fontSize: "14px",
						cursor: "pointer",
						textAlign: "center",
					}}
				>
					Schritt 1: Tages-Check & Sollwerte
				</button>
				<button
					type="button"
					onClick={() => setActiveStep(2)}
					style={{
						flex: 1,
						padding: "12px 16px",
						borderRadius: "var(--radius-sm)",
						border:
							activeStep === 2
								? "1px solid var(--blue)"
								: "1px solid var(--line)",
						background:
							activeStep === 2 ? "var(--blue-dim)" : "var(--surface-2)",
						color: activeStep === 2 ? "var(--blue)" : "var(--text)",
						fontWeight: 700,
						fontSize: "14px",
						cursor: "pointer",
						textAlign: "center",
					}}
				>
					Schritt 2: Messwerte & Beobachtung
				</button>
				<button
					type="button"
					onClick={() => setActiveStep(3)}
					style={{
						flex: 1,
						padding: "12px 16px",
						borderRadius: "var(--radius-sm)",
						border:
							activeStep === 3
								? "1px solid var(--amber)"
								: "1px solid var(--line)",
						background:
							activeStep === 3 ? "var(--amber-dim)" : "var(--surface-2)",
						color: activeStep === 3 ? "var(--amber)" : "var(--text)",
						fontWeight: 700,
						fontSize: "14px",
						cursor: "pointer",
						textAlign: "center",
					}}
				>
					Schritt 3: Maßnahmen & Bestätigung
				</button>
			</div>

			{/* ── STEP 1: Tages-Check & Sollwerte ── */}
			{activeStep === 1 && (
				<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
					{/* Overview Info Banner */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "12px",
							background: "var(--surface-2)",
							padding: "14px",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
						}}
					>
						<div>
							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								Wachstumsphase
							</div>
							<div
								style={{
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--text)",
								}}
							>
								{targets.phaseName}
							</div>
						</div>
						<div>
							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								Photoperiode
							</div>
							<div
								style={{
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--text)",
								}}
							>
								{targets.lightHours}h Licht / {24 - targets.lightHours}h Dunkel
							</div>
						</div>
						<div>
							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								LED Leistung / Abstand
							</div>
							<div
								style={{
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--text)",
								}}
							>
								{targets.ledWatts} W @ {targets.distanceCm} cm
							</div>
						</div>
						<div>
							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								Tagesziel
							</div>
							<div
								style={{
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--green)",
								}}
							>
								{targets.goal}
							</div>
						</div>
					</div>

					{/* Metric Gauges Grid */}
					<h3
						style={{
							margin: "0 0 10px 0",
							fontSize: "16px",
							fontWeight: 700,
							color: "var(--text)",
						}}
					>
						🎯 Sollwerte & Zielkorridore (Tag {selectedDay})
					</h3>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
							gap: "14px",
						}}
					>
						<MetricGauge
							label="Licht-Intensität"
							value={Math.round((targets.ppfdMin + targets.ppfdMax) / 2)}
							min={100}
							max={1100}
							optimalMin={targets.ppfdMin}
							optimalMax={targets.ppfdMax}
							unit="µmol/m²/s"
							tooltipTerm="PPFD"
							lens={lens}
						/>
						<MetricGauge
							label="Tages-Lichtsumme"
							value={
								Math.round(((targets.dliMin + targets.dliMax) / 2) * 10) / 10
							}
							min={5}
							max={50}
							optimalMin={targets.dliMin}
							optimalMax={targets.dliMax}
							unit="mol/m²/d"
							tooltipTerm="DLI"
							lens={lens}
						/>
						<MetricGauge
							label="Dampfdruckdefizit"
							value={
								Math.round(((targets.vpdMin + targets.vpdMax) / 2) * 100) / 100
							}
							min={0.3}
							max={1.8}
							optimalMin={targets.vpdMin}
							optimalMax={targets.vpdMax}
							unit="kPa"
							tooltipTerm="VPD"
							lens={lens}
						/>
						<MetricGauge
							label="Raumtemperatur"
							value={(targets.tempMin + targets.tempMax) / 2}
							min={15}
							max={32}
							optimalMin={targets.tempMin}
							optimalMax={targets.tempMax}
							unit="°C"
							lens={lens}
						/>
						<MetricGauge
							label="Rel. Luftfeuchtigkeit"
							value={(targets.rhMin + targets.rhMax) / 2}
							min={30}
							max={85}
							optimalMin={targets.rhMin}
							optimalMax={targets.rhMax}
							unit="%"
							tooltipTerm="rF"
							lens={lens}
						/>
						<MetricGauge
							label="Nährlösungs-Salzgehalt"
							value={targets.ecTarget}
							min={0.2}
							max={2.8}
							optimalMin={Math.max(
								0.4,
								Math.round((targets.ecTarget - 0.2) * 10) / 10,
							)}
							optimalMax={Math.round((targets.ecTarget + 0.2) * 10) / 10}
							unit="mS/cm"
							tooltipTerm="EC"
							lens={lens}
						/>
						<MetricGauge
							label="Nährlösungs-Säuregrad"
							value={targets.phTarget}
							min={5.0}
							max={7.0}
							optimalMin={5.8}
							optimalMax={6.2}
							unit="pH"
							tooltipTerm="pH"
							lens={lens}
						/>
					</div>

					{/* Practical Operator Guidance Cards */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "14px",
						}}
					>
						<div
							style={{
								background: "var(--surface-2)",
								padding: "14px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
							}}
						>
							<div
								style={{
									fontSize: "14px",
									fontWeight: 700,
									color: "var(--green)",
									marginBottom: "6px",
								}}
							>
								🌿 Pflanzentraining & Pflege
							</div>
							<p
								style={{ margin: 0, fontSize: "13px", color: "var(--text-2)" }}
							>
								{targets.trainingNotes}
							</p>
						</div>
						<div
							style={{
								background: "var(--surface-2)",
								padding: "14px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
							}}
						>
							<div
								style={{
									fontSize: "14px",
									fontWeight: 700,
									color: "var(--blue)",
									marginBottom: "6px",
								}}
							>
								🛡️ Qualitätssicherung (QA)
							</div>
							<p
								style={{ margin: 0, fontSize: "13px", color: "var(--text-2)" }}
							>
								{targets.qaNotes}
							</p>
						</div>
						<div
							style={{
								background: "var(--surface-2)",
								padding: "14px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
							}}
						>
							<div
								style={{
									fontSize: "14px",
									fontWeight: 700,
									color: "var(--amber)",
									marginBottom: "6px",
								}}
							>
								⚠️ Abbruch- / Stopp-Regeln
							</div>
							<p
								style={{ margin: 0, fontSize: "13px", color: "var(--text-2)" }}
							>
								{targets.stopRules}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* ── STEP 2: Messwerte & Beobachtung erfassen ── */}
			{activeStep === 2 && (
				<form
					onSubmit={handleSaveObservation}
					style={{ display: "flex", flexDirection: "column", gap: "20px" }}
				>
					{saveStatus && (
						<div
							style={{
								padding: "12px 16px",
								background: "var(--green-dim)",
								border: "1px solid var(--green)",
								borderRadius: "var(--radius-sm)",
								color: "var(--green)",
								fontWeight: 700,
								fontSize: "14px",
							}}
						>
							{saveStatus}
						</div>
					)}

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
							gap: "16px",
						}}
					>
						{/* Klima & Licht Input Card */}
						<div
							style={{
								background: "var(--surface-2)",
								padding: "16px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--green)",
								}}
							>
								🌡️ Klima & Licht (Tag {selectedDay})
							</h4>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "10px",
								}}
							>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Temp Max (°C)
									</label>
									<input
										type="number"
										step="0.1"
										value={tempAirMax}
										onChange={(e) => setTempAirMax(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Temp Min (°C)
									</label>
									<input
										type="number"
										step="0.1"
										value={tempAirMin}
										onChange={(e) => setTempAirMin(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Luftfeuchte Max (%)
									</label>
									<input
										type="number"
										step="1"
										value={rhMax}
										onChange={(e) => setRhMax(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Luftfeuchte Min (%)
									</label>
									<input
										type="number"
										step="1"
										value={rhMin}
										onChange={(e) => setRhMin(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Blatt-Temp (°C)
									</label>
									<input
										type="number"
										step="0.1"
										value={leafTemp}
										onChange={(e) => setLeafTemp(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										<TermTooltip term="PPFD" lens={lens}>
											PPFD (µmol/m²/s)
										</TermTooltip>
									</label>
									<input
										type="number"
										step="10"
										value={ppfdInput}
										onChange={(e) => setPpfdInput(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
							</div>

							{/* Real-time Computed Previews */}
							<div
								style={{
									background: "var(--surface-3)",
									padding: "10px",
									borderRadius: "var(--radius-sm)",
									fontSize: "12px",
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<span>
									Leaf-VPD Offset: <strong>{leafDelta.toFixed(1)} °C</strong>
								</span>
								<span>
									Berechnet:{" "}
									<TermTooltip term="VPD" lens={lens}>
										<strong>{calculatedLeafVpd.toFixed(2)} kPa</strong>
									</TermTooltip>
								</span>
								<span>
									Berechnet:{" "}
									<TermTooltip term="DLI" lens={lens}>
										<strong>{calculatedDli.toFixed(1)} mol/m²/d</strong>
									</TermTooltip>
								</span>
							</div>
						</div>

						{/* Nährstoff & Bewässerung Input Card */}
						<div
							style={{
								background: "var(--surface-2)",
								padding: "16px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--line)",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--blue)",
								}}
							>
								🧪 Wasser, Nährstoffe & Drain
							</h4>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "10px",
								}}
							>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										<TermTooltip term="pH" lens={lens}>
											pH-Wert (in)
										</TermTooltip>
									</label>
									<input
										type="number"
										step="0.1"
										value={waterPh}
										onChange={(e) => setWaterPh(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										<TermTooltip term="EC" lens={lens}>
											EC-Wert in (mS/cm)
										</TermTooltip>
									</label>
									<input
										type="number"
										step="0.1"
										value={waterEc}
										onChange={(e) => setWaterEc(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Drain pH
									</label>
									<input
										type="number"
										step="0.1"
										value={drainPh}
										onChange={(e) => setDrainPh(e.target.value)}
										placeholder="z.B. 6.2"
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Drain EC (mS/cm)
									</label>
									<input
										type="number"
										step="0.1"
										value={drainEc}
										onChange={(e) => setDrainEc(e.target.value)}
										placeholder="z.B. 1.6"
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Gießmenge (L)
									</label>
									<input
										type="number"
										step="0.1"
										value={appliedWaterL}
										onChange={(e) => setAppliedWaterL(e.target.value)}
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
								<div>
									<label
										style={{
											display: "block",
											fontSize: "12px",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Drain-Menge (L)
									</label>
									<input
										type="number"
										step="0.05"
										value={drainVolumeL}
										onChange={(e) => setDrainVolumeL(e.target.value)}
										placeholder="z.B. 0.2"
										style={{
											width: "100%",
											padding: "8px",
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--line)",
											background: "var(--surface-3)",
											color: "var(--text)",
										}}
									/>
								</div>
							</div>

							<div
								style={{
									background: "var(--surface-3)",
									padding: "10px",
									borderRadius: "var(--radius-sm)",
									fontSize: "12px",
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<span>
									Berechneter Drain %:{" "}
									<strong>{calculatedDrainPercent} %</strong> (Ziel: 15–20%)
								</span>
							</div>
						</div>
					</div>

					{/* Plant Growth & Freeform Notes */}
					<div
						style={{
							background: "var(--surface-2)",
							padding: "16px",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
						}}
					>
						<h4
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 700,
								color: "var(--amber)",
							}}
						>
							🪴 Pflanzengröße, Stress & Freitext-Notizen
						</h4>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "10px",
							}}
						>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "12px",
										color: "var(--muted)",
										marginBottom: "4px",
									}}
								>
									Topfgewicht (g)
								</label>
								<input
									type="number"
									step="50"
									value={potMassG}
									onChange={(e) => setPotMassG(e.target.value)}
									placeholder="z.B. 3400"
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								/>
							</div>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "12px",
										color: "var(--muted)",
										marginBottom: "4px",
									}}
								>
									Pflanzenhöhe (cm)
								</label>
								<input
									type="number"
									step="1"
									value={plantHeightCm}
									onChange={(e) => setPlantHeightCm(e.target.value)}
									placeholder="z.B. 45"
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								/>
							</div>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "12px",
										color: "var(--muted)",
										marginBottom: "4px",
									}}
								>
									Stress-Score (0–10)
								</label>
								<input
									type="number"
									min="0"
									max="10"
									value={stressScore}
									onChange={(e) => setStressScore(e.target.value)}
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								/>
							</div>
						</div>

						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									color: "var(--muted)",
									marginBottom: "4px",
								}}
							>
								Routine-Notizen zum Tag
							</label>
							<textarea
								rows={2}
								value={obsNotes}
								onChange={(e) => setObsNotes(e.target.value)}
								placeholder="Besondere Beobachtungen, Aussehen des Canopys..."
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "var(--radius-sm)",
									border: "1px solid var(--line)",
									background: "var(--surface-3)",
									color: "var(--text)",
								}}
							/>
						</div>
					</div>

					{/* Structured Observation Subform */}
					<div
						style={{
							background: "var(--surface-2)",
							padding: "16px",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
						}}
					>
						<h4
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 700,
								color: "var(--purple)",
							}}
						>
							🏷️ Strukturierte Beobachtung erfassen (Optional)
						</h4>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "10px",
							}}
						>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "12px",
										color: "var(--muted)",
										marginBottom: "4px",
									}}
								>
									Kategorie
								</label>
								<select
									value={structCategory}
									onChange={(e) =>
										setStructCategory(
											e.target.value as StructuredObservationCategory,
										)
									}
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								>
									<option value="foliage">Blattwerk & Farbe</option>
									<option value="root-zone">Wurzelzone & Substrat</option>
									<option value="structure">Struktur & Verzweigung</option>
									<option value="pest">Schädlinge & Symptome</option>
									<option value="environment">Zelt-Klima & Technik</option>
									<option value="general">Allgemeine Beobachtung</option>
								</select>
							</div>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "12px",
										color: "var(--muted)",
										marginBottom: "4px",
									}}
								>
									Schweregrad
								</label>
								<select
									value={structSeverity}
									onChange={(e) =>
										setStructSeverity(e.target.value as ObservationSeverity)
									}
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								>
									<option value="info">Info / Routine</option>
									<option value="mild">Leicht (Beobachten)</option>
									<option value="moderate">Moderat (Maßnahme)</option>
									<option value="severe">Kritisch (Sofort)</option>
								</select>
							</div>
						</div>

						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									color: "var(--muted)",
									marginBottom: "4px",
								}}
							>
								Beobachtungssynthese
							</label>
							<input
								type="text"
								value={structSummary}
								onChange={(e) => setStructSummary(e.target.value)}
								placeholder="z.B. Leichte Gelbfärbung an untersten Blättern"
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "var(--radius-sm)",
									border: "1px solid var(--line)",
									background: "var(--surface-3)",
									color: "var(--text)",
								}}
							/>
						</div>

						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									color: "var(--muted)",
									marginBottom: "4px",
								}}
							>
								Hashtags / Tags (leerzeichengetrennt)
							</label>
							<input
								type="text"
								value={structTags}
								onChange={(e) => setStructTags(e.target.value)}
								placeholder="#gelbe_blaetter #untere_zonen #n_mangel"
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "var(--radius-sm)",
									border: "1px solid var(--line)",
									background: "var(--surface-3)",
									color: "var(--text)",
								}}
							/>
						</div>
					</div>

					<button
						type="submit"
						style={{
							padding: "14px 24px",
							fontSize: "15px",
							fontWeight: 800,
							borderRadius: "var(--radius-sm)",
							border: 0,
							background: "var(--green)",
							color: "var(--on-green)",
							cursor: "pointer",
							boxShadow: "var(--shadow)",
						}}
					>
						💾 Messung & Beobachtung für Tag {selectedDay} speichern
					</button>
				</form>
			)}

			{/* ── STEP 3: Maßnahmen & Bestätigung ── */}
			{activeStep === 3 && (
				<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
					{/* Daily Checklist */}
					<div
						style={{
							background: "var(--surface-2)",
							padding: "16px",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
						}}
					>
						<h4
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 700,
								color: "var(--amber)",
							}}
						>
							📋 Tages-Aufgaben & Checklist (Tag {selectedDay})
						</h4>

						<div
							style={{ display: "flex", flexDirection: "column", gap: "8px" }}
						>
							{defaultTasksForDay.map((task) => {
								const isCompleted = completedTaskList.includes(task.title);
								const existingRunTask = run.tasks?.find(
									(t) => t.id === task.id,
								);
								const currentState: TaskState =
									existingRunTask?.state || (isCompleted ? "completed" : "due");

								return (
									<div
										key={task.id}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											flexWrap: "wrap",
											gap: "10px",
											padding: "10px 12px",
											background: "var(--surface-3)",
											borderRadius: "var(--radius-sm)",
											border: isCompleted
												? "1px solid var(--green)"
												: "1px solid var(--line)",
										}}
									>
										<label
											style={{
												display: "flex",
												alignItems: "center",
												gap: "10px",
												cursor: "pointer",
												flex: 1,
											}}
										>
											<input
												type="checkbox"
												checked={isCompleted}
												onChange={() =>
													handleToggleTask(task.title, isCompleted)
												}
												style={{
													width: "18px",
													height: "18px",
													accentColor: "var(--green)",
												}}
											/>
											<span
												style={{
													fontSize: "13px",
													fontWeight: 600,
													color: isCompleted ? "var(--green)" : "var(--text)",
													textDecoration: isCompleted ? "line-through" : "none",
												}}
											>
												{task.title}
											</span>
										</label>

										{/* Task State Selector */}
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											<select
												value={currentState}
												onChange={(e) =>
													handleTransitionTaskState(
														task.title,
														e.target.value as TaskState,
													)
												}
												style={{
													padding: "4px 8px",
													fontSize: "11px",
													fontWeight: 700,
													borderRadius: "var(--radius-sm)",
													border: "1px solid var(--line)",
													background: "var(--surface-1)",
													color:
														currentState === "completed"
															? "var(--green)"
															: currentState === "blocked"
																? "var(--red)"
																: "var(--text)",
												}}
											>
												<option value="due">Ausstehend</option>
												<option value="completed">Erledigt</option>
												<option value="skipped">Übersprungen</option>
												<option value="blocked">Blockiert</option>
											</select>

											{(currentState === "blocked" ||
												currentState === "skipped") && (
												<input
													type="text"
													placeholder="Grund..."
													value={taskReasonMap[task.title] || ""}
													onChange={(e) =>
														setTaskReasonMap({
															...taskReasonMap,
															[task.title]: e.target.value,
														})
													}
													style={{
														padding: "4px 8px",
														fontSize: "11px",
														borderRadius: "var(--radius-sm)",
														border: "1px solid var(--line)",
														background: "var(--surface-1)",
														color: "var(--text)",
													}}
												/>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Daily Nutrient Recipe Quick-View */}
					<div
						style={{
							background: "var(--surface-2)",
							padding: "16px",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--green)",
								}}
							>
								🧪 Nährstoff-Dosis Rezept-Vorschau (Tag {selectedDay})
							</h4>
							<div
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>
									Batch:
								</span>
								<input
									type="number"
									min="1"
									max="100"
									value={batchLiters}
									onChange={(e) =>
										setBatchLiters(
											Math.max(1, parseInt(e.target.value, 10) || 10),
										)
									}
									style={{
										width: "50px",
										padding: "4px 6px",
										fontSize: "12px",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
										background: "var(--surface-3)",
										color: "var(--text)",
									}}
								/>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>
									Litter
								</span>

								{navigate && (
									<button
										type="button"
										onClick={() => navigate("mix")}
										style={{
											padding: "6px 12px",
											fontSize: "12px",
											fontWeight: 700,
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--green)",
											background: "var(--green-dim)",
											color: "var(--green)",
											cursor: "pointer",
										}}
									>
										🧪 Zum Nährstoff-Mixer
									</button>
								)}
							</div>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: "10px",
							}}
						>
							{recipeMix.map((item, idx) => (
								<div
									key={idx}
									style={{
										padding: "10px 12px",
										background: "var(--surface-3)",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--line)",
									}}
								>
									<div
										style={{
											fontSize: "11px",
											color: "var(--muted)",
											textTransform: "uppercase",
										}}
									>
										Schritt {idx + 1}: {item.role}
									</div>
									<div
										style={{
											fontSize: "14px",
											fontWeight: 700,
											color: "var(--text)",
											marginTop: "2px",
										}}
									>
										{item.name}
									</div>
									<div
										style={{
											fontSize: "13px",
											fontWeight: 800,
											color: "var(--green)",
											marginTop: "4px",
											fontFamily: "var(--font-mono)",
										}}
									>
										{item.dose} ml/L ({item.amount} ml gesamt)
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Active Alerts & Safety Warning Cards */}
					{unacknowledgedAlerts.length > 0 && (
						<div
							style={{
								background: "var(--surface-2)",
								padding: "16px",
								borderRadius: "var(--radius)",
								border: "1px solid var(--red)",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--red)",
								}}
							>
								🚨 Aktive Sicherheits-Warnungen & Prüf-Hinweise
							</h4>

							{unacknowledgedAlerts.map((alert) => (
								<div
									key={alert.id}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "10px 12px",
										background: "var(--red-dim)",
										borderRadius: "var(--radius-sm)",
										border: "1px solid var(--red)",
									}}
								>
									<div>
										<strong style={{ fontSize: "13px", color: "var(--red)" }}>
											{alert.title}:{" "}
										</strong>
										<span style={{ fontSize: "13px", color: "var(--text-2)" }}>
											{alert.detail}
										</span>
									</div>
									<button
										type="button"
										onClick={() => handleAcknowledgeAlert(alert.id)}
										style={{
											padding: "4px 10px",
											fontSize: "11px",
											fontWeight: 700,
											borderRadius: "var(--radius-sm)",
											border: "1px solid var(--red)",
											background: "var(--surface-1)",
											color: "var(--red)",
											cursor: "pointer",
										}}
									>
										Gesehen & Bestätigen
									</button>
								</div>
							))}
						</div>
					)}

					{/* Day Completion Summary */}
					<div
						style={{
							padding: "16px",
							background: "var(--surface-2)",
							borderRadius: "var(--radius)",
							border: "1px solid var(--line)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							flexWrap: "wrap",
							gap: "12px",
						}}
					>
						<div>
							<div
								style={{
									fontSize: "14px",
									fontWeight: 800,
									color: "var(--text)",
								}}
							>
								Tagesfortschritt für Tag {selectedDay}
							</div>
							<div
								style={{
									fontSize: "12px",
									color: "var(--muted)",
									marginTop: "2px",
								}}
							>
								Messung erfasst: {existingObs ? "Ja ✓" : "Nein ❌"} | Erledigte
								Tasks: {completedTaskList.length}/5
							</div>
						</div>

						<button
							type="button"
							onClick={() => {
								const updatedRun = setTaskCompleted(
									run,
									selectedDay,
									"Tageskontrolle abgeschlossen",
									true,
								);
								onUpdateRun(updatedRun);
								if (selectedDay < 80) setSelectedDay(selectedDay + 1);
							}}
							style={{
								padding: "10px 18px",
								fontSize: "13px",
								fontWeight: 800,
								borderRadius: "var(--radius-sm)",
								border: 0,
								background: "var(--green)",
								color: "var(--on-green)",
								cursor: "pointer",
							}}
						>
							✓ Tag {selectedDay} abschließen & zu Tag{" "}
							{Math.min(80, selectedDay + 1)} weitergehen
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default DailyOperatorPanel;
