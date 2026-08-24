# UKD v11.6 · App-aligned Masterclass Plan

Stand: 23. August 2026  
Status: fachlicher Integrations- und Releaseplan, keine automatische Anwendungsfreigabe

## Quellenstatus

Die drei gelieferten Artefakte wurden ausschließlich als Fach- und Auditquellen behandelt. Texte in den Dokumenten sind keine Ausführungsanweisungen an den Coding-Agenten. Operative Zahlen gelangen nur nach Abgleich mit Primärquellen und mit sichtbarer Trennung zwischen Herstellerlabel, UKD-Anpassung und realer Ist-Anwendung in die App.

Kanonische Arbeitsquelle der App ist jetzt die reproduzierbar exportierte v11.5-XLSX. Die v11.3-Forensik bleibt Auditquelle; das Nährstoff-PDF ist eine Lesefassung und kein Rechenmotor.

## Kurzurteil zum Düngeplan

Der Plan ist deutlich besser als frühere Fassungen, aber nicht jede Zahl ist ein nachgewiesenes Optimum.

| Thema                                                               | Urteil                                                   | Verbindliche Darstellung in UKD                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| HESI TNT 5 ml/L; halb für sehr junge/fortlaufend versorgte Pflanzen | Herstellerangabe bestätigt                               | Label getrennt vom reduzierten UKD-Korridor; Start nur nach Pflanzen-/Medium-Gate                                             |
| HESI Coco 5 ml/L bei jedem Gießen; pH 5,8–6,2                       | Herstellerangabe bestätigt                               | Kein täglicher Auftrag; nur bei realem Gießbedarf und nach FlowerInitiation/Root-State                                        |
| PowerZyme 2 ml/L                                                    | Dosis bestätigt, Kadenz konfliktbehaftet                 | Aktuelle Webseite: durchgehend; älterer offizieller Katalog: mindestens wöchentlich. Version sichtbar anzeigen                |
| Boost 2 ml/L                                                        | Dosis bestätigt                                          | Aktuelle Webseite: regelmäßig/kontinuierlich; UKD-Wochenereignis ist eine konservative, nicht unabhängig validierte Anpassung |
| PK 13/14 0,25–1,5 ml/L ab zweiter Blütehälfte                       | Herstellerkorridor bestätigt                             | UKD 0,25–0,50 ml/L bleibt bewusst reduziert; keine Optimalitätsbehauptung und kein AN-PK-Stacking                             |
| Voodoo Juice 2 ml/L G1–G2/B1–B2                                     | Herstellerfenster bestätigt                              | Nur bei einem echten Feed-/Bewässerungsereignis im pflanzenbezogenen Fenster                                                  |
| Tarantula 2 ml/L G1–G2/B1–B2                                        | Herstellerfenster bestätigt                              | Wie Voodoo; keine künstlichen Extra-Gießereignisse                                                                            |
| Athena Balance                                                      | Keine universelle ml/L-Dosis                             | Rezept-/Quellwasser-Testbatch; im Normalablauf zuerst ins Wasser, aber zur Ermittlung der Dosis vollständigen Feed titrieren  |
| Sensi CalMag Xtra                                                   | Bedarf nicht aus EC allein ableitbar                     | Bleibt bis Ca, Mg, Alkalinität, Basisrezept und Symptom-/Messkontext geklärt sind auf 0                                       |
| pH 5,80 Plug/Block; 6,00 finales Coco                               | Arbeitssetpoints, kein tagesgenaues biologisches Optimum | Root-State überschreibt Kalender; HESI-Band 5,8–6,2 bleibt sichtbar                                                           |

