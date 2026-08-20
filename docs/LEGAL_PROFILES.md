# Rechtsprofile und Bestandskonten

Stand: 8. August 2026. Dieses Dokument beschreibt die Produktlogik, nicht eine individuelle Rechtsberatung.

## Warum drei getrennte Pfade nötig sind

1. **Privater Eigenanbau nach KCanG:** bis zu drei lebende Pflanzen je volljähriger Person am Wohnsitz oder gewöhnlichen Aufenthalt; für Konsumcannabis gelten die Besitz- und Schutzregeln des KCanG.
2. **Medizinalcannabis auf Verschreibung:** Medizinalcannabis ist gesetzlich ein Produkt aus staatlich kontrolliertem Anbau. Die Abgabe an Patientinnen und Patienten erfolgt aufgrund einer Verschreibung über eine Apotheke.
3. **Individuelle Erlaubnis nach § 4 MedCanG:** Eine Erlaubnis kann bestimmte Tätigkeiten, Betriebsstätten, Arten, Zeiträume und Umfänge autorisieren. Nur das Originaldokument bestimmt diesen Scope.

Eine Verschreibung, eine Kostenübernahme oder eine monatliche Apothekenmenge ist nicht automatisch eine private Anbauerlaubnis. Umgekehrt wird selbst angebautes Konsumcannabis nicht allein durch den Patientenstatus zu Medizinalcannabis.

Primärquellen: [KCanG § 3](https://www.gesetze-im-internet.de/kcang/__3.html), [KCanG § 9](https://www.gesetze-im-internet.de/kcang/__9.html), [MedCanG §§ 2–5](https://www.gesetze-im-internet.de/medcang/BJNR06D0C0024.html), [BfArM-Erlaubnisverfahren](https://www.bfarm.de/DE/Bundesopiumstelle/Medizinisches-Cannabis/Erlaubnis/_artikel.html), [BMG-FAQ zum Cannabisgesetz](https://www.bundesgesundheitsministerium.de/themen/cannabis/faq-cannabisgesetz/seite).

## Produktentscheidung

Der Plan berechnet die **technische Brutto-Ertragskapazität ohne künstliche Grammobergrenze**. Rechtliche Grenzen werden nicht in die Biologie- oder Kapazitätsformel eingebaut, sondern in einem separaten Bestands- und Tätigkeits-Gate geprüft.

Getrennte Konten:

- prognostizierter Bruttoertrag;
- trockener Eigenanbau-Bestand;
- rechtmäßig aus der Apotheke erworbener Medizinalbestand;
- zur Vernichtung ausgesonderte Menge;
- tatsächlich vernichtete Menge mit Datum und Nachweis;
- erlaubte Tätigkeiten laut aktuell geprüfter Rechtsgrundlage.

Wichtig: Eine geplante spätere Vernichtung legalisiert keinen zwischenzeitlichen unzulässigen Besitz. Das Gate prüft jeden Übergang — Ernte, Trocknung, Einlagerung, Entnahme und Vernichtung — gegen die aktuell verifizierte Rechtsgrundlage.

## Individuelle Werte

Vom Nutzer genannte Werte wie Monatsabgabe oder zulässiger Bestand werden erst nach Sichtprüfung des Originalbescheids als `documentVerified: true` übernommen. Eine ChatGPT-Share-Seite ist Kontext, aber keine amtliche Genehmigung und keine Primärquelle.

Persönliche Gesundheits-, Rezept- und Genehmigungsdaten werden nicht in Git oder Local Storage gespeichert. Das Repository enthält nur:

- `src/data/legal-profile.schema.json` als Schema;
- `src/data/legal-profile.example.json` mit neutralen Platzhaltern;
- eine `.gitignore`-Regel für lokale Profildateien.

## Fail-closed-Regeln

- Ohne geprüftes Dokument gelten nur die allgemeinen, aktuellen gesetzlichen Pfade.
- Eine Erlaubnis autorisiert ausschließlich die ausdrücklich genannten Tätigkeiten.
- Abgelaufene oder nicht datierte Dokumente liefern keine aktive Freigabe.
- Mengen verschiedener Rechtsgrundlagen werden nicht still addiert.
- Rechtstexte werden vor jedem Release und vor bestandsrelevanten Vorgängen erneut geprüft.
