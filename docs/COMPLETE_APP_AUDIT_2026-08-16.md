# Vollständiger App-Audit · UKD v8 · 16. August 2026

## Fortschreibung · Implementierungsstand 18. August 2026

Der Audit vom 16. August war die Ausgangsbasis. Seitdem sind die damaligen lokalen P0-Lücken umgesetzt: RunPackage v5, gemeinsames `applyRunCommand()`, resiliente Storage-Failure-UX, staged/atomarer Restore, IPM, Incident/Recovery, Equipment/Maintenance, Produktinventar, Reservoir/Lung Room, Energie, Post-Harvest, unveränderliche Mix-Korrekturen und Applikationen, privater Foto-Lifecycle, Setup-Profile/Run-Templates sowie der validierte CSV/JSON-Dateiimport. Workspace-Backup-v2 enthält den tatsächlichen Workspace, alle Runs und verschlüsselte Medien.

Als **Implementierungsvorschau, nicht als deployte Produktfähigkeit**, existieren außerdem Monorepo-Contracts, Fastify/Postgres mit default-deny RLS, Magic Links, Sync-Outbox/-API, Konfliktmodell, Docker Compose, serverseitiges OpenTelemetry und ein schreibunfähiger, evidenzgebundener Copilot-Adapter. Aktivierung bleibt gesperrt, bis Production-SMTP, EU-Infrastruktur, Zwei-Geräte-Sync, Medien-Objektfluss, Restore-Drill und Security-Abnahme nachgewiesen sind.

Weiter offen für Stable sind insbesondere vollständige DE/EN-UI-Lokalisierung, durchgängige SI/Imperial-Anzeige, echte Firefox/WebKit- und AT-Matrix, Visual Regression, Lighthouse/Feldmessung, Human-Factors-Studien, Connector-Fuzz-Corpus, Live-Retrieval/Copilot-Evals, signierte Release-Artefakte und das tatsächliche EU-VPS-Deployment. Diese Punkte können nicht allein durch lokale Implementierung als bestanden gelten.

Lokaler Gate-Nachweis am 18. August: `pnpm check` erfolgreich; 379 Web-Unit-Tests, 8 API-/Copilot-Tests, Content-/Security-/Lizenz-/Build-/Budget-Gates und 110 ausgeführte Desktop/Mobile-E2E-Tests bestanden (12 bewusst plattformspezifisch übersprungen). Jede aktive Route wurde einzeln in Dark und Light mit axe gegen WCAG 2.2 AA geprüft. Automatisierte axe-Ergebnisse ersetzen die weiterhin offenen realen AT-Tests nicht.

## Ergebnis

Der am 16. August geprüfte Stand war eine belastbare lokale Operator-Anwendung, aber noch keine vollständige „Cultivation Intelligence Platform“. Die folgenden Befunde dokumentieren diese Baseline; der aktuelle Capability-Status steht in der Fortschreibung und maschinenlesbar in `src/data/capability-roadmap.json`.

Release-Einstufung: **technischer Release Candidate mit offenen Produkt- und Content-Gates**. Ein „vollständig fertig“ wäre derzeit nicht evidenzgerecht.

## Geprüfter Umfang

| Ebene                       | Geprüft                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Kanonische Quelle           | v8-XLSX direkt gelesen; 29 Sheets; JSON-Snapshot und Manifest abgeglichen                                            |
| UI-Flächen                  | 25 Routen in Guided, Advanced und Expert                                                                             |
| Darstellung                 | Dark, Light, High Contrast, Textskalierung, Desktop und iPhone-Viewport                                              |
| Interaktion                 | Navigation, URL-State, Setup, Messungen, Today-Schritte, Timeline, Mix, Rechner, Filter, Suche, Dialoge, Run-Wechsel |
| Datenlebenszyklus           | IndexedDB-Persistenz, Reload, JSON-Backup/Restore, ungültiger Import, CSV, XLSX, PDF, Diagnosebundle                 |
| Wissenschaftliche Erfassung | Pflanzenidentität, Day-Zero-Anker, pH/EC-Kalibrierung, PPFD-Grid, Soll/Ist-Mix                                       |
| Accessibility               | Axe WCAG 2.0/2.1/2.2 A/AA auf allen Routen sowie interaktiven Dialogzuständen                                        |
| Sicherheit/Release          | Dependency Audit, Secret Scan, Build, Bundlebudgets, SBOM/Provenienz-Generator                                       |

