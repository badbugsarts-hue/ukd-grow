import type React from "react";
import { useState } from "react";
import waterPresets from "../../data/water-presets.json";
import { calculateBiologicalPlantAge, calculateDli } from "../../domain";
import { evaluateLiveClock } from "../../live-run";
import {
  activateRun,
  updateExecutionMode,
  updatePlantIdentity,
  updatePlantMilestones,
  updatePotProfile,
  updateRunConfig,
} from "../../run-state";
import type {
  AutoflowerStrain,
  DayZeroAnchor,
  EquipmentProfile,
  ExperienceLens,
  PlantIdentity,
  PotProfile,
  RouteId,
  RunConfig,
  RunExecutionMode,
  RunPackage,
  WaterProfile,
} from "../../types";
import LensBadge from "../common/LensBadge";
import TermTooltip from "../common/TermTooltip";
import { AutoflowerCockpitModal } from "../modals/AutoflowerCockpitModal";
import { PlantIdentityModal } from "../modals/PlantIdentityModal";
import { PpfdMappingModal } from "../modals/PpfdMappingModal";
import {
  predictEmergenceDate,
  predictGeneticsMetadata,
} from "../../prediction-engine";

export interface RunConfigPanelProps {
  run: RunPackage;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
  now?: Date;
}

export function calculateReadinessScore(config: RunConfig): {
  score: number;
  missingItems: string[];
  isReady: boolean;
} {
  const missingItems: string[] = [];

  // Category 1: Substrate & Pot (20%)
  let cat1 = true;
  if (!config.medium?.trim()) {
    cat1 = false;
    missingItems.push("Substrat-Typ nicht ausgewählt");
  }
  if (!config.pot?.nominalVolumeLiters || config.pot.nominalVolumeLiters <= 0) {
    cat1 = false;
    missingItems.push("Topfvolumen (L) unvollständig oder 0");
  }

  // Category 2: Light Setup (20%)
  let cat2 = true;
  if (!config.ledMaxW || config.ledMaxW <= 0) {
    cat2 = false;
    missingItems.push("Lampenleistung (W) unvollständig oder 0");
  }
  if (!config.lightHours || config.lightHours <= 0) {
    cat2 = false;
    missingItems.push("Photoperiode (h/d) nicht definiert");
  }

  // Category 3: Tent Setup (20%)
  let cat3 = true;
  if (
    !config.tentWidthCm ||
    !config.tentDepthCm ||
    !config.tentHeightCm ||
    config.tentWidthCm <= 0 ||
    config.tentDepthCm <= 0 ||
    config.tentHeightCm <= 0
  ) {
    cat3 = false;
    missingItems.push("Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig");
  }

  // Category 4: Water Analysis (20%) - Invariant 4 Fail-Closed Gate
  let cat4 = true;
  const w = config.water;
  if (!w || w.sourcePh === null || Number.isNaN(w.sourcePh)) {
    cat4 = false;
    missingItems.push("Wasser-pH fehlt");
  }
  if (!w || w.sourceEc === null || Number.isNaN(w.sourceEc)) {
    cat4 = false;
    missingItems.push("Wasser-EC fehlt");
  }
  if (!w || w.calciumMgL === null || Number.isNaN(w.calciumMgL)) {
    cat4 = false;
    missingItems.push("Calcium (mg/L) fehlt");
  }
  if (!w || w.magnesiumMgL === null || Number.isNaN(w.magnesiumMgL)) {
    cat4 = false;
    missingItems.push("Magnesium (mg/L) fehlt");
  }

  // Category 5: Equipment & Genetics Profile (20%)
  let cat5 = true;
  if (!config.name || !config.genetics) {
    cat5 = false;
    missingItems.push("Run-Bezeichnung oder Genetik-Name fehlt");
  }

  const score =
    (cat1 ? 20 : 0) +
    (cat2 ? 20 : 0) +
    (cat3 ? 20 : 0) +
    (cat4 ? 20 : 0) +
    (cat5 ? 20 : 0);

  return {
    score,
    missingItems,
    isReady: score === 100,
  };
}

