import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import auditData from "./data/legacy-audit.json";
import knowledgeData from "./data/knowledge-base.json";
import aiContext from "./data/ai-context.json";
import skillsData from "./data/skills.json";
import {
  DAILY_COLUMNS,
  calculateMix,
  getDailySheet,
  getDayPlan,
  numberAt,
  textAt,
} from "./domain";
import type {
  AuditFinding,
  CellValue,
  ExperienceLens,
  KnowledgeBase,
  RouteId,
  Workbook,
  WorkbookSheet,
} from "./types";

let workbook: Workbook = {};
const knowledge = knowledgeData as KnowledgeBase;
const audit = auditData as {
  schemaVersion: string;
  source: string;
  reviewedAt?: string;
  rows: AuditFinding[];
};
const AUDIT_COUNT = audit.rows.length;
const EMPTY_SHEET: WorkbookSheet = {
  range: "A1:A1",
  values: [[]],
  formulas: [[]],
};
const DEFAULT_NAV: NavItem = {
  id: "cockpit",
  label: "Cockpit",
  short: "Home",
  icon: "⌂",
  group: "Operator",
  description: "Run-Status und wichtigste Entscheidungen",
};

interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  icon: string;
  group: string;
  description: string;
}

const NAV: NavItem[] = [
  {
    id: "cockpit",
    label: "Cockpit",
    short: "Home",
    icon: "⌂",
    group: "Operator",
    description: "Run-Status und wichtigste Entscheidungen",
  },
  {
    id: "today",
    label: "Heute",
    short: "Heute",
    icon: "◉",
    group: "Operator",
    description: "Tagesziele, Aktionen und Stop-Regeln",
  },
  {
    id: "timeline",
    label: "Zeitachse",
    short: "Plan",
    icon: "↝",
    group: "Operator",
    description: "Alle 81 Tage und Phasen",
  },
  {
    id: "mix",
    label: "Mischlabor",
    short: "Mix",
    icon: "⌁",
    group: "Werkzeuge",
    description: "Batchmengen und sichere Mischreihenfolge",
  },
  {
    id: "climate",
    label: "Klima & Licht",
    short: "Klima",
    icon: "☼",
    group: "Werkzeuge",
    description: "PPFD, DLI, Temperatur, rF und VPD",
  },
  {
    id: "nutrients",
    label: "Nährstoffsystem",
    short: "Feed",
    icon: "◇",
    group: "Werkzeuge",
    description: "Reference-Feed und Stack-Grenzen",
  },
  {
    id: "products",
    label: "Produkte",
    short: "Produkte",
    icon: "▦",
    group: "Bibliothek",
    description: "UKD-relevante Produktmatrix",
  },
  {
    id: "compatibility",
    label: "Kompatibilität",
    short: "Matrix",
    icon: "⊞",
    group: "Bibliothek",
    description: "Kombinationen und Konflikte",
  },
  {
    id: "diagnostics",
    label: "Diagnose",
    short: "Diagnose",
    icon: "△",
    group: "Bibliothek",
    description: "Messwertbasierte Problem-Triage",
  },
  {
    id: "knowledge",
    label: "Wissen & Quellen",
    short: "Wissen",
    icon: "◫",
    group: "Evidenz",
    description: "Faktencheck mit Scope und Unsicherheit",
  },
  {
    id: "audit",
    label: "Audit Center",
    short: "Audit",
    icon: "✓",
    group: "Evidenz",
    description: `${AUDIT_COUNT} forensische Findings und Korrekturen`,
  },
  {
    id: "raw",
    label: "Rohdaten",
    short: "Daten",
    icon: "⌗",
    group: "System",
    description: "27 Blätter, Werte und Formeln",
  },
];

const LENSES: Array<{ id: ExperienceLens; label: string; compact: string }> = [
  { id: "guided", label: "Guided", compact: "G" },
  { id: "advanced", label: "Advanced", compact: "A" },
  { id: "expert", label: "Expert", compact: "E" },
];

const HELP: Record<
  RouteId,
  { what: string; why: string; how: string; interpret: string }
> = {
  cockpit: {
    what: "Die verdichtete Operator-Sicht auf den ausgewählten Run-Tag.",
    why: "Sie bündelt Entscheidungen, ohne die 45 Tagesplan-Spalten zu verstecken.",
    how: "Tag wählen, Stop-Regeln prüfen und dann Heute oder Mischlabor öffnen.",
    interpret:
      "Sollwerte sind Plantrajektorien. Aktuelle Pflanzen- und Messdaten haben Vorrang.",
  },
  today: {
    what: "Alle operativen Werte und Aufgaben für einen Tag.",
    why: "Klima, Licht, Wasser, Feed und Training müssen gemeinsam betrachtet werden.",
    how: "Von oben nach unten prüfen; offene Messwerte zuerst erfassen.",
    interpret:
      "Ein Kalenderwert ist keine Freigabe zur Erhöhung bei Stress oder auffälligem Drain-EC.",
  },
  timeline: {
    what: "Der komplette 81-Tage-Plan mit triggerbasierten Feed-Phasen.",
    why: "So werden Übergänge und kumulative Belastungen sichtbar.",
    how: "Mit Slider oder Tabelle zu einem Tag springen.",
    interpret:
      "Blüte- und Nährstofftrigger sind konfigurierbar; Licht/Klima bleiben konservative Planung.",
  },
  mix: {
    what: "Ein Batchrechner auf Basis des ausgewählten Tages.",
    why: "Er verhindert Übertragungsfehler von ml/L zu Batchmengen.",
    how: "Batchvolumen eingeben, Reihenfolge befolgen, Endmix messen.",
    interpret:
      "Athena und pH Down bei 0 bedeuten nicht 'vergessen', sondern 'nur nach Messung'.",
  },
  climate: {
    what: "Die Licht- und Klimakurven des Plans.",
    why: "PPFD, DLI, Temperatur, rF und VPD sind gekoppelt.",
    how: "Kurven prüfen und mit realen Messungen vergleichen.",
    interpret: "Leaf-VPD ist ohne Blatttemperaturmessung eine Schätzung.",
  },
  nutrients: {
    what: "Das operative HESI-Reference-System plus klar getrennte A/B-Optionen.",
    why: "Markenübergreifendes Stapeln kann Nährstoffe und Biostimulanzien duplizieren.",
    how: "Reference stabil halten und pro Test nur eine Variable ändern.",
    interpret:
      "Herstellerlabel, UKD-Reduktion und experimentelle Option sind unterschiedliche Evidenzebenen.",
  },
  products: {
    what: "Die im Projekt evaluierten Produkte.",
    why: "Die Liste macht Rollen, Phasen und Risiken vergleichbar.",
    how: "Suchen und anschließend Kompatibilität prüfen.",
    interpret: "Der Katalog ist UKD-relevant, nicht global vollständig.",
  },
  compatibility: {
    what: "Die Legacy-Kompatibilitätsmatrix als zugängliche Datentabelle.",
    why: "Doppelte Enzyme, Siliziumquellen oder PK-Module sind schnell übersehen.",
    how: "Nach Produkt oder Konflikt suchen.",
    interpret:
      "Eine grüne Zelle ist keine Wirksamkeitsgarantie; Scope und Quellen bleiben maßgeblich.",
  },
  diagnostics: {
    what: "Eine strukturierte Triage, keine automatische Pflanzen-Diagnose.",
    why: "Viele Symptome entstehen durch Messfehler, Wurzelzone oder Klima statt einen einzelnen Mangel.",
    how: "Erst pH/EC/Drain/Klima/Bewässerung prüfen, dann Hypothesen priorisieren.",
    interpret: "Ohne Messwerte bleibt die Diagnose ausdrücklich offen.",
  },
  knowledge: {
    what: "Die 2026 neu kuratierte Evidenzschicht.",
    why: "Sie trennt Gesetz, Forschung, Herstellerangabe und UKD-Inferenz.",
    how: "Claim öffnen, Scope und Unsicherheit lesen, Primärquelle prüfen.",
    interpret:
      "Verified-with-boundary bedeutet: Aussage stimmt im angegebenen Rahmen, nicht universell.",
  },
  audit: {
    what: `Alle ${AUDIT_COUNT} Findings der Evidence-Guarded-v6-Prüfung.`,
    why: "Es dokumentiert, warum wichtige Planentscheidungen geändert wurden.",
    how: "Nach Priorität filtern und Restunsicherheiten prüfen.",
    interpret:
      "FIXED heißt im geprüften Workbook korrigiert, nicht wissenschaftlich endgültig bewiesen.",
  },
  raw: {
    what: "Die vollständige Legacy-Datenbasis mit 27 Blättern.",
    why: "Nichts wird durch die neue Darstellung unsichtbar oder gelöscht.",
    how: "Blatt wählen, Werte prüfen; im Expert-Modus Formeln einblenden.",
    interpret:
      "Berechnete Werte stammen aus dem Evidence-Guarded-v6-Workbook und werden hier nicht still neu erfunden.",
  },
};