Kombinatorisch „jede Situation“ ist nicht endlich testbar. Der Audit verwendet deshalb eine definierte Zustandsmatrix aus Routen, Lenses, Themes, Viewports, Happy Paths, leeren Zuständen, ungültigen Daten und Recovery-Pfaden. Reale Assistive-Technology- und Nutzertests bleiben ein eigenes Release-Gate.

## Im Audit behobene Fehler

1. Operative UI, Service Worker, Paketversion und Manifest verwiesen teilweise noch auf v6/v9/v10 oder 27 statt 29 Sheets.
2. Der Masterplan erfand 150 W, AC-Infinity- und Noctua-Geräte sowie 12/12. Er liest nun reale Run-Konfiguration und kanonische Tageswerte.
3. Unbekannte Wasserchemie setzte fälschlich den gesamten Mix auf null. Jetzt bleiben kanonische Basiswerte sichtbar; nur chemieabhängige Conditioner, CalMag und pH-Korrektur bleiben fail-closed.
4. Ein vorgeschlagener universeller CalMag-Zielwert wurde entfernt.
5. Der Mix-Recorder speicherte Plandosen automatisch als tatsächlich verwendet und erfand 20 °C. Ist-Dosen und Endvolumen müssen nun explizit erfasst werden; Temperatur bleibt optional und unbekannt.
6. Der Kalibrierassistent erfand Geräte-IDs, Referenzlösungen und Messwerte. Gerät, Standard und Gültigkeit sind nun explizite Eingaben.
7. Das PPFD-Mapping war mit neun scheinbar gemessenen Werten und einem erfundenen Geräteprofil vorbefüllt. Es startet leer, verlangt Geräteidentität und speichert Direktmessungen ohne doppelte Dimmer-Skalierung.
8. Nicht erfasster Saatguttyp wurde als „feminisiert“ dargestellt. Er bleibt jetzt `unknown`.
9. Der sogenannte globale Planeditor verwandelte unbekannte Wasserwerte still in null, verwendete einen nativen `prompt()` und bot unechte Nährstoffsystemwechsel an. Er ist jetzt ein ehrlicher Run-Kontexteditor, erhält `null`, verlangt einen sichtbaren Audit-Grund und sperrt Multi-Stack-Scheinumschaltungen.
10. IPM, Incidents und das Equipment-Teilmodul wurden sprachlich als fertig dargestellt. Die UI benennt ihre tatsächlichen Grenzen.
11. Kontrastfehler in Masterplan, Today und Fütterungsplan sowie zu kleine mobile Tooltip-Ziele wurden behoben.
12. Dekorative SVGs waren für Assistive Technology nicht sauber verborgen; die Icons sind jetzt konsolidiert.
13. Die XLSX-Ausgabe verlor neuere Observation-Felder und v4-Domänen. Sie exportiert nun korrekte Pot-Mass-/Drain-Felder sowie Growth, Irrigation, Mix, Equipment, Maintenance, IPM, Incidents, Post-Harvest, Energy und Product Inventory als eigene Sheets.
14. Backup und Diagnosebundle meldeten App-Version 6.1.0; sie melden nun 8.0.0. Restore-Texte nennen v4.
15. „Offline Cache verfügbar“ prüfte nur das Vorhandensein der Browser-API. Die Systemansicht unterscheidet nun zwischen aktivem und nicht aktivem Service Worker.
16. Das Buildbudget prüfte nur den Entry-Chunk und ignorierte einen 908-kB-ExcelJS-Chunk. Es prüft jetzt Entry, größten Lazy Chunk und die gesamte JavaScript-Menge.
17. Die Wissensroute renderte zusätzlich zur kanonischen Knowledge Base ein hart codiertes Glossar mit nicht ausreichend belegten „Optimal“-Bereichen. Diese zweite Wahrheit wurde aus der aktiven Route entfernt; die Wissensansicht verwendet nur noch die validierte Knowledge Base.
18. Das Release-Gate akzeptierte ungeklärte Abhängigkeitslizenzen standardmäßig. Es blockiert jetzt fail-closed. Für `buffers@0.1.1` bleibt `licenseDeclared = NOASSERTION`, während eine versionierte, mit Archivbeleg dokumentierte Prüfung `licenseConcluded = MIT` setzt.
19. Aktive Architektur-, Content-, Migrations-, Produkt-, Sicherheits- und Testdokumente wurden auf Workbook v11.5, RunPackage v6 und 56 Sheets konsolidiert; die Capability-Roadmap nennt die tatsächlich implementierten Grenzen.

