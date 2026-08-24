import {
  lazy,
  type ReactNode,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCenter } from "./AlertCenter";
import { createBackupEnvelope } from "./backup";
import {
  EquipmentOperationsWorkspace,
  IncidentWorkspace,
  IpmWorkspace,
  ProductInventoryWorkspace,
} from "./OperationsWorkspace";
import {
  EnergyWorkspace,
  MixApplicationWorkspace,
  PostHarvestWorkspace,
  ReservoirWorkspace,
} from "./ScientificOperationsWorkspace";
import { MediaWorkspace } from "./MediaWorkspace";
import { ConnectorWorkspace } from "./ConnectorWorkspace";
import { ProfilesWorkspace } from "./ProfilesWorkspace";
import { GlobalCommandCenter } from "./GlobalCommandCenter";
import {
  createVaultCheckpoint,
  validateLatestCheckpointInStaging,
} from "./backup-vault";
import { applyRunCommand } from "./run-commands";
import { evaluateLiveClock } from "./live-run";
import {
  LensBadge,
  TermTooltip,
  InlineMetricCard,
  InlineEditable,
} from "./components/common";
import { Icon } from "./components/common/Icon";
import {
  DailyOperatorPanel,
  EnvironmentTargetsPanel,
  NutrientMixPanel,
  RunConfigPanel,
  VpdDliCalculatorPanel,
  MasterplanOverviewPanel,
  FeedingSchedulePanel,
  BatchResolverDashboard,
  EquipmentManagerPanel,
  AutoflowerCockpitPanel,
} from "./components/panels";
import {
  calculateMix,
  DAILY_COLUMNS,
  getDailySheet,
  getDayPlan,
  numberAt,
  textAt,
} from "./domain";
import {
  acknowledgeAlert,
  addObservation,
  addRunOverride,
  createDefaultRunPackage,
  createObservation,
  deriveRunAlerts,
  effectiveRunConfig,
  latestObservation,
  setTaskCompleted,
  updateExecutionMode,
  updatePlantIdentity,
} from "./run-state";
import {
  getLiveFieldSuggestions,
  predictGeneticsMetadata,
} from "./prediction-engine";
import {
  classifyStorageFailure,
  loadActiveRun,
  resilientRunRepository,
} from "./run-storage";
import type {
  AuditFinding,
  AutoflowerStrain,
  CellValue,
  DailyObservation,
  ExperienceLens,
  KnowledgeBase,
  LegalProfile,
  PlantIdentity,
  RouteId,
  RunConfig,
  RunExecutionMode,
  RunOverride,
  RunPackage,
  RunTask,
  Workbook,
  WorkbookSheet,
} from "./types";

let workbook: Workbook = {};
let knowledge: KnowledgeBase = {
  schemaVersion: "",
  reviewedAt: "",
  scope: "",
  evidenceScale: {},
  glossary: [],
  claims: [],
  sources: [],
};
let audit: {
  schemaVersion: string;
  source: string;
  reviewedAt?: string;
  rows: AuditFinding[];
} = { schemaVersion: "", source: "", rows: [] };
let aiContext: { schemaVersion: string } = { schemaVersion: "" };
let skillsData: { skills: unknown[] } = { skills: [] };
const AUDIT_COUNT = 55;
const EMPTY_SHEET: WorkbookSheet = {
  range: "A1:A1",
  values: [[]],
  formulas: [[]],
};
const _RunSetupWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).RunSetupWorkspace,
}));
const RunLogWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).RunLogWorkspace,
}));
const RunHistoryWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).RunHistoryWorkspace,
}));
const LegalWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).LegalWorkspace,
}));
const ReportsWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).ReportsWorkspace,
}));
const SystemWorkspace = lazy(async () => ({
  default: (await import("./RunWorkspace")).SystemWorkspace,
}));
const DEFAULT_NAV: NavItem = {
  id: "cockpit",
  label: "Cockpit",
  short: "Home",
  icon: <Icon name="activity" animate="pulse" />,
  group: "Operator",
  description: "Run-Status und wichtigste Entscheidungen",
};

interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  icon: ReactNode;
  group: string;
  description: string;
}

