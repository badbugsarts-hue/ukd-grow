import { useMemo } from "react";
import { resolvePlantBatches } from "../../domain";
import type { RouteId, RunPackage } from "../../types";
import { BeakerIcon, SproutIcon } from "../common/Icons";

interface BatchResolverDashboardProps {
  run: RunPackage;
  navigate?: (route: RouteId) => void;
}

const BATCH_LABELS = {
  blocked: "Gesperrt · zuerst Zustand vervollständigen",
  common: "Gemeinsamer TNT-/Basis-Batch möglich",
  bloom_split: "Pflanzenspezifischer Blüte-Batch erforderlich",
  water_only: "Keine Nährstofffreigabe · Pflanze abgeschlossen",
} as const;

export function BatchResolverDashboard({
  run,
  navigate,
}: BatchResolverDashboardProps) {
  const plants = useMemo(
    () =>
      resolvePlantBatches(
        run.plants,
        run.growthEvents,
        run.config.dayZeroAnchor ?? "emergence",
        new Date(),
      ),
    [run],
  );
  const needsSplit = plants.some(
    (plant) => plant.assignedBatch === "bloom_split",
  );
  const hasBlocked = plants.some((plant) => !plant.feedEligible);

  return (
    <section
      className="panel batch-resolver-dashboard"
      aria-labelledby="batch-resolver-title"
    >
      <header className="panel-header batch-resolver-header">
        <div>
          <p className="eyebrow">PFLANZENBEZOGENER SAFETY-RESOLVER</p>
          <h2 id="batch-resolver-title">Mixed-Run · Batch-Freigabe</h2>
          <p>
            Kalenderwerte sind nur Planung. Bestätigte Pflanzen- und
            Wurzelzonen-Ereignisse entscheiden über TNT/Coco, pH-Arbeitswert und
            Batch-Splitting.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate?.("setup")}
        >
          Setup und Ereignisse prüfen
        </button>
      </header>

      <div
        className={`resolver-summary ${hasBlocked ? "is-blocked" : needsSplit ? "needs-split" : "is-ready"}`}
        role="status"
      >
        <strong>
          {hasBlocked
            ? "Noch nicht mischbereit"
            : needsSplit
              ? "Getrennte Batches erforderlich"
              : "Gemeinsamer Batch grundsätzlich möglich"}
        </strong>
        <span>
          {hasBlocked
            ? "Mindestens eine Pflanze hat fehlende Pflicht-Ereignisse. UKD gibt dafür keine Dosis frei."
            : needsSplit
              ? "FlowerInitiation oder Root-Zone unterscheidet sich. Konzentration und Volumen je Pflanze auflösen."
              : "Vor Anwendung bleiben realer Gießbedarf, Endmix-EC/pH und Messgeräte-Status Pflicht-Gates."}
        </span>
      </div>

      <div className="resolver-grid">
        {plants.map((plant) => (
          <article key={plant.plantId} className="resolver-plant-card">
            <header>
              <SproutIcon size={20} />
              <div>
                <h3>{plant.label}</h3>
                <p>{plant.genetics}</p>
              </div>
              <span
                className={`status-chip ${plant.feedEligible ? "ok" : "blocked"}`}
              >
                {plant.feedEligible ? "EVENT-GATED" : "BLOCKIERT"}
              </span>
            </header>
            <dl className="resolver-facts">
              <div>
                <dt>Biologischer Tag</dt>
                <dd>{plant.biologicalAgeDays}</dd>
              </div>
              <div>
                <dt>Zustand</dt>
                <dd>{plant.stage}</dd>
              </div>
              <div>
                <dt>Root-Zone</dt>
                <dd>{plant.rootStage}</dd>
              </div>
              <div>
                <dt>pH-Arbeitswert</dt>
                <dd>{plant.workingPh.toFixed(2)}</dd>
              </div>
            </dl>
            <div className="resolver-batch-line">
              <BeakerIcon size={22} />
              <strong>{BATCH_LABELS[plant.assignedBatch]}</strong>
            </div>
            {plant.blockers.length > 0 ? (
              <ul className="resolver-blockers">
                {plant.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      <p className="field-message info">
        Ein positiver Wochen-/Tageswert ist Eligibility, keine automatische
        Anwendung. Ohne realen Gießbedarf wird nichts gemischt; ohne bestätigte
        FlowerInitiation wird nicht kalenderbasiert auf Coco/PK umgeschaltet.
      </p>
    </section>
  );
}
