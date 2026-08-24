import type { RunAlert } from "./types";

export function AlertCenter({
  alerts,
  acknowledgedIds,
  onAcknowledge,
  compact = false,
}: {
  alerts: RunAlert[];
  acknowledgedIds: string[];
  onAcknowledge: (id: string) => void;
  compact?: boolean;
}) {
  const open = alerts.filter((alert) => !acknowledgedIds.includes(alert.id));
  return (
    <section
      className={`alert-center ${compact ? "compact" : ""}`}
      aria-live="polite"
    >
      <header>
        <div>
          <small>PERSISTENTE SAFETY-GATES</small>
          <h2>
            {open.length === 0
              ? "Keine offenen Alerts"
              : `${open.length} offene Alerts`}
          </h2>
        </div>
      </header>
      {open.length === 0 ? (
        <p className="alert-clear">
          ✓ Alle aktuell abgeleiteten Alerts wurden geprüft.
        </p>
      ) : (
        <div className="alert-list">
          {open.map((alert) => (
            <article key={alert.id} className={alert.severity}>
              <span>{alert.severity === "critical" ? "!" : "i"}</span>
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
                <small>{alert.action}</small>
              </div>
              <button type="button" onClick={() => onAcknowledge(alert.id)}>
                Geprüft
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