const NAV: NavItem[] = [
  {
    id: "masterplan",
    label: "Start Hier",
    short: "Start",
    icon: <Icon name="plant" animate="grow" />,
    group: "Operator",
    description: "Dein UKD Grow Masterplan",
  },
  {
    id: "plan-editor",
    label: "Global Plan",
    short: "Plan",
    icon: <Icon name="globe" animate="none" />,
    group: "Operator",
    description: "Masterplan Settings & Validation",
  },
  {
    id: "cockpit",
    label: "Cockpit",
    short: "Home",
    icon: <Icon name="activity" animate="pulse" />,
    group: "Operator",
    description: "Run-Status und wichtigste Entscheidungen",
  },
  {
    id: "setup",
    label: "Run einrichten",
    short: "Setup",
    icon: <Icon name="settings" animate="spin" />,
    group: "Operator",
    description: "Konfiguration, Wasserprofil und Systemgrenzen",
  },
  {
    id: "log",
    label: "Messungen & Log",
    short: "Log",
    icon: <Icon name="calendar" animate="none" />,
    group: "Operator",
    description: "Soll/Ist-Werte, Ereignisse und Alerts",
  },
  {
    id: "today",
    label: "Heute",
    short: "Heute",
    icon: <Icon name="sun" animate="spin" />,
    group: "Operator",
    description: "Tagesziele, Aktionen und Stop-Regeln",
  },
  {
    id: "timeline",
    label: "Zeitachse",
    short: "Plan",
    icon: <Icon name="activity" animate="none" />,
    group: "Operator",
    description: "Alle 81 Tage und Phasen",
  },
  {
    id: "history",
    label: "Run-Historie",
    short: "Runs",
    icon: <Icon name="calendar" animate="none" />,
    group: "Operator",
    description: "Versionierte Runs, Snapshots und lokaler Wechsel",
  },
  {
    id: "mix",
    label: "Mischlabor",
    short: "Mix",
    icon: <Icon name="beaker" animate="float" />,
    group: "Werkzeuge",
    description: "Batchmengen und sichere Mischreihenfolge",
  },
  {
    id: "reservoir",
    label: "Reservoir & Raum",
    short: "Tank",
    icon: "◉",
    group: "Werkzeuge",
    description: "Tank-Checkpoints, Standzeit und Lung Room",
  },
  {
    id: "energy",
    label: "Energie",
    short: "Energie",
    icon: "ϟ",
    group: "Werkzeuge",
    description: "Licht-, Klima- und Gesamtenergie",
  },
  {
    id: "post-harvest",
    label: "Post-Harvest",
    short: "Dry/Cure",
    icon: "◇",
    group: "Operator",
    description: "Nachernte-Run, Trocknung, Cure und Lagerung",
  },
  {
    id: "climate",
    label: "Klima & Licht",
    short: "Klima",
    icon: <Icon name="light" animate="pulse" />,
    group: "Werkzeuge",
    description: "PPFD, DLI, Temperatur, rF und VPD",
  },
  {
    id: "calc",
    label: "VPD & DLI Rechner",
    short: "Rechner",
    icon: <Icon name="activity" animate="none" />,
    group: "Werkzeuge",
    description: "VPD & DLI Schnellrechner und 4-Phasen-Matrix",
  },
  {
    id: "nutrients",
    label: "Nährstoffsystem",
    short: "Feed",
    icon: <Icon name="droplet" animate="float" />,
    group: "Werkzeuge",
    description: "Reference-Feed und Stack-Grenzen",
  },
  {
    id: "products",
    label: "Produkte",
    short: "Produkte",
    icon: <Icon name="settings" animate="none" />,
    group: "Bibliothek",
    description: "UKD-relevante Produktmatrix",
  },
  {
    id: "inventory",
    label: "Mein Inventar",
    short: "Inventar",
    icon: "▣",
    group: "Werkzeuge",
    description: "Persönliche Gebinde, Restmengen und Chargen",
  },
  {
    id: "autoflower",
    label: "Genetics Cockpit",
    short: "Genetik",
    icon: <Icon name="plant" animate="pulse" />,
    group: "Bibliothek",
    description: "Kanonische Strain-Vergleichstabelle",
  },
  {
    id: "compatibility",
    label: "Kompatibilität",
    short: "Matrix",
    icon: <Icon name="warning" animate="none" />,
    group: "Bibliothek",
    description: "Kombinationen und Konflikte",
  },
  {
    id: "diagnostics",
    label: "Diagnose",
    short: "Diagnose",
    icon: <Icon name="activity" animate="pulse" />,
    group: "Bibliothek",
    description: "Messwertbasierte Problem-Triage",
  },
  {
    id: "knowledge",
    label: "Wissen & Quellen",
    short: "Wissen",
    icon: <Icon name="check" animate="none" />,
    group: "Evidenz",
    description: "Faktencheck mit Scope und Unsicherheit",
  },
  {
    id: "audit",
    label: "Audit Center",
    short: "Audit",
    icon: <Icon name="check" animate="pulse" />,
    group: "Evidenz",
    description: `${AUDIT_COUNT} forensische Findings und Korrekturen`,
  },
  {
    id: "raw",
    label: "Rohdaten",
    short: "Daten",
    icon: <Icon name="settings" animate="none" />,
    group: "System",
    description: "56 Blätter, Werte und Formeln",
  },
  {
    id: "legal",
    label: "Recht & Bestand",
    short: "Bestand",
    icon: <Icon name="warning" animate="none" />,
    group: "System",
    description: "Lokales Rechtsprofil und Bestandsereignisse",
  },
  {
    id: "reports",
    label: "Sichern & Berichte",
    short: "Export",
    icon: <Icon name="calendar" animate="none" />,
    group: "System",
    description: "Backup, Restore, CSV, XLSX und PDF",
  },
  {
    id: "media",
    label: "Medien",
    short: "Fotos",
    icon: "▧",
    group: "System",
    description: "EXIF-bereinigte und lokal verschlüsselte Fotos",
  },
  {
    id: "system",
    label: "Daten & Integrationen",
    short: "System",
    icon: "◎",
    group: "System",
    description: "Manifestprüfung, Offline- und Integrationsstatus",
  },
  {
    id: "connector",
    label: "Datei-Connector",
    short: "Import",
    icon: "⇥",
    group: "System",
    description: "CSV/JSON prüfen, zuordnen und revisionssicher importieren",
  },
  {
    id: "profiles",
    label: "Profile & Templates",
    short: "Profile",
    icon: "◫",
    group: "System",
    description: "Versionierte Setup-Profile und neue Run-Entwürfe",
  },
  {
    id: "equipment",
    label: "Equipment & Wartung",
    short: "Equipment",
    icon: "⚙",
    group: "System",
    description: "Assets, Wartung, PPFD und pH/EC-Kalibrierung",
  },
  {
    id: "ipm",
    label: "Plant Health (IPM)",
    short: "IPM",
    icon: "⚚",
    group: "Bibliothek",
    description: "Inspektionen, Behandlung, Follow-up und Ergebnis",
  },
  {
    id: "incidents",
    label: "Incidents & Recovery",
    short: "Incidents",
    icon: "⚠",
    group: "Werkzeuge",
    description: "Störfälle, Plan-Supersession und Recovery-Workflow",
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
  masterplan: {
    what: "Der zentrale 3-Schritte-Plan und Leitfaden für deinen Run.",
    why: "Erklärungen, Glossar und System-Übersicht für einen sicheren Einstieg.",
    how: "Lies den Plan und springe dann ins Cockpit oder Setup.",
    interpret:
      "Dein Ankerpunkt, wenn du unsicher bist, was als Nächstes ansteht.",
  },
  "plan-editor": {
    what: "Editor für ausgewählte Metadaten des aktiven Runs mit Abhängigkeitsprüfung.",
    why: "Er dokumentiert Kontextänderungen, ohne den kanonischen v11.5-Tagesplan still neu zu berechnen.",
    how: "Bearbeite nur erfasste Setupwerte und begründe jede Änderung. Der Nährstoffsystemwechsel bleibt gesperrt.",
    interpret:
      "Warnungen sind regelbasierte Hinweise; sie ersetzen weder Messung noch Fachprüfung.",
  },
  cockpit: {
    what: "Die verdichtete Operator-Sicht auf den ausgewählten Run-Tag.",
    why: "Sie bündelt Entscheidungen, ohne die 45 Tagesplan-Spalten zu verstecken.",
    how: "Tag wählen, Stop-Regeln prüfen und dann Heute oder Mischlabor öffnen.",
    interpret:
      "Sollwerte sind Plantrajektorien. Aktuelle Pflanzen- und Messdaten haben Vorrang.",
  },
  setup: {
    what: "Die versionierte Konfiguration des aktiven Runs.",
    why: "Planwerte sind nur mit dokumentiertem Setup und Wasserprofil interpretierbar.",
    how: "Felder prüfen, Wasser-Baseline messen und Änderungen bewusst speichern.",
    interpret:
      "Eine Konfigurationsänderung erzeugt ein Ereignis; der kanonische v11.5-Plan bleibt als Referenz unverändert.",
  },
  log: {
    what: "Manuelle Soll/Ist-Messungen, Aktionen und persistente Alerts.",
    why: "Planwerte werden erst durch aktuelle Messungen und Beobachtungen operativ nutzbar.",
    how: "Messwerte mit Zeitstempel speichern, Abweichungen prüfen und Alerts nur nach Prüfung quittieren.",
    interpret:
      "Gemessen, fehlend und veraltet sind unterschiedliche Datenzustände; kein Wert wird als live dargestellt.",
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
  history: {
    what: "Das lokale Repository aller versionierten Runs und ihrer unveränderlichen Snapshots.",
    why: "Historische Messungen, Entscheidungen und Konfigurationen dürfen beim Start eines neuen Runs nicht überschrieben werden.",
    how: "Run auswählen oder einen neuen Entwurf anlegen; jeder Wechsel wird über die aktive Run-ID gespeichert.",
    interpret:
      "Vergleiche zeigen zunächst Zusammenhänge, keine Kausalität oder automatisch abgeleitete Optimierungsregel.",
  },
  mix: {
    what: "Ein Batchrechner auf Basis des ausgewählten Tages.",
    why: "Er verhindert Übertragungsfehler von ml/L zu Batchmengen.",
    how: "Batchvolumen eingeben, Reihenfolge befolgen, Endmix messen.",
    interpret:
      "Athena und pH Down bei 0 bedeuten nicht 'vergessen', sondern 'nur nach Messung'.",
  },
  reservoir: {
    what: "Reale Reservoir-Checkpoints und der verfügbare Lung-Room-Korridor.",
    why: "Tankzustand und Raumreserve sind Ist-Fakten, keine abgeleiteten Planwerte.",
    how: "Größe, Material, Temperatur, Standzeit und Raumkorridor messen und erfassen.",
    interpret: "Fehlende Werte bleiben unbekannt und werden nicht geschätzt.",
  },
  energy: {
    what: "Getrennte Energieaufzeichnungen für Licht, Klima, Irrigation und Sensorik.",
    why: "Nur Gesamtenergie ermöglicht belastbare Kosten- und Effizienzvergleiche.",
    how: "Gemessene Werte bevorzugen und Schätzquellen sichtbar kennzeichnen.",
    interpret:
      "Nennleistung × Laufzeit ist eine Schätzung, keine Smart-Plug-Messung.",
  },
  "post-harvest": {
    what: "Ein zeitlicher Sub-Run für Ernte, Trocknung, Cure und Lagerung.",
    why: "Nacherntequalität entsteht über Checkpoints und darf nicht auf Endgewicht reduziert werden.",
    how: "Pro Pflanze starten und reale Masse-, Klima- und aw-Checkpoints ergänzen.",
    interpret: "Plan, Messung und beobachtetes Ergebnis bleiben getrennt.",
  },
  climate: {
    what: "Die Licht- und Klimakurven des Plans.",
    why: "PPFD, DLI, Temperatur, rF und VPD sind gekoppelt.",
    how: "Kurven prüfen und mit realen Messungen vergleichen.",
    interpret: "Leaf-VPD ist ohne Blatttemperaturmessung eine Schätzung.",
  },
  calc: {
    what: "Interaktiver Schnellrechner für VPD, DLI und 4-Phasen-Klimamatrix.",
    why: "Ermöglicht schnelle Vorab-Simulationen von Temperatur, Luftfeuchte, PPFD und Photoperiode.",
    how: "Regler für Temperatur, RLF und Licht anpassen und Zielkorridore vergleichen.",
    interpret:
      "Die Berechnungen nutzen die kanonischen Formeln für Leaf-VPD und DLI.",
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
  inventory: {
    what: "Der persönliche, runbezogene Produktbestand getrennt vom Wissenskatalog.",
    why: "Gebinde, Restmengen und Chargen sind Ist-Daten und keine Produktevidenz.",
    how: "Nur tatsächlich vorhandene Gebinde erfassen und Änderungen revisionssicher speichern.",
    interpret:
      "Ein vorhandenes Produkt ist dadurch weder empfohlen noch kompatibel.",
  },
  autoflower: {
    what: "Die kanonische v11.5-Strain- und Mixed-Cultivar-Vergleichsbasis.",
    why: "Sie trennt dokumentierte Vergleichsattribute von individuellen Pflanzenbeobachtungen.",
    how: "Tabelle filtern und Herkunft, Scope sowie Unsicherheit der Angaben prüfen.",
    interpret:
      "Breeder-Claim, UKD-Heuristik und persönliche Beobachtung sind keine austauschbaren Wahrheiten.",
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
    what: `Alle ${AUDIT_COUNT} übernommenen Findings der Evidence-Guarded-Prüfung.`,
    why: "Es dokumentiert, warum wichtige Planentscheidungen geändert wurden.",
    how: "Nach Priorität filtern und Restunsicherheiten prüfen.",
    interpret:
      "FIXED heißt im geprüften Workbook korrigiert, nicht wissenschaftlich endgültig bewiesen.",
  },
  raw: {
    what: "Die vollständige kanonische v11.5-Datenbasis mit 56 Blättern.",
    why: "Nichts wird durch die neue Darstellung unsichtbar oder gelöscht.",
    how: "Blatt wählen, Werte prüfen; im Expert-Modus Formeln einblenden.",
    interpret:
      "Berechnete Werte stammen aus dem Evidence-Guarded-v11.5-Workbook und werden hier nicht still neu erfunden.",
  },
  legal: {
    what: "Ein sitzungsgebundener Import geprüfter Rechtsprofile plus getrenntes Bestandslog.",
    why: "KCanG, Apothekenbezug und individuelle Erlaubnisse dürfen nicht still addiert werden.",
    how: "Nur ein geprüftes lokales Profil importieren und jede Bestandsbewegung einzeln dokumentieren.",
    interpret:
      "Das Modul ersetzt keine Rechtsberatung und speichert das sensible Profil nicht im Browser.",
  },
  reports: {
    what: "Der vollständige Backup-, Restore- und Berichtsbereich.",
    why: "Ein operativer Run braucht portable, versionierte und prüfbare Daten.",
    how: "Vor Änderungen JSON sichern; Importe werden vor Übernahme validiert.",
    interpret:
      "CSV/XLSX sind Arbeitsdaten, PDF ist eine Momentaufnahme; JSON bleibt das verlustfreie Austauschformat.",
  },
  media: {
    what: "Der lokale, verschlüsselte Foto-Lifecycle des Runs.",
    why: "EXIF- und Standortsdaten dürfen nicht unbemerkt in Run-Backups oder Sync gelangen.",
    how: "Bild importieren; UKD orientiert und codiert es neu, bevor das Original verworfen wird.",
    interpret:
      "Medieninhalt bleibt verschlüsselt; im RunPackage stehen nur geprüfte Metadaten und Referenzen.",
  },
  system: {
    what: "Datenintegrität, Offline-Status und ehrliche Integrationsgrenzen.",
    why: "Ein Update darf Quellen, Hashes oder lokale Daten nicht still verändern.",
    how: "Manifest prüfen, Version vergleichen und Integrationen nur nach freigegebenem Protokoll aktivieren.",
    interpret:
      "Sensorik, Cloud und Gerätesteuerung bleiben deaktiviert, solange Sicherheits- und Vertrauensmodell fehlen.",
  },
  connector: {
    what: "Ein read-only Datei-Connector mit Probe-, Mapping-, Validierungs- und Vorschauphase.",
    why: "Fremddaten dürfen erst nach Identitäts-, Einheiten-, Zeit- und Dublettenprüfung in den Run gelangen.",
    how: "CSV oder JSON wählen, Spalten zuordnen, Findings beheben und erst die validierte Vorschau übernehmen.",
    interpret:
      "Importierte Messwerte bleiben unverified, bis Geräteidentität und Kalibrierung separat geprüft wurden.",
  },
  profiles: {
    what: "Versionierte Setup-Profile und Run-Templates außerhalb des aktiven Run-Snapshots.",
    why: "Wiederverwendung darf historische Konfigurationen nicht rückwirkend verändern.",
    how: "Aktuelles Setup als Profil sichern, daraus ein Template erzeugen und damit einen neuen Entwurf starten.",
    interpret:
      "Der aktive Snapshot ist unveränderlich; spätere Profilversionen gelten nur für neue Runs.",
  },
  equipment: {
    what: "Asset-, Wartungs-, Lichtprofil-, PPFD- und Kalibrierungsfläche.",
    why: "Messwerte benötigen Geräteidentität, Kalibrierstatus und nachvollziehbare Erfassung.",
    how: "Nur tatsächlich gemessene Werte und die reale Geräte-ID eintragen.",
    interpret:
      "Fehlgeschlagene Kalibrierung bleibt ein Interpretationsblocker.",
  },
  ipm: {
    what: "Strukturierte Plant-Health- und IPM-Inspektionen mit Follow-up.",
    why: "Befund, Behandlung und Ergebnis müssen als Verlauf statt als Freitext-Snapshot bestehen bleiben.",
    how: "Befund erfassen und jeden Statuswechsel nach realer Prüfung bestätigen.",
    interpret: "Schließen erfordert Ergebnis und abgeschlossenes Follow-up.",
  },
  incidents: {
    what: "Incident-, Recovery- und Ursachenanalyse-Workflow.",
    why: "Ein kritischer Störfall muss den normalen Tagesplan sichtbar superseden.",
    how: "Incident eröffnen, Maßnahmen protokollieren und Recovery schrittweise bestätigen.",
    interpret:
      "Schließen erfordert Root Cause und Lessons Learned; Rückfälle gehen zurück in Mitigation.",
  },
};

function readRoute(): RouteId {
  const value = window.location.hash.replace(/^#\/?/, "") as RouteId;
  return NAV.some((item) => item.id === value) ? value : "masterplan";
}

function readLens(): ExperienceLens {
  const query = new URLSearchParams(window.location.search).get("lens");
  const saved = localStorage.getItem("ukd:lens");
  const value = query ?? saved;
  return value === "advanced" || value === "expert" ? value : "guided";
}

function readDay(): number {
  const queryParam = new URLSearchParams(window.location.search).get("day");
  const query = queryParam === null ? Number.NaN : Number(queryParam);
  const saved = Number(localStorage.getItem("ukd:day"));
  const value = Number.isFinite(query) && query >= 0 ? query : saved;
  return Math.max(
    0,
    Math.min(80, Number.isFinite(value) ? Math.round(value) : 0),
  );
}

function App() {
  const [data, setData] = useState<Workbook | null>(null);
  const [referenceReady, setReferenceReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `${import.meta.env.BASE_URL}data/evidence-guarded-workbook-v11_5.json`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    )
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

  useEffect(() => {
    let active = true;
    Promise.all([
      import("./data/legacy-audit.json"),
      import("./data/knowledge-base.json"),
      import("./data/ai-context.json"),
      import("./data/skills.json"),
    ])
      .then(([auditModule, knowledgeModule, contextModule, skillsModule]) => {
        if (!active) return;
        audit = auditModule.default as typeof audit;
        knowledge = knowledgeModule.default as KnowledgeBase;
        aiContext = contextModule.default;
        skillsData = skillsModule.default;
        setReferenceReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Referenzdaten konnten nicht geladen werden",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadError)
    return (
      <DataState
        title="Datenbasis konnte nicht geladen werden"
        detail={loadError}
        error
      />
    );
  if (!data || !referenceReady)
    return (
      <DataState
        title="Operator Workspace wird vorbereitet"
        detail={`56 Blätter und ${AUDIT_COUNT} Legacy-Audit-Findings werden geladen…`}
      />
    );
  workbook = data;
  return <Workspace />;
}

function Workspace() {
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [lens, setLens] = useState<ExperienceLens>(readLens);
  const [day, setDay] = useState(readDay);
  const [followLiveDay, setFollowLiveDay] = useState(true);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("ukd:theme") === "light" ? "light" : "dark",
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [run, setRun] = useState<RunPackage>(() => createDefaultRunPackage());
  const [runHydrated, setRunHydrated] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageReadOnly, setStorageReadOnly] = useState(false);
  const [legalProfile, setLegalProfile] = useState<LegalProfile | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem("ukd-welcome-dismissed"),
  );
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const lastClockObservedRef = useRef<string | null>(null);
  const plan = useMemo(() => getDayPlan(workbook, day), [day]);
  const setViewDay = (nextDay: number) => {
    setFollowLiveDay(false);
    setDay(nextDay);
  };

  const rememberFocus = () => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const openHelp = () => {
    rememberFocus();
    setHelpOpen(true);
  };
  const openPalette = () => {
    rememberFocus();
    setPaletteOpen(true);
  };
  const closeOverlays = () => {
    setHelpOpen(false);
    setPaletteOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  useEffect(() => {
    let active = true;
    loadActiveRun()
      .then((saved) => {
        if (active && saved) {
          setRun(saved);
          if (saved.executionMode === "live")
            setDay(evaluateLiveClock(saved).day);
        }
      })
      .catch((cause) => {
        if (active) {
          const failure = classifyStorageFailure(cause);
          setStorageReadOnly(true);
          setStorageError(
            `${failure.message} Bitte den aktuellen Stand sofort sichern.`,
          );
        }
      })
      .finally(() => {
        if (active) setRunHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!runHydrated || storageReadOnly) return;
    const timer = window.setTimeout(() => {
      void resilientRunRepository.save(run).then((result) => {
        if (result.ok) return;
        setStorageReadOnly(true);
        const protectedRun = result.protectedRun ?? run;
        setRun({
          ...protectedRun,
          storageState: {
            state: result.state,
            lastSuccessfulWriteAt:
              protectedRun.storageState.lastSuccessfulWriteAt,
            lastFailureAt: new Date().toISOString(),
            failureKind: result.failure.kind,
            detail: result.failure.message,
            unsavedChanges: true,
          },
        });
        setStorageError(
          `${result.failure.message} Weitere Änderungen sind bis zur Speicherprüfung gesperrt.`,
        );
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [run, runHydrated, storageReadOnly]);

  const updateRun = (next: RunPackage) => {
    if (storageReadOnly) {
      setStorageError(
        (current) =>
          current ||
          "Der Run ist schreibgeschützt. Exportiere ein Backup oder prüfe den Speicher.",
      );
      return;
    }
    const liveClock = evaluateLiveClock(run);
    const safeWhileClockBlocked = new Set([
      "live.anchor-corrected",
      "live.completed",
      "backup.checkpoint",
      "ai-proposal.rejected",
    ]);
    if (
      run.executionMode === "live" &&
      liveClock.blocked &&
      !safeWhileClockBlocked.has(next.domainEvents[0]?.type ?? "")
    ) {
      setStorageError(
        liveClock.health.detail ??
          "Die Live-Uhr ist blockiert; fachliche Änderungen wurden nicht gespeichert.",
      );
      return;
    }
    const nextHeadEvent = next.domainEvents[0];
    // A direct scientific editor can legitimately return a run
    // whose newest existing event is still a backup checkpoint.
    // Treat it as a checkpoint merge only when that event is new;
    // otherwise configuration edits (for example a PPFD map)
    // would be silently discarded.
    const isCheckpoint =
      nextHeadEvent?.type === "backup.checkpoint" &&
      !run.domainEvents.some((event) => event.id === nextHeadEvent.id);
    setRun((current) => {
      if (isCheckpoint && current.id === next.id) {
        const domain = next.domainEvents[0];
        const auditEntry = next.auditEvents[0];
        const timeline = next.events[0];
        return {
          ...current,
          updatedAt: next.updatedAt,
          backupState: { ...next.backupState, pending: false },
          backupCheckpoints: [
            ...next.backupCheckpoints.filter(
              (entry) =>
                !current.backupCheckpoints.some((item) => item.id === entry.id),
            ),
            ...current.backupCheckpoints,
          ].slice(0, 120),
          domainEvents:
            domain &&
            !current.domainEvents.some((entry) => entry.id === domain.id)
              ? [domain, ...current.domainEvents]
              : current.domainEvents,
          auditEvents:
            auditEntry &&
            !current.auditEvents.some((entry) => entry.id === auditEntry.id)
              ? [auditEntry, ...current.auditEvents]
              : current.auditEvents,
          events:
            timeline &&
            !current.events.some((entry) => entry.id === timeline.id)
              ? [timeline, ...current.events]
              : current.events,
        };
      }
      return {
        ...next,
        backupState: { ...next.backupState, pending: !isCheckpoint },
      };
    });
  };

  useEffect(() => {
    if (!runHydrated || storageReadOnly || !run.backupState.pending) return;
    const timer = window.setTimeout(() => {
      void createVaultCheckpoint(run, "automatic")
        .then((checkpoint) => {
          const recorded = applyRunCommand(run, {
            kind: "backup.checkpoint",
            checkpointId: checkpoint.id,
            sha256: checkpoint.sha256,
            checkpointKind: "automatic",
            verified: checkpoint.verified,
          });
          if (recorded.ok)
            setRun((current) => {
              if (current.id !== run.id) return current;
              const fresh = applyRunCommand(current, {
                kind: "backup.checkpoint",
                checkpointId: checkpoint.id,
                sha256: checkpoint.sha256,
                checkpointKind: "automatic",
                verified: checkpoint.verified,
              });
              return fresh.ok ? fresh.value : current;
            });
        })
        .catch((error) =>
          setStorageError(
            error instanceof Error
              ? `Automatisches Backup fehlgeschlagen: ${error.message}`
              : "Automatisches Backup fehlgeschlagen.",
          ),
        );
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [run, runHydrated, storageReadOnly]);

  useEffect(() => {
    if (!runHydrated) return;
    void validateLatestCheckpointInStaging().then((result) => {
      if (!result.ok && run.executionMode === "live")
        setStorageError(`Restore-Drill: ${result.detail}`);
    });
  }, [runHydrated, run.executionMode]);

  useEffect(() => {
    if (run.executionMode !== "live") return;
    const updateClock = () => {
      const now = new Date();
      setClockNow(now);
      const observedRun = lastClockObservedRef.current
        ? {
            ...run,
            clockHealth: {
              ...run.clockHealth,
              lastObservedAtUtc: lastClockObservedRef.current,
            },
          }
        : run;
      const result = evaluateLiveClock(observedRun, now);
      if (followLiveDay) setDay(result.day);
      if (!result.blocked)
        lastClockObservedRef.current = result.health.lastObservedAtUtc;
      const persistedAt = run.clockHealth.lastObservedAtUtc
        ? Date.parse(run.clockHealth.lastObservedAtUtc)
        : 0;
      const persistHeartbeat =
        !result.blocked && now.getTime() - persistedAt >= 60 * 60_000;
      if (result.health.status !== run.clockHealth.status || persistHeartbeat)
        setRun((current) => ({ ...current, clockHealth: result.health }));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, [run, followLiveDay]);

  const retryStorage = async () => {
    const result = await resilientRunRepository.retry(run);
    if (!result.ok) {
      setStorageError(result.failure.message);
      return;
    }
    setStorageReadOnly(false);
    setStorageError("");
    setRun({
      ...result.value,
      storageState: {
        state: "healthy",
        lastSuccessfulWriteAt: new Date().toISOString(),
        lastFailureAt: null,
        failureKind: null,
        detail: null,
        unsavedChanges: false,
      },
    });
  };

  const exportEmergencyBackup = async () => {
    downloadJson(
      `ukd-emergency-${run.id}`,
      await createBackupEnvelope(run, "8.0.0"),
    );
  };

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
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        setNavOpen(false);
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
      const target = event.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (event.key === "?" && !editing) {
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setHelpOpen(true);
      }
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
        lens={lens}
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
            onClick={openPalette}
          >
            <span>⌕</span>
            <span>Suche, Ansicht oder Aktion</span>
            <kbd>Ctrl K</kbd>
          </button>
          <ExecutionModeControl
            run={run}
            day={day}
            now={clockNow}
            onToggleMode={(mode) => {
              const updated = updateExecutionMode(run, mode);
              if (mode === "live") {
                setFollowLiveDay(true);
                const liveRes = evaluateLiveClock(updated, clockNow);
                setDay(liveRes.day);
              } else {
                setFollowLiveDay(false);
              }
              updateRun(updated);
            }}
            onSetDay={setViewDay}
          />
          <LensControl lens={lens} onChange={setLens} />
          <LensBadge
            lens={lens}
            onClick={() =>
              setLens(
                lens === "guided"
                  ? "advanced"
                  : lens === "advanced"
                    ? "expert"
                    : "guided",
              )
            }
          />
          <button
            className="icon-button"
            type="button"
            onClick={openHelp}
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
        <GlobalCommandCenter
          run={run}
          lens={lens}
          day={day}
          now={clockNow}
          plan={plan}
          knowledge={knowledge}
          capabilities={{ aiContext, skills: skillsData.skills }}
          onChange={updateRun}
          onSetDay={(nextDay) => {
            setFollowLiveDay(true);
            setDay(nextDay);
          }}
          onNavigate={navigate}
          onHelp={openHelp}
        />
        <main
          id="main-content"
          className={`main-content lens-${lens}`}
          tabIndex={-1}
        >
          <PageHeader
            item={active}
            lens={lens}
            day={day}
            setDay={setViewDay}
            onCycleLens={() =>
              setLens(
                lens === "guided"
                  ? "advanced"
                  : lens === "advanced"
                    ? "expert"
                    : "guided",
              )
            }
            onHelp={openHelp}
          />
          {storageError && (
            <aside
              className="inline-error global-error failure-banner"
              role="alert"
            >
              <div>
                <strong>Lokale Speicherung unterbrochen</strong>
                <p>{storageError}</p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => void exportEmergencyBackup()}
                >
                  Sofortbackup
                </button>
                <button type="button" onClick={() => void retryStorage()}>
                  Erneut versuchen
                </button>
                <button type="button" onClick={() => navigate("reports")}>
                  Backup öffnen
                </button>
                <button type="button" onClick={() => navigate("system")}>
                  Speicher prüfen
                </button>
              </div>
            </aside>
          )}
          {lens === "guided" && (
            <GuidedBanner route={route} onHelp={openHelp} />
          )}
          <Suspense
            fallback={
              <p className="route-loading" role="status">
                Arbeitsbereich wird geladen…
              </p>
            }
          >
            <RouteContent
              route={route}
              lens={lens}
              plan={plan}
              day={day}
              now={clockNow}
              setDay={setViewDay}
              navigate={navigate}
              run={run}
              setRun={updateRun}
              legalProfile={legalProfile}
              setLegalProfile={setLegalProfile}
              showWelcome={showWelcome}
              onDismissWelcome={() => {
                localStorage.setItem("ukd-welcome-dismissed", "1");
                setShowWelcome(false);
              }}
            />
          </Suspense>
        </main>
        <MobileBar route={route} onNavigate={navigate} />
      </div>
      {helpOpen && (
        <HelpDrawer route={route} lens={lens} onClose={closeOverlays} />
      )}
      {paletteOpen && (
        <CommandPalette
          onClose={closeOverlays}
          onNavigate={navigate}
          setDay={setViewDay}
        />
      )}
    </div>
  );
}

function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="welcome-card">
      <h2>Willkommen im UKD Grow Masterplan</h2>
      <p>
        Dein wissenschaftlich fundierter Begleiter für den kontrollierten
        Eigenanbau – von Keimung bis Ernte.
      </p>
      <ul>
        <li>
          <strong>Cockpit</strong> zeigt den Tagesstatus und die wichtigsten
          Entscheidungen
        </li>
        <li>
          <strong>Heute</strong> gibt dir alle Zielwerte und Aufgaben für den
          aktuellen Tag
        </li>
        <li>
          <strong>Mischlabor</strong> berechnet deine Nährlösung in der
          richtigen Reihenfolge
        </li>
        <li>
          Wechsle zwischen <strong>Guided</strong>, <strong>Advanced</strong>{" "}
          und <strong>Expert</strong> für mehr oder weniger Detail
        </li>
      </ul>
      <div className="welcome-actions">
        <button className="btn-dismiss" onClick={onDismiss} type="button">
          Verstanden, los geht's
        </button>
      </div>
    </div>
  );
}

const GUIDED_CORE_ROUTES: RouteId[] = [
  "cockpit",
  "today",
  "setup",
  "log",
  "mix",
  "timeline",
];

function Sidebar({
  route,
  lens,
  onNavigate,
  open,
  onClose,
}: {
  route: RouteId;
  lens: ExperienceLens;
  onNavigate: (route: RouteId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const groups = [...new Set(NAV.map((item) => item.group))];
  const activeGroup =
    NAV.find((item) => item.id === route)?.group ?? "Operator";
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g !== activeGroup)),
  );
  const [showAllInGuided, setShowAllInGuided] = useState(false);
  const formulaCount = Object.values(workbook).reduce(
    (sum, sheet) =>
      sum +
      sheet.formulas.flat().filter((formula) => String(formula).startsWith("="))
        .length,
    0,
  );

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  useEffect(() => {
    setCollapsedGroups((previous) => {
      if (!previous.has(activeGroup)) return previous;
      const next = new Set(previous);
      next.delete(activeGroup);
      return next;
    });
  }, [activeGroup]);

  const isGuidedFiltered = lens === "guided" && !showAllInGuided;

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
            <small
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "2px",
              }}
            >
              <span>Grow Workspace · v11.5</span>
              <LensBadge lens={lens} size="sm" />
            </small>
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
          <span className="status-dot" /> Datenstand 23.08.2026 · v11.5
        </div>
        <nav>
          {groups.map((group) => {
            const groupItems = NAV.filter((item) => item.group === group);
            const visibleItems = isGuidedFiltered
              ? groupItems.filter((item) =>
                  GUIDED_CORE_ROUTES.includes(item.id),
                )
              : groupItems;
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsedGroups.has(group);
            return (
              <div
                className={`nav-group ${isCollapsed ? "is-collapsed" : ""}`}
                key={group}
                data-group={group}
              >
                <button
                  className="nav-group-header"
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={!isCollapsed}
                >
                  <span>{group}</span>
                  <span className="nav-group-chevron" aria-hidden="true">
                    ▾
                  </span>
                </button>
                <div className="nav-group-items">
                  <div>
                    {visibleItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={route === item.id ? "active" : ""}
                        onClick={() => onNavigate(item.id)}
                        aria-current={route === item.id ? "page" : undefined}
                        title={item.description}
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
                </div>
              </div>
            );
          })}
          {isGuidedFiltered && (
            <button
              className="nav-group-header"
              type="button"
              onClick={() => setShowAllInGuided(true)}
              style={{ marginTop: 8, color: "var(--muted)" }}
            >
              <span>Alle Bereiche anzeigen ›</span>
            </button>
          )}
          {lens === "guided" && showAllInGuided && (
            <button
              className="nav-group-header"
              type="button"
              onClick={() => setShowAllInGuided(false)}
              style={{ marginTop: 8, color: "var(--muted)" }}
            >
              <span>‹ Nur Kernbereiche</span>
            </button>
          )}
        </nav>
        <div className="sidebar-foot">
          <span>
            56 Blätter · {formulaCount.toLocaleString("de-DE")} Formeln
          </span>
          <span>Evidence-Guarded v11.5 · geprüft 23.08.2026</span>
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

function ExecutionModeControl({
  run,
  day,
  now,
  onToggleMode,
  onSetDay,
}: {
  run: RunPackage;
  day: number;
  now: Date;
  onToggleMode: (mode: RunExecutionMode) => void;
  onSetDay: (day: number) => void;
}) {
  const isLive = run.executionMode === "live";
  const liveClock = evaluateLiveClock(run, now);
  const liveDay = liveClock.day;

  return (
    <div
      className="execution-mode-control"
      role="group"
      aria-label="Ausführungsmodus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        height: "36px",
        padding: "2px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-1)",
        whiteSpace: "nowrap",
      }}
    >
      <button
        type="button"
        className={`mode-btn execution-mode-live ${isLive ? "active" : ""}`}
        onClick={() => {
          if (!isLive) {
            onToggleMode("live");
          } else {
            onSetDay(liveDay);
          }
        }}
        aria-pressed={isLive}
        title={
          isLive
            ? `Live-Modus aktiv · Berechneter Tag ${liveDay} (UTC) · Anker: ${
                run.liveAnchor?.startedAtUtc
                  ? run.liveAnchor.startedAtUtc.slice(0, 10)
                  : "Startdatum"
              }`
            : "In Live-Modus wechseln (Echtzeit-Uhr basierend auf Keimungs-/Aussaat-Anker)"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          height: "30px",
          padding: "0 10px",
          border: isLive
            ? "1px solid color-mix(in srgb, var(--green) 40%, transparent)"
            : "1px solid transparent",
          borderRadius: "4px",
          background: isLive ? "var(--mode-live-active-bg)" : "transparent",
          // Keep the established quiet appearance with an opaque semantic
          // surface. This avoids engine-specific contrast interpretation of
          // color-mix() while preserving the approved visual hierarchy.
          color: "var(--mode-control-text)",
          fontSize: "11px",
          fontWeight: isLive ? 800 : 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <span
          className="mode-dot live-dot"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isLive ? "var(--green)" : "var(--muted)",
            boxShadow: isLive ? "0 0 8px var(--green)" : "none",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span>{isLive ? `LIVE: Tag ${liveDay} (UTC)` : "LIVE"}</span>
      </button>

      <button
        type="button"
        className={`mode-btn execution-mode-simulation ${!isLive ? "active" : ""}`}
        onClick={() => {
          if (isLive) {
            onToggleMode("simulation");
          }
        }}
        aria-pressed={!isLive}
        title={
          !isLive
            ? `Simulations-Modus aktiv · Tag ${day} / 80`
            : "In Simulations-Modus wechseln (interaktives Scrubbing)"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          height: "30px",
          padding: "0 10px",
          border: !isLive
            ? "1px solid color-mix(in srgb, var(--blue) 40%, transparent)"
            : "1px solid transparent",
          borderRadius: "4px",
          background: !isLive
            ? "var(--mode-simulation-active-bg)"
            : "transparent",
          color: "var(--mode-control-text)",
          fontSize: "11px",
          fontWeight: !isLive ? 800 : 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <span
          className="mode-dot sim-dot"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: !isLive ? "var(--blue)" : "var(--muted)",
            boxShadow: !isLive ? "0 0 6px var(--blue)" : "none",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span>{!isLive ? `SIMULATION: Tag ${day}` : "SIMULATION"}</span>
      </button>

      {!isLive && (
        <div
          className="sim-scrubber-cluster"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            paddingLeft: "4px",
            paddingRight: "4px",
            borderLeft: "1px solid var(--line)",
          }}
        >
          <input
            type="range"
            min={0}
            max={80}
            value={day}
            onChange={(e) => onSetDay(Number(e.target.value))}
            aria-label="Simulations-Tag Scrubbing"
            title={`Simulations-Tag: ${day} von 80`}
            style={{
              width: "70px",
              height: "4px",
              accentColor: "var(--blue)",
              cursor: "pointer",
            }}
          />
        </div>
      )}
    </div>
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
  onCycleLens,
  onHelp,
}: {
  item: NavItem;
  lens: ExperienceLens;
  day: number;
  setDay: (day: number) => void;
  onCycleLens: () => void;
  onHelp: () => void;
}) {
  return (
    <section className="page-header">
      <div>
        <div className="eyebrow">
          {item.group} <span>›</span> {item.label} <span>·</span>{" "}
          <LensBadge
            lens={lens}
            size="sm"
            onClick={onCycleLens}
            className="page-lens-control"
          />
        </div>
        <div className="breadcrumb">
          {item.group} <span>› {item.label}</span>
        </div>
        <h1>{item.label}</h1>
        <p>{item.description}</p>
        {lens === "guided" && (
          <p style={{ color: "var(--blue)", fontSize: 12, marginTop: 4 }}>
            💡 {HELP[item.id].how}
          </p>
        )}
      </div>
      <div className="header-actions">
        {![
          "setup",
          "knowledge",
          "audit",
          "raw",
          "legal",
          "reports",
          "system",
          "products",
          "autoflower",
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
          ? Hilfe
        </button>
      </div>
    </section>
  );
}

const GUIDED_HINTS: Partial<Record<RouteId, string>> = {
  cockpit:
    "Beginne oben: Prüfe Licht & Klima, dann Wurzelzone, dann Feed. Die Quick Actions unten führen dich zum nächsten Schritt.",
  today:
    "Arbeite die Karten von oben nach unten ab. Offene Messwerte zuerst erfassen, dann Aktionen durchführen.",
  mix: "Gib dein Batchvolumen in Litern ein. Die Tabelle berechnet automatisch die ml pro Produkt. Befolge die Mischreihenfolge.",
  setup:
    "Prüfe zuerst dein Wasserprofil (pH, EC). Ohne diese Werte sind die Dosen im Plan nicht zuverlässig.",
  log: "Trage hier deine täglichen Messwerte ein: Temperatur, Luftfeuchte, pH und EC. So wird der Soll/Ist-Vergleich möglich.",
  timeline:
    "Der Slider zeigt den gesamten 81-Tage-Plan. Klicke auf einen Tag, um die Tagesdetails zu sehen.",
  climate:
    "Die Kurven zeigen den geplanten Verlauf. Vergleiche sie mit deinen realen Messungen aus dem Log.",
  calc: "Simuliere hier Temperatur, Luftfeuchte und Lichtwerte, um VPD und DLI vorab zu berechnen und mit den Phasen-Zielwerten zu vergleichen.",
  nutrients:
    "Das Reference-System zeigt die Basisdosen. Ändere pro Test nur eine Variable.",
};

function GuidedBanner({
  route,
  onHelp,
}: {
  route: RouteId;
  onHelp: () => void;
}) {
  const hint = GUIDED_HINTS[route];
  return (
    <aside className="guided-banner">
      <span className="guided-icon">i</span>
      <div>
        <strong>{hint ? "So gehst du vor" : "Orientierung"}</strong>
        <p>{hint ?? `${HELP[route].what} ${HELP[route].interpret}`}</p>
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
  now,
  setDay,
  navigate,
  run,
  setRun,
  legalProfile,
  setLegalProfile,
  showWelcome,
  onDismissWelcome,
}: {
  route: RouteId;
  lens: ExperienceLens;
  plan: ReturnType<typeof getDayPlan>;
  day: number;
  now: Date;
  setDay: (day: number) => void;
  navigate: (route: RouteId) => void;
  run: RunPackage;
  setRun: (run: RunPackage) => void;
  legalProfile: LegalProfile | null;
  setLegalProfile: (profile: LegalProfile | null) => void;
  showWelcome: boolean;
  onDismissWelcome: () => void;
}) {
  switch (route) {
    case "masterplan":
      return (
        <MasterplanOverviewPanel navigate={navigate} run={run} plan={plan} />
      );
    case "plan-editor":
      return (
        <RunConfigPanel
          run={run}
          lens={lens}
          now={now}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "cockpit":
      return (
        <Cockpit
          plan={plan}
          day={day}
          lens={lens}
          setDay={setDay}
          navigate={navigate}
          run={run}
          setRun={setRun}
          showWelcome={showWelcome}
          onDismissWelcome={onDismissWelcome}
        />
      );
    case "setup":
      return (
        <RunConfigPanel
          run={run}
          lens={lens}
          now={now}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "log":
      return <RunLogWorkspace run={run} plan={plan} onChange={setRun} />;
    case "today":
      return (
        <DailyOperatorPanel
          plan={plan}
          getPlanForDay={(d) => getDayPlan(workbook, d)}
          lens={lens}
          navigate={navigate}
          run={run}
          onUpdateRun={setRun}
        />
      );
    case "timeline":
      return <Timeline day={day} setDay={setDay} lens={lens} />;
    case "history":
      return <RunHistoryWorkspace run={run} onChange={setRun} />;
    case "mix":
      return (
        <div className="page-stack">
          <NutrientMixPanel
            run={run}
            plan={plan}
            lens={lens}
            onUpdateRun={setRun}
            navigate={navigate}
          />
          <MixApplicationWorkspace run={run} lens={lens} onChange={setRun} />
        </div>
      );
    case "reservoir":
      return <ReservoirWorkspace run={run} lens={lens} onChange={setRun} />;
    case "energy":
      return <EnergyWorkspace run={run} lens={lens} onChange={setRun} />;
    case "post-harvest":
      return <PostHarvestWorkspace run={run} lens={lens} onChange={setRun} />;
    case "climate":
      return (
        <div className="page-stack">
          <EnvironmentTargetsPanel
            run={run}
            plan={plan}
            lens={lens}
            onUpdateRun={setRun}
            navigate={navigate}
          />
          <_Climate plan={plan} lens={lens} />
        </div>
      );
    case "calc":
      return (
        <VpdDliCalculatorPanel
          run={run}
          plan={plan}
          lens={lens}
          onUpdateRun={setRun}
          navigate={navigate}
        />
      );
    case "nutrients":
      return (
        <Nutrients plan={plan} lens={lens} navigate={navigate} run={run} />
      );
    case "products":
      return <LibraryPage sheetName="17_All_Products" lens={lens} />;
    case "inventory":
      return (
        <ProductInventoryWorkspace run={run} lens={lens} onChange={setRun} />
      );
    case "autoflower":
      return (
        <AutoflowerCockpitPanel
          lens={lens}
          navigate={navigate}
          selectedStrainIds={run.plants
            .slice(0, run.config.plantCount)
            .map((p) => p.genetics || "")}
          onSelectStrain={(strain: AutoflowerStrain) => {
            const plantIdentity = run.plants[0]?.identity;
            const updatedIdentity: PlantIdentity = {
              breeder: strain.breeder,
              seedType:
                strain.typ === "Autoflower" ? "autoflower" : "feminized",
              seedLot: plantIdentity?.seedLot ?? null,
              packBatch: plantIdentity?.packBatch ?? null,
              sourceDate: plantIdentity?.sourceDate ?? null,
              phenotypeNotes:
                strain.urteil || strain.wirkung || strain.geschmack || "",
              pottingDateIso: plantIdentity?.pottingDateIso,
              emergenceDateIso: plantIdentity?.emergenceDateIso,
              dayZeroAnchorDate: plantIdentity?.dayZeroAnchorDate,
            };
            const updatedConfig: RunConfig = {
              ...run.config,
              genetics: strain.name,
            };
            const updatedRun = updatePlantIdentity(
              { ...run, config: updatedConfig },
              strain.name,
              updatedIdentity,
              run.config.dayZeroAnchor ?? "emergence",
              run.config.startDate,
            );
            setRun(updatedRun);
            navigate("setup");
          }}
        />
      );
    case "compatibility":
      return <LibraryPage sheetName="16_Compatibility" lens={lens} />;
    case "diagnostics":
      return <Diagnostics lens={lens} />;
    case "knowledge":
      return <InternalKnowledgePage lens={lens} />;
    case "audit":
      return <AuditPage lens={lens} />;
    case "raw":
      return <RawData lens={lens} />;
    case "legal":
      return (
        <LegalWorkspace
          run={run}
          onChange={setRun}
          profile={legalProfile}
          onProfileChange={setLegalProfile}
        />
      );
    case "reports":
      return <ReportsWorkspace run={run} onChange={setRun} />;
    case "media":
      return <MediaWorkspace run={run} lens={lens} onChange={setRun} />;
    case "system":
      return <SystemWorkspace run={run} />;
    case "connector":
      return <ConnectorWorkspace run={run} lens={lens} onChange={setRun} />;
    case "profiles":
      return <ProfilesWorkspace run={run} lens={lens} onChange={setRun} />;
    case "equipment":
      return (
        <div className="page-stack">
          <EquipmentManagerPanel
            run={run}
            lens={lens}
            onUpdateRun={setRun}
            navigate={navigate}
          />
          <EquipmentOperationsWorkspace
            run={run}
            lens={lens}
            onChange={setRun}
          />
        </div>
      );
    case "ipm":
      return <IpmWorkspace run={run} lens={lens} onChange={setRun} />;
    case "incidents":
      return <IncidentWorkspace run={run} lens={lens} onChange={setRun} />;
    default:
      return (
        <Cockpit
          plan={plan}
          day={day}
          lens={lens}
          setDay={setDay}
          navigate={navigate}
          run={run}
          setRun={setRun}
          showWelcome={showWelcome}
          onDismissWelcome={onDismissWelcome}
        />
      );
  }
}

function Cockpit({
  plan,
  day,
  lens,
  setDay,
  navigate,
  run,
  setRun,
  showWelcome,
  onDismissWelcome,
}: {
  plan: ReturnType<typeof getDayPlan>;
  day: number;
  lens: ExperienceLens;
  setDay: (day: number) => void;
  navigate: (route: RouteId) => void;
  run: RunPackage;
  setRun: (run: RunPackage) => void;
  showWelcome: boolean;
  onDismissWelcome: () => void;
}) {
  const config = effectiveRunConfig(run);
  const observation = latestObservation(run, day);
  const alerts = deriveRunAlerts(run, plan);

  const handleSaveMeasurement = (fieldKey: string, value: number | string) => {
    const currentObs = latestObservation(run, day) ?? createObservation(day);
    const num =
      typeof value === "number" ? value : Number.parseFloat(String(value));
    const validNum = Number.isNaN(num) ? null : num;
    const values = { ...currentObs.values };

    if (fieldKey === "ppfd") {
      values.ppfd = validNum;
    } else if (
      fieldKey === "temp" ||
      fieldKey === "temperature" ||
      fieldKey === "tempLight"
    ) {
      values.tempMax = validNum;
    } else if (fieldKey === "humidity") {
      values.humidityMax = validNum;
    } else if (fieldKey === "vpd" || fieldKey === "leafVpd") {
      values.leafTemp = validNum;
    } else if (fieldKey === "ec") {
      values.ecIn = validNum;
    } else if (fieldKey === "ph") {
      values.phIn = validNum;
    } else if (fieldKey === "potMass" || fieldKey === "potWeight") {
      values.potMassGrams = validNum;
    }

    const updatedObs: DailyObservation = {
      ...currentObs,
      recordedAt: new Date().toISOString(),
      status: "measured",
      values,
    };

    const updatedRun = addObservation(run, updatedObs);
    setRun(updatedRun);
  };

  const handleSaveTarget = (
    fieldKey: string,
    value: number | string,
    meta?: { reason?: string },
  ) => {
    const override: RunOverride = {
      id: crypto.randomUUID(),
      field: fieldKey,
      canonicalValue:
        (config as unknown as Record<string, unknown>)[fieldKey] ?? null,
      overrideValue: value,
      evidenceConflict: "manual-override",
      reason:
        meta?.reason?.trim() || `In-Place Sollwertanpassung für ${fieldKey}`,
      createdAt: new Date().toISOString(),
      reversible: true,
    };
    const updatedRun = addRunOverride(run, override);
    setRun(updatedRun);
  };

  return (
    <div className="page-stack">
      {showWelcome && <WelcomeCard onDismiss={onDismissWelcome} />}
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
          <div style={{ marginTop: "2px" }}>
            <InlineEditable
              value={config.genetics}
              label="Genetik"
              fieldKey="genetics"
              getSuggestions={(query) =>
                getLiveFieldSuggestions("genetics", query, {
                  day,
                  genetics: config.genetics,
                })
              }
              onSave={(newGenetics) => {
                const strainMeta = predictGeneticsMetadata(String(newGenetics));
                const updated = updatePlantIdentity(
                  run,
                  String(newGenetics),
                  {
                    breeder: strainMeta?.breeder ?? null,
                    seedType: strainMeta?.seedType ?? "autoflower",
                    seedLot: null,
                    packBatch: null,
                    sourceDate: null,
                    phenotypeNotes: strainMeta?.phenotypeNotes ?? "",
                  },
                  run.config.dayZeroAnchor ?? "emergence",
                  run.config.startDate ?? new Date().toISOString().slice(0, 10),
                );
                setRun(updated);
              }}
              lens={lens}
            />
          </div>
        </div>
        <div>
          <small>Ziel</small>
          <strong>{textAt(plan, DAILY_COLUMNS.goal)}</strong>
        </div>
        <div className="progress-cell">
          <small>
            {run.executionMode === "live" ? "Live-Tag" : "Tag"} {day}
            {day <= 80 ? " von 80" : " · Plan endete an Tag 80"}
          </small>
          <div className="progress">
            <span
              style={{
                width: `${Math.min(100, Math.max(0, (day / 80) * 100))}%`,
              }}
            />
          </div>
        </div>
      </section>
      <section className="metric-grid">
        <InlineMetricCard
          label="PPFD"
          targetValue={numberAt(plan, DAILY_COLUMNS.ppfd)}
          measuredValue={observation?.values.ppfd ?? null}
          unit="µmol/m²/s"
          tone="blue"
          note="Lichtdichte am Canopy"
          lens={lens}
          fieldKey="ppfd"
          context={{
            day,
            lightIntensityPpfd: numberAt(plan, DAILY_COLUMNS.ppfd),
          }}
          onSaveMeasurement={(val) => handleSaveMeasurement("ppfd", val)}
          onSaveTarget={(val, meta) => handleSaveTarget("ppfd", val, meta)}
        />
        <InlineMetricCard
          label="DLI"
          targetValue={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          measuredValue={
            observation?.values.ppfd
              ? (
                  (observation.values.ppfd *
                    (run.config.lightHours ?? 18) *
                    3600) /
                  1_000_000
                ).toFixed(1)
              : null
          }
          unit="mol/m²/d"
          tone="blue"
          note="Tägliche Lichtmenge"
          lens={lens}
          fieldKey="dli"
          context={{ day, lightHours: run.config.lightHours ?? 18 }}
          onSaveMeasurement={(val) => handleSaveMeasurement("dli", val)}
          onSaveTarget={(val, meta) => handleSaveTarget("dli", val, meta)}
        />
        <InlineMetricCard
          label="Klima"
          targetValue={`${numberAt(plan, DAILY_COLUMNS.tempLight)}°`}
          measuredValue={
            observation?.values.tempMax !== null &&
            observation?.values.tempMax !== undefined
              ? `${observation.values.tempMax}°`
              : null
          }
          unit={`${numberAt(plan, DAILY_COLUMNS.humidity)} % rF`}
          tone="amber"
          note="Lichtphase"
          lens={lens}
          fieldKey="temperature"
          context={{
            day,
            airTempC: numberAt(plan, DAILY_COLUMNS.tempLight),
            relativeHumidityPct: numberAt(plan, DAILY_COLUMNS.humidity),
          }}
          onSaveMeasurement={(val) => handleSaveMeasurement("temp", val)}
          onSaveTarget={(val, meta) =>
            handleSaveTarget("temperature", val, meta)
          }
        />
        <InlineMetricCard
          label="Leaf-VPD"
          targetValue={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          measuredValue={
            observation?.values.leafTemp !== null &&
            observation?.values.leafTemp !== undefined
              ? Number(observation.values.leafTemp).toFixed(2)
              : null
          }
          unit="kPa est."
          tone="amber"
          note="mit Blatt-ΔT-Schätzung"
          lens={lens}
          fieldKey="vpd"
          context={{
            day,
            airTempC: numberAt(plan, DAILY_COLUMNS.tempLight),
            relativeHumidityPct: numberAt(plan, DAILY_COLUMNS.humidity),
          }}
          onSaveMeasurement={(val) => handleSaveMeasurement("vpd", val)}
          onSaveTarget={(val, meta) => handleSaveTarget("vpd", val, meta)}
        />
        <InlineMetricCard
          label="EC"
          targetValue={numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)}
          measuredValue={
            observation?.values.ecIn !== null &&
            observation?.values.ecIn !== undefined
              ? Number(observation.values.ecIn).toFixed(2)
              : null
          }
          unit="mS/cm"
          tone="green"
          note="Ziel Endmix"
          lens={lens}
          fieldKey="ec"
          context={{ day, targetEc: numberAt(plan, DAILY_COLUMNS.ec) }}
          onSaveMeasurement={(val) => handleSaveMeasurement("ec", val)}
          onSaveTarget={(val, meta) => handleSaveTarget("ec", val, meta)}
        />
        <InlineMetricCard
          label="pH"
          targetValue={numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)}
          measuredValue={
            observation?.values.phIn !== null &&
            observation?.values.phIn !== undefined
              ? Number(observation.values.phIn).toFixed(1)
              : null
          }
          unit="Ziel"
          tone="green"
          note="nach vollständigem Mix"
          lens={lens}
          fieldKey="ph"
          context={{ day, targetPh: numberAt(plan, DAILY_COLUMNS.ph) }}
          onSaveMeasurement={(val) => handleSaveMeasurement("ph", val)}
          onSaveTarget={(val, meta) => handleSaveTarget("ph", val, meta)}
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
              <dd>{observation ? "ERFASST" : "OFFEN"}</dd>
            </div>
            <div>
              <dt>Wasserchemie</dt>
              <dd>
                {config.water.sourcePh !== null &&
                config.water.sourceEc !== null
                  ? "ERFASST"
                  : "UNBEKANNT"}
              </dd>
            </div>
            <div>
              <dt>Bewässerung</dt>
              <dd>{textAt(plan, DAILY_COLUMNS.irrigation)}</dd>
            </div>
          </dl>
        </Panel>
      </div>
      <AlertCenter
        compact
        alerts={alerts}
        acknowledgedIds={run.acknowledgedAlertIds}
        onAcknowledge={(id) => setRun(acknowledgeAlert(run, id))}
      />
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
            <button type="button" onClick={() => navigate("climate")}>
              <span>🧮</span>
              <strong>VPD / DLI Rechner</strong>
              <small>Mikroklima & Phasenmatrix</small>
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

function _Today({
  plan,
  lens,
  navigate,
  run,
  setRun,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
  navigate: (route: RouteId) => void;
  run: RunPackage;
  setRun: (run: RunPackage) => void;
}) {
  const config = effectiveRunConfig(run);
  const actual = latestObservation(run, plan.day);
  const blockers = deriveRunAlerts(run, plan).filter(
    (alert) => alert.severity === "critical" || alert.severity === "warning",
  );
  const nextPlan = getDayPlan(workbook, Math.min(80, plan.day + 1));
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
      <section className="operations-header">
        <div>
          <small>
            {config.name.toUpperCase()} · TAG {plan.day} ·{" "}
            {textAt(plan, DAILY_COLUMNS.phase).toUpperCase()}
          </small>
          <h2>
            Systemzustand: {blockers.length > 0 ? "PRÜFUNG NÖTIG" : "STABIL"}
          </h2>
          <p>
            Plan/Evidence: {run.configurationSnapshot.evidenceVersion} ·
            Konfiguration v{run.configurationSnapshot.version} ·{" "}
            {run.status.toUpperCase()}
          </p>
        </div>
        <span
          className={blockers.length > 0 ? "state-warning" : "state-stable"}
        >
          {blockers.length} BLOCKER / WARNUNGEN
        </span>
      </section>
      {blockers.length > 0 && (
        <section className="today-blockers" aria-labelledby="blocker-title">
          <h2 id="blocker-title">Vor Entscheidungen prüfen</h2>
          <ul>
            {blockers.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.title}</strong>
                <span>{alert.action}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
      <section className="panel today-targets">
        <header>
          <div>
            <small>SCIENTIFIC VALUE SEMANTICS</small>
            <h2>Heutige Soll-/Ist-Matrix</h2>
          </div>
          <span>{actual ? "MESSUNG VORHANDEN" : "ISTWERTE FEHLEN"}</span>
        </header>
        <table className="target-matrix" aria-label="Soll- und Istwerte">
          <thead>
            <tr className="target-matrix-head">
              <th scope="col">Metrik</th>
              <th scope="col">Sollwert</th>
              <th scope="col">Messwert</th>
              <th scope="col">Semantik</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["pH", numberAt(plan, DAILY_COLUMNS.ph), actual?.values.phIn, ""],
              [
                "EC",
                numberAt(plan, DAILY_COLUMNS.ec),
                actual?.values.ecIn,
                "mS/cm",
              ],
              [
                "Temperatur",
                numberAt(plan, DAILY_COLUMNS.tempLight),
                actual?.values.tempMax,
                "°C",
              ],
              [
                "rF",
                numberAt(plan, DAILY_COLUMNS.humidity),
                actual?.values.humidityMax,
                "%",
              ],
              [
                "PPFD",
                numberAt(plan, DAILY_COLUMNS.ppfd),
                actual?.values.ppfd,
                "µmol/m²/s",
              ],
            ].map(([label, target, measured, unit]) => (
              <tr key={String(label)}>
                <th scope="row">{label}</th>
                <td>
                  {Number(target).toFixed(2)} {unit}
                </td>
                <td>
                  {measured === null || measured === undefined ? (
                    "—"
                  ) : (
                    <>
                      {Number(measured).toFixed(2)} {unit}
                    </>
                  )}
                </td>
                <td>
                  <b>TARGET</b> / {actual ? "MEASURED" : "MISSING"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="two-column wide-left">
        <Panel title="Aktionen & Qualität" kicker="CHECKLISTE">
          <p className="prose-callout">{textAt(plan, DAILY_COLUMNS.qa)}</p>
          <Checklist
            completed={run.completedTasks[String(plan.day)] ?? []}
            taskStates={run.tasks.filter((task) => task.day === plan.day)}
            onChange={(task, completed) =>
              setRun(setTaskCompleted(run, plan.day, task, completed))
            }
          />
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
      <section className="panel next-actions">
        <header>
          <div>
            <small>NEXT / WHY</small>
            <h2>Nächster Orientierungspunkt</h2>
          </div>
        </header>
        <p>
          Morgen: <strong>{textAt(nextPlan, DAILY_COLUMNS.phase)}</strong> ·{" "}
          {textAt(nextPlan, DAILY_COLUMNS.goal)}
        </p>
        <div className="button-row">
          <button type="button" onClick={() => navigate("log")}>
            Journal öffnen
          </button>
          <button type="button" onClick={() => navigate("timeline")}>
            Vollständige Timeline
          </button>
          <button type="button" onClick={() => navigate("knowledge")}>
            Entscheidungen erklären
          </button>
        </div>
      </section>
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
        <section
          className="data-table-wrap"
          aria-label="Tagesmatrix, horizontal scrollbar"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Safari needs keyboard focus on horizontally scrollable table regions.
          tabIndex={0}
        >
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
        </section>
      </Panel>
    </div>
  );
}

export function MixLab({
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

function _Climate({
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
          lens={lens}
        />
        <Metric
          label="DLI"
          value={numberAt(plan, DAILY_COLUMNS.dli).toFixed(1)}
          unit="mol/m²/d"
          tone="blue"
          note={`${numberAt(plan, DAILY_COLUMNS.lightHours)} h Photoperiode`}
          lens={lens}
        />
        <Metric
          label="Leaf-VPD"
          value={numberAt(plan, DAILY_COLUMNS.leafVpd).toFixed(2)}
          unit="kPa est."
          tone="amber"
          note={`Air-VPD ${numberAt(plan, DAILY_COLUMNS.airVpd).toFixed(2)} kPa`}
          lens={lens}
        />
        <Metric
          label="Energie"
          value={numberAt(plan, DAILY_COLUMNS.lightKwh).toFixed(2)}
          unit="kWh/Tag"
          tone="green"
          note={`${numberAt(plan, DAILY_COLUMNS.cumulativeKwh).toFixed(1)} kWh kum.`}
          lens={lens}
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
                label: "Watt",
                color: "#8ad2c7",
                values: rows.map((row) => Number(row[7] ?? 0)),
              },
            ]}
            selectedIndex={plan.day}
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
                label: "Temperatur",
                color: "#ef705c",
                values: rows.map((row) => Number(row[11] ?? 0)),
              },
            ]}
            selectedIndex={plan.day}
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
  run,
}: {
  plan: ReturnType<typeof getDayPlan>;
  lens: ExperienceLens;
  navigate: (route: RouteId) => void;
  run: RunPackage;
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
    ["Tarantula", "Mikroben", numberAt(plan, DAILY_COLUMNS.tarantula)],
  ] as const;
  return (
    <div className="page-stack">
      <BatchResolverDashboard run={run} navigate={navigate} />
      <section className="system-banner">
        <div>
          <span className="status-dot" />
          <small>OPERATIVER MOTOR</small>
          <h2>UKD HESI Conservative</h2>
          <p>
            Herstellerlabel und bewusst reduzierter Custom Plan bleiben
            getrennt. Die Karten darunter zeigen Kalender-Eligibility, nicht
            automatisch freigegebene Dosierungen.
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
      <div style={{ marginTop: "32px", marginBottom: "32px" }}>
        <FeedingSchedulePanel
          sheet={workbook["31_FEED_SCHEMA"] ?? EMPTY_SHEET}
          lens={lens}
        />
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
  const rows = useMemo(() => {
    const header = sheet.values[0] ?? [];
    const matches = sheet.values.slice(1).filter((row) =>
      row
        .map((cell) => String(cell ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return [header, ...matches];
  }, [sheet, query]);
  const resultCount = Math.max(0, rows.length - 1);
  const limit = lens === "guided" ? 25 : rows.length;
  return (
    <div className="page-stack">
      <Panel
        title={sheetName.replace(/^\d+_/, "").replaceAll("_", " ")}
        kicker={`${sheet.range} · ${resultCount} TREFFER`}
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
        {resultCount === 0 && (
          <p className="table-empty" role="status">
            Keine Treffer für „{query}“.
          </p>
        )}
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

export function InternalKnowledgePage({ lens }: { lens: ExperienceLens }) {
  const [evidence, setEvidence] = useState("all");
  const [openId, setOpenId] = useState<string | null>(() => {
    const requested = new URLSearchParams(window.location.search).get("claim");
    return knowledge.claims.some((claim) => claim.id === requested)
      ? requested
      : (knowledge.claims[0]?.id ?? null);
  });
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
          <span>Evidence-Guarded v11.5</span>
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
  const [sheetName, setSheetName] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("sheet");
    return requested && names.includes(requested)
      ? requested
      : (names[0] ?? "00_Dashboard");
  });
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
  lens,
}: {
  label: string;
  value: string | number;
  unit: string;
  tone: string;
  note: string;
  lens?: ExperienceLens;
}) {
  const isTerm = ["PPFD", "DLI", "Leaf-VPD", "VPD", "EC", "pH"].includes(label);
  return (
    <article className={`metric tone-${tone}`}>
      <div>
        <span>
          {isTerm ? (
            <TermTooltip
              term={label === "Leaf-VPD" ? "VPD" : label}
              lens={lens}
            >
              {label}
            </TermTooltip>
          ) : (
            label
          )}
        </span>
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

function Checklist({
  completed,
  taskStates,
  onChange,
}: {
  completed: string[];
  taskStates: RunTask[];
  onChange: (task: string, completed: boolean) => void;
}) {
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
            checked={completed.includes(item)}
            onChange={(event) => onChange(item, event.target.checked)}
          />
          <span>{item}</span>
          <small>
            {taskStates.find((task) => task.title === item)?.requirement ??
              "required"}{" "}
            · {taskStates.find((task) => task.title === item)?.state ?? "due"}
          </small>
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
  const [sort, setSort] = useState<{
    column: number;
    direction: "ascending" | "descending";
  } | null>(null);
  const width = Math.max(0, ...rows.map((row) => row.length));
  const displayRows = useMemo(() => {
    if (!sort || rows.length <= 2) return rows;
    const [header, ...body] = rows;
    body.sort((left, right) => {
      const a = left[sort.column];
      const b = right[sort.column];
      const comparison =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a ?? "").localeCompare(String(b ?? ""), "de", {
              numeric: true,
              sensitivity: "base",
            });
      return sort.direction === "ascending" ? comparison : -comparison;
    });
    return header ? [header, ...body] : body;
  }, [rows, sort]);
  const headerRow = displayRows[0] ?? [];
  const occurrences = new Map<string, number>();
  const keyedRows = displayRows.slice(1).map((row) => {
    const contentKey = JSON.stringify(row);
    const occurrence = (occurrences.get(contentKey) ?? 0) + 1;
    occurrences.set(contentKey, occurrence);
    return { row, key: `${contentKey}:${occurrence}` };
  });
  return (
    <section
      className="data-table-wrap"
      aria-label="Datentabelle, horizontal scrollbar"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Safari needs keyboard focus on horizontally scrollable table regions.
      tabIndex={0}
    >
      <table className={`data-table ${sticky ? "sticky" : ""}`}>
        {headerRow.length > 0 && (
          <thead>
            <tr className="header-row">
              {Array.from({ length: width }, (_, columnIndex) => {
                const active = sort?.column === columnIndex;
                return (
                  <th
                    key={columnName(columnIndex)}
                    scope="col"
                    aria-sort={active ? sort.direction : "none"}
                  >
                    <button
                      type="button"
                      className="table-sort"
                      onClick={() =>
                        setSort((current) => ({
                          column: columnIndex,
                          direction:
                            current?.column === columnIndex &&
                            current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                    >
                      {formatCell(headerRow[columnIndex])}
                      <span aria-hidden="true">
                        {active
                          ? sort.direction === "ascending"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {keyedRows.map(({ row, key }) => (
            <tr key={key}>
              {Array.from({ length: width }, (_, columnIndex) => {
                return (
                  <td key={columnName(columnIndex)}>
                    {formatCell(row[columnIndex])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
  selectedIndex,
}: {
  series: Array<{ label: string; color: string; values: number[] }>;
  selectedIndex?: number;
}) {
  const points = (values: number[]) =>
    (() => {
      const max = Math.max(...values, 1);
      const min = Math.min(...values, 0);
      const range = max - min || 1;
      return values
        .map(
          (value, index) =>
            `${(index / Math.max(1, values.length - 1)) * 100},${54 - ((value - min) / range) * 48}`,
        )
        .join(" ");
    })();
  const maxLength = Math.max(...series.map((item) => item.values.length), 1);
  const markerX =
    selectedIndex === undefined
      ? null
      : (selectedIndex / Math.max(1, maxLength - 1)) * 100;
  return (
    <div className="chart-block">
      <svg
        className="line-chart"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Kurvendiagramm: ${series.map((item) => item.label).join(", ")}`}
      >
        <desc>
          Jede Datenreihe verwendet ihre eigene beschriftete Min-Max-Skala.
          {selectedIndex === undefined
            ? ""
            : ` Markierung bei Run-Tag ${selectedIndex}.`}
        </desc>
        <g className="chart-grid">
          <line x1="0" y1="6" x2="100" y2="6" />
          <line x1="0" y1="30" x2="100" y2="30" />
          <line x1="0" y1="54" x2="100" y2="54" />
        </g>
        {markerX !== null && (
          <line
            className="chart-marker"
            x1={markerX}
            y1="4"
            x2={markerX}
            y2="56"
          />
        )}
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
      <dl className="chart-scale-list">
        {series.map((item) => {
          const selected =
            selectedIndex === undefined
              ? item.values.at(-1)
              : item.values[selectedIndex];
          return (
            <div key={item.label}>
              <dt>
                <i style={{ background: item.color }} /> {item.label}
              </dt>
              <dd>
                {Math.min(...item.values).toFixed(1)}–
                {Math.max(...item.values).toFixed(1)} · Auswahl{" "}
                {selected?.toFixed(1) ?? "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
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
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocusTrap(dialogRef, onClose);
  return (
    <aside
      ref={dialogRef}
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
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  useDialogFocusTrap(dialogRef, onClose);
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
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("claim", claim.id);
        window.history.replaceState({}, "", url);
        onNavigate("knowledge");
      },
    }));
    const sheets = Object.keys(workbook).map((name) => ({
      key: `sheet-${name}`,
      title: name,
      meta: "Legacy-Workbook-Blatt",
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("sheet", name);
        window.history.replaceState({}, "", url);
        onNavigate("raw");
      },
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
  const runItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    item.action();
    onClose();
  };
  return (
    <div className="palette-backdrop">
      <button
        type="button"
        className="palette-dismiss"
        onClick={onClose}
        aria-label="Suche schließen"
      />
      <section
        ref={dialogRef}
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
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  items.length === 0
                    ? 0
                    : Math.min(items.length - 1, index + 1),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                runItem(activeIndex);
              }
            }}
            placeholder="Suche nach Seite, Tag, Claim oder Datenblatt…"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="palette-results">
          {items.map((item, index) => (
            <button
              type="button"
              key={item.key}
              className={index === activeIndex ? "active" : ""}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runItem(index)}
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
          <span>56 Blätter · {knowledge.claims.length} Claims</span>
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
  const ids: RouteId[] = ["cockpit", "today", "log", "mix", "knowledge"];
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

function useDialogFocusTrap(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => !element.hasAttribute("hidden"));
    if (!dialog.contains(document.activeElement)) focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [dialogRef, onClose]);
}

export default App;
