import { useMemo, useState } from "react";
import type { DayPlan, ExperienceLens, RouteId, RunPackage } from "../../types";
import { getAllTerms, searchTerms } from "../common/termDictionary";
import LensBadge from "../common/LensBadge";

export interface ContextHelpGlossaryPanelProps {
  run?: RunPackage;
  plan?: DayPlan;
  lens?: ExperienceLens;
  onUpdateRun?: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
  initialCategory?: string;
  initialSearchQuery?: string;
}

export function ContextHelpGlossaryPanel({
  lens = "guided",
  initialSearchQuery = "",
}: ContextHelpGlossaryPanelProps) {
  const [query, setQuery] = useState(initialSearchQuery);
  const terms = useMemo(
    () => (query.trim() ? searchTerms(query) : getAllTerms()),
    [query],
  );
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>KNOWLEDGE BASE · SINGLE SOURCE</small>
          <h2>Kontext-Hilfe & Glossar</h2>
          <p>
            Alle Definitionen stammen aus der versionierten Knowledge Base.
            Diese Ansicht enthält keine eigenen Zielwerte oder zweite fachliche
            Wahrheit.
          </p>
        </div>
        <LensBadge lens={lens} />
      </section>
      <section className="panel form-panel">
        <label>
          <span>Fachbegriff suchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="VPD, DLI, EC, pH …"
          />
        </label>
      </section>
      <section className="panel">
        <div className="record-list">
          {terms.map((term) => (
            <article className="record-card" key={term.key}>
              <div>
                <small>
                  {term.category.toUpperCase()} · {term.unit}
                </small>
                <h3>
                  {term.acronym} · {term.germanName}
                </h3>
                <p>
                  {lens === "expert"
                    ? term.expert
                    : lens === "advanced"
                      ? term.advanced
                      : term.beginner}
                </p>
                {lens === "expert" && (
                  <small>
                    Quellen:{" "}
                    {term.sourceIds.join(", ") || "kanonische Definition"}
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ContextHelpGlossaryPanel;
