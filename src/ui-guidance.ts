export interface FieldGuidance {
  concept: string;
  explanation: string;
  measurement: string;
  recommendation: string;
  uncertainty: string;
  sourceIds: string[];
}

const FIELD_GUIDANCE: Record<string, FieldGuidance> = {
  "Ausgangs-pH": {
    concept: "pH",
    explanation: "Gemessener pH des unveränderten Ausgangswassers.",
    measurement: "Mit frisch kalibriertem pH-Meter vor Zusätzen messen.",
    recommendation:
      "Fehlt der Wert, zuerst messen; UKD erfindet keine Korrekturdosis.",
    uncertainty:
      "Messgerät, Temperatur und Kalibrierung bestimmen die Unsicherheit.",
    sourceIds: ["hesi-coco"],
  },
  "Ausgangs-EC": {
    concept: "EC",
    explanation: "Elektrische Leitfähigkeit des Ausgangswassers.",
    measurement: "Mit geprüftem EC-Meter und dokumentierter Temperatur messen.",
    recommendation: "Fehlt der Wert, zuerst messen.",
    uncertainty: "Geräteauflösung und Kalibrierstatus beachten.",
    sourceIds: ["hesi-coco"],
  },
  Calcium: {
    concept: "EC",
    explanation: "Calciumgehalt der Wasseranalyse in mg/L.",
    measurement:
      "Versorgeranalyse oder geeignete Laboranalyse mit Datum erfassen.",
    recommendation:
      "Unbekannt lassen und Analyse beschaffen; keine CalMag-Dosis raten.",
    uncertainty: "Versorgerwerte können zeitlich schwanken.",
    sourceIds: ["athena-balance-rate"],
  },
  Magnesium: {
    concept: "EC",
    explanation: "Magnesiumgehalt der Wasseranalyse in mg/L.",
    measurement: "Versorgeranalyse oder Laboranalyse mit Datum erfassen.",
    recommendation: "Unbekannt lassen und Analyse beschaffen.",
    uncertainty: "Zeitpunkt und Probenquelle dokumentieren.",
    sourceIds: ["athena-balance-rate"],
  },
  "HCO₃ / Alkalinität": {
    concept: "pH",
    explanation: "Pufferkapazität des Ausgangswassers.",
    measurement: "Wasseranalyse mit Methode, Einheit und Datum übernehmen.",
    recommendation:
      "Vor chemieabhängigen Entscheidungen messen bzw. Analyse beschaffen.",
    uncertainty:
      "HCO₃ und Alkalinität nicht ohne Einheitenprüfung gleichsetzen.",
    sourceIds: ["athena-balance-rate"],
  },
  Photoperiode: {
    concept: "DLI",
    explanation:
      "Tägliche Beleuchtungsdauer; sie wirkt zusammen mit PPFD auf DLI.",
    measurement: "Timer- und reale Einschaltzeit prüfen.",
    recommendation:
      "Den validierten Run-Preset verwenden und erst mit Messbasis ändern.",
    uncertainty:
      "Genetik, Phase und reale PPFD-Verteilung begrenzen die Übertragbarkeit.",
    sourceIds: ["autoflower-prr-2024"],
  },
  "LED Maximum": {
    concept: "PPFD",
    explanation:
      "Elektrische Obergrenze der Lampe, nicht die Lichtmenge am Blätterdach.",
    measurement: "Reale Leistung und 9-Punkt-PPFD-Karte dokumentieren.",
    recommendation:
      "PPFD-Mapping hat Vorrang vor Watt- oder Abstandsschätzung.",
    uncertainty:
      "Fixture, Abstand, Reflexion und Messgerät beeinflussen das Ergebnis.",
    sourceIds: ["rodriguez-morrison-2021"],
  },
  "Durchbruch / Emergence": {
    concept: "BT",
    explanation:
      "Bestätigt den sichtbaren Durchbruch je einzelner Pflanze; Run Day und Plant Day bleiben getrennte Uhren.",
    measurement:
      "Datum/Uhrzeit je Plant ID beobachten und als bestätigtes Ereignis speichern.",
    recommendation:
      "Nicht aus einer Breeder-Zeitangabe oder dem Aussaatdatum schätzen.",
    uncertainty:
      "Ein später bestätigtes Ereignis kann append-only korrigiert werden.",
    sourceIds: ["autoflower-prr-2024"],
  },
  "Nährstoffaufnahme bereit": {
    concept: "EC",
    explanation:
      "Fachliches Gate für den Wechsel von Saatreserve/Propagation zu einem Basisfeed.",
    measurement:
      "Keimblattzustand, echte Blätter, Wurzelentwicklung und Medium gemeinsam prüfen.",
    recommendation:
      "Fehlt die Bestätigung, Basisdünger nicht nur wegen des Kalendertags freigeben.",
    uncertainty:
      "First true leaves sind nur ein beobachtbarer Proxy und nicht identisch mit erschöpften Keimblattreserven.",
    sourceIds: ["hesi-tnt"],
  },
  "Root-Zone-Stufe": {
    concept: "EC",
    explanation:
      "Unterscheidet Eazy Plug, Eazy Block und finales Coco je Pflanze.",
    measurement: "Umtopfereignis und sichtbare Durchwurzelung dokumentieren.",
    recommendation:
      "Root-State vor pH-Arbeitswert, Bewässerung und Shared-Batch entscheiden lassen.",
    uncertainty:
      "Kalenderwochen sind nur Vorschau; die reale Durchwurzelung kann abweichen.",
    sourceIds: ["eazy-workbook-2023"],
  },
  FlowerInitiation: {
    concept: "BT",
    explanation:
      "Bestätigtes pflanzenbezogenes Ereignis, das den Bloom Day und den Coco-/Bloom-Pfad startet.",
    measurement:
      "Vorblüte und tatsächlichen Blütenbeginn nicht vermischen; pro Plant ID dokumentieren.",
    recommendation:
      "Ohne bestätigtes Ereignis keinen kalenderbasierten PK- oder Bloom-Wechsel ausführen.",
    uncertainty:
      "Cultivar und Phänotyp können innerhalb desselben Zelts deutlich auseinanderliegen.",
    sourceIds: ["babaei-2026", "autoflower-prr-2024"],
  },
  "Realer Gießbedarf": {
    concept: "Drain-EC",
    explanation:
      "Entscheidet, ob eine grundsätzlich eligible Mischung heute überhaupt angewendet wird.",
    measurement:
      "Topfmasse vor/nach Bewässerung, Zeit, Feuchteklasse, appliziertes Volumen und Diagnose-Drain gemeinsam loggen.",
    recommendation:
      "Ohne reales Gießereignis nichts allein wegen eines positiven Kalenderwerts mischen.",
    uncertainty:
      "Ein universeller Dryback-Prozentsatz ist ohne Topf-/Medium-Baseline nicht belastbar.",
    sourceIds: [],
  },
  "Endmix-pH": {
    concept: "pH",
    explanation:
      "pH des vollständig gemischten und homogenisierten Batches, nicht des Rohwassers.",
    measurement:
      "Mit kalibriertem Meter nach vollständigem Mix und dokumentierter Wartezeit messen.",
    recommendation:
      "Im Referenzband nichts ändern; außerhalb nur per produkt- und wasserspezifischem Testbatch titrieren.",
    uncertainty:
      "Alkalinität, Produktkonzentration, Temperatur und Stabilisierung bestimmen die Reaktion.",
    sourceIds: ["hesi-coco", "athena-balance-rate"],
  },
};

