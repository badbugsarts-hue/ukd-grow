# Release und Betrieb

`main` ist der integrierte Release-Stand. GitHub Actions trennt Core-Gates, Chromium Desktop/Mobile, Firefox, WebKit, Windows-Visual-Regression und Security-Scanning.

Stable verlangt unter anderem:

- grüne Qualitäts-, Browser-, Accessibility- und Security-Gates;
- Run-/Backup-Migration und echten Restore-Drill;
- SPDX-SBOM, Lizenzprüfung und Build-Provenienz;
- Changelog, Rollback-Plan und verifizierte Artefakt-Hashes.

Ein `vX.Y.Z`-Tag startet die Release-Pipeline. Implementierungsvorschauen wie Backend, Sync oder Copilot werden nicht als aktive Fähigkeit beworben, solange die Capability-Roadmap sie nicht freigibt.
