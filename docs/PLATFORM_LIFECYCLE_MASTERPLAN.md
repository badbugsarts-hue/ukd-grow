# UKD Cultivation Intelligence Platform · Lifecycle Masterplan

Stand: 09.08.2026

## Zielbild

UKD ist kein Feature-Sammelprojekt, sondern eine lokale Scientific-Operations-Plattform:

1. **Experience:** Today, Guided/Advanced/Expert, Hilfe und Knowledge Base.
2. **Operations:** Tasks, Pläne, Journal, Overrides und Failure UX.
3. **Science:** Evidenz, Messqualität, Kalibrierung, Lineage und spätere Experimente.
4. **Decision:** deterministische Regeln, Validierung, State Machines und Hazard Controls.
5. **Data:** Domain Events, Measurements, Runs, Migration und Recovery.
6. **Platform:** Storage, Connector-Verträge, Security, Releases und Diagnostik.

Der Entwicklungsfluss lautet verbindlich:

`User Need → Domain Model → Hazard/Safety → Data Lifecycle → UX → Verification → Release → Diagnostics → Learning → Evolution`

## Umgesetzte Plattformgrundlage

- RunPackage v3 mit v1/v2-Migration, unveränderlichem Aktivierungs-Snapshot und Multi-Run-Repository.
- Einheitliches Domain-Event-Envelope mit Aggregate, Zeit, Actor, Source, Payload und Kausalitätsfeldern.
- Append-only Messkorrekturen und reproduzierbare Event-Projektion.
- ScientificValue-Lineage mit Methode, Präzision, Unsicherheit, Confidence, Formel-, Evidenz-, Kalibrierungs- und Transformationsreferenzen.
- Geräte-, Capability- und Kalibrierungsmodelle sowie herstellerunabhängiger `MeasurementProvider`-Vertrag.
- Sensor-Trust-Gate für `valid`, `stale`, `unverified`, `calibration-due`, `outlier`, `conflicting`, `missing` und `suspect`.
- Formale Task-State-Machine; illegale Transitionen und unbegründetes Blockieren/Überspringen werden abgewiesen.
- SHA-256-verifiziertes Backup-Envelope; Restore mutiert erst nach Integritäts- und Schema-Gate.
- Privacy-preserving Diagnose-Bundle ohne Messwerte, Freitext, Rechtsprofil oder Zugangsdaten.
- Maschinenlesbare User-Journeys, Human-Factors-Metriken, Hazard Register, Failure-UX-Verträge, SLOs und Privacy-Klassen.
- SPDX-2.3-SBOM, Lizenzbericht und SLSA-kompatible Provenienzstruktur als CI-Artefakte.

## Acht Lifecycle-Epics

| Epic                                | Status        | Nächste belastbare Abnahme                                       |
| ----------------------------------- | ------------- | ---------------------------------------------------------------- |
| Product Research & Human Factors    | Teilweise     | Moderierte Tests mit mindestens fünf Personen je Lens            |
| Data Lifecycle & Event Architecture | Implementiert | Langzeit-Fixtures und weitere Schema-Migrationen                 |
| Scientific Measurement & Analytics  | Teilweise     | reale Geräte- und Kalibrierungs-Fixtures; Statistik-Guardrails   |
| Reliability & Observability         | Teilweise     | lokales Fehlerjournal, Failure Injection und Performance-Messung |
| Secure SDLC & Supply Chain          | Teilweise     | ASVS-Scope, SAST-Verfügbarkeit und signierte stabile Releases    |
| Platform & Integration SDK          | Teilweise     | erster read-only Referenzadapter und Contract-Test-Suite         |
| Release & Evolution System          | Teilweise     | Preview/Beta/Stable mit Rollback-Probe                           |
| Guarded Intelligence Layer          | Bedingt       | erst nach stabiler Retrieval-, Rule- und Safety-Pipeline         |

## Harte Grenzen

- Sensorwerte sind niemals allein wegen ihrer Herkunft `valid`.
- Bei Konflikt oder fehlender Kalibrierung wird automatische Interpretation ausgesetzt.
- Aktorik bleibt blockiert, solange Timeout, manuelles Stoppen, Limits, Interlocks, Recovery und Failure Injection nicht vollständig verifiziert sind.
- Feature Flags dürfen technische Funktionen schalten, niemals unterschiedliche wissenschaftliche Wahrheiten, Sollwerte oder Evidenzstände.
- Ein AI-System darf deterministische Berechnung und Safety-Gates erklären, aber nicht ersetzen.
- Automatisierte Accessibility-Scans sind kein Ersatz für reale NVDA/VoiceOver-, Zoom-, Tastatur-, Touch- und Kognitionstests.

## Primärquellenstatus

- OpenTelemetry ist vendor-/tool-agnostisch für Traces, Metrics und Logs; UKD exportiert derzeit dennoch keine Telemetrie.
- NIST SSDF 1.1 ist final; SSDF 1.2 ist seit 17.12.2025 Entwurf.
- OWASP ASVS 5.0.0 ist die aktuelle stabile Fassung.
- SPDX ist ISO/IEC 5962:2021; UKD erzeugt SPDX 2.3.
- SLSA 1.2 ist freigegeben. Das UKD-Provenienzobjekt beansprucht noch kein formell attestiertes SLSA-Level.
- OpenFeature wird nur als zukünftiger technischer Flag-Vertrag betrachtet.
- WCAG 2.2 bleibt Release-Ziel; Focus Not Obscured, Target Size, Consistent Help und Redundant Entry sind explizite Prüfpunkte.

Die vollständigen URLs, Prüfzeitpunkte, Scopes und Unsicherheiten liegen strukturiert in `src/data/knowledge-base.json`.
