# Faktencheck · Evidence-Guarded v6 · Stand 8. August 2026

## Ergebnis

Nein: Nicht jede Zahl im Plan ist als universell „richtig“ belegbar. Der v6-Audit dokumentiert 55 korrigierte Findings, aber der Plan enthält weiterhin vier verschiedene Arten von Aussagen:

| Klasse                 | Bewertung                                                    | Beispiele                                                                          |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Verifiziert            | direkt durch Gesetz, Physik, Label oder Primärquelle gedeckt | KCanG §9, DLI-Formel, Blumat-Innenraumhinweis, HESI-Label, Athena-Mischreihenfolge |
| Verifiziert mit Grenze | innerhalb untersuchter Bedingungen richtig                   | Licht-Ertrags-Reaktion, NPK-Wechselwirkungen, P-Überversorgung, water activity     |
| UKD-Heuristik          | operativer Startwert, kein nachgewiesenes Optimum            | 625 PPFD, CV ≤15 %, Drain-EC +0,3–0,4, reduzierte Dosen, Wochen-Cadence            |
| Unbekannt/zu messen    | ohne echte Eingabe nicht bestimmbar                          | Ca, Mg, Alkalinität, Athena-/CalMag-Bedarf, Blatt-ΔT, finaler pH                   |

## Bestätigt

- Deutscher Eigenanbau: maximal drei Pflanzen gleichzeitig für Volljährige am Wohnsitz/gewöhnlichen Aufenthalt; keine Weitergabe aus privatem Eigenanbau. [KCanG §9](https://www.gesetze-im-internet.de/kcang/__9.html)
- Tropf-Blumat: Der Hersteller definiert als bestimmungsgemäße Verwendung die Tröpfchenbewässerung für Pflanzen im Außenbereich. Indoor ist deshalb kein UKD-Referenzsystem; das ist eine Hersteller-/Produktscope-Grenze und kein gesetzliches Indoor-Verbot. [Benutzerhandbuch](https://www.blumat.com/storage/app/media/tropf/manual/Tropf-Blumat_user_manual_DE.pdf)
- HESI Coco: 50 ml/10 L, bei jedem Gießen; 5,8–6,2 wird für die Blüte genannt. Das belegt das Label, nicht den reduzierten UKD-Plan als Optimum. [HESI Coco](https://hesi.nl/de/COCO)
- Athena Balance: pH-Anpassung vor Zugabe der Dünger. Daraus folgt keine fixe Dosis. [Athena Water Conditioners](https://de.athenaag.com/water-conditioners)
- DLI: `PPFD × Stunden × 3600 / 1.000.000`; Planwerte stimmen rechnerisch, wenn PPFD als zeitlicher Mittelwert gilt.
- Leaf-VPD: Die Formel ist physikalisch plausibel, benötigt aber Blatt- statt nur Lufttemperatur. [ASHRAE Psychrometrics](https://handbook.ashrae.org/Handbooks/F21/SI/F21_Ch01/F21_Ch01_si.aspx)

## Rechtsprofil-Nachtrag

- KCanG-Eigenanbau und Medizinalcannabis sind getrennte Rechtswege. Medizinalcannabis wird aufgrund ärztlicher Verschreibung über Apotheken abgegeben; eine Verschreibung ist nicht automatisch eine private Anbauerlaubnis. [MedCanG §§ 2–5](https://www.gesetze-im-internet.de/medcang/BJNR06D0C0024.html), [BfArM-Erlaubnisverfahren](https://www.bfarm.de/DE/Bundesopiumstelle/Medizinisches-Cannabis/Erlaubnis/_artikel.html)
- Die technische Ertragsprognose darf ohne künstliche Grammgrenze rechnen. Zulässiger Eigenanbau-Bestand, verschriebener Apothekenbestand und dokumentierte Vernichtung bleiben getrennte Konten. Eine geplante Vernichtung ist selbst keine Erlaubnis.
- Behauptete individuelle Werte wie eine Monatsabgabe oder ein höherer zulässiger Bestand werden erst aus einem aktuellen Originalbescheid übernommen. Eine ChatGPT-Share-Seite ist keine amtliche Genehmigung.

## Nur begrenzt übertragbar

- Höhere Lichtintensität erhöhte in einer kontrollierten Studie den Ertrag im untersuchten Bereich. Das beweist weder 625 PPFD als Optimum noch die direkte Übertragbarkeit auf Autoflower, 18 h oder diesen Genotyp. [Rodriguez-Morrison et al. 2021](https://doi.org/10.3389/fpls.2021.646020)
- NPK-Interaktionen und sinkendes Blatt-Mg bei höherem P/K wurden in einem vegetativen DWC-System gezeigt. Das ist keine universelle Coco-Dosierregel. [Kpai et al. 2024](https://doi.org/10.3389/fpls.2024.1501484)
- Mehr P erhöhte in kontrollierten Studien nicht zuverlässig Ertrag oder Cannabinoide und steigerte den Austrag. Genotyp- und Systemgrenzen bleiben. [Westmoreland & Bugbee 2022](https://doi.org/10.3389/fpls.2022.1015652), [Hershkowitz et al. 2025](https://doi.org/10.3389/fpls.2025.1433985)
- 18–21 °C und 50–55 % rF sind verbreitete Trocknungspraxis, kein universelles Optimum. `aw 0,55–0,65` ist ein sinnvoller Endpunktbereich, aber die Standardisierung ist unvollständig. [Postharvest Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9404914/), [Processing Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8290527/)

## Nicht als bewiesen behandeln

- Produktmarketing zu „explosiven Wurzeln“, Ertrags- oder Qualitätssteigerung.
- die Wirksamkeitsrangfolge einzelner Root-Stimulatoren ohne kontrollierte Vergleichsstudie.
- fixe Athena-, CalMag- oder pH-Down-Dosen ohne Wasseranalyse und Endmixmessung.
- universelle Drain-EC-Alarmgrenzen, PPFD-Optima oder VPD-Zielkorridore.
- Breederdauer und -höhe als Garantie.
- Seed-Run-Vergleiche als kausaler A/B-Nachweis.

## Deep-Research-Nachtrag

Die neue Research-Beilage wurde nicht ungeprüft übernommen. Vier operative Aussagen wurden verworfen: pauschale Lizenzpflicht für privaten Eigenanbau, feste RH-Optima, 212–283 mg N/L als allgemeines Cannabis-Ziel und 12/12 als Autoflower-Regel. Der vollständige Abgleich steht in `DEEP_RESEARCH_AUDIT_2026.md`; die maschinenlesbaren Importregeln stehen in `RULES_OF_EVIDENCE.md`.

Die maschinenlesbare Teilmenge liegt in `src/data/knowledge-base.json`. Alte Community- und Händlerquellen bleiben aus Paritätsgründen im Legacy-Blatt, werden aber nicht automatisch zu Evidenzklasse A hochgestuft.