export const RunConfigPanel: React.FC<RunConfigPanelProps> = ({
  run,
  lens,
  onUpdateRun,
  navigate,
  now = new Date(),
}) => {
  const config = run.config;
  const readiness = calculateReadinessScore(config);
  const selectedDayZeroAnchor: DayZeroAnchor =
    config.dayZeroAnchor === "seed-planted" ? "seed-planted" : "emergence";

  // Modals state
  const [activePlantId, setActivePlantId] = useState<string | null>(null);
  const [isPlantIdentityModalOpen, setIsPlantIdentityModalOpen] =
    useState(false);
  const [isAutoflowerModalOpen, setIsAutoflowerModalOpen] = useState(false);
  const [isPpfdModalOpen, setIsPpfdModalOpen] = useState(false);
  const [dimmerPercent, setDimmerPercent] = useState<number>(100);

  // Primary Plant & Identity
  const primaryPlant = run.plants[0];
  const plantIdentity = primaryPlant?.identity;

  // Tent volumetric calculations
  const tentWidth = config.tentWidthCm || 0;
  const tentDepth = config.tentDepthCm || 0;
  const tentHeight = config.tentHeightCm || 0;
  const tentAreaM2 = (tentWidth * tentDepth) / 10000;
  const tentVolumeM3 = (tentAreaM2 * tentHeight) / 100;
  const plantCount = Math.max(1, config.plantCount || run.plants.length || 1);
  const plantDensity =
    tentAreaM2 > 0 ? (plantCount / tentAreaM2).toFixed(1) : "—";

  // Milestones (Potting & Emergence dates)
  const pottingDateIso =
    plantIdentity?.pottingDateIso ||
    (run.growthEvents || [])
      .find((e) => e.kind === "seed-planted")
      ?.occurredAt?.slice(0, 10) ||
    "";

  const emergenceDateIso =
    plantIdentity?.emergenceDateIso ||
    (run.growthEvents || [])
      .find((e) => e.kind === "emergence")
      ?.occurredAt?.slice(0, 10) ||
    (config.startDate ? config.startDate.slice(0, 10) : "");

  // Germination calculation
  const germinationDays = (() => {
    if (pottingDateIso && emergenceDateIso) {
      const p = new Date(pottingDateIso).getTime();
      const e = new Date(emergenceDateIso).getTime();
      if (!Number.isNaN(p) && !Number.isNaN(e) && e >= p) {
        return Math.round((e - p) / (1000 * 60 * 60 * 24));
      }
    }
    return null;
  })();

  // Biological plant age calculation
  const biologicalAge = calculateBiologicalPlantAge(
    selectedDayZeroAnchor,
    run.growthEvents || [],
    now,
  );
  const liveClock = evaluateLiveClock(run, now);

  const activeDay =
    run.executionMode === "live"
      ? liveClock.day
      : biologicalAge.biologicalAgeDays;

  // Lighting & Photobiology
  const ledMaxW = config.ledMaxW || 0;
  const lightHours = config.lightHours || 18;
  const estimatedPpfd =
    tentAreaM2 > 0
      ? Math.round((ledMaxW * (dimmerPercent / 100) * 2.2) / tentAreaM2)
      : 500;
  const estimatedDli = calculateDli(estimatedPpfd, lightHours);

  // Pot tare & substrate hydration calibration
  const pot = config.pot || {
    type: "fabric",
    nominalVolumeLiters: 9,
    emptyMassGrams: null,
    saturatedMassGrams: null,
  };
  const isHydrationCalibrated =
    pot.emptyMassGrams !== null &&
    pot.emptyMassGrams !== undefined &&
    pot.emptyMassGrams > 0 &&
    pot.saturatedMassGrams !== null &&
    pot.saturatedMassGrams !== undefined &&
    pot.saturatedMassGrams > pot.emptyMassGrams;

  // Ventilation & Exhaust persistence
  const exhaustM3h = config.exhaustM3h ?? 220;
  const airTurnoverPerHour = tentVolumeM3 > 0 ? exhaustM3h / tentVolumeM3 : 0;
  const airTurnoverPerMinute = airTurnoverPerHour / 60;
  const isAirflowAdequate = airTurnoverPerMinute >= 1.0;

  // Water Ca:Mg Ratio & Alkalinity
  const ca = config.water?.calciumMgL ?? 0;
  const mg = config.water?.magnesiumMgL ?? 0;
  const caMgRatioNum = mg > 0 ? ca / mg : null;
  const caMgRatioStr =
    caMgRatioNum !== null ? caMgRatioNum.toFixed(1) : ca > 0 ? `${ca}:0` : "—";
  const isCaMgOptimal =
    caMgRatioNum !== null && caMgRatioNum >= 2.5 && caMgRatioNum <= 4.5;

  // Handlers
  const handleConfigChange = (field: keyof RunConfig, value: unknown) => {
    const updatedConfig: RunConfig = {
      ...config,
      [field]: value,
    };
    const updatedRun = updateRunConfig(run, updatedConfig);
    onUpdateRun(updatedRun);
  };

  const handleMilestoneChange = (newPotting: string, newEmergence: string) => {
    if (newPotting && !newEmergence) {
      const predicted = predictEmergenceDate(newPotting);
      if (predicted) {
        onUpdateRun(
          updatePlantMilestones(
            run,
            {
              pottingDateIso: newPotting,
              emergenceDateIso: predicted,
              dayZeroAnchor: selectedDayZeroAnchor,
            },
            "Keimung automatisch vorausberechnet",
          ),
        );
      } else {
        onUpdateRun(
          updatePlantMilestones(
            run,
            {
              pottingDateIso: newPotting,
              emergenceDateIso: newEmergence,
              dayZeroAnchor: selectedDayZeroAnchor,
            },
            "Pflanzen-Meilensteine aktualisiert",
          ),
        );
      }
    } else {
      onUpdateRun(
        updatePlantMilestones(
          run,
          {
            pottingDateIso: newPotting,
            emergenceDateIso: newEmergence,
            dayZeroAnchor: selectedDayZeroAnchor,
          },
          "Pflanzen-Meilensteine aktualisiert",
        ),
      );
    }
  };

  const handleDayZeroAnchorChange = (dayZeroAnchor: DayZeroAnchor) => {
    onUpdateRun(
      updatePlantMilestones(
        run,
        {
          pottingDateIso,
          emergenceDateIso,
          dayZeroAnchor,
        },
        `Live-Nullpunkt auf ${dayZeroAnchor} gesetzt`,
      ),
    );
  };

  const handleExecutionModeChange = (mode: RunExecutionMode) => {
    const updatedRun = updateExecutionMode(run, mode);
    onUpdateRun(updatedRun);
  };

  const handlePotChange = (field: keyof PotProfile, value: unknown) => {
    const updatedPot: PotProfile = {
      ...pot,
      [field]: value,
    };
    const updatedRun = updatePotProfile(run, updatedPot);
    onUpdateRun(updatedRun);
  };

  const handleExhaustChange = (newExhaust: number) => {
    const val = Math.max(0, newExhaust);
    const existingEquipment = run.equipment || [];
    const hasExhaust = existingEquipment.some(
      (eq) => eq.category === "exhaust",
    );

    let nextEquipment: EquipmentProfile[];
    if (hasExhaust) {
      nextEquipment = existingEquipment.map((eq) =>
        eq.category === "exhaust"
          ? { ...eq, exhaustM3h: val, airflowM3h: val }
          : eq,
      );
    } else {
      nextEquipment = [
        ...existingEquipment,
        {
          id: "exhaust-fan-1",
          category: "exhaust",
          manufacturer: "Standard",
          model: "Abluftventilator",
          serialOrAssetId: null,
          ratedPowerW: null,
          exhaustM3h: val,
          airflowM3h: val,
          installedAt: new Date().toISOString(),
          position: "Top Exhaust",
          notes: "Hauptabluftventilator",
          status: "active",
        },
      ];
    }

    const updatedConfig: RunConfig = {
      ...config,
      exhaustM3h: val,
    };

    const updatedRun: RunPackage = {
      ...updateRunConfig(run, updatedConfig),
      equipment: nextEquipment,
    };
    onUpdateRun(updatedRun);
  };

  const handleWaterChange = (field: keyof WaterProfile, value: unknown) => {
    const updatedWater: WaterProfile = {
      ...config.water,
      [field]: value,
    };
    const updatedConfig: RunConfig = {
      ...config,
      water: updatedWater,
    };
    const updatedRun = updateRunConfig(run, updatedConfig);
    onUpdateRun(updatedRun);
  };

  const handleApplyWaterPreset = (presetId: string) => {
    const preset = waterPresets.find((p) => p.id === presetId);
    if (!preset) return;
    const updatedWater: WaterProfile = {
      ...config.water,
      sourceDescription: preset.name,
      calciumMgL: preset.calciumMgL,
      magnesiumMgL: preset.magnesiumMgL,
      alkalinityMgL: preset.alkalinityMgL,
      sourcePh: config.water.sourcePh ?? 7.2,
      sourceEc: config.water.sourceEc ?? (preset.calciumMgL > 80 ? 0.6 : 0.4),
      sourceType: preset.id === "ro_water_alg" ? "ro" : "municipal",
      verified: true,
    };
    const updatedConfig: RunConfig = {
      ...config,
      water: updatedWater,
    };
    onUpdateRun(updateRunConfig(run, updatedConfig));
  };

  const handleSelectStrain = (strain: AutoflowerStrain) => {
    if (!activePlantId) return;

    const targetPlant =
      run.plants.find((p) => p.id === activePlantId) || run.plants[0];
    const plantIdentity = targetPlant?.identity;

    const updatedIdentity: PlantIdentity = {
      breeder: strain.breeder,
      seedType: strain.typ === "Autoflower" ? "autoflower" : "feminized",
      seedLot: plantIdentity?.seedLot ?? null,
      packBatch: plantIdentity?.packBatch ?? null,
      sourceDate: plantIdentity?.sourceDate ?? null,
      phenotypeNotes: strain.urteil || strain.wirkung || strain.geschmack || "",
      pottingDateIso: plantIdentity?.pottingDateIso,
      emergenceDateIso: plantIdentity?.emergenceDateIso,
      dayZeroAnchorDate: plantIdentity?.dayZeroAnchorDate,
    };

    const updatedRun = updatePlantIdentity(
      run,
      activePlantId,
      strain.name,
      updatedIdentity,
      config.dayZeroAnchor ?? "emergence",
      run.config.startDate,
    );
    onUpdateRun(updatedRun);
  };

  const handleActivateRun = () => {
    if (!readiness.isReady) return;
    const activated = activateRun(run);
    onUpdateRun(activated);
  };

  return (
    <div
      className="panel-container run-config-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
        background: "var(--surface-1)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--green)",
              }}
            >
              UKD MASTER SETUP CENTER 2026
            </span>
            <LensBadge lens={lens} />
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                background:
                  run.status === "active"
                    ? "rgba(103, 214, 174, 0.2)"
                    : "rgba(229, 164, 75, 0.2)",
                color:
                  run.status === "active" ? "var(--green)" : "var(--amber)",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Status: {run.status.toUpperCase()}
            </span>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            ⚙️ Run-Konfiguration & Systemgrenzen
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            Vollständige Erfassung aller Systemparameter, Genetik-Cockpit,
            retroaktiver Meilensteine und Fail-Closed Readiness Gate.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {navigate && (
            <button
              type="button"
              onClick={() => navigate("setup")}
              style={{
                minHeight: "44px",
                padding: "8px 16px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🛠️ Setup-Übersicht
            </button>
          )}
        </div>
      </div>

      {/* Aktuelle Setup-Übersicht */}
      <section
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          fontSize: "13px",
        }}
      >
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            🌱 Aktuelle Genetik:
          </strong>
          <span
            style={{ color: "var(--green)", fontWeight: 700, fontSize: "14px" }}
          >
            {config.genetics || "Keine Genetik gewählt"}
          </span>
        </div>
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            🏠 Zelt & Pflanzen:
          </strong>
          <span style={{ color: "var(--text)" }}>
            {config.tentWidthCm} × {config.tentDepthCm} × {config.tentHeightCm}{" "}
            cm · {config.plantCount}{" "}
            {config.plantCount === 1 ? "Pflanze" : "Pflanzen"}
          </span>
        </div>
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            ☀️ Beleuchtung:
          </strong>
          <span style={{ color: "var(--text)" }}>
            {config.ledMaxW} W (Max) · {config.lightHours} h/d
          </span>
        </div>
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            🪴 Medium & Topf:
          </strong>
          <span style={{ color: "var(--text)" }}>
            {config.pot?.nominalVolumeLiters} L ·{" "}
            {config.mediumProduct || config.medium || "Kein Medium"}
          </span>
        </div>
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            🧪 Nährstoffe:
          </strong>
          <span style={{ color: "var(--text)" }}>
            {config.nutrientSystem || "UKD HESI Conservative"}
          </span>
        </div>
        <div>
          <strong
            style={{
              color: "var(--muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            💧 Bewässerung:
          </strong>
          <span style={{ color: "var(--text)" }}>
            {config.irrigationSystem || "Manuell (Hand)"}
          </span>
        </div>
      </section>

      {/* Top Fail-Closed Readiness Gate Box */}
      <section
        aria-label="Run Readiness Gate Status"
        style={{
          padding: "18px",
          background: readiness.isReady
            ? "rgba(103, 214, 174, 0.12)"
            : "rgba(235, 87, 87, 0.12)",
          border: `2px solid ${readiness.isReady ? "var(--green)" : "var(--red)"}`,
          borderRadius: "var(--radius-sm)",
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
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <strong
              style={{
                fontSize: "16px",
                color: readiness.isReady ? "var(--green)" : "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
              }}
            >
              {readiness.isReady
                ? "🛡️ FAIL-CLOSED READINESS GATE: BEREIT (Score: 100%)"
                : `🛡️ FAIL-CLOSED READINESS GATE: UNVOLLSTÄNDIG (Score: ${readiness.score}%)`}
            </strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              5 Sicherheitskategorien: Substrat & Topf, Beleuchtung,
              Zeltvolumen, Wasseranalyse, Stammdaten & Genetik.
            </span>
          </div>

          <span
            style={{
              fontSize: "13px",
              color: readiness.isReady ? "var(--green)" : "var(--red)",
              fontWeight: 700,
            }}
          >
            {readiness.isReady
              ? "✓ Alle 5 Sicherheitskategorien erfüllt"
              : "⚠️ Aktivierung gesperrt"}
          </span>
        </div>

        {!readiness.isReady && (
          <div
            style={{
              background: "var(--surface-0)",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--red)",
                marginBottom: "6px",
              }}
            >
              Erforderliche Schritte zur Freigabe:
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "20px",
                fontSize: "12px",
                color: "var(--text)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "4px",
              }}
            >
              {readiness.missingItems.map((item, idx) => (
                <li key={idx} style={{ color: "var(--text)" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "4px",
          }}
        >
          {run.status === "draft" ? (
            <button
              type="button"
              onClick={handleActivateRun}
              disabled={!readiness.isReady}
              style={{
                minHeight: "44px",
                padding: "10px 24px",
                background: readiness.isReady
                  ? "var(--green)"
                  : "var(--surface-3)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: readiness.isReady ? "var(--on-green)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "14px",
                cursor: readiness.isReady ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {readiness.isReady
                ? "🚀 Run Aktivieren (Immutable Snapshot v11.5 erzeugen)"
                : "🔒 Sperre aktiv — Bitte Konfiguration vervollständigen"}
            </button>
          ) : (
            <span
              style={{
                fontSize: "13px",
                color: "var(--green)",
                fontWeight: 700,
              }}
            >
              ✓ Run bereits aktiv (Immutable Snapshot v
              {run.configurationSnapshot.version})
            </span>
          )}
        </div>
      </section>

      {/* 8-Card Master Class Configuration Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 1: Genetik & Cultivar-Auswahl */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-1-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-1-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              🧬 1. Genetik & Cultivar-Auswahl
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Katalog & Identität
            </span>
          </div>

          <div>
            <label
              htmlFor="rcp-run-name"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Run-Bezeichnung *
            </label>
            <input
              id="rcp-run-name"
              type="text"
              value={config.name}
              onChange={(e) => handleConfigChange("name", e.target.value)}
              placeholder="z.B. UKD Master Run #1"
              required
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px 12px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "13px",
              }}
            />
          </div>

          {run.plants
            .slice(0, Math.max(1, config.plantCount))
            .map((plant, index) => {
              const pIdentity = plant.identity;
              return (
                <div
                  key={plant.id}
                  style={{
                    border: "1px solid var(--line-strong)",
                    borderRadius: "6px",
                    padding: "12px",
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
                        fontSize: "14px",
                        color: "var(--green)",
                      }}
                    >
                      {plant.label || `Pflanze ${index + 1}`}
                    </h4>
                  </div>

                  <div>
                    <label
                      htmlFor={`rcp-genetics-${plant.id}`}
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--muted)",
                        marginBottom: "4px",
                      }}
                    >
                      Genetik / Strain Name *
                    </label>
                    <input
                      id={`rcp-genetics-${plant.id}`}
                      type="text"
                      value={plant.genetics || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        let updatedPIdentity = pIdentity;

                        if (newValue.length >= 3) {
                          const prediction = predictGeneticsMetadata(newValue);
                          if (prediction) {
                            updatedPIdentity = {
                              ...pIdentity,
                              breeder:
                                prediction.breeder ||
                                pIdentity?.breeder ||
                                null,
                              seedType:
                                prediction.seedType ||
                                pIdentity?.seedType ||
                                "unknown",
                              phenotypeNotes:
                                pIdentity?.phenotypeNotes ||
                                prediction.phenotypeNotes ||
                                "",
                            };
                          }
                        }
                        onUpdateRun(
                          updatePlantIdentity(
                            run,
                            plant.id,
                            newValue,
                            updatedPIdentity,
                            config.dayZeroAnchor || "emergence",
                            updatedPIdentity?.dayZeroAnchorDate ||
                              run.config.startDate ||
                              "",
                          ),
                        );
                      }}
                      placeholder="z.B. Sweet Mandarin Zkittlez Auto"
                      required
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "8px 12px",
                        background: "var(--surface-1)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  {/* Genetics Metadata Display Badge */}
                  <div
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "4px",
                      padding: "12px",
                      fontSize: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        Züchter (Breeder):
                      </span>
                      <strong style={{ color: "var(--text)" }}>
                        {pIdentity?.breeder || "Nicht festgelegt"}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        Saatgut-Typ:
                      </span>
                      <span
                        style={{
                          background: "rgba(91, 140, 255, 0.15)",
                          color: "var(--blue)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontSize: "11px",
                        }}
                      >
                        {pIdentity?.seedType || "Autoflower"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        Lot / Charge:
                      </span>
                      <strong style={{ color: "var(--text-2)" }}>
                        {pIdentity?.seedLot || "—"}
                      </strong>
                    </div>
                    {pIdentity?.phenotypeNotes && (
                      <div
                        style={{
                          color: "var(--muted)",
                          fontStyle: "italic",
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        „{pIdentity.phenotypeNotes}“
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActivePlantId(plant.id);
                        setIsPlantIdentityModalOpen(true);
                      }}
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "8px 14px",
                        background: "var(--surface-1)",
                        color: "var(--text)",
                        border: "1px solid var(--line-strong)",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 600,
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      🌿 Identität anpassen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePlantId(plant.id);
                        setIsAutoflowerModalOpen(true);
                      }}
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "8px 14px",
                        background: "var(--green)",
                        color: "var(--on-green)",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      🌱 Genetik aus Katalog wählen
                    </button>
                  </div>
                </div>
              );
            })}
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 2: Zeitachse, Modus & Retroaktive Meilensteine */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-2-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-2-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              ⏱️ 2. Zeitachse, Modus & Meilensteine
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Retroaktiv
            </span>
          </div>

          {/* Live vs Simulation Segmented Switch */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              Ausführungsmodus:
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleExecutionModeChange("simulation")}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  padding: "8px 12px",
                  background:
                    run.executionMode === "simulation"
                      ? "var(--blue)"
                      : "var(--surface-1)",
                  color:
                    run.executionMode === "simulation"
                      ? "var(--on-blue)"
                      : "var(--text)",
                  border: `1px solid ${run.executionMode === "simulation" ? "transparent" : "var(--line)"}`,
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ◇ Simulation
              </button>
              <button
                type="button"
                onClick={() => handleExecutionModeChange("live")}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  padding: "8px 12px",
                  background:
                    run.executionMode === "live"
                      ? "var(--green)"
                      : "var(--surface-1)",
                  color:
                    run.executionMode === "live"
                      ? "var(--on-green)"
                      : "var(--text)",
                  border: `1px solid ${run.executionMode === "live" ? "transparent" : "var(--line)"}`,
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ● Live-Betrieb
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="rcp-day-zero-anchor"
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              Live-Nullpunkt (Tag 0)
            </label>
            <select
              id="rcp-day-zero-anchor"
              value={selectedDayZeroAnchor}
              onChange={(event) =>
                handleDayZeroAnchorChange(event.target.value as DayZeroAnchor)
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px",
                background: "var(--surface-1)",
                border: "1px solid var(--line-strong)",
                borderRadius: "4px",
                color: "var(--text)",
              }}
            >
              <option value="seed-planted">Aussaat / Eintopfen</option>
              <option value="emergence">Durchstoß / Keimung</option>
            </select>
          </div>

          {/* Retroactive Date Pickers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-potting-date"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Eintopfen / Aussaat
                {selectedDayZeroAnchor === "seed-planted" ? " (D0) *" : ""}
              </label>
              <input
                id="rcp-potting-date"
                type="date"
                value={pottingDateIso}
                onChange={(e) =>
                  handleMilestoneChange(e.target.value, emergenceDateIso)
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-emergence-date"
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Durchstoß / Keimung
                {selectedDayZeroAnchor === "emergence" ? " (D0) *" : ""}
              </label>
              <input
                id="rcp-emergence-date"
                type="date"
                value={emergenceDateIso}
                onChange={(e) =>
                  handleMilestoneChange(pottingDateIso, e.target.value)
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          {/* Dynamic Mathematical Age & Day Status */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                Keimdauer
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                  color: "var(--text)",
                  marginTop: "2px",
                }}
              >
                {germinationDays !== null ? `${germinationDays} Tage` : "—"}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                Biol. Alter
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                  color: "var(--green)",
                  marginTop: "2px",
                }}
              >
                Tag {biologicalAge.biologicalAgeDays}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                Aktiver Tag
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                  color:
                    run.executionMode === "live"
                      ? "var(--green)"
                      : "var(--blue)",
                  marginTop: "2px",
                }}
              >
                D={activeDay}
              </strong>
            </div>
          </div>

          {run.executionMode === "live" && (
            <div
              className={`setup-live-status ${liveClock.blocked ? "is-blocked" : "is-healthy"}`}
              role={liveClock.blocked ? "alert" : "status"}
              aria-live="polite"
            >
              <span className="setup-live-pulse" aria-hidden="true" />
              <div>
                <strong>
                  LIVE · Tag {liveClock.day} ·{" "}
                  {now.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </strong>
                <small>
                  Nullpunkt:{" "}
                  {selectedDayZeroAnchor === "seed-planted"
                    ? "Aussaat"
                    : "Durchstoß"}{" "}
                  {run.liveAnchor
                    ? new Date(run.liveAnchor.startedAtUtc).toLocaleString(
                        "de-DE",
                      )
                    : "nicht gesetzt"}
                </small>
                {liveClock.blocked && <small>{liveClock.health.detail}</small>}
              </div>
            </div>
          )}

          <span
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              lineHeight: "1.4",
            }}
          >
            💡 Das gewählte{" "}
            {selectedDayZeroAnchor === "seed-planted"
              ? "Aussaatdatum"
              : "Durchstoßdatum"}{" "}
            definiert den operativen Nullpunkt. Im Live-Modus zählt UKD ab
            diesem Zeitpunkt automatisch in exakten 24-Stunden-Perioden weiter.
          </span>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 3: Zelt-Geometrie & Raum-Dimensionen */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-3-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-3-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              ⛺ 3. Zelt-Geometrie & Raum-Dimensionen
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Volumen
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-tent-width"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Breite (cm) *
              </label>
              <input
                id="rcp-tent-width"
                type="number"
                min={30}
                max={300}
                value={config.tentWidthCm}
                onChange={(e) =>
                  handleConfigChange(
                    "tentWidthCm",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-tent-depth"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Tiefe (cm) *
              </label>
              <input
                id="rcp-tent-depth"
                type="number"
                min={30}
                max={300}
                value={config.tentDepthCm}
                onChange={(e) =>
                  handleConfigChange(
                    "tentDepthCm",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-tent-height"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Höhe (cm) *
              </label>
              <input
                id="rcp-tent-height"
                type="number"
                min={60}
                max={300}
                value={config.tentHeightCm}
                onChange={(e) =>
                  handleConfigChange(
                    "tentHeightCm",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="rcp-plant-count"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Pflanzenanzahl im Zelt:
            </label>
            <input
              id="rcp-plant-count"
              type="number"
              min={1}
              max={12}
              value={config.plantCount || 1}
              onChange={(e) =>
                handleConfigChange(
                  "plantCount",
                  Math.max(1, parseInt(e.target.value, 10) || 1),
                )
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px 12px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Computed Tent Metrics */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <div>
              <span style={{ color: "var(--muted)" }}>Grundfläche:</span>{" "}
              <strong style={{ color: "var(--text)" }}>
                {tentAreaM2.toFixed(2)} m²
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Zeltvolumen:</span>{" "}
              <strong style={{ color: "var(--text)" }}>
                {tentVolumeM3.toFixed(2)} m³
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Pflanzendichte:</span>{" "}
              <strong style={{ color: "var(--green)" }}>
                {plantDensity} Pflanzen/m²
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>KCanG-Limit:</span>{" "}
              <strong
                style={{
                  color: plantCount <= 3 ? "var(--green)" : "var(--amber)",
                }}
              >
                {plantCount <= 3 ? "✓ Konform (≤3)" : "⚠️ >3 Pflanzen"}
              </strong>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 4: Beleuchtung & Photobiologie */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-4-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-4-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              💡 4. Beleuchtung & Photobiologie
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              <TermTooltip term="DLI" lens={lens}>
                DLI
              </TermTooltip>{" "}
              &{" "}
              <TermTooltip term="PPFD" lens={lens}>
                PPFD
              </TermTooltip>
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-led-max-w"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Lampenleistung (W) *
              </label>
              <input
                id="rcp-led-max-w"
                type="number"
                min={10}
                max={2000}
                value={config.ledMaxW}
                onChange={(e) =>
                  handleConfigChange(
                    "ledMaxW",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-light-hours"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Photoperiode (h/Tag) *
              </label>
              <input
                id="rcp-light-hours"
                type="number"
                min={12}
                max={24}
                value={config.lightHours}
                onChange={(e) =>
                  handleConfigChange(
                    "lightHours",
                    parseInt(e.target.value, 10) || 18,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="rcp-dimmer-level"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Aktuelle Dimmer-Stufe ({dimmerPercent}%):
            </label>
            <input
              id="rcp-dimmer-level"
              type="range"
              min={20}
              max={100}
              step={5}
              value={dimmerPercent}
              onChange={(e) => setDimmerPercent(Number(e.target.value))}
              style={{ width: "100%", minHeight: "36px", cursor: "pointer" }}
            />
          </div>

          {/* Computed DLI and Target PPFD */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <div>
              <span style={{ color: "var(--muted)" }}>Geschätzter PPFD:</span>{" "}
              <strong style={{ color: "var(--text)" }}>
                {estimatedPpfd} µmol/m²/s
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Berechneter DLI:</span>{" "}
              <strong style={{ color: "var(--green)" }}>
                {estimatedDli.toFixed(1)} mol/m²/d
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPpfdModalOpen(true)}
            style={{
              width: "100%",
              minHeight: "44px",
              padding: "8px 14px",
              background: "var(--surface-1)",
              color: "var(--green)",
              border: "1px solid var(--green)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            🗺️ 9-Punkt PPFD Mapping erfassen
          </button>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 5: Pflanztopf & Substrat-Hydratation (Dryback Tare) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-5-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-5-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              🪴 5. Pflanztopf & Substrat-Hydratation
            </h3>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: isHydrationCalibrated
                  ? "rgba(103, 214, 174, 0.2)"
                  : "rgba(229, 164, 75, 0.2)",
                color: isHydrationCalibrated ? "var(--green)" : "var(--amber)",
                fontWeight: 700,
              }}
            >
              {isHydrationCalibrated ? "✓ Kalibriert" : "⚠️ Unkalibriert"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-medium"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Medium-Typ *
              </label>
              <select
                id="rcp-medium"
                value={config.medium}
                onChange={(e) => handleConfigChange("medium", e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              >
                <option value="Erde">Erde</option>
                <option value="Coco">Coco</option>
                <option value="Hydro">Hydro</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="rcp-pot-volume"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Topfvolumen (L) *
              </label>
              <input
                id="rcp-pot-volume"
                type="number"
                step="0.5"
                min={0.5}
                max={100}
                value={pot.nominalVolumeLiters}
                onChange={(e) =>
                  handlePotChange(
                    "nominalVolumeLiters",
                    parseFloat(e.target.value) || 0,
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-pot-type"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Topf-Bauart:
              </label>
              <select
                id="rcp-pot-type"
                value={pot.type || "fabric"}
                onChange={(e) =>
                  handlePotChange("type", e.target.value as PotProfile["type"])
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              >
                <option value="fabric">Stofftopf (Gronest/Root Pouch)</option>
                <option value="airpot">Air-Pot (Superoots)</option>
                <option value="plastic">Kunststofftopf (Standard)</option>
                <option value="autopot">AutoPot Modul</option>
                <option value="other">Sonstiger Behälter</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="rcp-medium-product"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Substrat-Produktname:
              </label>
              <input
                id="rcp-medium-product"
                type="text"
                value={config.mediumProduct || ""}
                onChange={(e) =>
                  handleConfigChange("mediumProduct", e.target.value)
                }
                placeholder="z.B. Biobizz Light-Mix"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          {/* Dryback Tare Weights */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--green)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              TARA-KALIBRIERUNG FÜR DRYBACK & GIESSMENGE
            </span>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              <div>
                <label
                  htmlFor="rcp-empty-mass"
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "2px",
                  }}
                >
                  Leergewicht (g):
                </label>
                <input
                  id="rcp-empty-mass"
                  type="number"
                  step="10"
                  value={pot.emptyMassGrams ?? ""}
                  onChange={(e) =>
                    handlePotChange(
                      "emptyMassGrams",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  placeholder="z.B. 1850"
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "8px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--text)",
                    fontSize: "12px",
                  }}
                />
                <small
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    display: "block",
                    marginTop: "2px",
                  }}
                >
                  Topf + trockenes Substrat
                </small>
              </div>

              <div>
                <label
                  htmlFor="rcp-saturated-mass"
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "2px",
                  }}
                >
                  Sättigung (100% FC, g):
                </label>
                <input
                  id="rcp-saturated-mass"
                  type="number"
                  step="10"
                  value={pot.saturatedMassGrams ?? ""}
                  onChange={(e) =>
                    handlePotChange(
                      "saturatedMassGrams",
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  placeholder="z.B. 5200"
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "8px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--text)",
                    fontSize: "12px",
                  }}
                />
                <small
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    display: "block",
                    marginTop: "2px",
                  }}
                >
                  Nach vollständigem Gießen
                </small>
              </div>
            </div>

            <span
              style={{
                fontSize: "11px",
                color: isHydrationCalibrated ? "var(--green)" : "var(--amber)",
              }}
            >
              {isHydrationCalibrated
                ? `✓ Verfügbares Wasser: ${(
                    ((pot.saturatedMassGrams || 0) -
                      (pot.emptyMassGrams || 0)) /
                    1000
                  ).toFixed(2)} L (100% Feldkapazität)`
                : "⚠️ Ohne Taragewichte ist keine automatisierte Berechnung der Topfhydratation möglich."}
            </span>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 6: Abluft, Umluft & Klimasteuerung */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-6-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-6-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              🌀 6. Abluft, Umluft & Klimasteuerung
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Persistiert
            </span>
          </div>

          <div>
            <label
              htmlFor="rcp-exhaust-m3h"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Abluftlüfter-Leistung (m³/h) *
            </label>
            <input
              id="rcp-exhaust-m3h"
              type="number"
              min={50}
              max={2000}
              value={exhaustM3h}
              onChange={(e) =>
                handleExhaustChange(parseInt(e.target.value, 10) || 0)
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px 12px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Computed Turnover Rate & Status Badge */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Luftwechselrate:</span>
              <strong style={{ color: "var(--text)" }}>
                {airTurnoverPerHour.toFixed(0)}x pro Stunde (
                {airTurnoverPerMinute.toFixed(1)}x/min)
              </strong>
            </div>

            <div>
              {isAirflowAdequate ? (
                <span style={{ color: "var(--green)", fontWeight: 700 }}>
                  ✓ Optimaler Luftwechsel (&ge; 1x/min für{" "}
                  {tentVolumeM3.toFixed(2)} m³ Raum)
                </span>
              ) : (
                <span style={{ color: "var(--amber)", fontWeight: 700 }}>
                  ⚠️ Empfohlene Mindestleistung:{" "}
                  {(tentVolumeM3 * 60).toFixed(0)} m³/h (&ge; 1.0 Wechsel/min)
                </span>
              )}
            </div>
          </div>

          {/* Climate Envelopes Preview */}
          <div
            style={{
              background: "var(--surface-1)",
              borderRadius: "4px",
              padding: "10px",
              fontSize: "11px",
              color: "var(--muted)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <strong style={{ color: "var(--text-2)" }}>
              Ziel-Klimamatrix (Soll-Bereiche):
            </strong>
            <div>
              • Sämling (D0–7): 24–26°C · 65–75% rF ·{" "}
              <TermTooltip term="VPD" lens={lens}>
                VPD
              </TermTooltip>{" "}
              0.4–0.8 kPa
            </div>
            <div>
              • Vegetation (D8–28): 24–27°C · 55–65% rF · VPD 0.8–1.1 kPa
            </div>
            <div>• Blüte (D29–80): 22–25°C · 45–55% rF · VPD 1.1–1.4 kPa</div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 7: Wasserchemie & Ausgangswasser */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-7-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-7-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              💧 7. Wasserchemie & Ausgangswasser
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Gate (Inv. 4)
            </span>
          </div>

          {/* City Water Presets Dropdown */}
          <div>
            <label
              htmlFor="rcp-water-preset"
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Stadtwasser-Preset als Referenz:
            </label>
            <select
              id="rcp-water-preset"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleApplyWaterPreset(e.target.value);
              }}
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            >
              <option value="">-- Stadtwasser-Profil auswählen --</option>
              {waterPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Ca: {p.calciumMgL} | Mg: {p.magnesiumMgL} mg/L)
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-water-ec"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Quell-
                <TermTooltip term="EC" lens={lens}>
                  EC
                </TermTooltip>{" "}
                (mS/cm) *
              </label>
              <input
                id="rcp-water-ec"
                type="number"
                step="0.05"
                value={config.water.sourceEc ?? ""}
                onChange={(e) =>
                  handleWaterChange(
                    "sourceEc",
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="z.B. 0.40"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-water-ph"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Quell-
                <TermTooltip term="pH" lens={lens}>
                  pH
                </TermTooltip>{" "}
                *
              </label>
              <input
                id="rcp-water-ph"
                type="number"
                step="0.1"
                value={config.water.sourcePh ?? ""}
                onChange={(e) =>
                  handleWaterChange(
                    "sourcePh",
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="z.B. 7.20"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                htmlFor="rcp-water-ca"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Calcium (Ca, mg/L) *
              </label>
              <input
                id="rcp-water-ca"
                type="number"
                value={config.water.calciumMgL ?? ""}
                onChange={(e) =>
                  handleWaterChange(
                    "calciumMgL",
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="z.B. 60"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="rcp-water-mg"
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                Magnesium (Mg, mg/L) *
              </label>
              <input
                id="rcp-water-mg"
                type="number"
                value={config.water.magnesiumMgL ?? ""}
                onChange={(e) =>
                  handleWaterChange(
                    "magnesiumMgL",
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="z.B. 15"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="rcp-water-alkalinity"
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Alkalinität (mg/L CaCO₃) *
            </label>
            <input
              id="rcp-water-alkalinity"
              type="number"
              min="0"
              step="1"
              value={config.water.alkalinityMgL ?? ""}
              onChange={(e) =>
                handleWaterChange(
                  "alkalinityMgL",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              placeholder="Erst nach Wasseranalyse eintragen"
              aria-describedby="rcp-water-alkalinity-help"
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            />
            <p
              id="rcp-water-alkalinity-help"
              className="microcopy"
              style={{ marginTop: "6px" }}
            >
              Guided-Empfehlung: Analysewert übernehmen; bei unbekanntem Wert
              zuerst messen und keine Dosis ableiten.
            </p>
          </div>

          {/* Ca:Mg Ratio Guidance */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "10px",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              Ca:Mg Verhältnis:{" "}
              <strong style={{ color: "var(--text)" }}>{caMgRatioStr}:1</strong>
            </span>
            <span
              style={{
                color: isCaMgOptimal ? "var(--green)" : "var(--amber)",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              {isCaMgOptimal
                ? "✓ Ideal (3:1 bis 4:1)"
                : "⚠️ CalMag Ausgleich empfohlen"}
            </span>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CARD 8: Nährstofflinie, Bewässerung & KCanG-Konformität */}
        {/* ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="card-8-heading"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              id="card-8-heading"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--green)",
              }}
            >
              🧪 8. Nährstofflinie & KCanG-Konformität
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Legal & Dünger
            </span>
          </div>

          <div>
            <label
              htmlFor="rcp-nutrient-system"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Nährstofflinie / Düngekonzept:
            </label>
            <select
              id="rcp-nutrient-system"
              value={config.nutrientSystem || "UKD HESI Conservative"}
              onChange={(e) =>
                handleConfigChange("nutrientSystem", e.target.value)
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px 12px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            >
              <option value="UKD HESI Conservative">
                UKD HESI Conservative (Referenz)
              </option>
              <option value="BioBizz Indoor Pack">
                BioBizz Organic (Light-Mix/All-Mix)
              </option>
              <option value="Athena Pro Line">
                Athena Pro Line (Clean Mineral)
              </option>
              <option value="Canna Coco A+B">
                Canna Coco A+B (Puffersystem)
              </option>
              <option value="Plagron Terra (Grow/Bloom)">
                Plagron Terra (Mineralisch)
              </option>
              <option value="Plagron Alga (Grow/Bloom)">
                Plagron Alga (Organisch)
              </option>
              <option value="AN pH Perfect Sensi">
                Advanced Nutrients pH Perfect
              </option>
              <option value="T.A. TriPart (Flora Series)">
                Terra Aquatica TriPart
              </option>
              <option value="Green House Feeding Bio">
                Green House Feeding Bio (Powder)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rcp-irrigation-system"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "4px",
              }}
            >
              Bewässerungsmethode:
            </label>
            <select
              id="rcp-irrigation-system"
              value={config.irrigationSystem || "Manuell (Hand)"}
              onChange={(e) =>
                handleConfigChange("irrigationSystem", e.target.value)
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "8px 12px",
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            >
              <option value="Manuell (Hand)">
                Manuell (Handbewässerung mit Drain)
              </option>
              <option value="Tropf-Blumat">
                Tropf-Blumat (Schwerkraft / Tonkegel)
              </option>
              <option value="AutoPot System (AquaValve)">
                AutoPot System (AquaValve Schwerkraft)
              </option>
              <option value="Netafim Drip Emitters">
                Netafim Drip Emitters (Druckkompensiert)
              </option>
              <option value="Ebbe-Flut / Flood">Ebbe-Flut Flutungstisch</option>
            </select>
          </div>

          {/* KCanG Compliance Banner */}
          <div
            style={{
              background:
                plantCount <= 3
                  ? "rgba(103, 214, 174, 0.12)"
                  : "rgba(242, 169, 59, 0.15)",
              border: `1px solid ${plantCount <= 3 ? "var(--green)" : "var(--amber)"}`,
              borderRadius: "4px",
              padding: "10px",
              fontSize: "11px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <strong
              style={{
                color: plantCount <= 3 ? "var(--green)" : "var(--amber)",
              }}
            >
              {plantCount <= 3
                ? `✓ KCanG-Basisprofil (${plantCount} von max. 3 gleichzeitig lebenden Cannabispflanzen)`
                : `⚠️ KCanG-Hinweis: ${plantCount} Pflanzen (Basisprofil: max. 3 gleichzeitig pro volljähriger Person)`}
            </strong>
            <span style={{ color: "var(--text-2)", lineHeight: "1.4" }}>
              Technisches Brutto-Potenzial: {Math.round(ledMaxW * 1.0)}–
              {Math.round(ledMaxW * 1.5)} g. Diese Prognose ist keine
              Besitzfreigabe. Tatsächlicher Bestand, Herkunft und eine
              erforderliche Vernichtung werden als getrennte Rechtsübergänge
              geprüft.
            </span>
          </div>
        </section>
      </div>

      {/* Bottom Readiness Gate & Action Banner */}
      <section
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: readiness.isReady ? "var(--green)" : "var(--amber)",
            }}
          >
            {readiness.isReady
              ? "✓ Konfiguration vollständig — Bereit für Start"
              : `⚠️ Konfiguration unvollständig (Score: ${readiness.score}%)`}
          </span>
          <span
            style={{
              display: "block",
              fontSize: "11px",
              color: "var(--muted)",
              marginTop: "2px",
            }}
          >
            Alle Änderungen werden automatisch im RunPackage gespeichert.
          </span>
        </div>

        {run.status === "draft" && (
          <button
            type="button"
            onClick={handleActivateRun}
            disabled={!readiness.isReady}
            style={{
              minHeight: "44px",
              padding: "10px 24px",
              background: readiness.isReady
                ? "var(--green)"
                : "var(--surface-3)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: readiness.isReady ? "var(--on-green)" : "var(--muted)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: readiness.isReady ? "pointer" : "not-allowed",
            }}
          >
            🚀 Run Jetzt Starten
          </button>
        )}
      </section>

      {/* Modals */}
      {isPlantIdentityModalOpen && activePlantId && (
        <PlantIdentityModal
          run={run}
          lens={lens}
          plantId={activePlantId}
          onClose={() => setIsPlantIdentityModalOpen(false)}
          onSave={(updatedRun) => {
            onUpdateRun(updatedRun);
            setIsPlantIdentityModalOpen(false);
          }}
        />
      )}

      {isAutoflowerModalOpen && (
        <AutoflowerCockpitModal
          lens={lens}
          selectedStrainIds={run.plants
            .slice(0, config.plantCount)
            .map((p) => p.genetics || "")}
          onClose={() => setIsAutoflowerModalOpen(false)}
          onSelectStrain={handleSelectStrain}
        />
      )}

      {isPpfdModalOpen && (
        <PpfdMappingModal
          run={run}
          lens={lens}
          onClose={() => setIsPpfdModalOpen(false)}
          onSave={(updatedRun) => {
            onUpdateRun(updatedRun);
            setIsPpfdModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default RunConfigPanel;