function readRoute(): RouteId {
  const value = window.location.hash.replace(/^#\/?/, "") as RouteId;
  return NAV.some((item) => item.id === value) ? value : "cockpit";
}

function readLens(): ExperienceLens {
  const query = new URLSearchParams(window.location.search).get("lens");
  const saved = localStorage.getItem("ukd:lens");
  const value = query ?? saved;
  return value === "advanced" || value === "expert" ? value : "guided";
}

function readDay(): number {
  const query = Number(new URLSearchParams(window.location.search).get("day"));
  const saved = Number(localStorage.getItem("ukd:day"));
  const value = Number.isFinite(query) && query >= 0 ? query : saved;
  return Math.max(
    0,
    Math.min(80, Number.isFinite(value) ? Math.round(value) : 0),
  );
}

function App() {
  const [data, setData] = useState<Workbook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/evidence-guarded-workbook-v6.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Workbook>;
      })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadError(
          error instanceof Error ? error.message : "Unbekannter Ladefehler",
        );
      });
    return () => controller.abort();
  }, []);

  if (loadError)
    return (
      <DataState
        title="Datenbasis konnte nicht geladen werden"
        detail={loadError}
        error
      />
    );
  if (!data)
    return (
      <DataState
        title="Operator Workspace wird vorbereitet"
        detail={`27 Blätter und ${AUDIT_COUNT} Audit-Findings werden geladen…`}
      />
    );
  workbook = data;
  return <Workspace />;
}

function Workspace() {
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [lens, setLens] = useState<ExperienceLens>(readLens);
  const [day, setDay] = useState(readDay);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("ukd:theme") === "light" ? "light" : "dark",
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const plan = useMemo(() => getDayPlan(workbook, day), [day]);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    localStorage.setItem("ukd:lens", lens);
    localStorage.setItem("ukd:day", String(day));
    const url = new URL(window.location.href);
    url.searchParams.set("lens", lens);
    url.searchParams.set("day", String(day));
    window.history.replaceState({}, "", url);
  }, [lens, day]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ukd:theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        setNavOpen(false);
      }
      if (event.key === "?") setHelpOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = (next: RouteId) => {
    window.location.hash = next;
    setRoute(next);
    setNavOpen(false);
  };

  const active = NAV.find((item) => item.id === route) ?? DEFAULT_NAV;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Zum Inhalt springen
      </a>
      <Sidebar
        route={route}
        onNavigate={navigate}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="app-column">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Navigation öffnen"
          >
            ☰
          </button>
          <div className="breadcrumb">
            <span>UKD /</span> {active.label}
          </div>
          <button
            className="command-trigger"
            type="button"
            onClick={() => setPaletteOpen(true)}
          >
            <span>⌕</span>
            <span>Suche, Ansicht oder Aktion</span>
            <kbd>Ctrl K</kbd>
          </button>
          <LensControl lens={lens} onChange={setLens} />
          <button
            className="icon-button"
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Hilfe zur Ansicht"
          >
            ?
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Farbschema wechseln"
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
        </header>
        <main
          id="main-content"
          className={`main-content lens-${lens}`}
          tabIndex={-1}
        >
          <PageHeader
            item={active}
            lens={lens}
            day={day}
            setDay={setDay}
            onHelp={() => setHelpOpen(true)}
          />
          {lens === "guided" && (
            <GuidedBanner route={route} onHelp={() => setHelpOpen(true)} />
          )}
          <RouteContent
            route={route}
            lens={lens}
            plan={plan}
            day={day}
            setDay={setDay}
            navigate={navigate}
          />
        </main>
        <MobileBar route={route} onNavigate={navigate} />
      </div>
      {helpOpen && (
        <HelpDrawer
          route={route}
          lens={lens}
          onClose={() => setHelpOpen(false)}
        />
      )}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={navigate}
          setDay={setDay}
        />
      )}
    </div>
  );
}

