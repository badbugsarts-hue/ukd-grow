# Rules of Evidence

## Claim-Typ vor Quellenrang

- Recht: amtliche Normfassung.
- Produktdosis, Mischfolge, Freigabe: aktuelle Herstellerdokumentation.
- biologische Wirkung oder Optimum: Primärforschung und geeignete Reviews.
- UKD-Prozessregel: als Engineering-Inferenz oder Heuristik kennzeichnen.
- Community: nur zur Entdeckung möglicher Fehlermuster, niemals als kanonische Dosis- oder Rechtsquelle.

Eine Herstellerquelle ist für ihr Label primär, aber nicht automatisch unabhängige Wirksamkeitsevidenz.

## Pflichtfelder pro Claim

`id`, `statement`, `status`, `evidence`, `scope`, `uncertainty`, `sourceIds`, `checkedAt` sowie bei Studien Population, System, Intervention, Vergleich und Ergebnis.

## Importzustände

1. `UNTRUSTED`: Research-Synthese oder neuer Link.
2. `EXTRACTED`: atomarer Claim mit Quelle.
3. `SCOPED`: Population/System/Grenzen dokumentiert.
4. `CONFLICTED`: abweichende Quellen sichtbar verknüpft.
5. `VERIFIED_WITH_BOUNDARY`: im untersuchten Rahmen bestätigt.
6. `OPERATIONAL`: nur wenn die Evidenz genau diesen Einsatz autorisiert.

## Fail-closed

- Unbekannte Wasserchemie erzeugt keine Athena-/CalMag-Dosis.
- Eine Kontrollgruppe wird nicht zu einem „Optimum“ umbenannt.
- Studienwerte werden nicht zwischen Cultivaren, Medien oder Photoperiodtypen übertragen, ohne dies als Inferenz zu kennzeichnen.
- Konflikte werden nicht gemittelt.
- Ein Nutzereingabewert befördert sich nicht selbst zu Evidenz.
- Veraltete Rechts- oder Herstellerclaims blockieren beim Release bis zur erneuten Prüfung.