## Am 16. August noch offene Capability-Lücken (historische Baseline)

### P0 · vor einer Behauptung „vollständig“

| Lücke                 | Ist-Zustand                                                                                                                                                 | Erforderlich                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Legacy-Glossar-Code   | `ContextHelpGlossaryPanel.tsx` und `termDictionary.ts` sind aus der aktiven Route entfernt, enthalten aber weiterhin hart codierte „optimal“-Formulierungen | Vor einer Wiederverwendung löschen oder ausschließlich aus der Knowledge Base generieren      |
| IPM                   | Typen und Arrays existieren; Route ist nur Vorschau                                                                                                         | Inspektionsformular, Verlauf, Fotos, Follow-up, Abschluss und AuditEvent                      |
| Incident/Recovery     | Typen existieren; Route ist nur Vorschau                                                                                                                    | Statusmaschine, Plan-Supersede, Aktionen, Recovery und Root-Cause-Workflow                    |
| Equipment/Maintenance | Nur Licht, PPFD und pH/EC-Kalibrierung sind bedienbar                                                                                                       | Generisches Asset-Inventar, Installation, Position, Wartung, Fehler und nächster Termin       |
| Produktinventar       | `productInventory` existiert nur im Schema/Export                                                                                                           | Besitz, Gebinde, Restmenge, Lot, Öffnung, Ablauf, Preis und Referenz-Stack-Prüfung als UI     |
| Weitere v4-Domänen    | Reservoir, Lung Room, Post-Harvest, Energy, Cultivar Profile und Nutrient System Profile haben keine vollständige UI                                        | Vertikale End-to-End-Slices mit State, Audit, Export und Tests                                |
| Storage-Failure-UX    | IndexedDB-Fehler werden technisch verworfen bzw. nur generisch sichtbar                                                                                     | Quota/Storage-full-Injection, In-Memory-Schutz, sofortiger Backup-Pfad und Recovery-Anleitung |

### P1 · Produktreife und Globalität

- Keine Internationalisierung: UI, Datum und Zahlen sind auf Deutsch/`de-DE` festgelegt.
- Keine einstellbaren Einheiten: SI ist korrekt kanonisch, aber Anzeige-/Import-Konvertierung für andere Regionen fehlt.
- Keine Workspace-/Setup-/Run-Template-Hierarchie. Editierbar ist der aktive lokale Run; kanonische Evidenz und Tagesplan sind bewusst read-only.
- Keine gespeicherten Dashboard-Layouts, Favoriten, individuellen Spalten, Hilfeintensität oder System-Theme-Automatik.
- Guided/Advanced/Expert sind nicht in jeder neueren Komponente konsequent als Dichte-/Erklärungslinse umgesetzt.
- Mix-Chargen lassen sich erfassen, aber noch nicht als Verlauf ansehen, korrigieren/superseden oder einer konkreten Applikation vollständig zuordnen.
- Kalibrierrecords speichern Standard und Unsicherheit, aber noch keine einzelnen Roh-/Referenzpunkte, Charge, Temperatur oder Elektrodenzustand.
- Fotos besitzen IDs, aber keinen lokalen Blob-/Datei-Lifecycle, keine EXIF-/Privacy-Regeln und keine Backupstrategie.
- Cold-offline ist für Kern-Shell und kanonische Daten ausgelegt; noch nie geladene Export-Chunks sind nicht garantiert offline verfügbar.
- Nur Chromium wird automatisiert geprüft. Firefox, WebKit/Safari, NVDA, VoiceOver, Sprachsteuerung und 400-%-Zoom brauchen reale Tests.
- Kein Lighthouse-/Core-Web-Vitals-Gate, keine visuelle Regression und kein gemessener Human-Factors-Test gegen die Ziele in `platform-quality.json`.

