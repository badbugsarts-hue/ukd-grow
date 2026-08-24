# Architektur und Entwicklung

Die aktive Anwendung nutzt React, TypeScript und Vite als statisch deploybare, offline-nahe SPA. RunPackage v6 liegt lokal in IndexedDB-Schema 8. Evidenzdaten und Nutzer-/Run-Daten sind getrennte Stores.

Wichtige Module:

- `src/domain.ts`: kanonische Tages-, DLI-, VPD- und Mixlogik
- `src/run-state.ts`: RunPackage v6, Migration, Events und State Machines
- `src/run-storage.ts`: resilientes Multi-Run-Repository
- `src/run-commands.ts`: atomarer Command-Gateway
- `src/data/`: Knowledge Base, Guardrails und Capability Truth

Vor einem Pull Request `pnpm check` ausführen. Fachänderungen benötigen Primärquelle, Scope, Unsicherheit und deterministische Tests.
