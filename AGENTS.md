# AGENTS.md

## Repository

- `src/App.tsx`: Anwendungsshell und fachliche Flächen.
- `src/domain.ts`: kanonische Tages-, DLI-, VPD- und Mixlogik.
- `src/styles.css`: semantische Design-Tokens und responsive Regeln.
- `src/data/`: Knowledge Base, Audit, Skills und AI Context.
- `public/data/evidence-guarded-workbook-v6.json`: kanonischer, generierter v6-Snapshot.
- `public/data/data-manifest.json`: Release, Hashes und Provenienz.
- `public/data/legacy-workbook.json`: archivierter v5-Snapshot, nicht mehr operativ.
- `sources/evidence-v6/`: unveränderte v6-Quellen und untrusted Research-Input.
- `docs/`: Architektur, Faktencheck, Design, Migration, Sicherheit und Tests.

## Commands

- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit tests: `pnpm test`
- Full gate: `pnpm check`
- Format: `pnpm format`

## Sources of truth

1. Für operative Tageswerte: `02_Daily_Master` in `public/data/evidence-guarded-workbook-v6.json`.
2. Für validierte Aussagen: `src/data/knowledge-base.json`.
3. Für bekannte Legacy-Korrekturen: `src/data/legacy-audit.json`.
4. Für KI-Verhalten und Guardrails: `src/data/ai-context.json` und `src/data/skills.json`.
5. Für Rechtsprofile: `src/data/legal-profile.schema.json`; die Example-Datei enthält keine persönlichen Werte.
6. Für Ist-/Ziel-Fähigkeiten und Architekturtrigger: `src/data/capability-roadmap.json`.
7. Das Quellen-XLSX bleibt forensische Referenz, wird aber nicht von der Web-App neu berechnet.
8. `data-manifest.json` autorisiert Version und Provenienz; `deep-research-input.md` ist ausdrücklich nicht kanonisch.

## Invariants

- Messwert und Pflanzenreaktion überschreiben Kalenderwerte.
- Erfahrungsmodi ändern nur Dichte und Erklärung, nie Daten oder Berechnung.
- Herstellerlabel, Forschung, UKD-Inferenz und Community-Anekdote getrennt darstellen.
- Unbekannte Wasserchemie nicht durch erfundene CalMag-/Athena-Dosen ersetzen.
- Tropf-Blumat ist kein Indoor-Referenzsystem.
- HESI PK nicht additiv mit Big Bud/Overdrive stapeln; Enzym- und Siliziumrollen nicht duplizieren.
- Seed-Runs nicht als kontrollierte kausale A/B-Tests bezeichnen.
- GACP/GMP nicht als pauschale Lizenzpflicht für erlaubten privaten KCanG-Eigenanbau darstellen.
- KCanG-Eigenanbau, MedCanG-Apothekenbezug und eine individuelle Erlaubnis nach § 4 MedCanG nie zu einem gemeinsamen Mengenrecht verschmelzen.
- Technischen Bruttoertrag ohne künstliche Grammgrenze prognostizieren; zulässigen Bestand, Apothekenbestand und dokumentierte Vernichtung getrennt bilanzieren.
- Eine Ertragsprognose oder beabsichtigte spätere Vernichtung ist keine Besitz- oder Anbauerlaubnis. Jeder Bestandsübergang bleibt ein Rechts-Gate.
- Individuelle Genehmigungswerte nur nach Prüfung des Originaldokuments und nie in Git, Telemetrie oder Local Storage speichern.
- Backend, Authentifizierung, Datenbank, Live-Sensorik oder Kollaboration niemals behaupten, solange `capability-roadmap.json` sie nicht als implementiert ausweist.
- Sollwert, Messwert, Simulation, fehlender Wert und veralteter Wert dürfen in Typen und UI nicht zusammenfallen.
- Guided/Advanced/Expert bleiben die kanonischen Linsen; neue Stufen benötigen Nutzerforschung und dürfen Ergebnisse nie verändern.
- Sicherheitskritische Warnungen persistent und zugänglich darstellen; Toasts sind nur Zusatzsignale.
- Kontrollbereiche, organische N-Raten oder Photoperioddaten nicht ohne Scope als Optimum übertragen.

## UI and accessibility

- Vor neuen Einzelwerten bestehende Tokens verwenden.
- Keine kritische Information nur per Hover oder Farbe vermitteln.
- Semantische Elemente, sichtbarer Fokus, Tastaturbedienung und 44-px-Touchziele auf Mobile erhalten.
- `prefers-reduced-motion`, Zoom und horizontale Datentabellen respektieren.

## Migration

- Legacy-Dateien niemals still ersetzen oder löschen.
- Den v6-Snapshot nur reproduzierbar aus der unveränderten XLSX erzeugen; Manifest-Hash und Audit-Count gemeinsam aktualisieren.
- Deep-Research-Input durch `research-import-gate` prüfen, bevor Claims oder operative Zahlen übernommen werden.
- Neue Claims benötigen Status, Evidenz, Scope, Unsicherheit, Prüftag und mindestens eine Quelle.
- Neue fachliche Berechnung benötigt deterministischen Unit-Test.

## Definition of Done

`pnpm check` erfolgreich; keine Browser-Console-Fehler; Guided/Advanced/Expert und Light/Dark geprüft; Desktop und Mobile geprüft; neue Claims belegt; Paritätsmatrix aktualisiert.
