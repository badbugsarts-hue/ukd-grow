# Mitwirken an UKD

UKD ist eine evidence-guarded, local-first Anwendung. Änderungen an UI und Code sind willkommen; Änderungen an Formeln, Sollwerten, Sicherheitsregeln oder Evidenz benötigen zusätzlich den dokumentierten Evidence-Review.

## Entwicklungsablauf

1. Issue anlegen oder vorhandenes Issue referenzieren.
2. Branch von `main` erstellen.
3. Kleine, nachvollziehbare Commits schreiben.
4. `pnpm install --frozen-lockfile` und anschließend `pnpm check` ausführen.
5. Pull Request mit Risiko, Testnachweis, Screenshots bei UI-Änderungen und Migrationsauswirkung eröffnen.

## Zusätzliche Gates für Fachänderungen

- Neue Claims benötigen Status, Scope, Unsicherheit, Prüftag und Primärquelle.
- Neue Berechnungen benötigen deterministische Unit- und Golden-Tests.
- Evidenz, Messwert, Simulation und Nutzeraktion bleiben getrennte Datentypen.
- Sicherheitskritische Zustände sind fail-closed und dürfen nicht nur als Toast erscheinen.
- Bestehende Backups und RunPackage-Versionen dürfen nicht still inkompatibel werden.

## Pull-Request-Nachweis

- Problem und gewünschtes Nutzerergebnis
- betroffene Domain-Invarianten
- automatisierte Tests und manuelle Browser-/A11Y-Prüfung
- Datenmigration, Backup- und Rollback-Auswirkung
- neue oder geänderte Quellen
- verbleibende Unsicherheiten und bekannte Grenzen

Die verbindlichen Repository-Regeln stehen in [AGENTS.md](AGENTS.md), die Release-Gates in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).