export const GLOBAL_ACTION_REGISTRY = {
  "live.start": {
    label: "Live starten",
    concept: "Run",
    help: "Kloniert eine Simulation ohne simulierte Historie und setzt die bestätigte Aussaat als UTC-Anker.",
  },
  "day.today": {
    label: "Heute",
    concept: "Run",
    help: "Kehrt zum automatisch berechneten Live-Tag zurück, ohne den Run-Zustand zu verändern.",
  },
  "log.quick": {
    label: "Quick Log",
    concept: "Messwert",
    help: "Öffnet die globale Ist-Erfassung. Bei blockierter Live-Uhr ist die Aktion gesperrt.",
  },
  "backup.now": {
    label: "Sofortbackup",
    concept: "Provenienz",
    help: "Erzeugt einen verschlüsselten, manifestierten und per Readback verifizierten Workspace-Checkpoint.",
  },
  "ai.export": {
    label: "Für AI exportieren",
    concept: "Evidenz",
    help: "Exportiert den fachlichen Zustand datenschutzbereinigt; AI darf nur einzeln prüfbare Vorschläge zurückgeben.",
  },
  "ai.import": {
    label: "AI-Rückgabe prüfen",
    concept: "Evidenz",
    help: "Quarantäne, Schema-/Hash-/Safety-Prüfung und Einzelentscheidung vor jedem Command.",
  },
} as const;

