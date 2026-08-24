# Erste Schritte

## Voraussetzungen

- Node.js 24
- pnpm 11.16
- aktueller Chromium-, Firefox- oder WebKit-basierter Browser

## Start

Unter Windows `START_UKD.cmd` doppelklicken oder im Projektordner:

```powershell
pnpm install --frozen-lockfile
pnpm start:local
```

Danach `http://127.0.0.1:4173` öffnen. `index.html` nicht direkt per `file://` starten.

## Empfohlener Ablauf

1. Guided, Advanced oder Expert wählen; die Fachwerte bleiben identisch.
2. Setup und Pflanzenidentität vollständig erfassen.
3. Wasser- und Messgeräte-Baselines prüfen.
4. In Simulation planen und testen.
5. Beim tatsächlichen Start über den Live-Preflight einen getrennten Live-Run erzeugen.
6. Regelmäßig verifizierte Backups außerhalb des Browsers ablegen.
