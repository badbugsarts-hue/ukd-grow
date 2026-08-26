import { useMemo, useRef, useState } from "react";
import {
  createAiCorrectionRequest,
  createAiExchange,
  validateAiProposalImport,
  type AiProposal,
  type ValidatedAiProposalFile,
} from "./ai-exchange";
import {
  chooseBackupDirectory,
  createVaultCheckpoint,
  downloadCheckpoint,
  requestPersistentStorage,
  storagePressureLevel,
} from "./backup-vault";
import { applyRunCommand } from "./run-commands";
import {
  addObservation,
  addRunEvent,
  addStructuredObservation,
  createObservation,
  deriveRunAlerts,
} from "./run-state";
import { evaluateLiveClock } from "./live-run";
import {
  DangerZone,
  InlineWorkflow,
  ModalDialog,
  StatusCard,
  TermTooltip,
} from "./components/common";
import {
  createGlobalActionRegistry,
  GLOBAL_ACTION_REGISTRY,
} from "./ui-guidance";
import type {
  ExperienceLens,
  ObservationValues,
  RunEvent,
  RunPackage,
  RouteId,
  StructuredObservation,
} from "./types";

type QuickLogKind = "measurement" | "observation" | "action";
type QuickMetric = {
  key: keyof ObservationValues;
  label: string;
  unit: string;
};

const QUICK_METRICS: QuickMetric[] = [
  { key: "tempMax", label: "Lufttemperatur", unit: "°C" },
  { key: "humidityMax", label: "Luftfeuchte", unit: "% rF" },
  { key: "phIn", label: "pH Eingang", unit: "pH" },
  { key: "ecIn", label: "EC Eingang", unit: "mS/cm" },
  { key: "phDrain", label: "pH Drain", unit: "pH" },
  { key: "ecDrain", label: "EC Drain", unit: "mS/cm" },
  { key: "waterLiters", label: "Wasser appliziert", unit: "L" },
  { key: "drainLiters", label: "Drain", unit: "L" },
  { key: "potMassGrams", label: "Topfmasse", unit: "g" },
  { key: "ppfd", label: "PPFD", unit: "µmol/m²/s" },
];

interface Props {
  run: RunPackage;
  lens: ExperienceLens;
  day: number;
  now: Date;
  plan: unknown;
  knowledge: unknown;
  capabilities: unknown;
  onChange: (run: RunPackage) => void;
  onSetDay: (day: number) => void;
  onNavigate: (route: RouteId) => void;
  onHelp: () => void;
}

