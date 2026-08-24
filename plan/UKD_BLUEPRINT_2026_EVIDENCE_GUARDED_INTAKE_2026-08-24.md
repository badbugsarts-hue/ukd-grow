# UKD Blueprint 2026 – Evidence-Guarded Intake

Prüfstand: 24.08.2026  
Status des Eingangsberichts: untrusted Research-Input, nicht kanonisch  
Operative Grundlage: UKD v11.5 / RunPackage v6

## Entscheidung

Der Blueprint beschreibt sinnvolle Produktziele, ist aber keine freigabefähige Spezifikation. Absolute Rechts-, Pflanzenphysiologie-, Accessibility- und Plattformbehauptungen wurden nicht übernommen. Verwertbare Punkte wurden als Capability-Gates oder begrenzte Knowledge-Base-Claims aufgenommen.

## Intake-Matrix

| Blueprint-Thema              | Entscheidung                    | UKD-Umsetzung / Grenze                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Offline-first                | übernehmen                      | IndexedDB, Service Worker, resilienter RunRepository, Backup-Vault und staged Restore bleiben Web-Baseline. Eine React-Native-/WatermelonDB-Migration benötigt einen gemessenen Produktgrund.                                        |
| QR Scan-to-Log               | planen                          | QR wird plattformübergreifender Basispfad. Plant-ID, Deep Link, Dublettenprüfung, Offline-Decoder, Permission UX und manueller Fallback sind Pflicht.                                                                                |
| NFC Scan-to-Log              | conditional                     | Nur nach Runtime-Capability-Test oder separat geprüftem Native Shell; niemals einziger Zugang zur Pflanze.                                                                                                                           |
| Edge-AI Bilddiagnose         | research-only                   | Kein Modell wird anhand von Modellname oder behaupteter Genauigkeit freigegeben. Erforderlich sind lizenzierter repräsentativer Datensatz, externe Validierung, OOD-Rejection, kalibrierte Unsicherheit und menschliche Bestätigung. |
| BLE/MQTT                     | conditional, read-only          | Nur benannte Geräte/Protokolle mit Identität, Einheit, Kalibrierung, Frische, Plausibilität, Replay- und Konflikttests. Keine Aktorsteuerung.                                                                                        |
| Aktorautomatik               | abgelehnt im aktuellen Scope    | Separate Hazard Analysis, Interlocks, Watchdog, fail-safe Zustand, physischer Override und Commissioning wären Mindestvoraussetzungen.                                                                                               |
| Legal Compliance             | begrenzt übernehmen             | UKD trennt Bestände und Rechtsgrundlagen. Keine Wachstums- oder Ertragsoptimierung auf eine Grammgrenze; Prognose ist kein Rechtsnachweis.                                                                                           |
| Social Feed                  | conditional                     | Field-level Redaction, Consent, Moderation, Missbrauchsschutz, Löschung und Datenschutzprüfung; nicht Teil des local-first Stable-Kerns.                                                                                             |
| VPD-Korridore                | nur als Hypothese               | VPD bleibt abgeleiteter Kontextwert mit Leaf-/Air-Temperatur, rF, Sensortrust, Bewässerung und Pflanzenreaktion. Keine alleinige Steuerlogik.                                                                                        |
| Mulder Chart / Ca:Mg 3:1–4:1 | als universelle Regel abgelehnt | Interaktionen werden als Diagnosehinweise dargestellt; keine automatische Elementgabe oder feste Verhältnisoptimierung ohne Analytik.                                                                                                |
| Photoperiode / Dark Cycle    | begrenzt übernehmen             | Photoperiodische und Autoflower-Pflanzen getrennt; Night-Interruption ist cultivar- und dosisabhängig. Einzelne Display-/Blitzereignisse werden nicht pauschal als Hermaphroditismusursache behauptet.                               |
| Grow-Tent-Grünmodus          | umbenennen und planen           | Nur „Low-Light Field Display“ zur Blendungsreduktion. Keine Behauptung, dass ein Display die Dunkelphase schützt.                                                                                                                    |
| Wasseraktivität              | übernehmen mit Grenze           | `aw <= 0,65` als Safety-Orientierung; 0,55–0,65 als kontrollierter Arbeitskorridor, nicht als alleiniger Schimmel- oder Cure-Nachweis.                                                                                               |
| WCAG 3 / APCA                | beobachten                      | WCAG 2.2 AA bleibt Release-Gate. WCAG 3 ist Working Draft; APCA erzeugt keine aktuelle Konformitätsbehauptung.                                                                                                                       |
| Offline Voice                | conditional                     | Nur nach Runtime-Nachweis lokaler Erkennung. Jede erkannte Aktion wird vor dem Domain Command sichtbar bestätigt; Tastatur/Touch bleiben vollständig.                                                                                |
| CRDT / Sync                  | nicht pauschal übernehmen       | Append-only Events werden vereinigt; konkurrierende Snapshot-/Profiländerungen erzeugen sichtbare Konfliktaufgaben. Kein stilles Last-write-wins. CRDTs nur nach feldbezogener Merge-Semantik.                                       |