export type GlobalActionId = keyof typeof GLOBAL_ACTION_REGISTRY;

export interface ActionAvailability {
  enabled: boolean;
  reason?: string;
}

export interface GlobalActionContext {
  executionMode: "simulation" | "live";
  clockBlocked: boolean;
}

export interface GlobalAction {
  id: GlobalActionId;
  label: string;
  conceptId: string;
  help: string;
  availability: ActionAvailability;
  execute: () => void | Promise<void>;
}

export function createGlobalActionRegistry(
  context: GlobalActionContext,
  handlers: Record<GlobalActionId, () => void | Promise<void>>,
): Record<GlobalActionId, GlobalAction> {
  return Object.fromEntries(
    (
      Object.entries(GLOBAL_ACTION_REGISTRY) as [
        GlobalActionId,
        (typeof GLOBAL_ACTION_REGISTRY)[GlobalActionId],
      ][]
    ).map(([id, definition]) => {
      const availability: ActionAvailability =
        id === "live.start" && context.executionMode !== "simulation"
          ? {
              enabled: false,
              reason: "Nur Simulationen können als Live-Run gestartet werden.",
            }
          : id === "log.quick" && context.clockBlocked
            ? {
                enabled: false,
                reason: "Die Live-Uhr muss zuerst geprüft werden.",
              }
            : { enabled: true };
      return [
        id,
        {
          id,
          label: definition.label,
          conceptId: definition.concept,
          help: definition.help,
          availability,
          execute: handlers[id],
        },
      ];
    }),
  ) as Record<GlobalActionId, GlobalAction>;
}

export function getFieldGuidance(
  label: string,
  unit?: string,
  min?: number,
  max?: number,
): FieldGuidance {
  return (
    FIELD_GUIDANCE[label] ?? {
      concept: "Evidenz",
      explanation: `${label} ist ein versioniertes Setup- oder Messfeld${unit ? ` in ${unit}` : ""}.`,
      measurement:
        "Quelle, Zeitpunkt und tatsächlichen Wert dokumentieren; Soll und Ist nicht vermischen.",
      recommendation:
        "Validierten Presetwert übernehmen oder bei fehlender Messbasis ausdrücklich unbekannt lassen.",
      uncertainty: `${min !== undefined || max !== undefined ? `Zulässiger Eingabebereich ${min ?? "offen"} bis ${max ?? "offen"}. ` : ""}Eine Eingabe ist keine automatische fachliche Freigabe.`,
      sourceIds: [],
    }
  );
}

export function fieldGuidanceText(
  label: string,
  unit?: string,
  min?: number,
  max?: number,
): string {
  const item = getFieldGuidance(label, unit, min, max);
  return `${item.explanation} Messung: ${item.measurement} Beste Option: ${item.recommendation} Unsicherheit: ${item.uncertainty}${item.sourceIds.length ? ` Quellen: ${item.sourceIds.join(", ")}.` : ""}`;
}