export function GlobalCommandCenter(props: Props) {
  const { run, lens, onChange } = props;
  const [open, setOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [anchorUtc, setAnchorUtc] = useState(() => toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [anchorCorrectionOpen, setAnchorCorrectionOpen] = useState(false);
  const [anchorReason, setAnchorReason] = useState("");
  const [completionReason, setCompletionReason] = useState("");
  const [proposalReview, setProposalReview] =
    useState<ValidatedAiProposalFile | null>(null);
  const [correctionFindings, setCorrectionFindings] =
    useState<ValidatedAiProposalFile | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickLogKind>("measurement");
  const [quickMetric, setQuickMetric] =
    useState<keyof ObservationValues>("phIn");
  const [quickValue, setQuickValue] = useState("");
  const [quickText, setQuickText] = useState("");
  const [quickSeverity, setQuickSeverity] =
    useState<StructuredObservation["severity"]>("info");
  const importRef = useRef<HTMLInputElement>(null);
  const commandCenterReturnFocusRef = useRef<HTMLElement | null>(null);
  const clock = useMemo(
    () => evaluateLiveClock(run, props.now),
    [run, props.now],
  );
  const anchorLabel =
    run.config.dayZeroAnchor === "seed-planted" ? "Aussaat" : "Durchstoß";
  const nextDayAt =
    run.liveAnchor && !clock.blocked
      ? new Date(
          Date.parse(run.liveAnchor.startedAtUtc) +
            (clock.day + 1) * 86_400_000,
        )
      : null;
  const alertCount = deriveRunAlerts(run, props.plan as never).filter(
    (entry) => !run.acknowledgedAlertIds.includes(entry.id),
  ).length;
  const latestReview = run.aiProposalReviews[0];
  const recentReviewMessage =
    latestReview && Date.now() - Date.parse(latestReview.decidedAtUtc) < 60_000
      ? `Vorschlag ${latestReview.proposalId} wurde ${latestReview.decision === "accepted" ? "angenommen" : "abgelehnt"} und auditiert.`
      : "";
  const displayMessage = message || recentReviewMessage;

  const openQuickLog = () => {
    setOpen(false);
    setQuickLogOpen(true);
    setMessage("");
  };

  const saveQuickLog = () => {
    const occurredAt = new Date().toISOString();
    const operationalDay = run.executionMode === "live" ? clock.day : props.day;
    if (quickKind === "measurement") {
      const value = Number(quickValue.replace(",", "."));
      if (!Number.isFinite(value)) {
        setMessage("Bitte einen gültigen Messwert eingeben.");
        return;
      }
      const observation = createObservation(operationalDay);
      onChange(
        addObservation(run, {
          ...observation,
          recordedAt: occurredAt,
          values: { ...observation.values, [quickMetric]: value },
          notes: quickText.trim(),
        }),
      );
    } else if (quickKind === "observation") {
      if (!quickText.trim()) {
        setMessage("Bitte die Beobachtung beschreiben.");
        return;
      }
      onChange(
        addStructuredObservation(run, {
          id: crypto.randomUUID(),
          runId: run.id,
          zoneId: run.zones[0]?.id ?? "unassigned-zone",
          ...(run.plants.length === 1 && run.plants[0]
            ? { plantId: run.plants[0].id }
            : {}),
          observedAt: occurredAt,
          category: "general",
          severity: quickSeverity,
          text: quickText.trim(),
          tags: ["quick-log"],
          photoIds: [],
        }),
      );
    } else {
      if (!quickText.trim()) {
        setMessage("Bitte die ausgeführte Aktion beschreiben.");
        return;
      }
      const event: RunEvent = {
        id: crypto.randomUUID(),
        day: operationalDay,
        occurredAt,
        category: "action",
        title: "Quick Log · Aktion",
        detail: quickText.trim(),
      };
      onChange(addRunEvent(run, event));
    }
    setQuickValue("");
    setQuickText("");
    setQuickLogOpen(false);
    setMessage("Quick Log wurde mit Audit- und Timeline-Spur gespeichert.");
  };

  const startLive = async () => {
    setBusy(true);
    setMessage("");
    try {
      const storage = await requestPersistentStorage();
      const initial = await createVaultCheckpoint(run, "critical");
      if (!initial.externalWritten)
        downloadCheckpoint(
          initial.download,
          `ukd-preflight-${run.id}.ukdbackup`,
        );
      const started = applyRunCommand(run, {
        kind: "live.clone-and-start",
        startedAtUtc: new Date(anchorUtc).toISOString(),
        anchorKind:
          run.config.dayZeroAnchor === "seed-planted"
            ? "seed-planted"
            : "emergence",
        timeZoneAtConfirmation:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      if (!started.ok)
        throw new Error(started.errors.map((entry) => entry.message).join(" "));
      let live = {
        ...started.value,
        backupState: {
          ...started.value.backupState,
          persistentStorage: storage.status,
          usageBytes: storage.usageBytes,
          quotaBytes: storage.quotaBytes,
        },
      };
      onChange(live);
      const checkpoint = await createVaultCheckpoint(live, "critical");
      const recorded = applyRunCommand(live, {
        kind: "backup.checkpoint",
        checkpointId: checkpoint.id,
        sha256: checkpoint.sha256,
        checkpointKind: "critical",
        verified: checkpoint.verified,
      });
      if (recorded.ok) {
        live = recorded.value;
        onChange(live);
      }
      props.onSetDay(0);
      setLiveOpen(false);
      setOpen(false);
      setMessage("Live-Run gestartet und zweimal verifiziert gesichert.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Live-Preflight fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  };

  const createManualBackup = async () => {
    setBusy(true);
    setMessage("");
    try {
      const checkpoint = await createVaultCheckpoint(run, "manual");
      if (!checkpoint.externalWritten)
        downloadCheckpoint(
          checkpoint.download,
          `ukd-${run.id}-${Date.now()}.ukdbackup`,
        );
      const recorded = applyRunCommand(run, {
        kind: "backup.checkpoint",
        checkpointId: checkpoint.id,
        sha256: checkpoint.sha256,
        checkpointKind: "manual",
        verified: true,
      });
      if (recorded.ok) onChange(recorded.value);
      setMessage(
        checkpoint.externalWritten
          ? "Backup geschrieben und per Readback verifiziert."
          : "Verifiziertes Backup heruntergeladen.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Backup fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  };

  const exportAi = async () => {
    const exchange = await createAiExchange(run, {
      plan: props.plan,
      knowledge: props.knowledge,
      diagnostics: {
        alerts: deriveRunAlerts(run, props.plan as never),
        clock: run.clockHealth,
      },
      capabilities: props.capabilities,
    });
    downloadJson(`ukd-ai-exchange-${run.id}`, exchange);
    setMessage("Datenschutzbereinigter AI-Austausch exportiert.");
  };

  const importAi = async (file: File) => {
    setMessage("");
    const raw = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setMessage(
        "JSON ist nicht lesbar. Der Reparaturassistent benötigt eine gültige JSON-Grundstruktur.",
      );
      return;
    }
    const validated = await validateAiProposalImport(parsed, raw, run);
    if (validated.findings.some((entry) => entry.severity === "error")) {
      setCorrectionFindings(validated);
      setProposalReview(null);
    } else {
      setProposalReview(validated);
      setCorrectionFindings(null);
    }
  };

  const decide = (proposal: AiProposal, decision: "accept" | "reject") => {
    if (!proposalReview) return;
    const reason =
      decision === "accept"
        ? "Nach Einzelprüfung durch Nutzer angenommen."
        : "Nach Einzelprüfung durch Nutzer abgelehnt.";
    const result = applyRunCommand(
      run,
      decision === "accept"
        ? {
            kind: "ai-proposal.accept",
            proposalId: proposal.id,
            fileSha256: proposalReview.fileSha256,
            targetPath: proposal.targetPath,
            reason,
            value: proposal.proposedValue,
          }
        : {
            kind: "ai-proposal.reject",
            proposalId: proposal.id,
            fileSha256: proposalReview.fileSha256,
            targetPath: proposal.targetPath,
            reason,
          },
    );
    if (!result.ok) {
      setMessage(result.errors.map((entry) => entry.message).join(" "));
      return;
    }
    onChange(result.value);
    void createVaultCheckpoint(result.value, "critical")
      .then((checkpoint) => {
        const checkpointResult = applyRunCommand(result.value, {
          kind: "backup.checkpoint",
          checkpointId: checkpoint.id,
          sha256: checkpoint.sha256,
          checkpointKind: "critical",
          verified: true,
        });
        if (checkpointResult.ok) onChange(checkpointResult.value);
      })
      .catch(() =>
        setMessage(
          "AI-Entscheidung ist protokolliert; der sofortige Checkpoint ist fehlgeschlagen und wird erneut vorgemerkt.",
        ),
      );
    const remaining = proposalReview.file.proposals.filter(
      (entry) => entry.id !== proposal.id,
    );
    setProposalReview(
      remaining.length === 0
        ? null
        : {
            ...proposalReview,
            file: { ...proposalReview.file, proposals: remaining },
          },
    );
    setMessage(
      `Vorschlag ${proposal.id} wurde ${decision === "accept" ? "angenommen" : "abgelehnt"} und auditiert.`,
    );
  };

  const correctAnchor = async () => {
    const result = applyRunCommand(run, {
      kind: "live.correct-anchor",
      nextStartedAtUtc: new Date(anchorUtc).toISOString(),
      reason: anchorReason,
    });
    if (!result.ok) {
      setMessage(result.errors.map((entry) => entry.message).join(" "));
      return;
    }
    onChange(result.value);
    const checkpoint = await createVaultCheckpoint(result.value, "critical");
    const recorded = applyRunCommand(result.value, {
      kind: "backup.checkpoint",
      checkpointId: checkpoint.id,
      sha256: checkpoint.sha256,
      checkpointKind: "critical",
      verified: true,
    });
    if (recorded.ok) onChange(recorded.value);
    setAnchorCorrectionOpen(false);
    setAnchorReason("");
    setMessage("Anker append-only korrigiert und sofort gesichert.");
  };

  const completeRun = async () => {
    const result = applyRunCommand(run, {
      kind: "live.complete",
      reason: completionReason,
    });
    if (!result.ok) {
      setMessage(result.errors.map((entry) => entry.message).join(" "));
      return;
    }
    onChange(result.value);
    const checkpoint = await createVaultCheckpoint(result.value, "completion");
    const recorded = applyRunCommand(result.value, {
      kind: "backup.checkpoint",
      checkpointId: checkpoint.id,
      sha256: checkpoint.sha256,
      checkpointKind: "completion",
      verified: true,
    });
    if (recorded.ok) onChange(recorded.value);
    setCompletionReason("");
    setMessage(
      "Live-Run abgeschlossen; Abschlussbackup bleibt dauerhaft erhalten.",
    );
  };

  const actions = createGlobalActionRegistry(
    {
      executionMode: run.executionMode,
      clockBlocked: clock.blocked,
    },
    {
      "live.start": () => {
        setAnchorUtc(toLocalInput(configuredAnchorDate(run)));
        setOpen(false);
        setLiveOpen(true);
      },
      "day.today": () => props.onSetDay(clock.day),
      "log.quick": openQuickLog,
      "backup.now": createManualBackup,
      "ai.export": exportAi,
      "ai.import": () => importRef.current?.click(),
    },
  );

  const pressure = storagePressureLevel(
    run.backupState.usageBytes,
    run.backupState.quotaBytes,
  );
  return (
    <>
      <div
        className="global-command-center"
        role="toolbar"
        aria-label="Globales Command Center"
      >
        <button
          type="button"
          className={`mode-chip mode-${run.executionMode}`}
          onClick={(event) => {
            commandCenterReturnFocusRef.current = event.currentTarget;
            setOpen(true);
          }}
          aria-label="Betriebsmodus und globale Aktionen öffnen"
        >
          {run.executionMode === "live"
            ? `● LIVE · Tag ${clock.day}`
            : "◇ SIMULATION"}
        </button>
        {run.executionMode === "live" && (
          <div
            className={`live-status-strip ${clock.blocked ? "is-blocked" : "is-healthy"}`}
            role={clock.blocked ? "alert" : "status"}
            aria-live="polite"
          >
            <span className="live-status-pulse" aria-hidden="true" />
            <span className="live-status-copy">
              <strong>
                {props.now.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </strong>
              <small>
                {clock.blocked
                  ? "Zeitprüfung erforderlich"
                  : `Nächster Tag ${nextDayAt?.toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
              </small>
            </span>
            {props.day !== clock.day && (
              <span className="live-view-day">Ansicht D{props.day}</span>
            )}
          </div>
        )}
        {run.executionMode === "live" && (
          <button
            type="button"
            className="command-desktop-secondary"
            onClick={() => void actions["day.today"].execute()}
            aria-description={actions["day.today"].help}
          >
            {actions["day.today"].label}
          </button>
        )}
        <button
          type="button"
          className="command-quick-log"
          onClick={() => void actions["log.quick"].execute()}
          disabled={!actions["log.quick"].availability.enabled}
          aria-description={actions["log.quick"].help}
        >
          {actions["log.quick"].label}
        </button>
        <button
          type="button"
          className="command-desktop-secondary"
          onClick={() => props.onNavigate("today")}
          aria-label={`${alertCount} offene Hinweise`}
        >
          Alerts {alertCount > 0 ? `(${alertCount})` : ""}
        </button>
        <button
          type="button"
          className="command-desktop-secondary"
          onClick={() => void actions["backup.now"].execute()}
          disabled={busy}
          aria-description={GLOBAL_ACTION_REGISTRY["backup.now"].help}
        >
          Sichern
        </button>
        <button
          className="command-more"
          type="button"
          onClick={(event) => {
            commandCenterReturnFocusRef.current = event.currentTarget;
            setOpen(true);
          }}
        >
          AI / Mehr
        </button>
      </div>
      {displayMessage &&
        !open &&
        !liveOpen &&
        !quickLogOpen &&
        !proposalReview &&
        !correctionFindings && (
          <p className="command-global-status" role="status">
            {displayMessage}
          </p>
        )}

      {open && !liveOpen && !proposalReview && !correctionFindings && (
        <ModalDialog
          open
          title="Command Center"
          eyebrow="Global verfügbar"
          onClose={() => setOpen(false)}
          closeLabel="Command Center schließen"
          returnFocusTargetRef={commandCenterReturnFocusRef}
        >
          <div className="status-grid">
            <StatusCard
              label="Betrieb"
              tone={run.executionMode === "live" ? "warning" : "success"}
              value={
                run.executionMode === "live"
                  ? `Live · Tag ${clock.day}`
                  : `Simulation · Ansichtstag ${props.day}`
              }
            />
            <StatusCard
              label="Uhr"
              tone={clock.blocked ? "danger" : "success"}
              value={clock.blocked ? "BLOCKIERT" : "Verifiziert"}
            />
            <StatusCard
              label="Backup"
              tone={run.backupState.lastCheckpointAtUtc ? "success" : "warning"}
              value={
                run.backupState.lastCheckpointAtUtc
                  ? new Date(
                      run.backupState.lastCheckpointAtUtc,
                    ).toLocaleString("de-DE")
                  : "Noch offen"
              }
            />
            <StatusCard
              label="Speicher"
              tone={
                pressure && pressure >= 85
                  ? "danger"
                  : pressure
                    ? "warning"
                    : "neutral"
              }
              value={
                pressure
                  ? `${pressure}% Warnstufe`
                  : run.backupState.persistentStorage
              }
            />
          </div>
          {clock.blocked && (
            <p className="inline-error" role="alert">
              {clock.health.detail}
            </p>
          )}
          <div className="command-action-grid">
            {run.executionMode === "simulation" && (
              <button
                type="button"
                className="primary-button"
                onClick={() => void actions["live.start"].execute()}
                aria-description={actions["live.start"].help}
              >
                ● {actions["live.start"].label}
              </button>
            )}
            {run.executionMode === "live" && (
              <button
                type="button"
                onClick={() => {
                  setAnchorUtc(
                    toLocalInput(
                      new Date(run.liveAnchor?.startedAtUtc ?? Date.now()),
                    ),
                  );
                  setAnchorCorrectionOpen((value) => !value);
                }}
              >
                Aussaatanker korrigieren
              </button>
            )}
            <button
              type="button"
              onClick={() => void actions["log.quick"].execute()}
              disabled={!actions["log.quick"].availability.enabled}
            >
              {actions["log.quick"].label} öffnen
            </button>
            <button
              type="button"
              onClick={() => void actions["backup.now"].execute()}
              disabled={busy}
            >
              Sofortbackup
            </button>
            <button
              type="button"
              onClick={() =>
                void chooseBackupDirectory().then((handle) =>
                  setMessage(
                    handle
                      ? `Backup-Ordner „${handle.name}“ verbunden.`
                      : "Dieser Browser unterstützt keinen direkten Ordnerzugriff.",
                  ),
                )
              }
            >
              Backup-Ordner wählen
            </button>
            <button
              type="button"
              onClick={() => void actions["ai.export"].execute()}
              aria-description={actions["ai.export"].help}
            >
              {actions["ai.export"].label}
            </button>
            <button
              type="button"
              onClick={() => void actions["ai.import"].execute()}
              aria-description={actions["ai.import"].help}
            >
              {actions["ai.import"].label}
            </button>
            <button type="button" onClick={props.onHelp}>
              Kontexthilfe
            </button>
          </div>
          {run.executionMode === "live" && anchorCorrectionOpen && (
            <InlineWorkflow aria-labelledby="anchor-correction-title">
              <h3 id="anchor-correction-title">Begründete Ankerkorrektur</h3>
              <label>
                Neuer Aussaatzeitpunkt
                <input
                  type="datetime-local"
                  value={anchorUtc}
                  onChange={(event) => setAnchorUtc(event.target.value)}
                />
              </label>
              <label>
                Begründung
                <textarea
                  value={anchorReason}
                  onChange={(event) => setAnchorReason(event.target.value)}
                  minLength={8}
                />
              </label>
              <button type="button" onClick={() => void correctAnchor()}>
                Korrektur prüfen & sichern
              </button>
            </InlineWorkflow>
          )}
          {run.executionMode === "live" && run.status !== "archived" && (
            <DangerZone summary="Live-Run abschließen">
              <label>
                Abschlussgrund
                <textarea
                  value={completionReason}
                  onChange={(event) => setCompletionReason(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => void completeRun()}>
                Abschließen und dauerhaft sichern
              </button>
            </DangerZone>
          )}
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json,.json,.ukdai"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importAi(file);
              event.currentTarget.value = "";
            }}
          />
          <details className="global-action-help">
            <summary>Hilfe zu allen globalen Aktionen</summary>
            <dl>
              {Object.entries(GLOBAL_ACTION_REGISTRY).map(([id, action]) => (
                <div key={id}>
                  <dt>{action.label}</dt>
                  <dd>{action.help}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="microcopy">
            <TermTooltip
              term="Evidenz"
              lens={lens}
              customText="AI erklärt und schlägt vor. Jede Änderung benötigt deine Einzelprüfung; Evidenz, Formeln und Live-Anker bleiben gesperrt."
              showIcon
            >
              Warum AI nur Vorschläge liefert
            </TermTooltip>
          </p>
          {displayMessage && (
            <p className="command-message" role="status">
              {displayMessage}
            </p>
          )}
        </ModalDialog>
      )}

      <ModalDialog
        open={quickLogOpen}
        title="Quick Log"
        eyebrow={
          run.executionMode === "live"
            ? `Live · Tag ${clock.day}`
            : `Simulation · Tag ${props.day}`
        }
        onClose={() => setQuickLogOpen(false)}
        closeLabel="Quick Log schließen"
        className="quick-log-sheet"
      >
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Art des Eintrags"
        >
          {(
            [
              ["measurement", "Messwert"],
              ["observation", "Beobachtung"],
              ["action", "Aktion"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={quickKind === kind}
              className={quickKind === kind ? "active" : ""}
              onClick={() => setQuickKind(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        {quickKind === "measurement" && (
          <div className="quick-log-measurement-grid">
            <label>
              Messgröße
              <select
                value={quickMetric}
                onChange={(event) =>
                  setQuickMetric(event.target.value as keyof ObservationValues)
                }
              >
                {QUICK_METRICS.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label} · {metric.unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wert
              <input
                inputMode="decimal"
                value={quickValue}
                onChange={(event) => setQuickValue(event.target.value)}
                placeholder="Messwert"
              />
            </label>
          </div>
        )}
        {quickKind === "observation" && (
          <label>
            Schwere
            <select
              value={quickSeverity}
              onChange={(event) =>
                setQuickSeverity(
                  event.target.value as StructuredObservation["severity"],
                )
              }
            >
              <option value="info">Information</option>
              <option value="mild">Leicht</option>
              <option value="moderate">Mittel</option>
              <option value="severe">Schwer</option>
            </select>
          </label>
        )}
        <label>
          {quickKind === "measurement"
            ? "Notiz (optional)"
            : quickKind === "observation"
              ? "Beobachtung"
              : "Ausgeführte Aktion"}
          <textarea
            rows={4}
            value={quickText}
            onChange={(event) => setQuickText(event.target.value)}
          />
        </label>
        <p className="microcopy">
          Der Eintrag wird getrennt von Sollwerten gespeichert und erhält Zeit-,
          Audit- und Timeline-Spur.
        </p>
        {message && (
          <p className="inline-error" role="alert">
            {message}
          </p>
        )}
        <div className="button-row dialog-actions">
          <button type="button" onClick={() => setQuickLogOpen(false)}>
            Abbrechen
          </button>
          <button type="button" className="primary-button" onClick={saveQuickLog}>
            Eintrag speichern
          </button>
        </div>
      </ModalDialog>

      {liveOpen && (
        <ModalDialog
          open
          title="Simulation als Live-Run starten"
          eyebrow="Geführter Preflight"
          onClose={() => setLiveOpen(false)}
          closeLabel="Live-Preflight schließen"
        >
          <ol className="preflight-list">
            <li>
              Setup: {run.config.genetics} · {run.config.medium} ·{" "}
              {run.plants.length} Pflanze(n)
            </li>
            <li>Pflanzenidentität und {anchorLabel}-Zeitpunkt bestätigen</li>
            <li>Persistenten Speicher prüfen</li>
            <li>Simulation unverändert erhalten und neuen Run erzeugen</li>
            <li>Vorher-/Nachher-Backup mit SHA-256-Readback</li>
          </ol>
          <label>
            {anchorLabel}-Zeitpunkt (Live-Tag 0)
            <input
              type="datetime-local"
              value={anchorUtc}
              max={toLocalInput(new Date())}
              onChange={(event) => setAnchorUtc(event.target.value)}
            />
          </label>
          <p className="microcopy">
            Live-Tag 0 beginnt exakt an diesem UTC-Zeitpunkt. Lokale Mitternacht
            und Sommerzeit ändern den Tageswechsel nicht.
          </p>
          <div className="button-row">
            <button type="button" onClick={() => setLiveOpen(false)}>
              Abbrechen
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={busy || !anchorUtc}
              onClick={() => void startLive()}
            >
              {busy
                ? "Prüfen und sichern…"
                : `${anchorLabel} bestätigen & Live starten`}
            </button>
          </div>
          {message && (
            <p className="inline-error" role="alert">
              {message}
            </p>
          )}
        </ModalDialog>
      )}

      {proposalReview && proposalReview.file.proposals.length > 0 && (
        <ModalDialog
          open
          title="AI-Vorschläge"
          eyebrow="Untrusted · Einzelprüfung"
          onClose={() => setProposalReview(null)}
          closeLabel="Vorschläge schließen"
          className="proposal-sheet"
        >
          {proposalReview.file.proposals.map((proposal) => (
            <article className="proposal-card" key={proposal.id}>
              <h3>{proposal.targetPath}</h3>
              <p>{proposal.reason}</p>
              <dl>
                <dt>Ausgang</dt>
                <dd>{JSON.stringify(proposal.baseValue)}</dd>
                <dt>Vorschlag</dt>
                <dd>{JSON.stringify(proposal.proposedValue)}</dd>
                <dt>Unsicherheit</dt>
                <dd>{proposal.uncertainty}</dd>
                <dt>Belege</dt>
                <dd>
                  {[
                    ...proposal.ruleIds,
                    ...proposal.claimIds,
                    ...proposal.sourceIds,
                  ].join(", ") || "Keine – daher besonders kritisch prüfen"}
                </dd>
              </dl>
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => decide(proposal, "reject")}
                >
                  Ablehnen
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => decide(proposal, "accept")}
                >
                  Annehmen
                </button>
              </div>
            </article>
          ))}
        </ModalDialog>
      )}

      {correctionFindings && (
        <ModalDialog
          open
          title="AI-Datei reparieren"
          eyebrow="Quarantäne"
          onClose={() => setCorrectionFindings(null)}
          closeLabel="Reparaturassistent schließen"
        >
          <ul className="finding-list">
            {correctionFindings.findings.map((finding, index) => (
              <li key={`${finding.path}-${index}`}>
                <strong>{finding.path}</strong>: {finding.message}
                {finding.example !== undefined && (
                  <code>{JSON.stringify(finding.example)}</code>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              downloadJson(
                `ukd-ai-correction-${correctionFindings.fileSha256.slice(0, 8)}`,
                createAiCorrectionRequest(
                  correctionFindings.fileSha256,
                  correctionFindings.findings,
                ),
              )
            }
          >
            Correction Request exportieren
          </button>
        </ModalDialog>
      )}
    </>
  );
}

function configuredAnchorDate(run: RunPackage): Date {
  const selectedKind =
    run.config.dayZeroAnchor === "seed-planted" ? "seed-planted" : "emergence";
  const milestone = run.growthEvents.find(
    (event) => event.kind === selectedKind && event.confidence === "confirmed",
  );
  const configured = milestone?.occurredAt || run.config.startDate;
  if (!configured) return new Date();
  const parsed = new Date(
    configured.includes("T") ? configured : `${configured}T00:00:00Z`,
  );
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function downloadJson(name: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
