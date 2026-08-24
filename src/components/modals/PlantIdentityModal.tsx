import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { calculateBiologicalPlantAge } from "../../domain";
import { updatePlantIdentity } from "../../run-state";
import type {
  DayZeroAnchor,
  ExperienceLens,
  GrowthEvent,
  PlantIdentity,
  RunPackage,
} from "../../types";
import TermTooltip from "../common/TermTooltip";

export interface PlantIdentityModalProps {
  run: RunPackage;
  lens: ExperienceLens;
  plantId: string;
  onClose: () => void;
  onSave: (updatedRun: RunPackage) => void;
}

export const DAY_ZERO_ANCHOR_OPTIONS: Array<{
  value: DayZeroAnchor;
  label: string;
}> = [
  { value: "emergence", label: "Keimung / Durchstoß (emergence)" },
  { value: "seed-started", label: "Samen feucht eingelegt (seed-started)" },
  { value: "seed-planted", label: "Samen in Medium (seed-planted)" },
  {
    value: "first-true-leaves",
    label: "Erstes echtes Blattpaar (first-true-leaves)",
  },
  {
    value: "run-operational-start",
    label: "Operativer Run-Start (run-operational-start)",
  },
];

export const PlantIdentityModal: React.FC<PlantIdentityModalProps> = ({
  run,
  lens,
  plantId,
  onClose,
  onSave,
}) => {
  const targetPlant = run.plants.find((p) => p.id === plantId) || run.plants[0];
  const initialIdentity = targetPlant?.identity;

  // Initial values state setup
  const [genetics, setGenetics] = useState<string>(
    targetPlant?.genetics || run.config.genetics || "",
  );
  const [breeder, setBreeder] = useState<string>(
    initialIdentity?.breeder ?? "",
  );
  const [seedType, setSeedType] = useState<PlantIdentity["seedType"]>(
    initialIdentity?.seedType ?? "unknown",
  );
  const [seedLot, setSeedLot] = useState<string>(
    initialIdentity?.seedLot ?? "",
  );
  const [packBatch, setPackBatch] = useState<string>(
    initialIdentity?.packBatch ?? "",
  );
  const [phenotypeNotes, setPhenotypeNotes] = useState<string>(
    initialIdentity?.phenotypeNotes ?? "",
  );
  const [dayZeroAnchor, setDayZeroAnchor] = useState<DayZeroAnchor>(
    run.config.dayZeroAnchor ?? "emergence",
  );

  // Derive initial anchor date from growthEvents or run config startDate or today
  const initialAnchorDate = useMemo(() => {
    const existingAnchor = (run.growthEvents || []).find(
      (e) => e.kind === (run.config.dayZeroAnchor ?? "emergence"),
    );
    if (existingAnchor?.occurredAt) {
      return existingAnchor.occurredAt.slice(0, 10);
    }
    if (run.config.startDate) {
      return run.config.startDate.slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }, [run]);

  const [anchorDate, setAnchorDate] = useState<string>(initialAnchorDate);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Live biological age preview computation
  const agePreview = useMemo(() => {
    const anchorOccurredAt = anchorDate
      ? new Date(`${anchorDate}T00:00:00Z`).toISOString()
      : new Date().toISOString();

    const candidateEvent: GrowthEvent = {
      id: "preview-anchor-event",
      plantId: targetPlant?.id ?? "plant-1",
      kind: dayZeroAnchor,
      occurredAt: anchorOccurredAt,
      day: 0,
      observedBy: "user",
      confidence: "confirmed",
      notes: "Day Zero Anchor Preview",
      photoIds: [],
    };

    const syntheticGrowthEvents = [
      ...(run.growthEvents || []).filter((e) => e.kind !== dayZeroAnchor),
      candidateEvent,
    ];

    return calculateBiologicalPlantAge(
      dayZeroAnchor,
      syntheticGrowthEvents,
      new Date(),
    );
  }, [dayZeroAnchor, anchorDate, run.growthEvents, targetPlant?.id]);

  const ageDelta = agePreview.biologicalAgeDays - agePreview.operationalAgeDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedIdentity: PlantIdentity = {
      breeder: breeder.trim() ? breeder.trim() : null,
      seedType,
      seedLot: seedLot.trim() ? seedLot.trim() : null,
      packBatch: packBatch.trim() ? packBatch.trim() : null,
      sourceDate: initialIdentity?.sourceDate ?? null,
      phenotypeNotes: phenotypeNotes.trim(),
    };

    const updatedRun = updatePlantIdentity(
      run,
      targetPlant?.id ?? "plant-1",
      genetics.trim() || "Unbenannt",
      updatedIdentity,
      dayZeroAnchor,
      anchorDate,
    );

    onSave(updatedRun);
  };

  return (
    <div
      className="palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plant-identity-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 100 }}
    >
      <div
        className="command-palette"
        style={{
          width: "min(640px, calc(100vw - 24px))",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          background: "var(--surface-0)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            id="plant-identity-modal-title"
            style={{ margin: 0, fontSize: "18px", color: "var(--text)" }}
          >
            🌿 Pflanzen-Identität & Day Zero Anker Bearbeiten (
            {targetPlant?.label || "Unbenannt"})
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              minHeight: "44px",
              minWidth: "44px",
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Grid Form Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {/* Genetics / Strain */}
            <div style={{ gridColumn: "span 2" }}>
              <label
                htmlFor="pi-genetics"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Genetik / Strain Name *
              </label>
              <input
                id="pi-genetics"
                type="text"
                value={genetics}
                onChange={(e) => setGenetics(e.target.value)}
                placeholder="z.B. Double Grape Auto"
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Breeder */}
            <div>
              <label
                htmlFor="pi-breeder"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Züchter / Breeder{" "}
                <TermTooltip
                  term="Breeder"
                  customText="Hersteller oder Zuchtbank der Genetik (z.B. Mephisto Genetics, Dutch Passion)."
                  lens={lens}
                />
              </label>
              <input
                id="pi-breeder"
                type="text"
                value={breeder}
                onChange={(e) => setBreeder(e.target.value)}
                placeholder="z.B. Mephisto Genetics"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Seed Type */}
            <div>
              <label
                htmlFor="pi-seedtype"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Saatgut-Typ
              </label>
              <select
                id="pi-seedtype"
                value={seedType}
                onChange={(e) =>
                  setSeedType(e.target.value as PlantIdentity["seedType"])
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              >
                <option value="feminized">Feminisiert</option>
                <option value="autoflower">Autoflower</option>
                <option value="regular">Regulär</option>
                <option value="clone">Steckling / Klonschnitt</option>
                <option value="unknown">Unbekannt</option>
              </select>
            </div>

            {/* Seed Lot */}
            <div>
              <label
                htmlFor="pi-seedlot"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Saatgut-Lot ID{" "}
                <TermTooltip
                  term="Saatgut-Lot"
                  customText="Chargennummer der Samenverpackung zur lückenlosen Nachverfolgbarkeit (Data Lineage)."
                  lens={lens}
                />
              </label>
              <input
                id="pi-seedlot"
                type="text"
                value={seedLot}
                onChange={(e) => setSeedLot(e.target.value)}
                placeholder="z.B. LOT-2026-MG-88"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Pack Batch */}
            <div>
              <label
                htmlFor="pi-packbatch"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Pack / Batch ID
              </label>
              <input
                id="pi-packbatch"
                type="text"
                value={packBatch}
                onChange={(e) => setPackBatch(e.target.value)}
                placeholder="z.B. BATCH-04-A"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Day Zero Anchor Dropdown */}
            <div>
              <label
                htmlFor="pi-dayzeroanchor"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Day Zero Anker{" "}
                <TermTooltip
                  term="Day Zero Anchor"
                  customText="Definiert den biologischen Nullpunkt (z.B. Keimung vs. Aussaat) für exakte Entwicklungsberechnungen."
                  lens={lens}
                />
              </label>
              <select
                id="pi-dayzeroanchor"
                value={dayZeroAnchor}
                onChange={(e) =>
                  setDayZeroAnchor(e.target.value as DayZeroAnchor)
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              >
                {DAY_ZERO_ANCHOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Anchor Date */}
            <div>
              <label
                htmlFor="pi-anchordate"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Anker-Datum (YYYY-MM-DD)
              </label>
              <input
                id="pi-anchordate"
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Phenotype Notes */}
            <div style={{ gridColumn: "span 2" }}>
              <label
                htmlFor="pi-phenotypenotes"
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "4px",
                }}
              >
                Phänotyp-Notizen & Besonderheiten{" "}
                <TermTooltip
                  term="Phänotyp"
                  customText="Erscheinungsbild und spezifische Merkmale der Pflanze (z.B. Wuchshöhe, Blattform, Aroma)."
                  lens={lens}
                />
              </label>
              <textarea
                id="pi-phenotypenotes"
                value={phenotypeNotes}
                onChange={(e) => setPhenotypeNotes(e.target.value)}
                placeholder="Besondere Eigenschaften, Blattstruktur, Internodienabstände..."
                rows={3}
                style={{
                  width: "100%",
                  minHeight: "88px",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Live Math Preview Card */}
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--green)",
                fontWeight: 800,
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px",
                letterSpacing: "0.05em",
              }}
            >
              LIVE-BERECHNUNG PFLANZENALTER
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                textAlign: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Biologisches Alter
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "18px",
                    color: "var(--green)",
                  }}
                >
                  {agePreview.biologicalAgeDays} Tage
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Operatives Alter
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "18px",
                    color: "var(--text)",
                  }}
                >
                  {agePreview.operationalAgeDays} Tage
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Alter-Delta
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "18px",
                    color:
                      ageDelta > 0
                        ? "var(--green)"
                        : ageDelta < 0
                          ? "var(--amber)"
                          : "var(--text-2)",
                  }}
                >
                  {ageDelta > 0 ? `+${ageDelta}` : ageDelta} Tage
                </strong>
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginTop: "10px",
                textAlign: "center",
              }}
            >
              Anker: <strong>{dayZeroAnchor}</strong> am{" "}
              <strong>{anchorDate || "—"}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                minHeight: "44px",
                padding: "0 18px",
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-2)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              style={{
                minHeight: "44px",
                padding: "0 22px",
                background: "var(--green)",
                color: "var(--on-green)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Identität & Anker Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlantIdentityModal;
