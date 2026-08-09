import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCenter } from "./AlertCenter";
import { DAILY_COLUMNS, type DayPlan, numberAt } from "./domain";
import {
  activateRun,
  addInventoryEvent,
  addObservation,
  addRunEvent,
  addRunOverride,
  addStructuredObservation,
  createDefaultRunPackage,
  createObservation,
  deriveRunAlerts,
  effectiveRunConfig,
  inventoryBalance,
  runToCsv,
  supersedeMeasurement,
  updateRunConfig,
  validateRunPackage,
} from "./run-state";
import { indexedDbRunRepository } from "./run-storage";
import type {
  InventoryEvent,
  LegalBasis,
  LegalProfile,
  ObservationValues,
  RunConfig,
  RunEvent,
  RunOverride,
  RunPackage,
  StructuredObservation,
} from "./types";

interface RunProps {
  run: RunPackage;
  onChange: (run: RunPackage) => void;
}

export function RunSetupWorkspace({ run, onChange }: RunProps) {
  const [draft, setDraft] = useState<RunConfig>(run.config);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(run.config), [run.config]);
  const setField = <K extends keyof RunConfig>(key: K, value: RunConfig[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setWater = (key: keyof RunConfig["water"], value: number | null) =>
    setDraft((current) => ({
      ...current,
      water: { ...current.water, [key]: value },
    }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    onChange(updateRunConfig(run, draft));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };
  const unknownWater = Object.values(draft.water).filter(
    (value) => value === null,
  ).length;
  const blockers = [
    !draft.name.trim(),
    !draft.genetics.trim(),
    draft.plantCount < 1,
    draft.tentWidthCm <= 0 || draft.tentDepthCm <= 0 || draft.tentHeightCm <= 0,
  ].filter(Boolean).length;
  const activate = () => {
    if (blockers > 0) return;
    onChange(activateRun(updateRunConfig(run, draft)));
  };
  return (
    <form className="page-stack" onSubmit={save}>
      <section className="workspace-banner">
        <div>
          <small>VERSIONIERTE RUN-KONFIGURATION</small>
          <h2>{draft.name}</h2>
          <p>
            Status: <b>{run.status.toUpperCase()}</b>.{" "}
            {run.status === "draft"
              ? "Bis zur Aktivierung wird der Entwurf bearbeitet."
              : "Der aktive Snapshot v" +
                run.configurationSnapshot.version +
                " bleibt unverändert; Profiländerungen gelten erst für einen neuen Run."}
          </p>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="submit">
            Setup-Profil speichern
          </button>
          {run.status === "draft" && (
            <button
              className="primary-button"
              type="button"
              disabled={blockers > 0}
              onClick={activate}
            >
              Run aktivieren
            </button>
          )}
        </div>
      </section>
      {saved && (
        <p className="save-state" role="status">
          ✓ Konfiguration und Änderungsereignis gespeichert.
        </p>
      )}
      <section className="panel form-panel">
        <header>
          <div>
            <small>BASIS</small>
            <h2>Run und Anlage</h2>
          </div>
        </header>
        <div className="form-grid">
          <TextField
            label="Run-Name"
            value={draft.name}
            onChange={(value) => setField("name", value)}
          />
          <TextField
            label="Genetik"
            value={draft.genetics}
            onChange={(value) => setField("genetics", value)}
          />
          <label>
            <span>Startdatum</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
            />
          </label>
          <NumberField
            label="Plan-Endtag"
            value={draft.endDay}
            min={1}
            max={365}
            onChange={(value) => setField("endDay", value ?? 80)}
          />
          <NumberField
            label="Pflanzen im Run"
            value={draft.plantCount}
            min={0}
            max={1000}
            onChange={(value) => setField("plantCount", value ?? 0)}
          />
          <TextField
            label="Medium"
            value={draft.medium}
            onChange={(value) => setField("medium", value)}
          />
          <TextField
            label="Bewässerungssystem"
            value={draft.irrigationSystem}
            onChange={(value) => setField("irrigationSystem", value)}
          />
          <TextField
            label="Nährstoffsystem"
            value={draft.nutrientSystem}
            onChange={(value) => setField("nutrientSystem", value)}
          />
          <NumberField
            label="Zeltbreite"
            unit="cm"
            value={draft.tentWidthCm}
            min={1}
            onChange={(value) => setField("tentWidthCm", value ?? 60)}
          />
          <NumberField
            label="Zelttiefe"
            unit="cm"
            value={draft.tentDepthCm}
            min={1}
            onChange={(value) => setField("tentDepthCm", value ?? 60)}
          />
          <NumberField
            label="Zelthöhe"
            unit="cm"
            value={draft.tentHeightCm}
            min={1}
            onChange={(value) => setField("tentHeightCm", value ?? 180)}
          />
          <NumberField
            label="LED Maximum"
            unit="W"
            value={draft.ledMaxW}
            min={0}
            onChange={(value) => setField("ledMaxW", value ?? 0)}
          />
          <NumberField
            label="Photoperiode"
            unit="h"
            value={draft.lightHours}
            min={0}
            max={24}
            step={0.5}
            onChange={(value) => setField("lightHours", value ?? 18)}
          />
        </div>
      </section>
      <section className="panel form-panel">
        <header>
          <div>
            <small>BASELINE · KEINE KALENDERDOSIS</small>
            <h2>Wasserprofil</h2>
          </div>
        </header>
        <div className="form-grid">
          <NumberField
            label="Ausgangs-pH"
            value={draft.water.sourcePh}
            min={0}
            max={14}
            step={0.01}
            onChange={(value) => setWater("sourcePh", value)}
          />
          <NumberField
            label="Ausgangs-EC"
            unit="mS/cm"
            value={draft.water.sourceEc}
            min={0}
            step={0.01}
            onChange={(value) => setWater("sourceEc", value)}
          />
          <NumberField
            label="Calcium"
            unit="mg/L"
            value={draft.water.calciumMgL}
            min={0}
            step={0.1}
            onChange={(value) => setWater("calciumMgL", value)}
          />
          <NumberField
            label="Magnesium"
            unit="mg/L"
            value={draft.water.magnesiumMgL}
            min={0}
            step={0.1}
            onChange={(value) => setWater("magnesiumMgL", value)}
          />
          <NumberField
            label="HCO₃ / Alkalinität"
            unit="mg/L"
            value={draft.water.alkalinityMgL}
            min={0}
            step={0.1}
            onChange={(value) => setWater("alkalinityMgL", value)}
          />
        </div>
        <p className="form-note">
          Leere Werte bleiben ausdrücklich „fehlend“. Die UI leitet daraus keine
          automatische Athena-, CalMag- oder Säuredosis ab.
        </p>
      </section>
      <section
        className="panel setup-review"
        aria-labelledby="setup-review-title"
      >
        <header>
          <div>
            <small>PRE-FLIGHT REVIEW</small>
            <h2 id="setup-review-title">Aktivierungsprüfung</h2>
          </div>
          <span className={`run-state-badge ${run.status}`}>{run.status}</span>
        </header>
        <div className="review-metrics">
          <div>
            <small>BEKANNT</small>
            <strong>{18 - unknownWater}</strong>
          </div>
          <div>
            <small>UNBEKANNT</small>
            <strong>{unknownWater}</strong>
          </div>
          <div>
            <small>WARNUNGEN</small>
            <strong>{unknownWater > 0 ? 1 : 0}</strong>
          </div>
          <div>
            <small>BLOCKER</small>
            <strong>{blockers}</strong>
          </div>
          <div>
            <small>OVERRIDES</small>
            <strong>
              {run.overrides.filter((entry) => !entry.reversedAt).length}
            </strong>
          </div>
        </div>
        <p>
          Unbekannte Wasserwerte bleiben zulässig und sichtbar, erzeugen aber
          Safety-Gates. Aktivierung friert die Konfiguration als
          reproduzierbaren Snapshot ein.
        </p>
      </section>
    </form>
  );
}

export function RunLogWorkspace({
  run,
  plan,
  onChange,
}: RunProps & { plan: DayPlan }) {
  const [draft, setDraft] = useState(() => createObservation(plan.day));
  const [eventTitle, setEventTitle] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [observationCategory, setObservationCategory] =
    useState<StructuredObservation["category"]>("general");
  const [observationSeverity, setObservationSeverity] =
    useState<StructuredObservation["severity"]>("info");
  const [observationText, setObservationText] = useState("");
  const [correctionId, setCorrectionId] = useState("");
  const [correctedValue, setCorrectedValue] = useState<number | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [overrideField, setOverrideField] = useState("");
  const [canonicalValue, setCanonicalValue] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  useEffect(() => setDraft(createObservation(plan.day)), [plan.day]);
  const updateValue = (key: keyof ObservationValues, value: number | null) =>
    setDraft((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));
  const saveObservation = (event: FormEvent) => {
    event.preventDefault();
    onChange(
      addObservation(run, {
        ...draft,
        recordedAt: new Date().toISOString(),
      }),
    );
    setDraft(createObservation(plan.day));
  };
  const saveEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim()) return;
    const item: RunEvent = {
      id: crypto.randomUUID(),
      day: plan.day,
      occurredAt: new Date().toISOString(),
      category: "action",
      title: eventTitle.trim(),
      detail: eventDetail.trim(),
    };
    onChange(addRunEvent(run, item));
    setEventTitle("");
    setEventDetail("");
  };
  const saveStructuredObservation = (event: FormEvent) => {
    event.preventDefault();
    if (!observationText.trim()) return;
    const item: StructuredObservation = {
      id: crypto.randomUUID(),
      runId: run.id,
      zoneId: run.zones[0]?.id ?? "unassigned-zone",
      ...(run.plants.length === 1 && run.plants[0]
        ? { plantId: run.plants[0].id }
        : {}),
      observedAt: new Date().toISOString(),
      category: observationCategory,
      severity: observationSeverity,
      text: observationText.trim(),
      tags: [],
      photoIds: [],
    };
    onChange(addStructuredObservation(run, item));
    setObservationText("");
  };
  const saveCorrection = (event: FormEvent) => {
    event.preventDefault();
    if (!correctionId || correctedValue === null || !correctionReason.trim())
      return;
    onChange(
      supersedeMeasurement(run, correctionId, correctedValue, correctionReason),
    );
    setCorrectionId("");
    setCorrectedValue(null);
    setCorrectionReason("");
  };
  const saveOverride = (event: FormEvent) => {
    event.preventDefault();
    if (!overrideField.trim() || !overrideReason.trim()) return;
    const item: RunOverride = {
      id: crypto.randomUUID(),
      field: overrideField.trim(),
      canonicalValue,
      overrideValue,
      evidenceConflict: "Außerhalb des kanonischen Evidence-/Planwerts",
      reason: overrideReason.trim(),
      createdAt: new Date().toISOString(),
      reversible: true,
    };
    onChange(addRunOverride(run, item));
    setOverrideField("");
    setCanonicalValue("");
    setOverrideValue("");
    setOverrideReason("");
  };
  const alerts = deriveRunAlerts(run, plan);
  return (
    <div className="page-stack">
      <section className="target-actual-strip">
        <StatusMetric
          label="pH"
          target={numberAt(plan, DAILY_COLUMNS.ph)}
          actual={draft.values.phIn}
          unit=""
        />
        <StatusMetric
          label="EC"
          target={numberAt(plan, DAILY_COLUMNS.ec)}
          actual={draft.values.ecIn}
          unit="mS/cm"
        />
        <StatusMetric
          label="Temperatur"
          target={numberAt(plan, DAILY_COLUMNS.tempLight)}
          actual={draft.values.tempMax}
          unit="°C"
        />
        <StatusMetric
          label="rF"
          target={numberAt(plan, DAILY_COLUMNS.humidity)}
          actual={draft.values.humidityMax}
          unit="%"
        />
      </section>
      <AlertCenter
        alerts={alerts}
        acknowledgedIds={run.acknowledgedAlertIds}
        onAcknowledge={(id) =>
          onChange({
            ...run,
            updatedAt: new Date().toISOString(),
            acknowledgedAlertIds: [
              ...new Set([...run.acknowledgedAlertIds, id]),
            ],
          })
        }
      />
      <div className="two-column wide-left">
        <form className="panel form-panel" onSubmit={saveObservation}>
          <header>
            <div>
              <small>RUN-TAG {plan.day} · MANUELL</small>
              <h2>Messdatensatz erfassen</h2>
            </div>
            <button className="primary-button" type="submit">
              Messung speichern
            </button>
          </header>
          <div className="form-grid compact">
            <NumberField
              label="pH Eingang"
              value={draft.values.phIn}
              step={0.01}
              min={0}
              max={14}
              onChange={(value) => updateValue("phIn", value)}
            />
            <NumberField
              label="EC Eingang"
              unit="mS/cm"
              value={draft.values.ecIn}
              step={0.01}
              min={0}
              onChange={(value) => updateValue("ecIn", value)}
            />
            <NumberField
              label="pH Drain"
              value={draft.values.phDrain}
              step={0.01}
              min={0}
              max={14}
              onChange={(value) => updateValue("phDrain", value)}
            />
            <NumberField
              label="EC Drain"
              unit="mS/cm"
              value={draft.values.ecDrain}
              step={0.01}
              min={0}
              onChange={(value) => updateValue("ecDrain", value)}
            />
            <NumberField
              label="Temperatur max"
              unit="°C"
              value={draft.values.tempMax}
              step={0.1}
              onChange={(value) => updateValue("tempMax", value)}
            />
            <NumberField
              label="Temperatur min"
              unit="°C"
              value={draft.values.tempMin}
              step={0.1}
              onChange={(value) => updateValue("tempMin", value)}
            />
            <NumberField
              label="rF max"
              unit="%"
              value={draft.values.humidityMax}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => updateValue("humidityMax", value)}
            />
            <NumberField
              label="rF min"
              unit="%"
              value={draft.values.humidityMin}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => updateValue("humidityMin", value)}
            />
            <NumberField
              label="Blatttemperatur"
              unit="°C"
              value={draft.values.leafTemp}
              step={0.1}
              onChange={(value) => updateValue("leafTemp", value)}
            />
            <NumberField
              label="PPFD"
              unit="µmol/m²/s"
              value={draft.values.ppfd}
              min={0}
              step={1}
              onChange={(value) => updateValue("ppfd", value)}
            />
            <NumberField
              label="Wasser"
              unit="L"
              value={draft.values.waterLiters}
              min={0}
              step={0.01}
              onChange={(value) => updateValue("waterLiters", value)}
            />
            <NumberField
              label="Pflanzenhöhe"
              unit="cm"
              value={draft.values.plantHeightCm}
              min={0}
              step={0.1}
              onChange={(value) => updateValue("plantHeightCm", value)}
            />
            <NumberField
              label="Stress"
              unit="0–5"
              value={draft.values.stress}
              min={0}
              max={5}
              step={1}
              onChange={(value) => updateValue("stress", value)}
            />
            <label className="full-field">
              <span>Beobachtungen / Notizen</span>
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </form>
        <form className="panel form-panel" onSubmit={saveEvent}>
          <header>
            <div>
              <small>AKTION / NOTIZ</small>
              <h2>Ereignis dokumentieren</h2>
            </div>
          </header>
          <div className="stacked-fields">
            <TextField
              label="Titel"
              value={eventTitle}
              onChange={setEventTitle}
            />
            <label>
              <span>Details</span>
              <textarea
                rows={5}
                value={eventDetail}
                onChange={(event) => setEventDetail(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit">
              Ereignis hinzufügen
            </button>
          </div>
        </form>
      </div>
      <section className="quick-log-grid" aria-label="Strukturiertes Journal">
        <form className="panel form-panel" onSubmit={saveStructuredObservation}>
          <header>
            <div>
              <small>QUICK LOG · KEINE AUTOMATISCHE DIAGNOSE</small>
              <h2>Beobachtung</h2>
            </div>
          </header>
          <div className="stacked-fields">
            <label>
              <span>Kategorie</span>
              <select
                value={observationCategory}
                onChange={(event) =>
                  setObservationCategory(
                    event.target.value as StructuredObservation["category"],
                  )
                }
              >
                <option value="general">Allgemein</option>
                <option value="foliage">Blattwerk</option>
                <option value="root-zone">Wurzelzone</option>
                <option value="structure">Struktur</option>
                <option value="pest">Schädling</option>
                <option value="environment">Umwelt</option>
              </select>
            </label>
            <label>
              <span>Schwere</span>
              <select
                value={observationSeverity}
                onChange={(event) =>
                  setObservationSeverity(
                    event.target.value as StructuredObservation["severity"],
                  )
                }
              >
                <option value="info">Information</option>
                <option value="mild">Leicht</option>
                <option value="moderate">Moderat</option>
                <option value="severe">Schwer</option>
              </select>
            </label>
            <label>
              <span>Beobachtung</span>
              <textarea
                rows={4}
                value={observationText}
                onChange={(event) => setObservationText(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit">
              Beobachtung speichern
            </button>
          </div>
        </form>
        <form className="panel form-panel" onSubmit={saveCorrection}>
          <header>
            <div>
              <small>SUPERSEDING · NICHT LÖSCHEN</small>
              <h2>Messwert korrigieren</h2>
            </div>
          </header>
          <div className="stacked-fields">
            <label>
              <span>Originalmessung</span>
              <select
                value={correctionId}
                onChange={(event) => setCorrectionId(event.target.value)}
              >
                <option value="">Messung auswählen</option>
                {run.measurements
                  .filter((entry) => !entry.supersededBy)
                  .slice(0, 50)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.metric} · {String(entry.reading.value)}{" "}
                      {entry.reading.unit ?? ""}
                    </option>
                  ))}
              </select>
            </label>
            <NumberField
              label="Korrigierter Wert"
              value={correctedValue}
              onChange={setCorrectedValue}
            />
            <TextField
              label="Korrekturgrund"
              value={correctionReason}
              onChange={setCorrectionReason}
            />
            <button className="secondary-button" type="submit">
              Korrektur als neues Event speichern
            </button>
          </div>
        </form>
        <form className="panel form-panel" onSubmit={saveOverride}>
          <header>
            <div>
              <small>EXPERT DECISION · REVERSIBEL</small>
              <h2>Override dokumentieren</h2>
            </div>
          </header>
          <div className="stacked-fields">
            <TextField
              label="Feld / Regel"
              value={overrideField}
              onChange={setOverrideField}
            />
            <TextField
              label="Kanonischer Wert"
              value={canonicalValue}
              onChange={setCanonicalValue}
            />
            <TextField
              label="Override-Wert"
              value={overrideValue}
              onChange={setOverrideValue}
            />
            <label>
              <span>Begründung</span>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit">
              Override mit Begründung speichern
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <header>
          <div>
            <small>PERSISTENT · NEUSTE ZUERST</small>
            <h2>Run-Verlauf</h2>
          </div>
        </header>
        <div className="event-list">
          {run.events.length === 0 ? (
            <EmptyState text="Noch keine Ereignisse dokumentiert." />
          ) : (
            run.events.slice(0, 100).map((event) => (
              <article key={event.id}>
                <time dateTime={event.occurredAt}>
                  {formatTimestamp(event.occurredAt)}
                </time>
                <div>
                  <small>
                    TAG {event.day} · {event.category.toUpperCase()}
                  </small>
                  <strong>{event.title}</strong>
                  <p>{event.detail || "—"}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function RunHistoryWorkspace({ run, onChange }: RunProps) {
  const [runs, setRuns] = useState<RunPackage[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    indexedDbRunRepository
      .listRuns()
      .then((values) =>
        setRuns(
          values.some((entry) => entry.id === run.id)
            ? values
            : [run, ...values],
        ),
      )
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Run-Liste fehlgeschlagen",
        ),
      );
  }, [run]);
  const createRun = async () => {
    try {
      const next = createDefaultRunPackage();
      await indexedDbRunRepository.createRun(next);
      onChange(next);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Run konnte nicht angelegt werden",
      );
    }
  };
  const selectRun = async (selected: RunPackage) => {
    await indexedDbRunRepository.setActiveRun(selected.id);
    onChange(selected);
  };
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>WORKSPACE / RUN REPOSITORY</small>
          <h2>Versionierte Runs</h2>
          <p>
            Jeder Run besitzt einen eigenen Konfigurations-Snapshot, Messwerte,
            Journal, Tasks, Overrides und Audit-Events. Wechsel verändert keine
            historischen Daten.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => void createRun()}
        >
          Neuen Run-Entwurf anlegen
        </button>
      </section>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <section className="run-history-grid" aria-label="Gespeicherte Runs">
        {runs.length === 0 ? (
          <EmptyState text="Der aktive Run wird beim nächsten Autosave in der Historie sichtbar." />
        ) : (
          runs.map((entry) => (
            <article
              key={entry.id}
              className={entry.id === run.id ? "active" : ""}
            >
              <div>
                <small>
                  {entry.status.toUpperCase()} · SNAPSHOT v
                  {entry.configurationSnapshot.version}
                </small>
                <h2>{effectiveRunConfig(entry).name}</h2>
                <p>
                  {effectiveRunConfig(entry).genetics} ·{" "}
                  {entry.measurements.length} Messwerte ·{" "}
                  {entry.structuredObservations.length} Beobachtungen
                </p>
              </div>
              <div className="button-row">
                <span>{formatTimestamp(entry.updatedAt)}</span>
                {entry.id === run.id ? (
                  <b>AKTIV</b>
                ) : (
                  <button type="button" onClick={() => void selectRun(entry)}>
                    Run öffnen
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

export function LegalWorkspace({
  run,
  onChange,
  profile,
  onProfileChange,
}: RunProps & {
  profile: LegalProfile | null;
  onProfileChange: (profile: LegalProfile | null) => void;
}) {
  const [error, setError] = useState("");
  const [type, setType] = useState<InventoryEvent["type"]>("harvest-dry");
  const [grams, setGrams] = useState<number | null>(null);
  const [basis, setBasis] = useState<LegalBasis>("kcang-private");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const importProfile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as unknown;
      if (!isLegalProfile(value))
        throw new Error("Profil entspricht nicht dem freigegebenen Schema.");
      onProfileChange(value);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Profil konnte nicht gelesen werden.",
      );
    }
  };
  const addEntry = (event: FormEvent) => {
    event.preventDefault();
    if (grams === null || grams <= 0) return;
    onChange(
      addInventoryEvent(run, {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        type,
        grams,
        legalBasis: basis,
        note,
        evidenceReference: reference,
      }),
    );
    setGrams(null);
    setNote("");
    setReference("");
  };
  return (
    <div className="page-stack">
      <section className="privacy-banner">
        <span>§</span>
        <div>
          <h2>Sensible Profildaten bleiben sitzungsgebunden</h2>
          <p>
            Das importierte Rechtsprofil wird weder in IndexedDB noch Local
            Storage gespeichert. Nur das getrennte, nicht-dokumenthaltige
            Bestandsereignislog gehört zum Run-Backup.
          </p>
        </div>
      </section>
      <div className="two-column">
        <section className="panel form-panel">
          <header>
            <div>
              <small>LOKALE DATEI</small>
              <h2>Rechtsprofil</h2>
            </div>
          </header>
          <label className="file-button">
            Profil-JSON auswählen
            <input
              type="file"
              accept="application/json,.json"
              onChange={importProfile}
            />
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {profile ? (
            <div className="profile-summary">
              <strong>
                {profile.authorizations.length} Autorisierungen geladen
              </strong>
              <p>Verifiziert am {profile.verifiedAt ?? "nicht angegeben"}</p>
              <ul>
                {profile.authorizations.map((authorization) => (
                  <li key={JSON.stringify(authorization)}>
                    <b>{authorization.legalBasis}</b>
                    <span>
                      {authorization.documentVerified
                        ? "Dokument geprüft"
                        : "nicht geprüft"}
                    </span>
                    <small>
                      {authorization.authorizedActivities.join(", ") ||
                        "keine Tätigkeit"}
                    </small>
                  </li>
                ))}
              </ul>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onProfileChange(null)}
              >
                Profil aus Sitzung entfernen
              </button>
            </div>
          ) : (
            <EmptyState text="Kein persönliches Rechtsprofil geladen. Allgemeine Pfade werden nicht mit individuellen Limits überschrieben." />
          )}
        </section>
        <section className="inventory-balance">
          <small>DOKUMENTIERTER SALDO</small>
          <strong>{inventoryBalance(run).toFixed(2)} g</strong>
          <p>Rechnerischer Ereignissaldo, keine rechtliche Freigabe.</p>
        </section>
      </div>
      <div className="two-column wide-left">
        <form className="panel form-panel" onSubmit={addEntry}>
          <header>
            <div>
              <small>GETRENNTER ÜBERGANG</small>
              <h2>Bestandsereignis</h2>
            </div>
          </header>
          <div className="stacked-fields">
            <label>
              <span>Typ</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as InventoryEvent["type"])
                }
              >
                <option value="harvest-wet">Ernte nass</option>
                <option value="harvest-dry">Ernte trocken</option>
                <option value="pharmacy-acquisition">Apothekenbezug</option>
                <option value="consumption">Entnahme / Verbrauch</option>
                <option value="destruction">Vernichtung</option>
                <option value="correction">Korrektur</option>
              </select>
            </label>
            <NumberField
              label="Menge"
              unit="g"
              value={grams}
              min={0.01}
              step={0.01}
              onChange={setGrams}
            />
            <label>
              <span>Rechtsgrundlage</span>
              <select
                value={basis}
                onChange={(event) => setBasis(event.target.value as LegalBasis)}
              >
                <option value="kcang-private">KCanG privat</option>
                <option value="medcang-prescription">
                  MedCanG Verschreibung
                </option>
                <option value="medcang-section-4-permit">
                  MedCanG § 4 Erlaubnis
                </option>
              </select>
            </label>
            <TextField
              label="Nachweisreferenz"
              value={reference}
              onChange={setReference}
            />
            <label>
              <span>Notiz</span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit">
              Ereignis speichern
            </button>
          </div>
        </form>
        <section className="panel">
          <header>
            <div>
              <small>NICHT STILL ADDIEREN</small>
              <h2>Bestandsverlauf</h2>
            </div>
          </header>
          <div className="event-list compact">
            {run.inventory.length === 0 ? (
              <EmptyState text="Noch keine Bestandsereignisse." />
            ) : (
              run.inventory.map((entry) => (
                <article key={entry.id}>
                  <time dateTime={entry.occurredAt}>
                    {formatTimestamp(entry.occurredAt)}
                  </time>
                  <div>
                    <small>{entry.legalBasis}</small>
                    <strong>
                      {entry.type} · {entry.grams.toFixed(2)} g
                    </strong>
                    <p>{entry.note || entry.evidenceReference || "—"}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ReportsWorkspace({ run, onChange }: RunProps) {
  const [message, setMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const config = effectiveRunConfig(run);
  const exportJson = () =>
    download(
      `${safeName(config.name)}.ukd-run.json`,
      JSON.stringify(run, null, 2),
      "application/json",
    );
  const exportCsv = () =>
    download(
      `${safeName(config.name)}-measurements.csv`,
      runToCsv(run),
      "text/csv;charset=utf-8",
    );
  const importRun = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = validateRunPackage(
        JSON.parse(await file.text()) as unknown,
      );
      if (!parsed.ok) throw new Error(parsed.errors.join(" "));
      onChange({ ...parsed.value, updatedAt: new Date().toISOString() });
      setMessage(`✓ ${file.name} wurde validiert und wiederhergestellt.`);
    } catch (cause) {
      setMessage(
        `Fehler: ${cause instanceof Error ? cause.message : "Import fehlgeschlagen."}`,
      );
    }
  };
  const exportXlsx = async () => {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    workbook.creator = "UKD Grow Masterplan 2026";
    workbook.created = new Date(run.createdAt);
    const addSheet = (name: string, columns: string[], records: object[]) => {
      const sheet = workbook.addWorksheet(name, {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      sheet.columns = columns.map((key) => ({
        header: key,
        key,
        width: Math.min(42, Math.max(12, key.length + 2)),
      }));
      sheet.addRows(records);
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = {
        from: "A1",
        to: sheet.getCell(1, columns.length).address,
      };
    };
    const observationColumns = [
      "id",
      "day",
      "recordedAt",
      "source",
      "status",
      "phIn",
      "ecIn",
      "phDrain",
      "ecDrain",
      "volumeLiters",
      "temperatureC",
      "humidityPercent",
      "substrateMoisturePercent",
      "notes",
    ];
    addSheet(
      "Observations",
      observationColumns,
      run.observations.map(({ values, ...entry }) => ({ ...entry, ...values })),
    );
    addSheet(
      "Events",
      ["id", "day", "occurredAt", "category", "title", "detail"],
      run.events,
    );
    addSheet(
      "Measurements",
      [
        "id",
        "runId",
        "zoneId",
        "plantId",
        "metric",
        "value",
        "unit",
        "semantic",
        "sourceKind",
        "sourceReference",
        "quality",
        "measuredAt",
        "supersededBy",
        "correctionReason",
      ],
      run.measurements.map(({ reading, ...entry }) => ({
        ...entry,
        value: reading.value,
        unit: reading.unit ?? "",
        semantic: reading.semantic,
        sourceKind: reading.source.kind,
        sourceReference: reading.source.reference,
        quality: reading.quality ?? "unknown",
      })),
    );
    addSheet(
      "Journal",
      [
        "id",
        "runId",
        "zoneId",
        "plantId",
        "observedAt",
        "category",
        "severity",
        "text",
      ],
      run.structuredObservations,
    );
    addSheet(
      "Tasks",
      [
        "id",
        "day",
        "title",
        "requirement",
        "state",
        "phase",
        "reason",
        "dueAt",
        "completedAt",
      ],
      run.tasks,
    );
    addSheet(
      "Overrides",
      [
        "id",
        "field",
        "canonicalValue",
        "overrideValue",
        "evidenceConflict",
        "reason",
        "createdAt",
        "reversedAt",
      ],
      run.overrides.map((entry) => ({
        ...entry,
        canonicalValue: JSON.stringify(entry.canonicalValue),
        overrideValue: JSON.stringify(entry.overrideValue),
      })),
    );
    addSheet(
      "Audit",
      ["id", "occurredAt", "action", "entityType", "entityId", "detail"],
      run.auditEvents,
    );
    addSheet(
      "Inventory",
      [
        "id",
        "occurredAt",
        "type",
        "grams",
        "legalBasis",
        "note",
        "evidenceReference",
      ],
      run.inventory,
    );
    const buffer = await workbook.xlsx.writeBuffer();
    download(
      `${safeName(config.name)}.xlsx`,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  };
  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF();
    document.setFontSize(18);
    document.text(config.name, 14, 20);
    document.setFontSize(10);
    const lines = [
      `Schema: ${run.schemaVersion}`,
      `Genetik: ${config.genetics}`,
      `Start: ${config.startDate}`,
      `Messdatensätze: ${run.observations.length}`,
      `Typisierte Messwerte: ${run.measurements.length}`,
      `Strukturierte Beobachtungen: ${run.structuredObservations.length}`,
      `Overrides: ${run.overrides.length}`,
      `Ereignisse: ${run.events.length}`,
      `Bestandssaldo: ${inventoryBalance(run).toFixed(2)} g`,
      "",
      ...run.events
        .slice(0, 35)
        .map(
          (event) =>
            `${formatTimestamp(event.occurredAt)} · Tag ${event.day} · ${event.title}`,
        ),
    ];
    document.text(lines, 14, 30, { maxWidth: 180 });
    document.save(`${safeName(config.name)}-report.pdf`);
  };
  return (
    <div className="page-stack">
      <section className="report-hero">
        <div>
          <small>VERLUSTFREIER MASTER</small>
          <h2>RunPackage {run.schemaVersion}</h2>
          <p>
            JSON ist Backup und Restore-Format. CSV, XLSX und PDF sind
            abgeleitete Berichte.
          </p>
        </div>
        <strong>{formatTimestamp(run.updatedAt)}</strong>
      </section>
      {message && (
        <p
          className={
            message.startsWith("Fehler") ? "inline-error" : "save-state"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <section className="export-grid">
        <ExportCard
          title="JSON Backup"
          text="Vollständiger Run mit Konfiguration, Messungen, Ereignissen und Bestandslog."
          action="JSON sichern"
          onClick={exportJson}
        />
        <ExportCard
          title="CSV Messwerte"
          text="Flaches, portables Format für Statistik und Tabellenprogramme."
          action="CSV exportieren"
          onClick={exportCsv}
        />
        <ExportCard
          title="Excel Workbook"
          text="Separate Blätter für Messungen, Journal, Tasks, Overrides, Audit und Bestand."
          action="XLSX exportieren"
          onClick={() => void exportXlsx()}
        />
        <ExportCard
          title="PDF Bericht"
          text="Lesbare Momentaufnahme für Archiv und Review."
          action="PDF erzeugen"
          onClick={() => void exportPdf()}
        />
        <ExportCard
          title="Druckansicht"
          text="Browser-Druck mit bestehendem Print-Stylesheet."
          action="Drucken"
          onClick={() => window.print()}
        />
        <ExportCard
          title="Restore"
          text="RunPackage v2 wird validiert; v1 wird kontrolliert und verlustfrei migriert."
          action="JSON importieren"
          onClick={() => importRef.current?.click()}
        />
      </section>
      <input
        ref={importRef}
        className="sr-only"
        type="file"
        aria-label="Run-Backupdatei auswählen"
        accept="application/json,.json"
        onChange={importRun}
      />
      <section className="panel">
        <header>
          <div>
            <small>WIEDERHERSTELLBARKEIT</small>
            <h2>Backup-Checkliste</h2>
          </div>
        </header>
        <ol className="backup-list">
          <li>JSON vor größeren Änderungen sichern.</li>
          <li>Datei außerhalb des Projektordners kopieren.</li>
          <li>Restore nach Schema- oder Versionswechsel testen.</li>
          <li>Sensible Rechtsdokumente separat und geschützt halten.</li>
        </ol>
      </section>
    </div>
  );
}

export function SystemWorkspace() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [integrity, setIntegrity] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [online, setOnline] = useState(navigator.onLine);
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem("ukd:contrast") === "high",
  );
  const [textScale, setTextScale] = useState(
    localStorage.getItem("ukd:text-scale") ?? "normal",
  );
  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast
      ? "high"
      : "normal";
    localStorage.setItem("ukd:contrast", highContrast ? "high" : "normal");
  }, [highContrast]);
  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
    localStorage.setItem("ukd:text-scale", textScale);
  }, [textScale]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/data-manifest.json`)
      .then((response) => response.json())
      .then((value: Manifest) => setManifest(value));
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const verify = async () => {
    if (!manifest) return;
    setIntegrity("checking");
    const response = await fetch(
      `${import.meta.env.BASE_URL}${manifest.canonicalWorkbook.path}`,
      { cache: "no-store" },
    );
    const hash = await crypto.subtle.digest(
      "SHA-256",
      await response.arrayBuffer(),
    );
    const hex = [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    setIntegrity(
      hex === manifest.canonicalWorkbook.sha256 ? "valid" : "invalid",
    );
  };
  return (
    <div className="page-stack">
      <section className="system-status-grid">
        <SystemCard
          label="Release"
          value={manifest?.release ?? "lädt…"}
          state="target"
        />
        <SystemCard
          label="Netzwerk"
          value={online ? "ONLINE" : "OFFLINE"}
          state={online ? "measured" : "stale"}
        />
        <SystemCard
          label="Offline Cache"
          value={"serviceWorker" in navigator ? "VERFÜGBAR" : "NICHT VERFÜGBAR"}
          state={"serviceWorker" in navigator ? "measured" : "missing"}
        />
        <SystemCard
          label="Datenintegrität"
          value={integrity.toUpperCase()}
          state={
            integrity === "valid"
              ? "measured"
              : integrity === "invalid"
                ? "missing"
                : "target"
          }
        />
      </section>
      <section className="panel integrity-panel">
        <header>
          <div>
            <small>SHA-256 · KANONISCH</small>
            <h2>Datenmanifest</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={!manifest || integrity === "checking"}
            onClick={() => void verify()}
          >
            {integrity === "checking" ? "Prüfe…" : "Workbook verifizieren"}
          </button>
        </header>
        {manifest ? (
          <dl className="manifest-list">
            <div>
              <dt>Generiert</dt>
              <dd>{manifest.generatedAt}</dd>
            </div>
            <div>
              <dt>Blätter</dt>
              <dd>{manifest.canonicalWorkbook.sheets}</dd>
            </div>
            <div>
              <dt>Formeln</dt>
              <dd>{manifest.canonicalWorkbook.formulas}</dd>
            </div>
            <div>
              <dt>SHA-256</dt>
              <dd>
                <code>{manifest.canonicalWorkbook.sha256}</code>
              </dd>
            </div>
          </dl>
        ) : (
          <EmptyState text="Manifest wird geladen." />
        )}
        {integrity === "invalid" && (
          <p className="inline-error" role="alert">
            Hashabweichung: Daten nicht als kanonisch verwenden.
          </p>
        )}
      </section>
      <section className="integration-grid">
        <IntegrationCard
          title="Sensor-Gateway"
          status="BEDINGT"
          text="Kein Geräteprotokoll, Kalibrierungs- oder Offline-Modell freigegeben. Keine Fake-Live-Daten."
        />
        <IntegrationCard
          title="Cloud / Mehrbenutzer"
          status="BEDINGT"
          text="Keine Authentifizierung oder serverseitige Speicherung. Lokaler Einzelbenutzerbetrieb bleibt aktiv."
        />
        <IntegrationCard
          title="Gerätesteuerung"
          status="BLOCKIERT"
          text="Direkte Aktorik benötigt Fail-safe, Not-Aus, Leckagegrenze und freigegebene Vertrauensgrenze."
        />
      </section>
      <section className="panel accessibility-settings">
        <header>
          <div>
            <small>PERSÖNLICHE DARSTELLUNG</small>
            <h2>Accessibility-Einstellungen</h2>
          </div>
        </header>
        <div>
          <button
            className={highContrast ? "active" : ""}
            type="button"
            aria-pressed={highContrast}
            onClick={() => setHighContrast((value) => !value)}
          >
            Hoher Kontrast
          </button>
          {(
            [
              ["normal", "Text 100 %"],
              ["large", "Text 115 %"],
              ["xlarge", "Text 130 %"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={textScale === value ? "active" : ""}
              type="button"
              aria-pressed={textScale === value}
              onClick={() => setTextScale(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          Browserzoom bleibt zusätzlich verfügbar. Layout und Tabellen sind auf
          Reflow ausgelegt.
        </p>
      </section>
    </div>
  );
}

function StatusMetric({
  label,
  target,
  actual,
  unit,
}: {
  label: string;
  target: number;
  actual: number | null;
  unit: string;
}) {
  const status = actual === null ? "missing" : "measured";
  return (
    <article className={`status-metric ${status}`}>
      <small>{label}</small>
      <strong>
        {actual === null ? "—" : actual.toFixed(2)} {unit}
      </strong>
      <span>{status === "missing" ? "FEHLEND" : "GEMESSEN"}</span>
      <p>
        Soll {target.toFixed(2)} {unit}
      </p>
    </article>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number | null;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label>
      <span>
        {label}
        {unit ? ` · ${unit}` : ""}
      </span>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
      />
    </label>
  );
}

function ExportCard({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <article>
      <span>⇩</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="secondary-button" type="button" onClick={onClick}>
        {action}
      </button>
    </article>
  );
}

function SystemCard({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: string;
}) {
  return (
    <article className={`system-card ${state}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{state.toUpperCase()}</span>
    </article>
  );
}

function IntegrationCard({
  title,
  status,
  text,
}: {
  title: string;
  status: string;
  text: string;
}) {
  return (
    <article>
      <small>{status}</small>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>○</span>
      <p>{text}</p>
    </div>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function safeName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-z0-9äöüß_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "ukd-run"
  );
}

function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function isLegalProfile(value: unknown): value is LegalProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LegalProfile>;
  return (
    profile.schemaVersion === "1.0.0" &&
    profile.jurisdiction === "DE" &&
    Array.isArray(profile.authorizations) &&
    profile.planning?.inventoryGateRequired === true &&
    profile.planning?.destructionLogRequired === true
  );
}

interface Manifest {
  release: string;
  generatedAt: string;
  canonicalWorkbook: {
    path: string;
    sha256: string;
    sheets: number;
    formulas: number;
  };
}
