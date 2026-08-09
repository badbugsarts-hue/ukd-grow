# Changelog

## v6 Operational Workspace · 2026-08-09

- Fünf neue Arbeitsbereiche für Run-Setup, Mess-/Ereignislog, Recht & Bestand, Berichte und Systemdiagnose ergänzt; insgesamt 17 Routen.
- Versioniertes `RunPackage` mit IndexedDB-Persistenz, Soll-/Messwerttrennung, persistenten Checklisten, Warnungen und Bestandsereignissen umgesetzt.
- Validiertes JSON-Backup/Restore sowie CSV-, XLSX-, PDF- und Druckexport ergänzt.
- PWA-Manifest, Produktions-Service-Worker, Datenhash-Prüfung, Offline-/Integrationsstatus, Hochkontrast und Textskalierung ergänzt.
- Globale Suche mit Claim-/Rohdaten-Deep-Links, semantische und sortierbare Tabellen, Dialog-Fokusfalle und Fokuswiederherstellung umgesetzt.
- Initialen Produktions-Chunk durch getrennte Referenzdaten von rund 307 kB auf rund 259 kB reduziert.
- Verwundbare SheetJS-Abhängigkeit entfernt; XLSX-Export ersetzt und Produktionsaudit auf null bekannte Schwachstellen gebracht.

## v6 Complete Function Gate · 2026-08-09

- Vollständige Funktionsmatrix für 12 Routen, drei Experience Lenses, Desktop und Mobile ergänzt.
- Browserzustände, Tastaturnavigation, Filter, Berechnungen, Diagnostik, Rohdatenexport und Ladefehler automatisiert abgesichert.
- Axe-Gate auf alle Routen sowie Dark/Light erweitert; Kontrast und Tastaturzugriff horizontaler Tabellen korrigiert.
- Gespeicherten Run-Tag, Command-Palette, dynamischen Claim-Zähler, zeilenweite Tabellensuche und mobile Lens-Navigation korrigiert.
- Numerische Eingaben und Tagesgrenzen defensiv gegen negative, nicht endliche und fehlende Werte gehärtet.
- Windows-Starter gegen fehlendes globales `pnpm` gehärtet: lokale Vite-Installation startet direkt; Codex-Runtime und Corepack dienen als Installations-Fallbacks.

## v6 Local Launcher · 2026-08-09

- Direkten `file://`-Aufruf von `index.html` mit einer sichtbaren, zugänglichen Diagnose statt weißer Seite versehen.
- `START_UKD.cmd` als Windows-Doppelklick-Starter ergänzt; installiert bei Bedarf Abhängigkeiten und öffnet den Vite-Server.
- `pnpm start:local` als kanonischen lokalen Startbefehl ergänzt und durch Playwright abgesichert.

## v6 Capability Roadmap & Plan Audit 2 · 2026-08-08

- Zweiten Architektur-/UX-Entwurf gegen den realen Repository-Stand geprüft; falsche „kein Quellcode/keine Tests“-Bestandsaufnahme verworfen.
- Ist-Architektur und capability-getriggerte Backend-, Sensor-, Export- und Next.js-Optionen maschinenlesbar modelliert.
- Experience Lens 1–10 mangels unterscheidbarer Nutzerzustände abgelehnt; Guided/Advanced/Expert bleiben kanonisch.
- Datenzustände Soll, gemessen, simuliert, fehlend und veraltet als verbindliche Semantik ergänzt.
- Core Web Vitals auf LCP/INP/CLS am p75 aktualisiert und Browser-Speicher-/Web-Crypto-Grenzen belegt.
- Knowledge Base auf 22 Claims und 32 Quellen erweitert; E2E-Test liest die Claim-Zahl nun direkt aus der kanonischen Datei.

## v6 Legal-Profile & Architecture Review · 2026-08-08

- Eingereichten Next.js-/UI-Migrationsplan gegen Projektanforderungen und Primärquellen geprüft; Vite-ADR bestätigt und spätere Next.js-Trigger dokumentiert.
- KCanG-Eigenanbau, MedCanG-Apothekenbezug und individuelle §-4-Erlaubnis als getrennte Rechts- und Bestandskonten modelliert.
- Technische Ertragsprognose von Besitz-, Herkunfts- und Vernichtungs-Gates getrennt; keine künstliche Grammobergrenze in der Kapazitätsplanung.
- Lokales Rechtsprofil-Schema und datensparsames Example ergänzt; persönliche Profile über `.gitignore` ausgeschlossen.
- Tropf-Blumat-Aussage auf dokumentierte Hersteller-Zweckbestimmung statt behauptetes gesetzliches Indoor-Verbot präzisiert.
- Knowledge Base, AI Context, Legal-Release-Skill, AGENTS und Sicherheitsdokumentation aktualisiert.

## v6 Evidence-Guarded Deep-Research Integration · 2026-08-08

- Neue Evidence-Guarded-XLSX und 219-seitige Mobile-PDF vollständig geprüft und als unveränderte Quellen archiviert.
- Kanonischen Web-Snapshot von v5 auf v6 aktualisiert; Audit von 46 auf 55 Findings erweitert.
- Externe Research-Synthese als untrusted Input klassifiziert; vier Scope-Fehler verworfen.
- Knowledge Base um KCanG-Besitz/Zugriff, GACP/GMP-Scope, RH, organische N-Rate, Autoflower-Photoperiode und Flushing erweitert.
- AI-Kontext und Skills um Research-Import- und Legal-Release-Gates ergänzt.

## 6.0.0 · 2026-08-08

- Legacy-Monolith in React/TypeScript/Vite-Architektur überführt.
- 27 Blätter und 46 Audit-Findings verlustfrei als versionierte JSON-Daten migriert.
- Guided/Advanced/Expert, kontextuelle Hilfe und globale Suche ergänzt.
- Cockpit, Today, Timeline, Mix, Climate, Nutrients, Library, Diagnostics, Knowledge, Audit und Raw Data umgesetzt.
- Quellen als Knowledge Base sowie Skills- und AI-Context-JSON integriert.
- High-impact Claims anhand Gesetz, Herstellerdokumenten, Standardreferenz und Primärliteratur neu eingeordnet.
- Tests für DLI, Leaf-VPD, Datum und Batchskalierung hinzugefügt.
