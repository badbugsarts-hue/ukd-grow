import { type FormEvent, useState } from "react";
import { applyRunCommand, type RunCommand } from "./run-commands";
import type { EnergyCategory, ExperienceLens, RunPackage } from "./types";

interface Props {
  run: RunPackage;
  lens: ExperienceLens;
  onChange: (run: RunPackage) => void;
}

function useScientificCommand(run: RunPackage, onChange: Props["onChange"]) {
  const [message, setMessage] = useState("");
  const dispatch = (command: RunCommand) => {
    const result = applyRunCommand(run, command);
    if (!result.ok) {
      setMessage(result.errors.map((entry) => entry.message).join(" "));
      return false;
    }
    onChange(result.value);
    setMessage(
      "✓ Ist-Datensatz, DomainEvent, AuditEvent und Timeline-Eintrag gespeichert.",
    );
    return true;
  };
  return { dispatch, message };
}

export function ReservoirWorkspace({ run, lens, onChange }: Props) {
  const { dispatch, message } = useScientificCommand(run, onChange);
  const [tankSizeLiters, setTankSizeLiters] = useState(10);
  const [material, setMaterial] = useState("Kunststoff");
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const [standtimeHours, setStandtimeHours] = useState<number | null>(null);
  const [tempMin, setTempMin] = useState<number | null>(null);
  const [tempMax, setTempMax] = useState<number | null>(null);
  const [rhMin, setRhMin] = useState<number | null>(null);
  const [rhMax, setRhMax] = useState<number | null>(null);
  const submitReservoir = (event: FormEvent) => {
    event.preventDefault();
    dispatch({
      kind: "reservoir.record",
      reservoir: { tankSizeLiters, material, temperatureC, standtimeHours },
    });
  };
  const submitLungRoom = (event: FormEvent) => {
    event.preventDefault();
    dispatch({
      kind: "lung-room.update",
      profile: {
        roomTempMinC: tempMin,
        roomTempMaxC: tempMax,
        roomRhMin: rhMin,
        roomRhMax: rhMax,
        climateReserveNotes: "Manuell erfasster Raumkorridor",
        measuredAt: new Date().toISOString(),
      },
    });
  };
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>RESERVOIR · LUNG ROOM · {lens.toUpperCase()}</small>
          <h2>Wasser- und Raumprofil</h2>
          <p>
            Physisches Setup und reale Checkpoints bleiben getrennt von
            Tagesplan und Sollwerten.
          </p>
        </div>
      </section>
      <form className="panel form-panel" onSubmit={submitReservoir}>
        <header>
          <div>
            <small>IST-CHECKPOINT</small>
            <h2>Reservoir erfassen</h2>
          </div>
        </header>
        <div className="form-grid">
          <NumberInput
            label="Tankgröße (L)"
            value={tankSizeLiters}
            onChange={setTankSizeLiters}
          />
          <label>
            <span>Material</span>
            <input
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              required
            />
          </label>
          <NullableNumberInput
            label="Temperatur (°C)"
            value={temperatureC}
            onChange={setTemperatureC}
          />
          <NullableNumberInput
            label="Standzeit (h)"
            value={standtimeHours}
            onChange={setStandtimeHours}
          />
        </div>
        <button className="primary-button" type="submit">
          Reservoir-Checkpoint speichern
        </button>
      </form>
      <form className="panel form-panel" onSubmit={submitLungRoom}>
        <header>
          <div>
            <small>KLIMARESERVE</small>
            <h2>Lung Room</h2>
          </div>
        </header>
        <div className="form-grid">
          <NullableNumberInput
            label="Temperatur min (°C)"
            value={tempMin}
            onChange={setTempMin}
          />
          <NullableNumberInput
            label="Temperatur max (°C)"
            value={tempMax}
            onChange={setTempMax}
          />
          <NullableNumberInput
            label="rF min (%)"
            value={rhMin}
            onChange={setRhMin}
          />
          <NullableNumberInput
            label="rF max (%)"
            value={rhMax}
            onChange={setRhMax}
          />
        </div>
        <button className="primary-button" type="submit">
          Raumprofil aktualisieren
        </button>
      </form>
      {message && (
        <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>
          {message}
        </p>
      )}
      <section className="panel">
        <header>
          <div>
            <small>HISTORIE</small>
            <h2>Reservoir-Checkpoints</h2>
          </div>
        </header>
        <div className="record-list">
          {run.reservoirs.length === 0 ? (
            <p>Noch kein Reservoir erfasst.</p>
          ) : (
            run.reservoirs.map((entry) => (
              <article className="record-card" key={entry.id}>
                <div>
                  <small>
                    {entry.recordedAt
                      ? new Date(entry.recordedAt).toLocaleString("de-DE")
                      : "Legacy"}
                  </small>
                  <h3>
                    {entry.tankSizeLiters ?? "—"} L · {entry.material}
                  </h3>
                  <p>
                    {entry.temperatureC ?? "—"} °C · Standzeit{" "}
                    {entry.standtimeHours ?? "—"} h
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function EnergyWorkspace({ run, lens, onChange }: Props) {
  const { dispatch, message } = useScientificCommand(run, onChange);
  const [category, setCategory] = useState<EnergyCategory>("lighting");
  const [powerW, setPowerW] = useState(140);
  const [hours, setHours] = useState(18);
  const [day, setDay] = useState(0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    dispatch({
      kind: "energy.record",
      reading: {
        category,
        equipmentId: null,
        day,
        kwhEstimate: Math.round(((powerW * hours) / 1000) * 1000) / 1000,
        hoursPerDay: hours,
        powerW,
        source: "manual",
        notes: "Manuell erfasster Energie-Checkpoint",
      },
    });
  };
  const total = run.energyReadings.reduce(
    (sum, entry) => sum + entry.kwhEstimate,
    0,
  );
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>ENERGY LINEAGE · {lens.toUpperCase()}</small>
          <h2>Gesamtenergie</h2>
          <p>
            Licht, Klima, Irrigation und Sensorik werden als getrennte Ist- oder
            Schätzquellen geführt.
          </p>
        </div>
        <strong>{total.toFixed(2)} kWh erfasst</strong>
      </section>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Kategorie</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as EnergyCategory)
              }
            >
              {[
                "lighting",
                "exhaust",
                "circulation",
                "dehumidification",
                "humidification",
                "heating",
                "pumps",
                "sensors",
                "other",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <NumberInput
            label="Leistung (W)"
            value={powerW}
            onChange={setPowerW}
          />
          <NumberInput label="Stunden" value={hours} onChange={setHours} />
          <NumberInput label="Run-Tag" value={day} onChange={setDay} />
        </div>
        <button className="primary-button" type="submit">
          Energie speichern
        </button>
      </form>
      {message && (
        <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>
          {message}
        </p>
      )}
      <section className="panel">
        <div className="record-list">
          {run.energyReadings.map((entry) => (
            <article className="record-card" key={entry.id}>
              <div>
                <small>
                  TAG {entry.day} · {entry.source}
                </small>
                <h3>
                  {entry.category}: {entry.kwhEstimate.toFixed(3)} kWh
                </h3>
                <p>
                  {entry.powerW} W × {entry.hoursPerDay} h
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PostHarvestWorkspace({ run, lens, onChange }: Props) {
  const { dispatch, message } = useScientificCommand(run, onChange);
  const [plantId, setPlantId] = useState(run.plants[0]?.id ?? "");
  const [wetWeight, setWetWeight] = useState<number | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    dispatch({
      kind: "post-harvest.record",
      record: {
        plantId,
        harvestedAt: new Date().toISOString(),
        wetWeightGrams: wetWeight,
        dryingStartedAt: new Date().toISOString(),
        dryingEndedAt: null,
        dryingCheckpoints: [],
        finalDryWeightGrams: null,
        cureContainerType: "",
        cureStartedAt: null,
        cureCheckpoints: [],
        storageLocation: "",
        storageStartedAt: null,
        finalAwTarget: null,
        status: "drying",
      },
    });
  };
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>POST-HARVEST SUB-RUN · {lens.toUpperCase()}</small>
          <h2>Trocknung, Cure und Lagerung</h2>
          <p>
            Nachernte erhält eine eigene ID, Revision und zeitliche
            Checkpoint-Historie.
          </p>
        </div>
      </section>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Pflanze</span>
            <select
              value={plantId}
              onChange={(event) => setPlantId(event.target.value)}
            >
              {run.plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.label}
                </option>
              ))}
            </select>
          </label>
          <NullableNumberInput
            label="Nassgewicht (g)"
            value={wetWeight}
            onChange={setWetWeight}
          />
        </div>
        <button className="primary-button" type="submit" disabled={!plantId}>
          Nachernte-Run starten
        </button>
      </form>
      {message && (
        <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>
          {message}
        </p>
      )}
      <section className="panel">
        <div className="record-list">
          {run.postHarvest.length === 0 ? (
            <p>Noch kein Nachernte-Run.</p>
          ) : (
            run.postHarvest.map((entry) => (
              <article className="record-card" key={entry.id}>
                <div>
                  <small>
                    {(entry.status ?? "planned").toUpperCase()} · REV{" "}
                    {entry.revision ?? 1}
                  </small>
                  <h3>
                    {run.plants.find((plant) => plant.id === entry.plantId)
                      ?.label ?? entry.plantId}
                  </h3>
                  <p>
                    Nass {entry.wetWeightGrams ?? "—"} g · Trocken{" "}
                    {entry.finalDryWeightGrams ?? "—"} g
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function MixApplicationWorkspace({ run, lens, onChange }: Props) {
  const { dispatch, message } = useScientificCommand(run, onChange);
  const batches = run.mixBatches.filter((entry) => !entry.supersededBy);
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [volume, setVolume] = useState(0.5);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    dispatch({
      kind: "mix-application.record",
      application: {
        mixBatchId: batchId,
        plantIds: run.plants.map((entry) => entry.id),
        appliedAt: new Date().toISOString(),
        volumeLiters: volume,
        method: "manual",
        notes: "Tatsächliche Applikation",
      },
    });
  };
  return (
    <section className="panel form-panel">
      <header>
        <div>
          <small>PLAN ≠ ACTUAL · {lens.toUpperCase()}</small>
          <h2>Mix-Applikation</h2>
        </div>
      </header>
      {batches.length === 0 ? (
        <p>Zuerst eine unveränderte Mix-Charge erfassen.</p>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>Aktive Charge</span>
              <select
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchLabel}
                  </option>
                ))}
              </select>
            </label>
            <NumberInput
              label="Tatsächlich appliziert (L)"
              value={volume}
              onChange={setVolume}
            />
          </div>
          <button className="primary-button" type="submit">
            Applikation dokumentieren
          </button>
        </form>
      )}
      {message && (
        <p className={message.startsWith("✓") ? "save-state" : "inline-error"}>
          {message}
        </p>
      )}
      <div className="record-list">
        {run.mixApplications.map((entry) => (
          <article className="record-card" key={entry.id}>
            <div>
              <small>{new Date(entry.appliedAt).toLocaleString("de-DE")}</small>
              <h3>
                {entry.volumeLiters} L · {entry.method}
              </h3>
              <p>
                Charge {entry.mixBatchId} · {entry.plantIds.length} Pflanze(n)
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function NullableNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
      />
    </label>
  );
}
