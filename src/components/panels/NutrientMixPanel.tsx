import type React from "react";
import { useState } from "react";
import {
  calculateMix,
  DAILY_COLUMNS,
  numberAt,
  resolvePlantBatches,
} from "../../domain";
import { applyRunCommand } from "../../run-commands";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import LensBadge from "../common/LensBadge";
import MetricGauge from "../common/MetricGauge";
import TermTooltip from "../common/TermTooltip";

export interface NutrientMixPanelProps {
  run: RunPackage;
  plan?: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
}

export interface DisplayMixItem {
  name: string;
  dose: number;
  amount: number;
  role: string;
  warning?: string;
  statusText?: string;
  isBlocked?: boolean;
}

export function applyMixSafetyRules(
  items: Array<{
    name: string;
    dose: number;
    amount: number;
    role: string;
    warning?: string;
  }>,
  isWaterProfileIncomplete: boolean,
  stackingBoosterConflict: boolean,
  feedGateBlocked = false,
): DisplayMixItem[] {
  return items.map((item) => {
    const normalizedName = item.name.toLowerCase();
    const requiresMeasuredWaterChemistry =
      normalizedName.includes("athena balance") ||
      normalizedName.includes("calmag") ||
      normalizedName.includes("cal mag") ||
      normalizedName.includes("ph down");
    const isPkItem =
      item.name === "PK13/14" ||
      item.name === "PK 13/14" ||
      item.name.includes("PK13/14");
    const isNutrientItem =
      item.dose > 0 &&
      !normalizedName.includes("ph down") &&
      !normalizedName.includes("athena balance");

    if (feedGateBlocked && isNutrientItem) {
      return {
        ...item,
        dose: 0,
        amount: 0,
        statusText: "⛔ Gesperrt: Pflanzen-/Batch-Zustand unvollständig",
        isBlocked: true,
      };
    }

    if (isWaterProfileIncomplete && requiresMeasuredWaterChemistry) {
      return {
        ...item,
        dose: 0.0,
        amount: 0.0,
        statusText: "⛔ Gesperrt: Wasserchemie fehlt",
        isBlocked: true,
      };
    }

    if (stackingBoosterConflict && isPkItem) {
      return {
        ...item,
        dose: 0.0,
        amount: 0.0,
        statusText: "⛔ GESPERRT: Stacking-Konflikt",
        isBlocked: true,
      };
    }

    return item;
  });
}

