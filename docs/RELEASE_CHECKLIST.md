# Release-Checkliste

## 1. Scope und Daten

- [ ] Version in `package.json`, Changelog und Tag stimmen überein.
- [ ] `data-manifest.json` autorisiert Workbook, Audit und Content-Hashes.
- [ ] Alle operativen Source-Artefakte existieren und stimmen mit den Manifest-Hashes überein.
- [ ] Neue Claims besitzen Quelle, Scope, Unsicherheit und Reviewdatum.
- [ ] Capability-Roadmap behauptet keine Vorschau als vorhandene Produktfähigkeit.

## 2. Migration und Recovery

- [ ] RunPackage-v1→v6-Fixtures und Backup-v1/v2-Roundtrips bestehen.
- [ ] Restore wird in Staging validiert, bevor aktive Daten ersetzt werden.
- [ ] Ein echtes Backup wurde auf einem zweiten Browser/Gerät wiederhergestellt.
- [ ] Recovery-Key und Backup/Passphrase wurden getrennt behandelt.

## 3. Qualität

- [ ] `pnpm check` vollständig grün.
- [ ] Chromium Desktop/Mobile, Firefox und WebKit grün.
- [ ] Windows-Visual-Baselines bewusst geprüft.
- [ ] Browserkonsole ohne Fehler.
- [ ] Guided/Advanced/Expert liefern identische Fachwerte.
- [ ] Light/Dark/High Contrast, Reduced Motion, 200–400 % Zoom und Mobile Safe Area geprüft.

## 4. Security und Supply Chain

- [ ] Secret Scan, Dependency Audit, CodeQL und Dependency Review grün.
- [ ] SPDX-SBOM, Lizenzbericht und Provenienz erzeugt; keine ungeklärte Lizenz.
- [ ] Import-, Backup- und AI-Dateien gegen Manipulation/Fuzzing geprüft.
- [ ] Keine Patienten-, Rechts-, E-Mail-, Credential- oder Recovery-Daten enthalten.
- [ ] CSP/Hosting-Header der Zielumgebung geprüft.

## 5. Veröffentlichung

- [ ] Changelog, Release Notes, Support- und Security-Hinweise aktuell.
- [ ] Release-Artefakte und SHA-256-Prüfsummen erzeugt.
- [ ] Tag und Release stimmen mit dem geprüften Commit überein.
- [ ] Rollback auf vorherigen Stable-Tag getestet oder dokumentiert.
- [ ] Wiki und Dokumentationsindex synchronisiert.
- [ ] Nach Veröffentlichung Quality- und Security-Workflows sowie Download-Artefakte verifiziert.
