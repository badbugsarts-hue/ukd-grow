# Security, Release & Evolution Policy

## Secure SDLC

- NIST SSDF 1.1 ist die veröffentlichte Governance-Basis; 1.2 wird bis zur finalen Veröffentlichung nur beobachtet.
- OWASP ASVS 5.0.0 wird mit versionierten Requirement-IDs referenziert. Das Zielniveau wird vor einem öffentlichen oder servergestützten Release festgelegt.
- CI führt Lint, Typecheck, Unit-, Content-, Build-, Budget-, Browser-, Accessibility-, Produktionsaudit- und Secret-Pattern-Gates aus.
- Alle GitHub Actions im Quality Gate sind auf exakte Commit-SHAs gepinnt.
- Dependabot prüft npm- und GitHub-Actions-Abhängigkeiten wöchentlich.

## Software-Provenienz

Jeder CI-Lauf erzeugt:

- `ukd-sbom.spdx.json` als SPDX-2.3-SBOM;
- `license-audit.json` mit expliziten `NOASSERTION`-Fällen und geprüften Conclusions;
- `release/license-conclusions.json` als reviewpflichtige, versionierte Ausnahmequelle; deklarierte und geschlussfolgerte Lizenz bleiben im SPDX getrennt;
- `ukd-provenance.json` mit Source Commit, Node/pnpm, Lockfile-, Content- und Build-Artefakt-Hashes.

Diese Dateien sind Belege, aber noch keine kryptografisch signierte SLSA-Attestation. Ein Stable-Release bleibt blockiert, solange ungeklärte Lizenzen, fehlende Signatur oder ein erforderliches Security-Gate offen sind.

## Release-Kanäle

- **preview:** jeder PR, keine Datenkompatibilitätsgarantie außerhalb dokumentierter Fixtures;
- **beta:** Migrations- und Restore-Probe bestanden, bekannte Risiken veröffentlicht;
- **stable:** alle Release-SLOs grün, Lizenzstatus geklärt, Artefakte gehasht/signiert und Rollback geprobt.

## Kompatibilität

- RunPackage v1, v2 und v3 werden nach v4 migriert.
- Eine Migration ist append-only nachvollziehbar und mutiert den aktiven Run erst nach vollständiger Validierung.
- Downgrades sind nicht implizit garantiert. Vor inkompatiblen Änderungen wird ein verifiziertes Backup verlangt.
- Ein Schema wird mindestens einen stabilen Release-Zyklus nach der Ablösung lesbar gehalten.

## Feature Flags

Flags dürfen UI, technische Adapter oder experimentelle Diagnostik steuern. Sie dürfen niemals fachliche Sollwerte, Evidenzklassen, Formelergebnisse oder Safety-Gates verändern. Derzeit ist kein externer Flag-Provider eingebunden.

## Deprecation

Jede Deprecation nennt Ersatz, Migrationspfad, frühestes Enddatum und betroffene Daten-/Connector-Versionen. Entfernen ohne getestete Migration ist nicht zulässig.