export const NutrientMixPanel: React.FC<NutrientMixPanelProps> = ({
  run,
  plan,
  lens,
  onUpdateRun,
  navigate,
}) => {
  const currentDay = plan?.day ?? 0;
  const water = run.config.water;

  // Local interactive state
  const [batchLiters, setBatchLiters] = useState<number>(10);
  const [stackingBoosterConflict, setStackingBoosterConflict] =
    useState<boolean>(false);
  const [measuredEc, setMeasuredEc] = useState<number | undefined>(undefined);
  const [measuredPh, setMeasuredPh] = useState<number | undefined>(undefined);
  const [batchLabel, setBatchLabel] = useState<string>(
    `Batch Tag ${currentDay}`,
  );
  const [deviationNotes, setDeviationNotes] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [actualDoses, setActualDoses] = useState<Record<string, string>>({});
  const [waterTempC, setWaterTempC] = useState<string>("");
  const [finalVolumeLiters, setFinalVolumeLiters] = useState<string>("");

  // Check fail-closed water profile missing alert
  const isWaterProfileIncomplete =
    water.sourcePh === null ||
    water.sourceEc === null ||
    water.calciumMgL === null ||
    water.magnesiumMgL === null ||
    water.alkalinityMgL === null;
  const plantBatchStates = resolvePlantBatches(
    run.plants,
    run.growthEvents,
    run.config.dayZeroAnchor ?? "emergence",
  );
  const feedGateBlocked =
    plantBatchStates.length === 0 ||
    plantBatchStates.some((plant) => !plant.feedEligible) ||
    (run.plants.length > 1 &&
      plantBatchStates.some((plant) => plant.assignedBatch === "bloom_split"));

  // Calculate dosages via domain helper if plan present, or fallback defaults
  const rawMixItems = plan
    ? calculateMix(plan, batchLiters)
    : [
        {
          name: "Athena Balance",
          dose: 0,
          amount: 0,
          role: "Wasser zuerst",
          warning: "Nur nach Wasserchemie titrieren",
        },
        {
          name: run.config.nutrientSystem || "HESI TNT / Blüh Complex",
          dose: 0,
          amount: 0,
          role: "Basis",
        },
        {
          name: "CalMag",
          dose: 0,
          amount: 0,
          role: "Nur nach Bedarf",
        },
        {
          name: "Wurzel Complex",
          dose: 0,
          amount: 0,
          role: "Definierte Frühgabe",
        },
        {
          name: "PowerZyme",
          dose: 0,
          amount: 0,
          role: "Support",
          warning: "Nicht zusätzlich Sensizym im Referenzplan",
        },
        {
          name: "SuperVit",
          dose: 0,
          amount: 0,
          role: "Mikrodosis",
        },
        {
          name: "HESI Boost",
          dose: 0,
          amount: 0,
          role: "Blüte-Support",
        },
        {
          name: "PK13/14",
          dose: 0,
          amount: 0,
          role: "PK-Modul",
          warning: "Nicht mit Big Bud/Overdrive stapeln",
        },
        {
          name: "pH Down",
          dose: 0,
          amount: 0,
          role: "Ganz zum Schluss",
          warning: "Nur nach finaler Endmix-Messung",
        },
      ];

  const mixItems = applyMixSafetyRules(
    rawMixItems,
    isWaterProfileIncomplete,
    stackingBoosterConflict,
    feedGateBlocked,
  );

  // Targets from plan
  const targetEc = plan ? numberAt(plan, DAILY_COLUMNS.ec) : 1.4;
  const targetPh = plan ? numberAt(plan, DAILY_COLUMNS.ph) : 6.2;
  const actualDoseFor = (item: DisplayMixItem): number =>
    item.isBlocked ? 0 : Number(actualDoses[item.name]);
  const actualsComplete = mixItems.every((item) => {
    if (item.isBlocked || item.dose === 0) return true;
    const actual = actualDoses[item.name];
    return (
      actual !== undefined &&
      actual.trim() !== "" &&
      Number.isFinite(Number(actual)) &&
      Number(actual) >= 0
    );
  });
  const parsedFinalVolume = Number(finalVolumeLiters);
  const canRecordBatch =
    !feedGateBlocked &&
    actualsComplete &&
    finalVolumeLiters.trim() !== "" &&
    Number.isFinite(parsedFinalVolume) &&
    parsedFinalVolume > 0;

  const handleRecordBatch = () => {
    if (!canRecordBatch) return;
    const batch = {
      id: crypto.randomUUID(),
      day: currentDay,
      createdAt: new Date().toISOString(),
      waterSourceEc: water.sourceEc,
      waterSourcePh: water.sourcePh,
      waterTempC:
        waterTempC.trim() === "" || !Number.isFinite(Number(waterTempC))
          ? null
          : Number(waterTempC),
      waterVolumeLiters: batchLiters,
      components: mixItems.map((item, idx) => ({
        productName: item.name,
        productId: null,
        plannedDoseMlPerL: item.dose,
        actualDoseMlPerL: actualDoseFor(item),
        actualTotalMl: actualDoseFor(item) * batchLiters,
        mixOrder: idx + 1,
      })),
      finalEc: measuredEc ?? null,
      finalPh: measuredPh ?? null,
      finalVolumeLiters: parsedFinalVolume,
      plannedDay: plan?.day ?? null,
      deviationNotes: deviationNotes.trim(),
      reservoirId: null,
      batchLabel: batchLabel.trim() || `Batch Tag ${currentDay}`,
    };
    const result = applyRunCommand(run, { kind: "mix-batch.create", batch });
    if (!result.ok) {
      setSaveStatus(result.errors.map((entry) => entry.message).join(" "));
      return;
    }
    onUpdateRun(result.value);
    setSaveStatus(
      `Mischcharge "${batch.batchLabel}" erfolgreich protokolliert!`,
    );
    setActualDoses({});
    setWaterTempC("");
    setFinalVolumeLiters("");
    setTimeout(() => setSaveStatus(null), 4000);
  };

  return (
    <div
      className="panel-container nutrient-mix-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
        background: "var(--surface-1)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}
    >
      {feedGateBlocked && (
        <div role="alert" className="field-message error">
          <strong>Pflanzen-/Batch-Freigabe fehlt.</strong> Der globale
          Kalenderbatch ist gesperrt, bis jede Zielpflanze Emergence,
          Nährstoffaufnahme und Root-Zone bestätigt hat. Bei abweichender
          FlowerInitiation muss je Pflanze bzw. kompatibler Teilgruppe gemischt
          werden.
        </div>
      )}
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "12px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            🧪 Nährstoff-Mix & Rezept-Berechnung
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            7-Schritt-Mischprotokoll für Präzisionsdosierung & Sicherheits-Gates
            (Tag {currentDay})
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LensBadge lens={lens} />
          {navigate && (
            <button
              type="button"
              onClick={() => navigate("nutrients")}
              style={{
                padding: "8px 14px",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              📋 Nährstoff-Details
            </button>
          )}
        </div>
      </div>

      {/* Fail-Closed Water Profile Warning Alert */}
      {isWaterProfileIncomplete && (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            background: "var(--red-dim)",
            border: "2px solid var(--red)",
            borderRadius: "var(--radius-sm)",
            color: "var(--red)",
            fontSize: "13px",
            lineHeight: "1.5",
            fontWeight: 600,
          }}
        >
          <strong
            style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}
          >
            ⛔ FEHLENDES WASSERPROFIL (Fail-Closed Gate)
          </strong>
          FEHLENDES WASSERPROFIL: Conditioner, CalMag und pH-Korrektur bleiben
          gesperrt. Die kanonischen Basiswerte bleiben als Plan sichtbar, sind
          aber erst nach Endmix-Messung operativ zu bestätigen.
          {navigate && (
            <button
              type="button"
              onClick={() => navigate("setup")}
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "8px 14px",
                background: "var(--text)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ⚙️ Zur Run-Konfiguration (Wasseranalyse eingeben)
            </button>
          )}
        </div>
      )}

      {/* 7-Step Interactive Batch Workflow */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Step 1: Water & Volume */}
        <div
          style={{
            padding: "14px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "14px",
              color: "var(--green)",
            }}
          >
            Schritt 1: Wasser & Anmischvolumen
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>
                Batch-Volumen (Liter):
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={batchLiters}
                onChange={(e) =>
                  setBatchLiters(Math.max(1, parseFloat(e.target.value) || 1))
                }
                aria-label="Mischvolumen in Litern"
                style={{
                  width: "80px",
                  padding: "6px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              Quell-EC:{" "}
              <strong>
                {water.sourceEc !== null
                  ? `${water.sourceEc} mS/cm`
                  : "Nicht erfasst"}
              </strong>{" "}
              | Quell-pH:{" "}
              <strong>
                {water.sourcePh !== null ? water.sourcePh : "Nicht erfasst"}
              </strong>{" "}
              | Ca:Mg:{" "}
              <strong>
                {water.calciumMgL !== null
                  ? `${water.calciumMgL}:${water.magnesiumMgL ?? 0}`
                  : "Keine Labordaten"}
              </strong>
            </div>
          </div>
        </div>

        {/* Step 2: Base Nutrients */}
        <div
          style={{
            padding: "14px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
              Schritt 2: Basisdünger ({run.config.nutrientSystem || "HESI"})
            </h3>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--green-dim)",
                color: "var(--green)",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              AKTIV
            </span>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginBottom: "8px",
            }}
          >
            Dosierung wird automatisch skaliert auf {batchLiters} Liter
            Ansatzwasser.
          </div>
        </div>

        {/* Step 3: Micro Nutrients & Root Complex */}
        <div
          style={{
            padding: "14px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
              Schritt 3: Mikronährstoffe & Wurzel-Complex
            </h3>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--green-dim)",
                color: "var(--green)",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              AKTIV
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Wurzel Complex & SuperVit Mikrodosierung nach Tagesplan.
          </div>
        </div>

        {/* Step 4: Additives & Safety Rule Gate */}
        <div
          style={{
            padding: "14px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
              Schritt 4: Additive (Enzyme, Boost & PK 13/14)
            </h3>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                background: stackingBoosterConflict
                  ? "var(--red-dim)"
                  : "var(--blue-dim)",
                color: stackingBoosterConflict ? "var(--red)" : "var(--blue)",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              {stackingBoosterConflict ? "GESPERRT" : "BEDINGT"}
            </span>
          </div>

          {/* Stacking Rule Enforcement Toggle */}
          <div
            style={{
              marginTop: "8px",
              padding: "10px",
              background: "var(--surface-1)",
              borderRadius: "4px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--text)",
              }}
            >
              <input
                type="checkbox"
                checked={stackingBoosterConflict}
                onChange={(e) => setStackingBoosterConflict(e.target.checked)}
                style={{ accentColor: "var(--red)" }}
              />
              <span>
                Zusätzlicher PK-Booster (z.B. Big Bud / Overdrive) wird
                verwendet
              </span>
            </label>

            {stackingBoosterConflict && (
              <div
                role="alert"
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "var(--red-dim)",
                  border: "1px solid var(--red)",
                  borderRadius: "4px",
                  color: "var(--red)",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                ⚠️ HESI PK 13/14 darf nicht additiv mit weiteren PK-Boostern
                gestapelt werden! (Invariant 6 Violation Avoided)
              </div>
            )}
          </div>
        </div>

        {/* Step 5: pH Correction & Athena Balance */}
        <div
          style={{
            padding: "14px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--green)" }}>
              Schritt 5: pH-Korrektur & Athena Balance
            </h3>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--amber-dim)",
                color: "var(--amber)",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              BEDINGT
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            ⚠️ <strong>Wichtiger Sicherheitshinweis:</strong> Ganz zum Schluss:
            pH Down erst nach finaler Durchmischung und Messung zugeben!
          </div>
        </div>

        {/* Calculated Recipe Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--surface-2)",
                  color: "var(--muted)",
                }}
              >
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Komponente
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Rolle
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Soll-Dosis (ml/L)
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Gesamtmenge ({batchLiters}L)
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Ist-Dosis (ml/L)
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  Status & Hinweis
                </th>
              </tr>
            </thead>
            <tbody>
              {mixItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {item.name}
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--muted)" }}>
                    {item.role}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {item.dose.toFixed(2)} ml/L
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: item.isBlocked ? "var(--muted)" : "var(--green)",
                    }}
                  >
                    {item.amount.toFixed(1)} ml
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {item.isBlocked || item.dose === 0 ? (
                      <span style={{ color: "var(--muted)" }}>
                        0,00 · gesperrt/nicht geplant
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={actualDoses[item.name] ?? ""}
                        onChange={(event) =>
                          setActualDoses((current) => ({
                            ...current,
                            [item.name]: event.target.value,
                          }))
                        }
                        aria-label={`Tatsächliche Dosis ${item.name} in Milliliter pro Liter`}
                        required
                        style={{
                          width: "92px",
                          minHeight: "44px",
                          padding: "6px",
                          background: "var(--surface-1)",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          color: "var(--text)",
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: "11px" }}>
                    {item.statusText ? (
                      <span style={{ color: "var(--red)", fontWeight: 700 }}>
                        {item.statusText}
                      </span>
                    ) : item.warning ? (
                      <span style={{ color: "var(--amber)" }}>
                        ⚠️ {item.warning}
                      </span>
                    ) : (
                      <span style={{ color: "var(--green)" }}>
                        ✓ Freigegeben
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Step 6: Target vs Measured Control */}
        <div
          style={{
            padding: "16px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Schritt 6: Soll- vs. Ist-Kontrolle (
            <TermTooltip term="EC" lens={lens} /> &{" "}
            <TermTooltip term="pH" lens={lens} />)
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {/* EC Gauge & Input */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label style={{ fontSize: "13px", fontWeight: 600 }}>
                  Gemessener End-EC (mS/cm):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="4.0"
                  placeholder={`Soll: ${targetEc}`}
                  value={measuredEc ?? ""}
                  onChange={(e) =>
                    setMeasuredEc(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  aria-label="Gemessener EC in mS/cm"
                  style={{
                    width: "100px",
                    minHeight: "44px",
                    padding: "8px 10px",
                    background: "var(--surface-1)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                />
              </div>
              <MetricGauge
                value={measuredEc ?? null}
                min={0.5}
                max={2.5}
                unit="mS/cm"
                optimalMin={Math.max(0.5, targetEc - 0.15)}
                optimalMax={targetEc + 0.15}
                warnMin={Math.max(0.5, targetEc - 0.3)}
                warnMax={targetEc + 0.3}
                label="EC Endmix"
                lens={lens}
              />
            </div>

            {/* pH Gauge & Input */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label style={{ fontSize: "13px", fontWeight: 600 }}>
                  Gemessener End-pH:
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="4.0"
                  max="8.0"
                  placeholder={`Soll: ${targetPh}`}
                  value={measuredPh ?? ""}
                  onChange={(e) =>
                    setMeasuredPh(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  aria-label="Gemessener pH Wert"
                  style={{
                    width: "100px",
                    minHeight: "44px",
                    padding: "8px 10px",
                    background: "var(--surface-1)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                />
              </div>
              <MetricGauge
                value={measuredPh ?? null}
                min={5.0}
                max={7.0}
                unit="pH"
                optimalMin={Math.max(5.0, targetPh - 0.2)}
                optimalMax={Math.min(7.0, targetPh + 0.2)}
                warnMin={Math.max(5.0, targetPh - 0.4)}
                warnMax={Math.min(7.0, targetPh + 0.4)}
                label="pH Endmix"
                lens={lens}
              />
            </div>
          </div>
        </div>

        {/* Step 7: Record Batch & Audit Log */}
        <div
          style={{
            padding: "16px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Schritt 7: Charge Protokollieren & Speichern
          </h3>
          <div
            className="mix-record-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label
                htmlFor="mix-water-temperature"
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Gemessene Wassertemperatur (°C, optional):
              </label>
              <input
                id="mix-water-temperature"
                type="number"
                step="0.1"
                value={waterTempC}
                onChange={(event) => setWaterTempC(event.target.value)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="mix-final-volume"
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Tatsächliches Endvolumen (L) *:
              </label>
              <input
                id="mix-final-volume"
                type="number"
                min="0.01"
                step="0.01"
                value={finalVolumeLiters}
                onChange={(event) => setFinalVolumeLiters(event.target.value)}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="mix-batch-label"
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Chargen-Bezeichnung:
              </label>
              <input
                id="mix-batch-label"
                type="text"
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
                placeholder={`Batch Tag ${currentDay}`}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="mix-deviation-notes"
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Abweichungen / Bemerkungen:
              </label>
              <input
                id="mix-deviation-notes"
                type="text"
                value={deviationNotes}
                onChange={(e) => setDeviationNotes(e.target.value)}
                placeholder="z.B. Temp 20°C, 2 Tropfen pH- verwendet"
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecordBatch}
            disabled={!canRecordBatch}
            style={{
              padding: "10px 16px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--green)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--on-green)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            📝 Ist-Charge aufzeichnen
          </button>
          {!canRecordBatch && (
            <p
              role="status"
              style={{ margin: 0, color: "var(--amber)", fontSize: "12px" }}
            >
              {feedGateBlocked
                ? "Zuerst Pflanzen-/Root-Zone-Ereignisse vervollständigen oder getrennte Zielbatches auflösen."
                : "Vor dem Speichern alle geplanten Ist-Dosen und das tatsächliche Endvolumen erfassen. Leere Felder werden nicht als Planwert oder Nullmessung interpretiert."}
            </p>
          )}

          {saveStatus && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--green-dim)",
                border: "1px solid var(--green)",
                borderRadius: "var(--radius-sm)",
                color: "var(--green)",
                fontSize: "12px",
              }}
            >
              {saveStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutrientMixPanel;