### P2 · spätere Plattform

- Capability-basiertes Connector-SDK ist als Vertrag vorhanden, aber kein realer Adapter ist freigegeben.
- Kein Sync, Backend, Auth, Multi-User, Konfliktmerge oder organisationsweiter „globaler“ Zustand.
- Keine optionale Operational-Telemetrie; nur lokales Diagnosebundle.
- Kein evidenzgebundener Copilot. Das ist richtig priorisiert: erst deterministische Regeln, Retrieval, Safety und Evaluation.

## Editierbarkeit und Geltungsbereich

| Datenart                         | Lokal editierbar           | Global editierbar        | Persistenz                  |
| -------------------------------- | -------------------------- | ------------------------ | --------------------------- |
| Aktive Run-Konfiguration         | teilweise                  | nein                     | IndexedDB                   |
| Messungen/Beobachtungen          | ja, append/supersede       | nein                     | IndexedDB                   |
| Ist-Mix und Bewässerung          | Erfassung teilweise        | nein                     | IndexedDB                   |
| Kanonischer Tagesplan v8         | nein                       | nur Build-/XLSX-Pipeline | versionierter JSON-Snapshot |
| Knowledge Base/Evidenz           | nein                       | nur Repository-Review    | Git/JSON                    |
| Rechtsprofil                     | Import, nicht editierbar   | nein                     | nur Session                 |
| Bestandsereignisse               | ja                         | nein                     | IndexedDB                   |
| Theme/Lens/Tag/A11Y              | ja                         | nein                     | Local Storage               |
| IPM/Incident/Post-Harvest/Energy | noch keine vollständige UI | nein                     | Schema vorhanden            |

„Global“ darf deshalb derzeit nur „für den aktiven lokalen Run“ bedeuten. Organisationsweite Defaults, synchronisierte Profile oder globale fachliche Neuberechnung existieren nicht.

## Performance und Supply Chain

- Initialer minifizierter Chunk: rund 293 kB, Budget 450 kB.
- Größter Lazy Chunk: ExcelJS rund 908 kB, Budget 950 kB.
- Gesamtes minifiziertes JavaScript: rund 2.245 MB, Budget 2.40 MB.
- ExcelJS und PDF-Export bleiben lazy; der Kernpfad lädt sie nicht initial.
- SBOM und SLSA-artige Provenienz werden erzeugt; signierte Releases und nachgewiesene Build-Provenienz sind noch nicht vollständig.

## Empfohlene Reihenfolge

1. Quarantänten Legacy-Glossar-Code löschen oder aus `knowledge-base.json`/kanonischen Daten generieren.
2. Storage-full-/IndexedDB-Fehler als getesteten Recovery-Pfad implementieren.
3. IPM und Incident als erste vollständige v4-Slices implementieren.
4. Equipment + Maintenance + Produktinventar end-to-end fertigstellen.
5. Mix-Verlauf, Korrektur/Supersede und Applikationszuordnung ergänzen.
6. Firefox/WebKit, reale AT-Tests, Human Factors und Performance-Gates ergänzen.

## Kanonische Referenzen

- Operative Werte: `public/data/evidence-guarded-workbook-v11_5.json`
- Provenienz: `public/data/data-manifest.json`
- Validierte Claims: `src/data/knowledge-base.json`
- Guardrails: `src/data/ai-context.json`, `src/data/skills.json`
- Capability-Status: `src/data/capability-roadmap.json`
- Product Science, Hazards, Failure UX und SLOs: `src/data/platform-quality.json`
- Vollständige Sicherung: JSON Backup Envelope; XLSX/PDF/CSV sind abgeleitete Berichte
