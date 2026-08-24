# Operations Runbook

## Lokal starten

```powershell
pnpm install --frozen-lockfile
pnpm start:local
```

Die App läuft unter `http://127.0.0.1:4173`. Ein direkter `file://`-Aufruf ist nicht unterstützt.

## Release prüfen

```powershell
pnpm check
```

Der Befehl umfasst Core-Gates, Security, Build, Release-Metadaten und die vollständige Playwright-Matrix. In GitHub Actions laufen Core, vier Browserprojekte und Windows-Visual-Regression getrennt, damit Fehler eindeutig zugeordnet werden können.

## Datenproblem oder Schreibfehler

1. Keine weiteren fachlichen Mutationen durchführen.
2. Read-only-Degraded-Mode und Storage-Diagnose prüfen.
3. Sofortbackup erzeugen und Readback-Ergebnis sichern.
4. Restore ausschließlich in Staging validieren.
5. Erst nach Hash-, Schema-, Referenz- und Medienprüfung aktivieren.

## Rollback

1. Letzten als stabil markierten Git-Tag bestimmen.
2. Aktuelles Workspace-Backup verifizieren und getrennt aufbewahren.
3. Vorherige Web-Artefakte bereitstellen.
4. Keine Datenmigration rückwärts erzwingen; kompatibles Backup/Export verwenden.
5. Incident, Auswirkung und Wiederanlauf im Changelog/Advisory dokumentieren.

## GitHub Release

Tags im Format `vX.Y.Z` lösen den Release-Workflow aus. Er baut die statische App, erzeugt SPDX-SBOM, Provenienz, Lizenzbericht, Archiv und SHA-256-Prüfsummen und aktualisiert den GitHub Release. Ein Tag darf erst nach grünem `main`-Gate gesetzt werden.

## Nicht aktive Plattformfähigkeiten

Fastify/Postgres, Magic Link, Sync, serverseitiger Copilot und Telemetrie bleiben Implementierungsvorschau, bis Capability-Roadmap, Security-, Zwei-Geräte- und Restore-Gates ihre Aktivierung freigeben.
