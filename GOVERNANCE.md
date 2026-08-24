# Governance

## Entscheidungsbereiche

- **Produkt und UX:** Nutzerbedarf, Accessibility, Human Factors und Fehlbedienungsrisiken.
- **Domain:** Datenmodelle, Commands, State Machines, Migration und Recovery.
- **Evidence:** Claims, Quellen, Formeln, Sollwerte, Scope und Unsicherheit.
- **Security/Release:** Abhängigkeiten, CI, SBOM, Provenienz, Signierung und Rollback.

## Entscheidungsprinzip

`main` ist der integrierte Release-Stand. Normale Änderungen laufen über Pull Request und grüne Quality Gates. Evidence- oder Safety-Änderungen benötigen zusätzlich dokumentierte fachliche Prüfung. Dringende Sicherheitskorrekturen dürfen beschleunigt werden, müssen aber nachträglich denselben Nachweis erhalten.

## Wahrheitshierarchie

Die kanonischen Quellen und Invarianten stehen in [AGENTS.md](AGENTS.md). Weder UI-Presets noch Feature Flags, Sync, Connectoren oder AI dürfen Evidenz und Formeln überschreiben.

## Veröffentlichungen

Preview → Beta → Stable. Ein Stable-Release verlangt Migrationsprobe, Restore-Drill, Browser-/A11Y-Gates, geklärte Lizenzen, Changelog, SBOM, Provenienz und Rollback-Plan. Details: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).