function Sidebar({
  route,
  onNavigate,
  open,
  onClose,
}: {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const groups = [...new Set(NAV.map((item) => item.group))];
  const formulaCount = Object.values(workbook).reduce(
    (sum, sheet) =>
      sum +
      sheet.formulas.flat().filter((formula) => String(formula).startsWith("="))
        .length,
    0,
  );
  return (
    <>
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Hauptnavigation"
      >
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span>U</span>
          </div>
          <div>
            <strong>UKD Masterplan</strong>
            <small>Operator Workspace · v6</small>
          </div>
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={onClose}
            aria-label="Navigation schließen"
          >
            ×
          </button>
        </div>
        <div className="system-badge">
          <span className="status-dot" /> Datenstand 08.08.2026
        </div>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={route === item.id ? "active" : ""}
                  onClick={() => onNavigate(item.id)}
                  aria-current={route === item.id ? "page" : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === "audit" && (
                    <span className="nav-count">{AUDIT_COUNT}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>
            27 Blätter · {formulaCount.toLocaleString("de-DE")} Formeln
          </span>
          <span>Evidence-Guarded v6 · geprüft 08.08.2026</span>
        </div>
      </aside>
      {open && (
        <button
          className="nav-backdrop"
          type="button"
          onClick={onClose}
          aria-label="Navigation schließen"
        />
      )}
    </>
  );
}

function LensControl({
  lens,
  onChange,
}: {
  lens: ExperienceLens;
  onChange: (lens: ExperienceLens) => void;
}) {
  return (
    <fieldset className="lens-control">
      <legend className="sr-only">Erfahrungsmodus</legend>
      {LENSES.map((item) => (
        <button
          type="button"
          key={item.id}
          className={lens === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
          title={item.label}
        >
          {item.compact}
          <span>{item.label}</span>
        </button>
      ))}
    </fieldset>
  );
}

function PageHeader({
  item,
  lens,
  day,
  setDay,
  onHelp,
}: {
  item: NavItem;
  lens: ExperienceLens;
  day: number;
  setDay: (day: number) => void;
  onHelp: () => void;
}) {
  return (
    <section className="page-header">
      <div>
        <div className="eyebrow">
          {item.group} <span>•</span>{" "}
          {LENSES.find((entry) => entry.id === lens)?.label}
        </div>
        <h1>{item.label}</h1>
        <p>{item.description}</p>
      </div>
      <div className="header-actions">
        {![
          "knowledge",
          "audit",
          "raw",
          "products",
          "compatibility",
          "diagnostics",
        ].includes(item.id) && (
          <label className="day-stepper">
            Run-Tag{" "}
            <input
              type="number"
              min="0"
              max="80"
              value={day}
              onChange={(event) =>
                setDay(Math.max(0, Math.min(80, Number(event.target.value))))
              }
            />
          </label>
        )}
        <button className="secondary-button" type="button" onClick={onHelp}>
          Ansicht erklären
        </button>
      </div>
    </section>
  );
}

function GuidedBanner({
  route,
  onHelp,
}: {
  route: RouteId;
  onHelp: () => void;
}) {
  return (
    <aside className="guided-banner">
      <span className="guided-icon">i</span>
      <div>
        <strong>Orientierung</strong>
        <p>
          {HELP[route].what} {HELP[route].interpret}
        </p>
      </div>
      <button type="button" onClick={onHelp}>
        Mehr erfahren
      </button>
    </aside>
  );
}

function RouteContent({
  route,
  lens,
  plan,
  day,
  setDay,
  navigate,
}: {
  route: RouteId;
  lens: ExperienceLens;
  plan: ReturnType<typeof getDayPlan>;
  day: number;
  setDay: (day: number) => void;
  navigate: (route: RouteId) => void;
}) {
  switch (route) {
    case "cockpit":
      return (
        <Cockpit plan={plan} lens={lens} setDay={setDay} navigate={navigate} />
      );
    case "today":
      return <Today plan={plan} lens={lens} navigate={navigate} />;
    case "timeline":
      return <Timeline day={day} setDay={setDay} lens={lens} />;
    case "mix":
      return <MixLab plan={plan} lens={lens} />;
    case "climate":
      return <Climate plan={plan} lens={lens} />;
    case "nutrients":
      return <Nutrients plan={plan} lens={lens} navigate={navigate} />;
    case "products":
      return <LibraryPage sheetName="17_All_Products" lens={lens} />;
    case "compatibility":
      return <LibraryPage sheetName="16_Compatibility" lens={lens} />;
    case "diagnostics":
      return <Diagnostics lens={lens} />;
    case "knowledge":
      return <KnowledgePage lens={lens} />;
    case "audit":
      return <AuditPage lens={lens} />;
    case "raw":
      return <RawData lens={lens} />;
  }
}

function Cockpit({
  plan,
  lens,
  setDay,
  navigate,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
  setDay: (day: number) => void;
  navigate: (route: RouteId) => void;
}) {
  const day = plan.day;
  return (
    <div className="page-stack">
      <section className="run-strip">
        <div>
          <span className="phase-pulse" />
          <div>
            <small>AKTIVER RUN</small>
            <strong>{textAt(plan, DAILY_COLUMNS.phase)}</strong>
          </div>
        </div>
        <div>
          <small>Genetik</small>
          <strong>Double Grape Auto</strong>
        </div>
        <div>
          <small>Ziel</small>
          <strong>{textAt(plan, DAILY_COLUMNS.goal)}</strong>
        </div>
        <div className="progress-cell">
          <small>Tag {day} von 80</small>
          <div className="progress">
            <span style={{ width: `${(day / 80) * 100}%` }} />
          </div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric
          label="PPFD"
          value={numberAt(plan, DAILY_COLUMNS.ppfd)}
          unit="µmol/m²/s"
          tone="blue"
          note="Lichtdichte am Canopy"
        />
        <Metric
          label="DLI"
          value={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          unit="mol/m²/d"
          tone="blue"
          note="Tägliche Lichtmenge"
        />
        <Metric
          label="Klima"
          value={`${numberAt(plan, DAILY_COLUMNS.tempLight)}°`}
          unit={`${numberAt(plan, DAILY_COLUMNS.humidity)} % rF`}
          tone="amber"
          note="Lichtphase"
        />
        <Metric
          label="Leaf-VPD"
          value={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          unit="kPa est."
          tone="amber"
          note="mit Blatt-ΔT-Schätzung"
        />
        <Metric
          label="EC"
          value={numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)}
          unit="mS/cm"
          tone="green"
          note="Ziel Endmix"
        />
        <Metric
          label="pH"
          value={numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)}
          unit="Ziel"
          tone="green"
          note="nach vollständigem Mix"
        />
      </section>
      <div className="two-column wide-left">
        <Panel
          title="Operator-Pfad"
          kicker="HEUTE"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => navigate("today")}
            >
              Vollansicht →
            </button>
          }
        >
          <div className="operator-list">
            <ActionRow
              step="01"
              title="Licht & Klima prüfen"
              value={`${numberAt(plan, DAILY_COLUMNS.watts)} W · ${numberAt(plan, DAILY_COLUMNS.distance)} cm · ${numberAt(plan, DAILY_COLUMNS.tempLight)} °C`}
              status="plan"
            />
            <ActionRow
              step="02"
              title="Wurzelzone beurteilen"
              value={`${numberAt(plan, DAILY_COLUMNS.waterMin)}–${numberAt(plan, DAILY_COLUMNS.waterMax)} L · ${textAt(plan, DAILY_COLUMNS.irrigation)}`}
              status="measure"
            />
            <ActionRow
              step="03"
              title="Feed vorbereiten"
              value={`${textAt(plan, DAILY_COLUMNS.base)} · ${numberAt(plan, DAILY_COLUMNS.baseDose)} ml/L`}
              status={
                numberAt(plan, DAILY_COLUMNS.baseDose) > 0 ? "action" : "plan"
              }
            />
            <ActionRow
              step="04"
              title="Canopy & Training"
              value={textAt(plan, DAILY_COLUMNS.training)}
              status="observe"
            />
          </div>
        </Panel>
        <Panel title="Decision Gate" kicker="STOP / GO">
          <div className="decision-state">
            <span>!</span>
            <strong>Vor Erhöhung prüfen</strong>
          </div>
          <p>{textAt(plan, DAILY_COLUMNS.stop)}</p>
          <dl className="compact-list">
            <div>
              <dt>Logstatus</dt>
              <dd>OFFEN</dd>
            </div>
            <div>
              <dt>Wasserchemie</dt>
              <dd>UNBEKANNT</dd>
            </div>
            <div>
              <dt>Bewässerung</dt>
              <dd>{textAt(plan, DAILY_COLUMNS.irrigation)}</dd>
            </div>
          </dl>
        </Panel>
      </div>
      <div className="two-column">
        <Panel title="12-Wochen-Trajektorie" kicker="LICHT & KLIMA">
          <MultiLineChart
            series={[
              { label: "PPFD", color: "#62a8ff", values: weeklyColumn(17) },
              { label: "rF", color: "#e5a44b", values: weeklyColumn(22) },
            ]}
          />
          <div className="chart-legend">
            <span>
              <i style={{ background: "#62a8ff" }} />
              PPFD
            </span>
            <span>
              <i style={{ background: "#e5a44b" }} />
              rF
            </span>
          </div>
        </Panel>
        <Panel title="Quick Actions" kicker="NÄCHSTER SCHRITT">
          <div className="quick-grid">
            <button type="button" onClick={() => navigate("mix")}>
              <span>⌁</span>
              <strong>Batch berechnen</strong>
              <small>Mengen & Reihenfolge</small>
            </button>
            <button type="button" onClick={() => navigate("knowledge")}>
              <span>◫</span>
              <strong>Claim prüfen</strong>
              <small>Scope & Quelle</small>
            </button>
            <button
              type="button"
              onClick={() => setDay(Math.min(80, plan.day + 1))}
            >
              <span>→</span>
              <strong>Nächster Tag</strong>
              <small>Plan fortsetzen</small>
            </button>
            <button type="button" onClick={() => navigate("audit")}>
              <span>✓</span>
              <strong>Audit öffnen</strong>
              <small>{AUDIT_COUNT} Korrekturen</small>
            </button>
          </div>
        </Panel>
      </div>
      {lens === "expert" && <ExpertTrace plan={plan} />}
    </div>
  );
}

function Today({
  plan,
  lens,
  navigate,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
  navigate: (route: RouteId) => void;
}) {
  const sections = [
    {
      title: "Licht & Klima",
      tone: "blue",
      rows: [
        [
          "Licht",
          `${numberAt(plan, DAILY_COLUMNS.watts)} W · ${numberAt(plan, DAILY_COLUMNS.lightHours)} h`,
        ],
        [
          "PPFD / DLI",
          `${numberAt(plan, DAILY_COLUMNS.ppfd)} / ${numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}`,
        ],
        ["Abstand", `${numberAt(plan, DAILY_COLUMNS.distance)} cm`],
        [
          "Temperatur",
          `${numberAt(plan, DAILY_COLUMNS.tempLight)} / ${numberAt(plan, DAILY_COLUMNS.tempDark)} °C`,
        ],
        [
          "rF / Leaf-VPD",
          `${numberAt(plan, DAILY_COLUMNS.humidity)} % / ${numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)} kPa`,
        ],
      ],
    },
    {
      title: "Wasser & Wurzelzone",
      tone: "green",
      rows: [
        ["Modus", textAt(plan, DAILY_COLUMNS.irrigation)],
        [
          "Wasserkorridor",
          `${numberAt(plan, DAILY_COLUMNS.waterMin)}–${numberAt(plan, DAILY_COLUMNS.waterMax)} L`,
        ],
        [
          "EC / pH",
          `${numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)} / ${numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)}`,
        ],
        ["Wurzel Complex", `${numberAt(plan, DAILY_COLUMNS.rootDose)} ml/L`],
      ],
    },
    {
      title: "Feed & Stack",
      tone: "purple",
      rows: [
        ["Basis", textAt(plan, DAILY_COLUMNS.base)],
        ["Basisdosis", `${numberAt(plan, DAILY_COLUMNS.baseDose)} ml/L`],
        ["PowerZyme", `${numberAt(plan, DAILY_COLUMNS.powerZyme)} ml/L`],
        [
          "Boost / PK",
          `${numberAt(plan, DAILY_COLUMNS.boost)} / ${numberAt(plan, DAILY_COLUMNS.pk)} ml/L`,
        ],
        ["Voodoo", `${numberAt(plan, DAILY_COLUMNS.voodoo)} ml/L`],
      ],
    },
  ];
  return (
    <div className="page-stack">
      <section className="today-lead">
        <div className="day-orbit">
          <span>TAG</span>
          <strong>{plan.day}</strong>
          <small>W{numberAt(plan, DAILY_COLUMNS.week)}</small>
        </div>
        <div>
          <span className="evidence-tag">UKD PLANWERT</span>
          <h2>{textAt(plan, DAILY_COLUMNS.phase)}</h2>
          <p>{textAt(plan, DAILY_COLUMNS.goal)}</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("mix")}
        >
          Mischung vorbereiten
        </button>
      </section>
      <section className="today-grid">
        {sections.map((section) => (
          <Panel key={section.title} title={section.title} kicker="SOLLWERTE">
            <dl className={`detail-list ${section.tone}`}>
              {section.rows.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </section>
      <div className="two-column wide-left">
        <Panel title="Aktionen & Qualität" kicker="CHECKLISTE">
          <p className="prose-callout">{textAt(plan, DAILY_COLUMNS.qa)}</p>
          <Checklist />
        </Panel>
        <Panel title="Training / Canopy" kicker="PFLANZENREAKTION">
          <h3>{textAt(plan, DAILY_COLUMNS.training)}</h3>
          <p>
            Nur durchführen, wenn Vitalität, Wasserstatus und Erholung stimmen.
            Nicht mehrere Stressoren am selben Tag einführen.
          </p>
        </Panel>
      </div>
      <Panel title="Stop-Regel" kicker="SICHERHEIT">
        <div className="stop-rule">
          <span>!</span>
          <p>{textAt(plan, DAILY_COLUMNS.stop)}</p>
        </div>
        {lens !== "guided" && (
          <p className="muted">
            Planstatus: {textAt(plan, DAILY_COLUMNS.evidence)}
          </p>
        )}
      </Panel>
      {lens === "expert" && <ExpertTrace plan={plan} />}
    </div>
  );
}

function Timeline({
  day,
  setDay,
  lens,
}: {
  day: number;
  setDay: (day: number) => void;
  lens: ExperienceLens;
}) {
  const sheet = getDailySheet(workbook);
  const rows = sheet.values.slice(1);
  const visible = rows.filter((_, index) =>
    lens === "guided" ? Math.abs(index - day) <= 3 : true,
  );
  return (
    <div className="page-stack">
      <Panel title={`Run-Tag ${day}`} kicker="NAVIGATION">
        <div className="timeline-control">
          <button
            type="button"
            onClick={() => setDay(Math.max(0, day - 1))}
            aria-label="Vorheriger Tag"
          >
            −
          </button>
          <input
            type="range"
            min="0"
            max="80"
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
            aria-label="Run-Tag auswählen"
          />
          <button
            type="button"
            onClick={() => setDay(Math.min(80, day + 1))}
            aria-label="Nächster Tag"
          >
            +
          </button>
          <output>
            {textAt(getDayPlan(workbook, day), DAILY_COLUMNS.phase)}
          </output>
        </div>
        <div className="phase-track">
          {phaseBands().map((band) => (
            <button
              type="button"
              key={band.label}
              style={{ flex: band.days }}
              className={day >= band.start && day <= band.end ? "active" : ""}
              onClick={() => setDay(band.start)}
            >
              <span>{band.label}</span>
              <small>
                {band.start}–{band.end}
              </small>
            </button>
          ))}
        </div>
      </Panel>
      <Panel
        title="Tagesmatrix"
        kicker={lens === "guided" ? "± 3 TAGE" : "81 TAGE"}
      >
        <div className="data-table-wrap">
          <table className="data-table timeline-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Phase</th>
                <th>Ziel</th>
                <th>PPFD</th>
                <th>DLI</th>
                <th>EC</th>
                <th>pH</th>
                <th>Wasser</th>
                <th>Feed</th>
                {lens === "expert" && <th>GM / Evidenz</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const rowDay = Number(row[0]);
                return (
                  <tr
                    key={rowDay}
                    className={rowDay === day ? "selected" : ""}
                    onClick={() => setDay(rowDay)}
                  >
                    <td>
                      <button type="button" onClick={() => setDay(rowDay)}>
                        {rowDay}
                      </button>
                    </td>
                    <td>{String(row[4] ?? "")}</td>
                    <td>{String(row[5] ?? "")}</td>
                    <td>{String(row[8] ?? "")}</td>
                    <td>{Number(row[9] ?? 0).toFixed(1)}</td>
                    <td>{String(row[15] ?? "")}</td>
                    <td>{String(row[16] ?? "")}</td>
                    <td>
                      {row[17]}–{row[18]} L
                    </td>
                    <td>
                      {row[20]} · {row[21]} ml/L
                    </td>
                    {lens === "expert" && (
                      <td>
                        {row[35]} · {row[33]}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function MixLab({
  plan,
  lens,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
}) {
  const [liters, setLiters] = useState(5);
  const mix = calculateMix(plan, liters);
  return (
    <div className="page-stack">
      <section className="mix-console">
        <div className="mix-input">
          <span>BATCHVOLUMEN</span>
          <label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={liters}
              onChange={(event) =>
                setLiters(Math.max(0, Number(event.target.value)))
              }
            />
            <strong>L</strong>
          </label>
          <small>
            Tag {plan.day} · {textAt(plan, DAILY_COLUMNS.phase)}
          </small>
        </div>
        <div className="mix-summary">
          <div>
            <small>EC-Ziel</small>
            <strong>{numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)}</strong>
            <span>mS/cm</span>
          </div>
          <div>
            <small>pH-Ziel</small>
            <strong>{numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)}</strong>
            <span>Endmix</span>
          </div>
          <div>
            <small>Aktive Produkte</small>
            <strong>{mix.filter((item) => item.dose > 0).length}</strong>
            <span>+ Mess-Gates</span>
          </div>
        </div>
      </section>
      <div className="two-column wide-left">
        <Panel title="Batch-Rezept" kicker="BERECHNET">
          <div className="mix-list">
            {mix.map((item, index) => (
              <div
                key={item.name}
                className={item.dose === 0 ? "conditional" : ""}
              >
                <span className="mix-order">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.role}
                    {item.warning ? ` · ${item.warning}` : ""}
                  </small>
                </div>
                <span>{item.dose.toFixed(3)} ml/L</span>
                <b>{item.amount.toFixed(2)} ml</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Mess-Gates" kicker="NICHT ÜBERSPRINGEN">
          <ol className="gate-list">
            <li>
              <span>1</span>
              <p>
                <strong>Wasser messen</strong>pH, EC, Temperatur, Ca/Mg/HCO₃
                wenn verfügbar.
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>Komponenten einzeln</strong>Nie Konzentrate direkt
                miteinander mischen.
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>5–10 min homogenisieren</strong>Danach EC und finalen pH
                prüfen.
              </p>
            </li>
            <li>
              <span>4</span>
              <p>
                <strong>Nur eine pH-Richtung</strong>Kein
                Athena-/Säure-Ping-Pong.
              </p>
            </li>
          </ol>
        </Panel>
      </div>
      {lens !== "guided" && (
        <Panel title="Mischreihenfolge v2" kicker="PROTOKOLL">
          <MixOrder />
        </Panel>
      )}
      {lens === "expert" && <ExpertTrace plan={plan} />}
    </div>
  );
}

function Climate({
  plan,
  lens,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
}) {
  const rows = getDailySheet(workbook).values.slice(1);
  return (
    <div className="page-stack">
      <section className="metric-grid four">
        <Metric
          label="PPFD"
          value={numberAt(plan, DAILY_COLUMNS.ppfd)}
          unit="µmol/m²/s"
          tone="blue"
          note={`${numberAt(plan, DAILY_COLUMNS.watts)} W · ${numberAt(plan, DAILY_COLUMNS.distance)} cm`}
        />
        <Metric
          label="DLI"
          value={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          unit="mol/m²/d"
          tone="blue"
          note={`${numberAt(plan, DAILY_COLUMNS.lightHours)} h Photoperiode`}
        />
        <Metric
          label="Leaf-VPD"
          value={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          unit="kPa est."
          tone="amber"
          note={`Air-VPD ${numberAt(plan, DAILY_COLUMNS.airVpd).toFixed(2)} kPa`}
        />
        <Metric
          label="Energie"
          value={numberAt(plan, DAILY_COLUMNS.lightKwh).toFixed(2)}
          unit="kWh/Tag"
          tone="green"
          note={`${numberAt(plan, DAILY_COLUMNS.cumulativeKwh).toFixed(1)} kWh kum.`}
        />
      </section>
      <div className="two-column">
        <Panel title="Lichttrajektorie" kicker="TAG 0–80">
          <MultiLineChart
            series={[
              {
                label: "PPFD",
                color: "#62a8ff",
                values: rows.map((row) => Number(row[8] ?? 0)),
              },
              {
                label: "Watt × 4",
                color: "#8ad2c7",
                values: rows.map((row) => Number(row[7] ?? 0) * 4),
              },
            ]}
          />
        </Panel>
        <Panel title="Klimatrajektorie" kicker="TAG 0–80">
          <MultiLineChart
            series={[
              {
                label: "rF",
                color: "#e5a44b",
                values: rows.map((row) => Number(row[13] ?? 0)),
              },
              {
                label: "Temp × 2",
                color: "#ef705c",
                values: rows.map((row) => Number(row[11] ?? 0) * 2),
              },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Interpretationsgrenzen" kicker="EVIDENZ">
        <div className="boundary-grid">
          <Boundary
            title="625 PPFD ist kein Universaloptimum"
            text="Es ist eine konservative UKD-Arbeitsobergrenze für diesen 18-h-Plan. Die zitierte Lichtstudie ist nicht automatisch auf Autoflower und dieses Zelt übertragbar."
            evidence="A + Inferenz"
          />
          <Boundary
            title="Leaf-VPD ist modelliert"
            text="Der Wert nutzt eine Blatt-ΔT-Annahme. Eine IR-Blatttemperatur und mehrere Messpunkte sind fachlich stärker."
            evidence="Physik"
          />
          <Boundary
            title="PPFD-Karte vor Watt"
            text="Watt und Abstand sind nur Geräteeinstellungen. Eine 9-Punkt-Messung am Canopy entscheidet über Gleichmäßigkeit und Hotspots."
            evidence="Engineering"
          />
        </div>
      </Panel>
      {lens === "expert" && (
        <Panel title="Formeln" kicker="MODELL">
          <pre className="code-block">{`DLI = PPFD × Lichtstunden × 3600 / 1,000,000\nLeaf-VPD = SVP(Tleaf) − RH × SVP(Tair)\nSVP(T) = 0.6108 × exp(17.27T / (T + 237.3))\nLicht-kWh = Watt × Stunden / 1000`}</pre>
        </Panel>
      )}
    </div>
  );
}

function Nutrients({
  plan,
  lens,
  navigate,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
  navigate: (route: RouteId) => void;
}) {
  const doses = [
    [
      "Basis",
      textAt(plan, DAILY_COLUMNS.base),
      numberAt(plan, DAILY_COLUMNS.baseDose),
    ],
    ["Wurzel Complex", "Root", numberAt(plan, DAILY_COLUMNS.rootDose)],
    ["PowerZyme", "Enzym", numberAt(plan, DAILY_COLUMNS.powerZyme)],
    ["HESI Boost", "Blüte", numberAt(plan, DAILY_COLUMNS.boost)],
    ["PK13/14", "PK", numberAt(plan, DAILY_COLUMNS.pk)],
    ["Voodoo Juice", "Mikroben", numberAt(plan, DAILY_COLUMNS.voodoo)],
  ] as const;
  return (
    <div className="page-stack">
      <section className="system-banner">
        <div>
          <span className="status-dot" />
          <small>OPERATIVER MOTOR</small>
          <h2>UKD HESI Conservative</h2>
          <p>
            Herstellerlabel und bewusst reduzierter Custom Plan bleiben
            getrennt.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("mix")}
        >
          Batch berechnen
        </button>
      </section>
      <div className="dose-grid">
        {doses.map(([name, role, dose]) => (
          <div key={name} className={dose > 0 ? "active" : ""}>
            <span>{role}</span>
            <strong>{name}</strong>
            <b>
              {dose.toFixed(3)} <small>ml/L</small>
            </b>
          </div>
        ))}
      </div>
      <div className="two-column">
        <Panel title="Nicht stapeln" kicker="REFERENCE-REGELN">
          <ul className="rule-list">
            <li>
              <span>PK</span>
              <p>
                <strong>HESI PK13/14 versus Big Bud / Overdrive</strong>Im
                A/B-Test ersetzen, nicht addieren.
              </p>
            </li>
            <li>
              <span>Si</span>
              <p>
                <strong>Athena Balance versus Hesilicio / Rhino Skin</strong>
                Standardmäßig nur eine Siliziumquelle.
              </p>
            </li>
            <li>
              <span>Enz</span>
              <p>
                <strong>PowerZyme versus Sensizym</strong>Keine doppelte
                Enzymrolle im Referenzplan.
              </p>
            </li>
            <li>
              <span>Bio</span>
              <p>
                <strong>Mikroben frisch einsetzen</strong>Nicht als
                stagnierenden Dauertank behandeln.
              </p>
            </li>
          </ul>
        </Panel>
        <Panel title="A/B-Option" kicker="NICHT REFERENCE">
          <h3>{textAt(plan, DAILY_COLUMNS.gmPhase)}</h3>
          <p>{textAt(plan, DAILY_COLUMNS.gmRecommendation)}</p>
          <div className="evidence-note">
            <span>C</span>
            <p>
              Explorative UKD-Empfehlung. Keine kontrollierte Hybrid-Dosisstudie
              und keine automatische Aktivierung.
            </p>
          </div>
        </Panel>
      </div>
      {lens !== "guided" && (
        <Panel title="Tagesdosen" kicker="DETAIL">
          <SheetSlice
            sheet={getDailySheet(workbook)}
            rowIndex={plan.day + 1}
            from={20}
            to={44}
            formulas={lens === "expert"}
          />
        </Panel>
      )}
    </div>
  );
}

function LibraryPage({
  sheetName,
  lens,
}: {
  sheetName: string;
  lens: ExperienceLens;
}) {
  const sheet = workbook[sheetName] ?? EMPTY_SHEET;
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      sheet.values.filter((row) =>
        row.some((cell) =>
          String(cell ?? "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      ),
    [sheet, query],
  );
  const limit = lens === "guided" ? 24 : rows.length;
  return (
    <div className="page-stack">
      <Panel
        title={sheetName.replace(/^\d+_/, "").replaceAll("_", " ")}
        kicker={`${sheet.range} · ${rows.length} TREFFER`}
        action={
          <label className="table-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="In Tabelle filtern"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        }
      >
        <GenericTable rows={rows.slice(0, limit)} sticky />
        {lens === "guided" && rows.length > limit && (
          <p className="table-footnote">
            Guided zeigt die ersten {limit} Treffer. Advanced oder Expert zeigt
            die vollständige Matrix.
          </p>
        )}
      </Panel>
    </div>
  );
}

function Diagnostics({ lens }: { lens: ExperienceLens }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const inputs = [
    "pH-Meter kalibriert",
    "EC-Meter geprüft",
    "Endmix-pH gemessen",
    "Drain-EC als Trend",
    "Substratfeuchte geprüft",
    "Licht/Blatttemperatur gemessen",
    "Schädlinge beidseitig geprüft",
  ];
  return (
    <div className="page-stack">
      <section className="diagnostic-intro">
        <span>△</span>
        <div>
          <h2>Erst messen, dann Hypothese bilden.</h2>
          <p>
            Visuell ähnliche Symptome können durch pH, Salzstress, Bewässerung,
            Klima oder echte Nährstoffprobleme entstehen.
          </p>
        </div>
      </section>
      <div className="two-column wide-left">
        <Panel
          title="Minimum Dataset"
          kicker={`${Object.values(checks).filter(Boolean).length}/${inputs.length} ERFASST`}
        >
          <div className="check-grid">
            {inputs.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={Boolean(checks[item])}
                  onChange={(event) =>
                    setChecks({ ...checks, [item]: event.target.checked })
                  }
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Triage-Status" kicker="KEINE FERNDIAGNOSE">
          <div
            className={`triage-score ${Object.values(checks).filter(Boolean).length >= 5 ? "ready" : "open"}`}
          >
            <strong>
              {Object.values(checks).filter(Boolean).length >= 5
                ? "BEREIT FÜR HYPOTHESEN"
                : "DATEN FEHLEN"}
            </strong>
            <p>
              {Object.values(checks).filter(Boolean).length >= 5
                ? "Messbasis ist ausreichend für eine priorisierte, weiterhin unsichere Triage."
                : "Noch keine sichere Ursache ableiten. Zuerst Mess- und Wurzelzonenfehler ausschließen."}
            </p>
          </div>
        </Panel>
      </div>
      <Panel title="Sicherer Diagnosepfad" kicker="REIHENFOLGE">
        <div className="diagnostic-flow">
          <FlowStep
            n="1"
            title="Messsystem"
            text="Kalibrierung, Einheiten, Messort"
          />
          <FlowStep
            n="2"
            title="Wurzelzone"
            text="Feuchte, Drain, Geruch, Temperatur"
          />
          <FlowStep
            n="3"
            title="Klima & Licht"
            text="Blatt-/Lufttemperatur, rF, PPFD"
          />
          <FlowStep
            n="4"
            title="Muster"
            text="Alt/neu, oben/unten, lokal/systemisch"
          />
          <FlowStep
            n="5"
            title="Eine Änderung"
            text="Beobachten und dokumentieren"
          />
        </div>
      </Panel>
      {lens !== "guided" && (
        <Panel title="Legacy-Diagnostik" kicker="13_DIAGNOSTICS">
          <GenericTable
            rows={(workbook["13_Diagnostics"] ?? EMPTY_SHEET).values}
          />
        </Panel>
      )}
    </div>
  );
}

function KnowledgePage({ lens }: { lens: ExperienceLens }) {
  const [evidence, setEvidence] = useState("all");
  const [openId, setOpenId] = useState<string | null>(
    knowledge.claims[0]?.id ?? null,
  );
  const claims = knowledge.claims.filter(
    (claim) => evidence === "all" || claim.evidence === evidence,
  );
  const sources = new Map(
    knowledge.sources.map((source) => [source.id, source]),
  );
  return (
    <div className="page-stack">
      <section className="knowledge-summary">
        <div>
          <span className="evidence-seal">A–E</span>
          <div>
            <small>KNOWLEDGE BASE · SCHEMA {knowledge.schemaVersion}</small>
            <h2>{knowledge.claims.length} High-impact Claims</h2>
            <p>
              Geprüft am{" "}
              {new Intl.DateTimeFormat("de-DE").format(
                new Date(knowledge.reviewedAt),
              )}{" "}
              · {knowledge.sources.length} kuratierte Primär- und Reviewquellen
            </p>
          </div>
        </div>
        <fieldset className="filter-tabs">
          <legend className="sr-only">Evidenzfilter</legend>
          {["all", "A", "B", "C", "D", "E"].map((value) => (
            <button
              type="button"
              key={value}
              className={evidence === value ? "active" : ""}
              onClick={() => setEvidence(value)}
            >
              {value === "all" ? "Alle" : value}
            </button>
          ))}
        </fieldset>
      </section>
      <div className="claim-list">
        {claims.map((claim) => (
          <article
            key={claim.id}
            className={`claim ${openId === claim.id ? "open" : ""}`}
          >
            <button
              type="button"
              className="claim-head"
              onClick={() => setOpenId(openId === claim.id ? null : claim.id)}
              aria-expanded={openId === claim.id}
            >
              <span className={`evidence-badge e-${claim.evidence}`}>
                {claim.evidence}
              </span>
              <div>
                <strong>{claim.title}</strong>
                <small>{claim.status}</small>
              </div>
              <span>{openId === claim.id ? "−" : "+"}</span>
            </button>
            {openId === claim.id && (
              <div className="claim-body">
                <p className="claim-statement">{claim.statement}</p>
                <div className="claim-meta">
                  <div>
                    <small>GÜLTIGKEITSBEREICH</small>
                    <p>{claim.scope}</p>
                  </div>
                  <div>
                    <small>RESTUNSICHERHEIT</small>
                    <p>{claim.uncertainty}</p>
                  </div>
                </div>
                <div className="source-links">
                  {claim.sourceIds.map((id) => {
                    const source = sources.get(id);
                    return source ? (
                      <a
                        key={id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>↗</span>
                        <div>
                          <strong>{source.title}</strong>
                          <small>
                            {source.publisher} · {source.type}
                          </small>
                        </div>
                      </a>
                    ) : null;
                  })}
                </div>
                {lens === "expert" && (
                  <pre className="code-block compact">
                    {JSON.stringify(claim, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      <Panel title="Evidenzmodell" kicker="MASCHINENLESBAR">
        <div className="evidence-scale">
          {Object.entries(knowledge.evidenceScale).map(([key, value]) => (
            <div key={key}>
              <span className={`evidence-badge e-${key}`}>{key}</span>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AuditPage({ lens }: { lens: ExperienceLens }) {
  const [priority, setPriority] = useState("all");
  const rows = audit.rows.filter(
    (finding) => priority === "all" || finding.priority === priority,
  );
  return (
    <div className="page-stack">
      <section className="audit-stats">
        <div>
          <small>FINDINGS</small>
          <strong>{AUDIT_COUNT}</strong>
          <span>vollständig migriert</span>
        </div>
        <div>
          <small>KRITISCH</small>
          <strong>
            {audit.rows.filter((item) => item.severity === "KRITISCH").length}
          </strong>
          <span>Reference-/Rechtskonflikte</span>
        </div>
        <div>
          <small>HOCH</small>
          <strong>
            {audit.rows.filter((item) => item.severity === "HOCH").length}
          </strong>
          <span>operative Risiken</span>
        </div>
        <div>
          <small>STATUS</small>
          <strong className="status-fixed">FIXED</strong>
          <span>Evidence-Guarded v6</span>
        </div>
      </section>
      <fieldset className="filter-tabs audit-filter">
        <legend className="sr-only">Prioritätsfilter</legend>
        {["all", "P0", "P1", "P2", "P3"].map((value) => (
          <button
            type="button"
            key={value}
            className={priority === value ? "active" : ""}
            onClick={() => setPriority(value)}
          >
            {value === "all" ? "Alle" : value}
          </button>
        ))}
      </fieldset>
      <div className="audit-list">
        {rows.map((finding) => (
          <article key={finding.id}>
            <div className="audit-id">
              <span>{finding.id}</span>
              <b className={`severity ${finding.severity.toLowerCase()}`}>
                {finding.severity}
              </b>
              <small>{finding.priority}</small>
            </div>
            <div className="audit-main">
              <small>{finding.area}</small>
              <h3>{finding.finding}</h3>
              <div className="audit-change">
                <span>→</span>
                <p>{finding.correction}</p>
              </div>
              {lens !== "guided" && (
                <div className="audit-meta">
                  <span>Risiko: {finding.risk}</span>
                  <span>Evidenz: {finding.evidence}</span>
                  <span>Rest: {finding.uncertainty}</span>
                </div>
              )}
            </div>
            <span className="fixed-badge">✓ FIXED</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function RawData({ lens }: { lens: ExperienceLens }) {
  const names = Object.keys(workbook);
  const [sheetName, setSheetName] = useState(names[0] ?? "00_Dashboard");
  const sheet = workbook[sheetName] ?? EMPTY_SHEET;
  const [formulas, setFormulas] = useState(lens === "expert");
  useEffect(() => {
    if (lens !== "expert") setFormulas(false);
  }, [lens]);
  return (
    <div className="page-stack">
      <section className="raw-toolbar">
        <label>
          Blatt
          <select
            value={sheetName}
            onChange={(event) => setSheetName(event.target.value)}
          >
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <div>
          <span>{sheet.range}</span>
          <span>{sheet.values.length} Zeilen</span>
          <span>
            {Math.max(...sheet.values.map((row) => row.length))} Spalten
          </span>
        </div>
        {lens === "expert" && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={formulas}
              onChange={(event) => setFormulas(event.target.checked)}
            />
            <span /> Formeln
          </label>
        )}
        <button
          type="button"
          className="secondary-button"
          onClick={() => downloadJson(sheetName, sheet)}
        >
          JSON exportieren
        </button>
      </section>
      <Panel title={sheetName} kicker="LEGACY PARITY">
        <GenericTable
          rows={formulas ? mergeFormulaRows(sheet) : sheet.values}
          sticky
        />
      </Panel>
    </div>
  );
}

function Panel({
  title,
  kicker,
  action,
  children,
}: {
  title: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header>
        <div>
          {kicker && <small>{kicker}</small>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
function Metric({
  label,
  value,
  unit,
  tone,
  note,
}: {
  label: string;
  value: string | number;
  unit: string;
  tone: string;
  note: string;
}) {
  return (
    <article className={`metric tone-${tone}`}>
      <div>
        <span>{label}</span>
        <i />
      </div>
      <strong>{value}</strong>
      <b>{unit}</b>
      <small>{note}</small>
    </article>
  );
}
function ActionRow({
  step,
  title,
  value,
  status,
}: {
  step: string;
  title: string;
  value: string;
  status: string;
}) {
  return (
    <div className="action-row">
      <span>{step}</span>
      <div>
        <strong>{title}</strong>
        <small>{value}</small>
      </div>
      <b className={`action-status ${status}`}>
        {status === "measure"
          ? "MESSEN"
          : status === "action"
            ? "AKTIV"
            : status === "observe"
              ? "PRÜFEN"
              : "PLAN"}
      </b>
    </div>
  );
}
function Boundary({
  title,
  text,
  evidence,
}: {
  title: string;
  text: string;
  evidence: string;
}) {
  return (
    <article>
      <span>{evidence}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
function FlowStep({
  n,
  title,
  text,
}: {
  n: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <span>{n}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </div>
  );
}

function Checklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const items = [
    "Bewässerung und Leck prüfen",
    "Blattwinkel / Stress beobachten",
    "Drain oder stehendes Wasser prüfen",
    "Änderung im Log dokumentieren",
  ];
  return (
    <div className="inline-checklist">
      {items.map((item) => (
        <label key={item}>
          <input
            type="checkbox"
            checked={Boolean(done[item])}
            onChange={(event) =>
              setDone({ ...done, [item]: event.target.checked })
            }
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}
function MixOrder() {
  const steps = [
    "Frisches Wasser messen",
    "Athena Balance nur bei Bedarf vollständig einmischen",
    "CalMag nur nach Wasseranalyse/Bedarf",
    "HESI Basis vollständig einmischen",
    "Support-Komponenten einzeln",
    "Optionale A/B-Module nur nach Modulregel",
    "EC messen und an Pflanzenreaktion koppeln",
    "Homogenisieren, finalen pH messen",
    "pH Down nur falls final zu hoch",
    "Frisch verwenden und dokumentieren",
  ];
  return (
    <ol className="mix-order-list">
      {steps.map((step, index) => (
        <li key={step}>
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function GenericTable({
  rows,
  sticky = false,
}: {
  rows: CellValue[][];
  sticky?: boolean;
}) {
  const width = Math.max(0, ...rows.map((row) => row.length));
  const occurrences = new Map<string, number>();
  const keyedRows = rows.map((row) => {
    const contentKey = JSON.stringify(row);
    const occurrence = (occurrences.get(contentKey) ?? 0) + 1;
    occurrences.set(contentKey, occurrence);
    return { row, key: `${contentKey}:${occurrence}` };
  });
  return (
    <div className="data-table-wrap">
      <table className={`data-table ${sticky ? "sticky" : ""}`}>
        <tbody>
          {keyedRows.map(({ row, key }, rowIndex) => (
            <tr key={key} className={rowIndex === 0 ? "header-row" : ""}>
              {Array.from({ length: width }, (_, columnIndex) => {
                const Tag = rowIndex === 0 ? "th" : "td";
                return (
                  <Tag key={columnName(columnIndex)}>
                    {formatCell(row[columnIndex])}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SheetSlice({
  sheet,
  rowIndex,
  from,
  to,
  formulas,
}: {
  sheet: WorkbookSheet;
  rowIndex: number;
  from: number;
  to: number;
  formulas: boolean;
}) {
  const headers = (sheet.values[0] ?? []).slice(from, to + 1);
  const values = (sheet.values[rowIndex] ?? []).slice(from, to + 1);
  const formulaValues = sheet.formulas[rowIndex]?.slice(from, to + 1) ?? [];
  return (
    <div className="slice-grid">
      {headers.map((header, index) => (
        <div key={String(header)}>
          <small>{String(header)}</small>
          <strong>{formatCell(values[index])}</strong>
          {formulas && formulaValues[index] && (
            <code>{formulaValues[index]}</code>
          )}
        </div>
      ))}
    </div>
  );
}
function ExpertTrace({ plan }: { plan: ReturnType<typeof getDayPlan> }) {
  return (
    <Panel title="Provenienz & Formeln" kicker="EXPERT TRACE">
      <div className="trace-grid">
        <div>
          <small>Kanonische Quelle</small>
          <strong>02_Daily_Master · Zeile {plan.day + 2}</strong>
        </div>
        <div>
          <small>Planstatus</small>
          <strong>{textAt(plan, DAILY_COLUMNS.evidence)}</strong>
        </div>
        <div>
          <small>Aktive Formeln</small>
          <strong>
            {plan.formulaRow.filter(Boolean).length} / {plan.formulaRow.length}
          </strong>
        </div>
        <div>
          <small>AI Context</small>
          <strong>
            Schema {aiContext.schemaVersion} · {skillsData.skills.length} Skills
          </strong>
        </div>
      </div>
      <details>
        <summary>Formelzeile anzeigen</summary>
        <pre className="code-block">
          {JSON.stringify(plan.formulaRow, null, 2)}
        </pre>
      </details>
    </Panel>
  );
}

function MultiLineChart({
  series,
}: {
  series: Array<{ label: string; color: string; values: number[] }>;
}) {
  const all = series.flatMap((item) => item.values);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const points = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${(index / Math.max(1, values.length - 1)) * 100},${54 - ((value - min) / range) * 48}`,
      )
      .join(" ");
  return (
    <svg
      className="line-chart"
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Kurvendiagramm: ${series.map((item) => item.label).join(", ")}`}
    >
      <g className="chart-grid">
        <line x1="0" y1="6" x2="100" y2="6" />
        <line x1="0" y1="30" x2="100" y2="30" />
        <line x1="0" y1="54" x2="100" y2="54" />
      </g>
      {series.map((item) => (
        <polyline
          key={item.label}
          fill="none"
          stroke={item.color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={points(item.values)}
        />
      ))}
    </svg>
  );
}

function HelpDrawer({
  route,
  lens,
  onClose,
}: {
  route: RouteId;
  lens: ExperienceLens;
  onClose: () => void;
}) {
  const help = HELP[route];
  return (
    <aside
      className="help-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <header>
        <div>
          <small>CONTEXTUAL HELP · {lens.toUpperCase()}</small>
          <h2 id="help-title">
            {NAV.find((item) => item.id === route)?.label} verstehen
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Hilfe schließen"
        >
          ×
        </button>
      </header>
      <div className="help-body">
        <HelpBlock n="01" title="Was sehe ich?" text={help.what} />
        <HelpBlock n="02" title="Warum ist das wichtig?" text={help.why} />
        <HelpBlock n="03" title="Wie benutze ich es?" text={help.how} />
        <HelpBlock
          n="04"
          title="Wie interpretiere ich es?"
          text={help.interpret}
        />
        <div className="shortcut-card">
          <strong>Tastatur</strong>
          <span>
            <kbd>Ctrl K</kbd> Alles durchsuchen
          </span>
          <span>
            <kbd>?</kbd> Diese Hilfe
          </span>
          <span>
            <kbd>Esc</kbd> Dialog schließen
          </span>
        </div>
      </div>
    </aside>
  );
}
function HelpBlock({
  n,
  title,
  text,
}: {
  n: string;
  title: string;
  text: string;
}) {
  return (
    <section className="help-block">
      <span>{n}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </section>
  );
}

function CommandPalette({
  onClose,
  onNavigate,
  setDay,
}: {
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
  setDay: (day: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    const nav = NAV.map((item) => ({
      key: `nav-${item.id}`,
      title: item.label,
      meta: item.description,
      action: () => onNavigate(item.id),
    }));
    const claims = knowledge.claims.map((claim) => ({
      key: `claim-${claim.id}`,
      title: claim.title,
      meta: `Evidenz ${claim.evidence} · ${claim.status}`,
      action: () => onNavigate("knowledge"),
    }));
    const sheets = Object.keys(workbook).map((name) => ({
      key: `sheet-${name}`,
      title: name,
      meta: "Legacy-Workbook-Blatt",
      action: () => onNavigate("raw"),
    }));
    const days = Array.from({ length: 81 }, (_, day) => ({
      key: `day-${day}`,
      title: `Run-Tag ${day}`,
      meta: String(getDayPlan(workbook, day).raw[4] ?? ""),
      action: () => {
        setDay(day);
        onNavigate("today");
      },
    }));
    return [...nav, ...claims, ...sheets, ...days]
      .filter(
        (item) => !q || `${item.title} ${item.meta}`.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, onNavigate, setDay]);
  return (
    <div className="palette-backdrop">
      <button
        type="button"
        className="palette-dismiss"
        onClick={onClose}
        aria-label="Suche schließen"
      />
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Globale Suche"
      >
        <label>
          <span>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche nach Seite, Tag, Claim oder Datenblatt…"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="palette-results">
          {items.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => {
                item.action();
                onClose();
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
              <span>↵</span>
            </button>
          ))}
          {items.length === 0 && (
            <p>Keine Treffer. Versuche einen Fachbegriff oder „Tag 28“.</p>
          )}
        </div>
        <footer>
          <span>↑↓ navigieren</span>
          <span>↵ öffnen</span>
          <span>27 Blätter · 10 Claims</span>
        </footer>
      </section>
    </div>
  );
}

function MobileBar({
  route,
  onNavigate,
}: {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
}) {
  const ids: RouteId[] = ["cockpit", "today", "timeline", "mix", "knowledge"];
  return (
    <nav className="mobile-bar" aria-label="Mobile Schnellnavigation">
      {ids.map((id) => {
        const item = NAV.find((entry) => entry.id === id) ?? DEFAULT_NAV;
        return (
          <button
            type="button"
            key={id}
            className={route === id ? "active" : ""}
            onClick={() => onNavigate(id)}
          >
            <span>{item.icon}</span>
            {item.short}
          </button>
        );
      })}
    </nav>
  );
}

function weeklyColumn(index: number): number[] {
  return (workbook["00_Dashboard"] ?? EMPTY_SHEET).values
    .slice(2, 14)
    .map((row) => Number(row[index] ?? 0));
}
function phaseBands() {
  const rows = getDailySheet(workbook).values.slice(1);
  const result: Array<{
    label: string;
    start: number;
    end: number;
    days: number;
  }> = [];
  rows.forEach((row, index) => {
    const label = String(row[4] ?? "—");
    const last = result.at(-1);
    if (last?.label === label) {
      last.end = index;
      last.days += 1;
    } else result.push({ label, start: index, end: index, days: 1 });
  });
  return result;
}
function formatCell(value: CellValue | undefined): ReactNode {
  if (value === null || value === undefined || value === "")
    return <span className="empty-cell">—</span>;
  if (typeof value === "number")
    return Number.isInteger(value) ? value : Number(value.toFixed(4));
  return String(value);
}
function mergeFormulaRows(sheet: WorkbookSheet): CellValue[][] {
  return sheet.values.map((row, rowIndex) =>
    row.map(
      (value, columnIndex) => sheet.formulas[rowIndex]?.[columnIndex] || value,
    ),
  );
}
function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}
function DataState({
  title,
  detail,
  error = false,
}: {
  title: string;
  detail: string;
  error?: boolean;
}) {
  return (
    <main className="data-state">
      <div className={error ? "error" : ""}>
        <span>{error ? "!" : "U"}</span>
        <h1>{title}</h1>
        <p>{detail}</p>
        {error && (
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Erneut laden
          </button>
        )}
      </div>
    </main>
  );
}

export default App;
