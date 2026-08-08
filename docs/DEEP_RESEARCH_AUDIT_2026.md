# Deep-Research-Audit · Evidence-Guarded v6

Stand: 8. August 2026

## Ergebnis

Die neue v6 ist gegenüber v5 fachlich deutlich belastbarer. Sie ergänzt neun Findings (A47–A55), trennt Herstellerlabel von UKD-Arbeitswerten und blockiert Dosisentscheidungen, wenn Wasserchemie oder Primärquellen fehlen. Die externe Research-Synthese wird als untrusted Input archiviert, nicht als Beleg importiert.

## Geprüfte Artefakte

- XLSX v6: 27 Blätter, 55 Findings, 2.945 importierbare Formeln; Scan ohne sichtbare `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!` oder `#SPILL!`.
- Mobile PDF: 219 Seiten; vollständige Thumbnail-Prüfung plus hochauflösende Stichproben an Anfang, Mitte, Rechts-/Quellen-Addendum und Ende.
- Research-Beilage: 27.656 Bytes; jede operative Kernaussage gegen Gesetz, Herstellerdokumentation oder Primärliteratur geprüft.

Ein fehlerfreier Formel-Scan beweist keine biologische Richtigkeit. Er bestätigt nur, dass in den geprüften Zellwerten keine offensichtlichen Excel-Fehlermarker stehen.

## Entscheidungen zu den Research-Claims

| Research-Claim                                                | Entscheidung                                          | Begründung                                                                                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privater Anbau erfordert immer eine behördliche Erlaubnis     | verworfen                                             | KCanG §9 erlaubt Volljährigen bis zu drei Pflanzen gleichzeitig am Wohnsitz/gewöhnlichen Aufenthalt; keine pauschale Vorab-Lizenz.                |
| GACP/GMP gilt als Pflichtenkatalog für diesen privaten Run    | verworfen als Pflicht; behalten als Qualitätsreferenz | EMA-GACP Revision 1 betrifft pflanzliche Ausgangsstoffe für medizinische Zwecke; EU-GMP Arzneimittelherstellung.                                  |
| 40–60 % RH in Veg und 40–50 % in Blüte ist bewiesenes Optimum | verworfen                                             | Die Studie verglich 37–58 % mit extremen 78–98 % in einem CBD-dominanten Klon. Der Kontrollbereich wurde nicht als universelles Optimum getestet. |
| 212–283 mg N/L ist ein allgemeines Cannabis-Soll              | verworfen                                             | Kontext: eine organische Formulierung, zwei coir-basierte organische Substrate, ein Cultivar. Keine direkte HESI-/Mineral-Coco-Übertragung.       |
| 12/12 ist Standard für das vorliegende Autoflower-Setup       | verworfen                                             | Autoflower-Accessions sind photoperiodisch insensitiv. 18 h bleibt eine UKD-Arbeitsannahme, nicht ein bewiesenes Optimum.                         |
| Flushing verbessert universell die Qualität                   | verworfen                                             | Kontrollierte Daten zeigen überwiegend geringe und cultivarabhängige Effekte. Hersteller-Finish und unabhängige Evidenz bleiben getrennt.         |

## Primärquellen

- [KCanG §3](https://www.gesetze-im-internet.de/kcang/__3.html), [§9](https://www.gesetze-im-internet.de/kcang/__9.html) und [§10](https://www.gesetze-im-internet.de/kcang/__10.html)
- [EMA GACP Revision 1](https://www.ema.europa.eu/en/good-agricultural-collection-practice-starting-materials-herbal-origin-scientific-guideline)
- [EU EudraLex Volume 4 GMP](https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en)
- [Corredor-Perilla et al. 2025 · RH](https://doi.org/10.3389/fpls.2025.1678142)
- [Caplan et al. 2017 · organische N-Rate](https://doi.org/10.21273/HORTSCI12401-17)
- [Babaei et al. 2026 · Autoflower-Phänotyp/Genomik](https://doi.org/10.1038/s41598-026-53686-y)
- [Saloner et al. 2024 · Preharvest-Flushing](https://doi.org/10.1016/j.indcrop.2024.119157)
- [Athena Balance Produktseite](https://store.athenaag.com/balance/), [HESI Coco](https://hesi.nl/de/COCO) und [Blumat Innenraumhinweis](https://www.blumat.com/de/tropf-blumat/worth-knowing)

## Verbleibende Grenzen

- PPFD-, EC-, Liter-/Tag- und UKD-Dosiskurven sind operative Hypothesen, keine universellen Optima.
- Für Double Grape Auto im konkreten 140-W-/11-L-Coco-Setup fehlen kontrollierte 18/20/24-h-, RH-, Feed- und Bewässerungsvergleiche.
- Herstellerangaben autorisieren das eigene Label, aber keine unabhängige Wirksamkeitsrangfolge.
- Eine positive fachliche Freigabe durch Botaniker, Elektrofachkraft oder Rechtsberatung ist nicht durch automatisierte Recherche ersetzbar.

## Release-Gate

Eine neue operative Zahl darf nur erscheinen, wenn Quelle, Claim-Typ, untersuchte Population, System, Intervention, Vergleich, Ergebnis, Scope, Unsicherheit und Prüftag gemeinsam gespeichert sind. Fehlt eines der entscheidenden Felder, bleibt die Ausgabe erklärend oder `BLOCK/UNKNOWN`.
