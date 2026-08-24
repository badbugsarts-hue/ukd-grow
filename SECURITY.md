# Security Policy

## Unterstützte Version

Sicherheitskorrekturen werden für den aktuellen Stand von `main` und den neuesten Stable-Tag bereitgestellt. Vorschau- und Legacy-Artefakte unter `plan/` sind keine unterstützten Laufzeitversionen.

## Vertraulich melden

Bitte keine ausnutzbaren Details, Zugangsdaten oder persönlichen Run-Daten in einem öffentlichen Issue veröffentlichen. Nutze stattdessen **Security → Advisories → Report a vulnerability** im GitHub-Repository.

Die Meldung sollte enthalten:

- betroffene Version oder Commit;
- reproduzierbare Schritte mit bereinigten Beispieldaten;
- erwartete und beobachtete Auswirkung;
- Einschätzung, ob Datenintegrität, Backup, Import, XSS, Auth/Sync-Vorschau oder Supply Chain betroffen sind.

## Reaktionsziel

Eine Erstbewertung erfolgt möglichst innerhalb von sieben Kalendertagen. Kritische Findings blockieren Stable-Releases. Nach Behebung folgen Regressionstest, Changelog-Eintrag und – sofern erforderlich – koordinierte Veröffentlichung.

Weitere technische Regeln: [docs/SECURITY.md](docs/SECURITY.md) und [docs/SECURITY_RELEASE_AND_EVOLUTION.md](docs/SECURITY_RELEASE_AND_EVOLUTION.md).