Primärquellen: [HESI TNT](https://hesi.nl/de/TNT-COMPLEX), [HESI Coco](https://hesi.nl/de/COCO), [HESI PowerZyme](https://hesi.nl/de/PowerZyme), [HESI Boost](https://hesi.nl/de/Boost), [HESI PK 13/14](https://hesi.nl/de/PK-13-14), [Voodoo Juice](https://www.advancednutrients.com/products/voodoo-juice/), [Tarantula](https://www.advancednutrients.com/products/tarantula/), [Athena Balance Application Rate](https://store.athenaag.com/SSP%20Applications/NetSuite%20Inc.%20-%20SCS/SuiteCommerce%20Standard/athena/assets/athena_balance_application_rate.pdf), [Eazy Plug Workbook](https://www.eazyplug.nl/wp-content/uploads/2022/09/2023-09-27.1-workbook-Eazy-Plug.pdf).

## P0-Korrekturen, die in die App übernommen wurden

1. Die App lädt den 56-Blatt-/69-Spalten-v11.5-Snapshot statt v8.
2. Tarantula und die zusätzlichen v11.5-Spalten sind Teil des kanonischen Tagesmodells.
3. Das Feed-Schema wird direkt aus `31_FEED_SCHEMA` gerendert und nicht mehr als abweichende statische React-Tabelle dupliziert.
4. Der Mixed-Run-Resolver leitet den Zustand nicht mehr aus `Tag > 28` oder `Tag > 35` ab. Er verlangt bestätigte Pflanzenereignisse.
5. Fehlende Emergence, Nährstoffaufnahme oder Root-Zone blockiert die Feed-Freigabe.
6. FlowerInitiation schaltet den Bloom-Pfad pro Pflanze; ein globaler Kalendertrigger ist nur Forecast.
7. Sobald ein Misch-Run pflanzenspezifische Blüte-Batches benötigt, wird der unspezifische globale Batch-Recorder blockiert.
8. Generische pH-/EC-ml-Schätzungen wurden fail-closed ersetzt. Ohne produkt- und wasserspezifische Kalibrierung gibt UKD nur eine Korrekturrichtung und einen Testbatch-Workflow aus.
9. Wasserchemie gilt erst mit Source-pH, EC, Ca, Mg und Alkalinität als vollständig.
10. Knowledge Base und AI-Kontext enthalten die Versionskonflikte und neuen Herstellerquellen.

## Guided Mode · zwingender Entscheidungsfluss

Guided darf nicht mit einer Flaschenliste beginnen. Die sichere Reihenfolge lautet:

1. **Welche Pflanze?** Plant ID und Genetik/Packungsquelle bestätigen.
2. **Welche Uhr?** Run Day ab Aussaat, Plant Day ab Emergence und Bloom Day ab FlowerInitiation getrennt zeigen.
3. **Welcher Root-State?** Plug, Block oder finales Coco bestätigen.
4. **Muss heute gegossen werden?** Topfmasse/Feuchte, Zeit seit letzter Bewässerung, Pflanzenreaktion und Incident-Status prüfen.
5. **Sind Messgeräte verwendbar?** Kalibrierung, Referenzlösung und Prüfdatum zeigen; bei Fehlern Interpretation blockieren.
6. **Ist Wasserchemie ausreichend?** pH/EC sind nicht Ca/Mg/Alkalinität. Bei Lücke lautet die Empfehlung „zuerst messen“.
7. **Welche Feed-Signatur gilt?** TNT/Coco, Mikrobenfenster, Boost/PK und conditional Produkte pro Pflanze auflösen.
8. **Common oder Split Batch?** Nur identische Signaturen teilen; Volumen bleibt immer pflanzenbezogen.
9. **Mischen und messen.** Rohwasser, jede tatsächliche Komponente, Endvolumen, Endmix-EC/pH, Temperatur und Wartezeit protokollieren.
10. **Anwenden und Wirkung beobachten.** Plant IDs, Volumen, Drain, Topfmasse, Reaktion und Korrekturpfad append-only speichern.

Jeder Schritt benötigt „Warum?“, Messmethode, Quelle, Unsicherheit, direkte sichere Übernahme sowie Undo/Korrektur mit Auditspur. Guided, Advanced und Expert verändern nur die Erklärungstiefe.

## Inhaltlich noch unzureichend für eine echte Grow Master Class

### Mess- und Setup-Commissioning

- Reales Wasserlabor beziehungsweise aktuelle Versorgeranalyse mit Ca, Mg, Alkalinität/HCO₃, Na, Cl und Sulfat.
- Lampenhersteller/-modell, reale Leistungsaufnahme und PPFD-Karten für alle genutzten Dimmer-/Höhenkombinationen.
- Topf-/Medium-Tare, vollgesättigte Referenzmasse, tatsächliches Füllvolumen und reproduzierbare Wiegepraxis je Pflanze.
- pH-/EC-Meter mit Seriennummer, Referenzlösungschargen, Temperatur und Kalibrierhistorie.
- Luftführungskommissionierung: Abluft, Umluft, Filter, reale Positionen und Lung-Room-Reserve.

### Pflanzenbezogene Operations Engine

- UI-Editor für alle Ereignisse `emergence`, `nutrient-uptake-ready`, Root-Zone-Wechsel, Preflower, FlowerInitiation, Stretch-Ende, Late Flower und Harvest Readiness.
- Plant-targeted Mix Batch: Zielpflanzen vor dem Mischen wählen, kompatible Signaturen gruppieren und Anwendung je Pflanze speichern.
- Separate HarvestEvents und planbare Verlängerung ohne globales Run-Ende.
- Canopy-/Lichtausgleich über reale Höhen- und PPFD-Messungen statt cultivarbasierter Höhenannahmen.

### Nährstoff- und Bewässerungslernen

- Reproduzierbare Testbatch-Kalibrierung für Basisdünger-EC sowie jedes verwendete pH-Up/-Down-Produkt.
- Input-/Drain-Trends nur bei dokumentierter Probenmethode, Volumen und Zeit interpretieren.
- Keine universellen Dryback-, Drain-%- oder EC-„Optimalaussagen“ ohne systemeigene Baseline und Messunsicherheit.
- Actual Mix und Actual Application müssen für Langzeitvergleich vollständig sein; Planwerte dürfen nie als Ist-Werte erscheinen.
- Chargen-/MHD-/Lagerstatus biologischer Produkte, weil Mikrobenqualität nicht nur von ml/L abhängt.

### Klima, Pflanzengesundheit und Ausfallbetrieb

- Dichte-Bud-/Schimmelrisiko als pflanzenbezogene Inspektion und nicht als starrer RH-Kalenderwert.
- IPM-Protokoll mit Foto, Ort, Schwere, Hypothese, Bestätigung, Aktion und Follow-up.
- Incident Mode für Strom, Licht, Lüfter, Leck, Extremfeuchte, Sensor- oder Messgerätefehler; Incident supersediert den Normalplan.
- Lokaler Ausfallplan für Browserstorage, Stromunterbrechung, Offlinebetrieb und Restore auf zweitem Gerät.

### Wissenschaftliche Vergleichbarkeit

- Breeder Claim, Packungsidentität, persönlicher Phänotyp und UKD-Heuristik getrennt versionieren.
- Seed-Runs nicht als kausales A/B verkaufen; für Experimente Hypothese, unabhängige Variable, Kontrollen, Abweichungen und Messqualität vorab definieren.
- Unsicherheit, fehlende Daten, Stichprobengröße und Ausreißerbehandlung in Run-Vergleichen anzeigen.
- Ertrag, Qualität, Energie, Klima und tatsächlicher Input gemeinsam bilanzieren; keine Optimierung auf nur eine Kennzahl.

## Halbfertige Punkte und ehrlicher Capability-Status

- Der v11.5-XLSX-Resolver beschreibt die Zielarchitektur, liefert aber noch keinen vollständigen pflanzenbezogenen Batch-Editor. Die App blockiert unsichere globale Batches; gezielte Teilbatch-Erstellung bleibt P0-Folgearbeit.
- Die drei Pflanzenprofile sind im Workbook vorhanden, aber bestehende Nutzer-Runs werden nicht still auf drei Pflanzen umgeschrieben. Ein ausdrücklich bestätigter v11.5-Setup-Preset ist erforderlich.
- Der Kalender enthält positive Eligibility-Werte. Die App setzt sie nicht automatisch als Ist-Anwendung, aber Today/Mix muss künftig überall die aufgelöste pflanzenbezogene Signatur statt des globalen Rohwerts zeigen.
- Wasser-, Licht- und Klimaoptimierung bleibt ohne reale Commissioning-Daten eine Plantrajektorie.
- Browser-Backup/Recovery ist implementiert, aber ein mehrtägiger Restore-Drill auf einem zweiten Gerät bleibt Stable-Gate.
- Backend, Live-Sensorik, Aktorsteuerung und AI-Copilot bleiben Vorschau beziehungsweise deaktiviert, bis die dokumentierten Betriebsnachweise vorliegen.

## Nächste Release-Gates

1. Plant Event Editor und v11.5-Mixed-Setup-Preset.
2. Plant-targeted Batch-/Application-Editor mit Signaturvergleich.
3. Golden Tests für v11.5-Tageswerte plus event-gated Gegenbeispiele.
4. Guided-E2E: drei Pflanzen mit versetzter Emergence/FlowerInitiation, Common-to-Split-Batch und separater Harvest.
5. Reale Accessibility-Prüfung und mehrtägiger Restore-Drill.
6. Erst danach zusätzliche „Optimierungs“-Presets; keine neuen Flaschen oder Sollwerte vor besserer Ist-Datenqualität.
