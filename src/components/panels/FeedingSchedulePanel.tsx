import type { ExperienceLens, WorkbookSheet } from "../../types";

interface FeedingSchedulePanelProps {
  sheet: WorkbookSheet;
  lens: ExperienceLens;
}

function displayCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function FeedingSchedulePanel({
  sheet,
  lens,
}: FeedingSchedulePanelProps) {
  const headerIndex = sheet.values.findIndex(
    (row) => String(row[0] ?? "").trim() === "Role / Product",
  );
  const header = headerIndex >= 0 ? (sheet.values[headerIndex] ?? []) : [];
  const dataRows = sheet.values
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell !== null && cell !== ""));
  const appendixIndex = dataRows.findIndex(
    (row) => String(row[0] ?? "").trim() === "HOW TO READ THE MAP",
  );
  const scheduleRows =
    appendixIndex >= 0 ? dataRows.slice(0, appendixIndex) : dataRows;
  const rows =
    lens === "guided"
      ? scheduleRows.filter(
          (row) => !String(row[1] ?? "").match(/OFF|EXPERIMENT|ALTERNATIVE/i),
        )
      : scheduleRows;

  return (
    <section
      className="panel-container feeding-schedule"
      aria-labelledby="feeding-title"
    >
      <header className="panel-header">
        <p className="eyebrow">KANONISCHES BLATT 31_FEED_SCHEMA</p>
        <h2 id="feeding-title">Autoflower Feed Map · v11.5</h2>
        <p>
          Herstellerfenster, UKD-Arbeitswerte und operative Freigabe bleiben
          getrennt. Wochenspalten sind Vorschau, nicht Gießauftrag.
        </p>
      </header>
      <aside className="evidence-legend" aria-label="Interpretationslegende">
        <span>
          <b>MANUFACTURER</b> Label/Fenster des Herstellers
        </span>
        <span>
          <b>UKD ADAPTATION</b> konservative, nicht als Optimum validierte
          Anpassung
        </span>
        <span>
          <b>EVENT-GATED</b> nur nach Pflanzenzustand und realem Gießbedarf
        </span>
      </aside>
      <div
        className="data-table-wrap feeding-table-wrap"
        role="region"
        aria-label="Fütterungsplan, horizontal scrollbar"
      >
        <table className="feeding-table">
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th key={`${index}-${displayCell(cell)}`}>
                  {displayCell(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${displayCell(row[0])}`}>
                {header.map((_, columnIndex) => (
                  <td key={columnIndex}>{displayCell(row[columnIndex])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-message warning">
        Guided blendet reine A/B-/Off-Pfade aus, verändert aber keine Werte. „2
        ml/L in G1–G2“ bedeutet: bei einem tatsächlich nötigen Feed-Ereignis in
        diesem Herstellerfenster — nicht zusätzlich gießen und nicht automatisch
        täglich anwenden.
      </p>
    </section>
  );
}