## Korrigierte fachliche Regeln

1. **Recht:** KCanG § 3 spricht von drei lebenden Cannabispflanzen, nicht ausschließlich drei weiblichen Pflanzen. 25 g allgemein und 50 g am Wohnsitz beziehen sich auf das Gewicht nach dem Trocknen. Ertrag, Besitz, Herkunft und Vernichtung bleiben getrennte Sachverhalte.
2. **VPD:** Niedriger oder hoher VPD kann Prozesse beeinflussen, aber „Nährstofftransport stoppt vollständig“ ist als generelle Aussage nicht freigabefähig.
3. **Nährstoffe:** Sichtbare Symptome sind mehrdeutig. P-, Zn-, Fe-, Cu-, Ca-, Mg- und K-Interaktionen rechtfertigen ohne Messkontext keine deterministische Ursache oder Korrektur.
4. **Licht:** Cannabis ist photoperiodisch sensitiv, aber Reaktion auf Nachtunterbrechung hängt von Genotyp, Spektrum, Intensität und Dauer ab. Grünlicht ist nicht wirkungslos.
5. **Post-Harvest:** Wasseraktivität ergänzt, ersetzt aber nicht Probe, Temperatur, Zeit, Feuchtegradient, mikrobielle Qualität und sensorische Inspektion.
6. **Accessibility:** WCAG 2.2 AA plus reale AT-Tests ist prüfbar; WCAG 3 und APCA bleiben Forschungs-/Designbeobachtung.

## Nächste umsetzbare Slices

### P0 – vor Stable

- per-plant Event-Editor für Emergence, Nutrient-Uptake, Root-Zone und Flower-Onset
- plant-targeted Mix Application mit Charge, Volumen, Zeitpunkt und Ergebnis
- Guided Capture für Topfmasse, Drainvolumen/%, Wasseranalyse und Kalibrierung
- echter zweiter-Gerät-Backup-/Restore-Drill
- reale NVDA-/VoiceOver-/Touch-/400-%-Zoom-Tests

### P1 – nach Stable-Kern

- Offline-QR Scan-to-Log mit manuellem Fallback
- Low-Light Field Display ohne Dark-Cycle-Sicherheitsclaim
- vollständige Post-Harvest-Zeitreihe einschließlich `aw`-Probenlineage
- instrumentierte Human-Factors-Tests für Quick Log und Guided Decisions

### Research Gates

- on-device Bildassistenz
- Web-/Native-NFC
- Offline-Sprache
- benannte BLE-/MQTT-Read-only-Adapter
- Multi-User-Sync und selektives Teilen

## Quellenbasis

- KCanG §§ 3 und 9: https://www.gesetze-im-internet.de/kcang/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG 3 Draftstatus: https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/
- Hydroponische Nährstoffinteraktionen: https://doi.org/10.3389/fpls.2019.00923
- Kritik universeller Kationenverhältnisse: https://doi.org/10.2136/sssaj2006.0186
- Cannabis-Wasseraktivität: https://pmc.ncbi.nlm.nih.gov/articles/PMC10874826/
- Cannabis-Mikrobiologie/Postharvest: https://pmc.ncbi.nlm.nih.gov/articles/PMC10294073/
- Cannabis-Photoperiode: https://doi.org/10.21273/HORTSCI15452-20
- Night-Break-Studie: https://pubmed.ncbi.nlm.nih.gov/41095236/
- Web-NFC-Status: https://www.w3.org/community/web-nfc/
- SpeechRecognition-Verfügbarkeit: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
