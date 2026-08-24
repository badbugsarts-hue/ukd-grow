import { useEffect, useMemo, useState } from "react";
import cockpitDataRaw from "../../data/autoflower-cockpit.json";
import type {
  AutoflowerStrain,
  CultivarKind,
  CultivarType,
  ExperienceLens,
  ExperienceLevel,
  PlantProvenance,
  RouteId,
} from "../../types";

const cockpitData = cockpitDataRaw as unknown as AutoflowerStrain[];

export interface AutoflowerCockpitPanelProps {
  navigate?: (route: RouteId) => void;
  lens?: ExperienceLens;
  onSelectStrain?: (strain: AutoflowerStrain) => void;
  selectedStrainIds?: string[];
  isModal?: boolean;
}

export type ViewMode = "cards" | "list";
export type SortOption = "rank" | "yield" | "height" | "name" | "thc" | "score";

function extractThcNumeric(thcStr: string): number {
  if (!thcStr) return 0;
  const match = thcStr.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (match?.[1]) {
    return Number.parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

export function AutoflowerCockpitPanel({
  navigate: _navigate,
  lens: _lens = "guided",
  onSelectStrain,
  selectedStrainIds = [],
  isModal = false,
}: AutoflowerCockpitPanelProps) {
  // Filter State
  const [activeKindTab, setActiveKindTab] = useState<"all" | CultivarKind>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBreeder, setSelectedBreeder] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<Set<CultivarType>>(
    new Set(),
  );
  const [selectedProv, setSelectedProv] = useState<Set<PlantProvenance>>(
    new Set(),
  );
  const [selectedLevels, setSelectedLevels] = useState<Set<ExperienceLevel>>(
    new Set(),
  );
  const [selectedMold, setSelectedMold] = useState<Set<string>>(new Set());
  const [selectedFeed, setSelectedFeed] = useState<Set<string>>(new Set());
  const [maxHeight, setMaxHeight] = useState<number>(200);
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Active selected strain for drawer detail view
  const [drawerStrain, setDrawerStrain] = useState<AutoflowerStrain | null>(
    null,
  );

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawerStrain) {
          setDrawerStrain(null);
          e.stopPropagation();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerStrain]);

  // Unique list of breeders & shops for filter dropdowns
  const uniqueBreeders = useMemo(() => {
    const set = new Set<string>();
    for (const s of cockpitData) {
      if (s.breeder) set.add(s.breeder);
    }
    return Array.from(set).sort();
  }, []);

  const uniqueShops = useMemo(() => {
    const set = new Set<string>();
    for (const s of cockpitData) {
      if (s.shop) set.add(s.shop);
    }
    return Array.from(set).sort();
  }, []);

  // Filter toggle helper
  const toggleSetItem = <T,>(
    set: Set<T>,
    setter: (s: Set<T>) => void,
    item: T,
  ) => {
    const next = new Set(set);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setter(next);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setActiveKindTab("all");
    setSearchQuery("");
    setSelectedBreeder("");
    setSelectedShop("");
    setSelectedTypes(new Set());
    setSelectedProv(new Set());
    setSelectedLevels(new Set());
    setSelectedMold(new Set());
    setSelectedFeed(new Set());
    setMaxHeight(200);
    setSortBy("rank");
  };

  // Filter & Sort computation
  const filteredStrains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = cockpitData.filter((strain) => {
      // Tab kind filter
      if (activeKindTab !== "all" && strain.kind !== activeKindTab) {
        return false;
      }

      // Fulltext search across 9+ attributes
      if (q) {
        const combinedText = [
          strain.name,
          strain.breeder,
          strain.shop,
          strain.cross,
          strain.gen,
          strain.terpene,
          strain.geschmack,
          strain.geruch,
          strain.wirkung,
          strain.ester,
          strain.urteil,
          strain.thc,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!combinedText.includes(q)) {
          return false;
        }
      }

      // Breeder filter
      if (selectedBreeder && strain.breeder !== selectedBreeder) {
        return false;
      }

      // Shop filter
      if (selectedShop && strain.shop !== selectedShop) {
        return false;
      }

      // Cultivar type filter
      if (selectedTypes.size > 0 && !selectedTypes.has(strain.typ)) {
        return false;
      }

      // Provenance filter
      if (selectedProv.size > 0 && !selectedProv.has(strain.prov)) {
        return false;
      }

      // Level filter
      if (
        selectedLevels.size > 0 &&
        !selectedLevels.has(strain.level as ExperienceLevel)
      ) {
        return false;
      }

      // Mold filter
      if (selectedMold.size > 0) {
        const matchesMold = Array.from(selectedMold).some((m) =>
          strain.mold.toLowerCase().includes(m.toLowerCase()),
        );
        if (!matchesMold) return false;
      }

      // Feed filter
      if (selectedFeed.size > 0) {
        const matchesFeed = Array.from(selectedFeed).some((f) =>
          strain.feed.toLowerCase().includes(f.toLowerCase()),
        );
        if (!matchesFeed) return false;
      }

      // Height filter (only apply if slider is below max 200 cm)
      if (maxHeight < 200) {
        if (strain.hmax === null || strain.hmax > maxHeight) {
          return false;
        }
      }

      return true;
    });

    // Sort logic
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "rank":
          if (b.score !== a.score) return b.score - a.score;
          return a.rank - b.rank;
        case "yield": {
          const avgYieldA = (a.ertrag_lo + a.ertrag_hi) / 2;
          const avgYieldB = (b.ertrag_lo + b.ertrag_hi) / 2;
          return avgYieldB - avgYieldA;
        }
        case "height": {
          const hA = a.hmax ?? 999;
          const hB = b.hmax ?? 999;
          return hA - hB;
        }
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "thc": {
          const thcA = extractThcNumeric(a.thc);
          const thcB = extractThcNumeric(b.thc);
          return thcB - thcA;
        }
        case "score":
          return b.score - a.score;
        default:
          return a.rank - b.rank;
      }
    });
  }, [
    activeKindTab,
    searchQuery,
    selectedBreeder,
    selectedShop,
    selectedTypes,
    selectedProv,
    selectedLevels,
    selectedMold,
    selectedFeed,
    maxHeight,
    sortBy,
  ]);

  // KPI computations for header
  const kpis = useMemo(() => {
    const total = filteredStrains.length;
    const originalCount = filteredStrains.filter(
      (s) => s.prov === "original",
    ).length;
    const whiteLabelCount = filteredStrains.filter(
      (s) => s.prov === "whitelabel" || s.prov === "unklar",
    ).length;
    return { total, originalCount, whiteLabelCount };
  }, [filteredStrains]);

  const MAXY = 130;

  return (
    <div
      className="autoflower-cockpit-root page-stack"
      style={{ gap: "var(--space-md)" }}
    >
      {/* ── 1. Header & Photobiology Scientific Banner ──────────────── */}
      <section
        className="autoflower-header-banner"
        style={{
          background:
            "linear-gradient(135deg, var(--surface-0), var(--surface-1))",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "auto 0 0 0",
            height: "2px",
            background:
              "linear-gradient(90deg, var(--blue), var(--red) 65%, transparent)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                color: "var(--green)",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Bibliothek <span>›</span> Autoflower & Genetics Cockpit
            </div>
            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: "clamp(22px, 3.2vw, 32px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              Was in <em>0,36 m²</em> unter 140 Watt wirklich passt
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-2)",
                fontSize: "14px",
                maxWidth: "65ch",
                lineHeight: 1.4,
              }}
            >
              Masterclass-Datenbasis aus 61 verifizierten Sorten & Phänotypen
              für das 60×60×180 cm Zelt. Wissenschaftliche DLI-Ertragsprognose,
              Terpenchemie & Agronomiemodelle.
            </p>
          </div>

          {/* View switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "3px",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
              aria-label="Kartenansicht"
              style={{
                background:
                  viewMode === "cards" ? "var(--surface-0)" : "transparent",
                color: viewMode === "cards" ? "var(--green)" : "var(--muted)",
                border:
                  viewMode === "cards"
                    ? "1px solid var(--line-strong)"
                    : "none",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minHeight: "44px",
              }}
            >
              <span>⊞</span> Raster
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="Listenansicht"
              style={{
                background:
                  viewMode === "list" ? "var(--surface-0)" : "transparent",
                color: viewMode === "list" ? "var(--green)" : "var(--muted)",
                border:
                  viewMode === "list" ? "1px solid var(--line-strong)" : "none",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minHeight: "44px",
              }}
            >
              <span>☰</span> Achse
            </button>
          </div>
        </div>

        {/* Photobiology Equation & KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            alignItems: "stretch",
          }}
        >
          {/* Equation box */}
          <div
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--line)",
              borderLeft: "4px solid var(--red)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "var(--text)", fontWeight: 600 }}>
              E<sub>gesamt</sub> = 140 W ×{" "}
              <span style={{ color: "var(--green)" }}>0,45–0,90 g/W</span> × q
            </div>
            <small
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-ui)",
                fontSize: "11px",
                marginTop: "4px",
                display: "block",
              }}
            >
              Ertrag ist licht- und flächenlimitiert, nicht
              pflanzenzahlskaliert.
            </small>
          </div>

          {/* KPI 1: Active Strains */}
          <div
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                color: "var(--muted)",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              Treffer / Gesamt
            </span>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              {kpis.total}{" "}
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                / {cockpitData.length}
              </span>
            </div>
          </div>

          {/* KPI 2: Original Genetics */}
          <div
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                color: "var(--muted)",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              Originalgenetik
            </span>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--green)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              {kpis.originalCount}{" "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Breeder-Linien
              </span>
            </div>
          </div>

          {/* KPI 3: White Label / Unklar */}
          <div
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                color: "var(--muted)",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              White Label / Unklar
            </span>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--amber)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              {kpis.whiteLabelCount}{" "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Reseller-Lots
              </span>
            </div>
          </div>

          {/* KPI 4: 140W Base Band */}
          <div
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                color: "var(--muted)",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              140 W LED Basisband
            </span>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--blue)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              63–126 g{" "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                / Zelt
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Main Workspace: Sidebar Filter Aside + Content Grid ───── */}
      <div
        className="autoflower-workspace-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 280px) 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ── Sidebar Filters ────────────────────────────── */}
        <aside
          className="autoflower-filter-aside"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Category Tabs: All / Jungpflanzen / Saatgut */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Kategorie
            </div>
            <div
              style={{
                display: "flex",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "3px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveKindTab("all")}
                aria-pressed={activeKindTab === "all"}
                style={{
                  flex: 1,
                  background:
                    activeKindTab === "all"
                      ? "var(--surface-0)"
                      : "transparent",
                  color:
                    activeKindTab === "all" ? "var(--text)" : "var(--muted)",
                  border:
                    activeKindTab === "all"
                      ? "1px solid var(--line-strong)"
                      : "none",
                  borderRadius: "4px",
                  padding: "8px 4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                Alle
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color:
                      activeKindTab === "all" ? "var(--green)" : "var(--muted)",
                    marginTop: "2px",
                  }}
                >
                  61
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveKindTab("jungpflanze")}
                aria-pressed={activeKindTab === "jungpflanze"}
                style={{
                  flex: 1.2,
                  background:
                    activeKindTab === "jungpflanze"
                      ? "var(--surface-0)"
                      : "transparent",
                  color:
                    activeKindTab === "jungpflanze"
                      ? "var(--text)"
                      : "var(--muted)",
                  border:
                    activeKindTab === "jungpflanze"
                      ? "1px solid var(--line-strong)"
                      : "none",
                  borderRadius: "4px",
                  padding: "8px 4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                Jungpflanze
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color:
                      activeKindTab === "jungpflanze"
                        ? "var(--green)"
                        : "var(--muted)",
                    marginTop: "2px",
                  }}
                >
                  Top 50
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveKindTab("samen")}
                aria-pressed={activeKindTab === "samen"}
                style={{
                  flex: 1,
                  background:
                    activeKindTab === "samen"
                      ? "var(--surface-0)"
                      : "transparent",
                  color:
                    activeKindTab === "samen" ? "var(--text)" : "var(--muted)",
                  border:
                    activeKindTab === "samen"
                      ? "1px solid var(--line-strong)"
                      : "none",
                  borderRadius: "4px",
                  padding: "8px 4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                Saatgut
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color:
                      activeKindTab === "samen"
                        ? "var(--green)"
                        : "var(--muted)",
                    marginTop: "2px",
                  }}
                >
                  Top 11
                </span>
              </button>
            </div>
          </div>

          {/* Fulltext Search */}
          <div>
            <label
              htmlFor="cockpit-search-input"
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Suche
            </label>
            <input
              id="cockpit-search-input"
              type="search"
              placeholder="Name, Breeder, Terpen, Wirkung…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                color: "var(--text)",
                fontSize: "13px",
                minHeight: "44px",
              }}
            />
          </div>

          {/* Cultivar Type Facet */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Typ
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(
                [
                  "Autoflower",
                  "Photoperiodisch",
                  "Fast Version",
                ] as CultivarType[]
              ).map((typ) => {
                const active = selectedTypes.has(typ);
                return (
                  <button
                    key={typ}
                    type="button"
                    onClick={() =>
                      toggleSetItem(selectedTypes, setSelectedTypes, typ)
                    }
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: active
                        ? "1px solid var(--green)"
                        : "1px solid var(--line)",
                      color: active ? "var(--green)" : "var(--text-2)",
                      padding: "8px 12px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {typ}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provenance Facet */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Provenienz
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                {
                  id: "original" as PlantProvenance,
                  label: "Original",
                  color: "var(--green)",
                },
                {
                  id: "whitelabel" as PlantProvenance,
                  label: "White Label",
                  color: "var(--amber)",
                },
                {
                  id: "unklar" as PlantProvenance,
                  label: "Unklar",
                  color: "var(--red)",
                },
              ].map((p) => {
                const active = selectedProv.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      toggleSetItem(selectedProv, setSelectedProv, p.id)
                    }
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: active
                        ? `1px solid ${p.color}`
                        : "1px solid var(--line)",
                      color: active ? p.color : "var(--text-2)",
                      padding: "8px 12px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: active ? 600 : 400,
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: p.color,
                      }}
                    />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience Level Facet */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Erfahrungsniveau
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(
                ["Anfänger", "Fortgeschritten", "Profi"] as ExperienceLevel[]
              ).map((lvl) => {
                const active = selectedLevels.has(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      toggleSetItem(selectedLevels, setSelectedLevels, lvl)
                    }
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: active
                        ? "1px solid var(--green)"
                        : "1px solid var(--line)",
                      color: active ? "var(--green)" : "var(--text-2)",
                      padding: "8px 12px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mold Resistance Filter */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Schimmelresistenz [C]
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "gut", label: "Gut / Sehr gut" },
                { id: "mittel", label: "Mittel" },
                { id: "gering", label: "Erhöhtes Risiko" },
              ].map((m) => {
                const active = selectedMold.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      toggleSetItem(selectedMold, setSelectedMold, m.id)
                    }
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: active
                        ? "1px solid var(--blue)"
                        : "1px solid var(--line)",
                      color: active ? "var(--blue)" : "var(--text-2)",
                      padding: "8px 12px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feed Tolerance Filter */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Düngetoleranz [C]
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "gering", label: "Sensibel" },
                { id: "mittel", label: "Mittel" },
                { id: "hoch", label: "Hoch" },
              ].map((f) => {
                const active = selectedFeed.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      toggleSetItem(selectedFeed, setSelectedFeed, f.id)
                    }
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: active
                        ? "1px solid var(--purple)"
                        : "1px solid var(--line)",
                      color: active ? "var(--purple)" : "var(--text-2)",
                      padding: "8px 12px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Breeder Dropdown */}
          <div>
            <label
              htmlFor="cockpit-breeder-select"
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Züchter / Seedbank
            </label>
            <select
              id="cockpit-breeder-select"
              value={selectedBreeder}
              onChange={(e) => setSelectedBreeder(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: "13px",
                minHeight: "44px",
              }}
            >
              <option value="">Alle Züchter ({uniqueBreeders.length})</option>
              {uniqueBreeders.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Shop Dropdown */}
          <div>
            <label
              htmlFor="cockpit-shop-select"
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Bezugsquelle / Shop
            </label>
            <select
              id="cockpit-shop-select"
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: "13px",
                minHeight: "44px",
              }}
            >
              <option value="">Alle Quellen ({uniqueShops.length})</option>
              {uniqueShops.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Canopy Max Height Slider */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              <span>Max. Endhöhe</span>
              <span
                style={{
                  color: "var(--green)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {maxHeight >= 200 ? "200+ cm (Alle)" : `≤ ${maxHeight} cm`}
              </span>
            </div>
            <input
              type="range"
              min="70"
              max="200"
              step="5"
              value={maxHeight}
              onChange={(e) => setMaxHeight(Number(e.target.value))}
              aria-label="Maximale Endhöhe in Zentimetern"
              style={{ width: "100%", accentColor: "var(--green)" }}
            />
          </div>

          {/* Sorting Dropdown */}
          <div>
            <label
              htmlFor="cockpit-sort-select"
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Sortierung
            </label>
            <select
              id="cockpit-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: "13px",
                minHeight: "44px",
              }}
            >
              <option value="rank">Masterclass Score (Rang)</option>
              <option value="yield">Ertragspotenzial (g trocken)</option>
              <option value="thc">THC / Potenz absteigend</option>
              <option value="height">Endhöhe aufsteigend</option>
              <option value="name">Sortenname A–Z</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px dashed var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              padding: "10px",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              minHeight: "44px",
            }}
          >
            ↻ Filter zurücksetzen
          </button>
        </aside>

        {/* ── Main Content Area ─────────────────────────── */}
        <section aria-label="Sortenkatalog" style={{ minWidth: 0 }}>
          {/* Result Counter & Active Filter Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              fontSize: "12px",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div>
              {filteredStrains.length}{" "}
              {filteredStrains.length === 1
                ? "Sorte gefunden"
                : "Sorten gefunden"}
            </div>
          </div>

          {/* Empty State */}
          {filteredStrains.length === 0 ? (
            <div
              style={{
                background: "var(--surface-0)",
                border: "1px dashed var(--line-strong)",
                borderRadius: "var(--radius)",
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
              <h3
                style={{
                  margin: "0 0 8px 0",
                  color: "var(--text)",
                  fontSize: "18px",
                }}
              >
                Keine Treffer für die aktuelle Filterkombination
              </h3>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  maxWidth: "48ch",
                  marginInline: "auto",
                }}
              >
                Die gewählten Kriterien schließen alle Einträge aus. Bitte
                Höhengrenze anheben, Suchbegriff anpassen oder Filter
                zurücksetzen.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  color: "var(--green)",
                  padding: "8px 18px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: "44px",
                }}
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : viewMode === "cards" ? (
            /* ── CARD GRID VIEW ──────────────────────────────── */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredStrains.map((strain) => {
                const isSelected =
                  selectedStrainIds.includes(strain.id) ||
                  selectedStrainIds.includes(strain.name);
                const provColor =
                  strain.prov === "original"
                    ? "var(--green)"
                    : strain.prov === "whitelabel"
                      ? "var(--amber)"
                      : "var(--red)";

                const leftPercent = Math.max(
                  0,
                  Math.min(100, (strain.ertrag_lo / MAXY) * 100),
                );
                const widthPercent = Math.max(
                  3,
                  Math.min(
                    100 - leftPercent,
                    ((strain.ertrag_hi - strain.ertrag_lo) / MAXY) * 100,
                  ),
                );

                return (
                  <article
                    key={strain.id}
                    style={{
                      background: "var(--surface-0)",
                      border: isSelected
                        ? "2px solid var(--green)"
                        : "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      transition: "border-color 0.15s, transform 0.15s",
                      boxShadow: isSelected
                        ? "0 0 16px rgba(103, 214, 174, 0.15)"
                        : "none",
                    }}
                  >
                    {/* Card Header Bar */}
                    <div
                      style={{
                        background: "var(--surface-1)",
                        borderBottom: "1px solid var(--line)",
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            background: "var(--surface-2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid var(--line)",
                          }}
                        >
                          #{String(strain.rank).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: provColor,
                            textTransform: "uppercase",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: provColor,
                            }}
                          />
                          {strain.prov}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: "var(--green)",
                            background: "rgba(103, 214, 174, 0.12)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          Score {strain.score}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div
                      style={{
                        padding: "16px 14px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "var(--text)",
                            lineHeight: 1.3,
                          }}
                        >
                          {strain.name}
                        </h3>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <span>{strain.breeder}</span>
                          <span>•</span>
                          <span style={{ color: "var(--text-2)" }}>
                            {strain.typ}
                          </span>
                          <span>•</span>
                          <span
                            style={{
                              color:
                                strain.kind === "samen"
                                  ? "var(--blue)"
                                  : "var(--green)",
                            }}
                          >
                            {strain.kind === "samen"
                              ? "Saatgut"
                              : "Jungpflanze"}
                          </span>
                        </div>
                      </div>

                      {/* Cannabinoid & Potency pill summary */}
                      <div
                        style={{
                          background: "var(--surface-1)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 10px",
                          fontSize: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{ color: "var(--muted)", fontSize: "11px" }}
                          >
                            Potenz & Chemotyp:
                          </span>
                          <strong
                            style={{
                              color: "var(--text)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {strain.thc.slice(0, 24)}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-2)",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>CBD: {strain.cbd.slice(0, 16)}</span>
                          <span>q = {strain.q}</span>
                        </div>
                      </div>

                      {/* Yield Range Uncertainty Bar */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "11px",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--muted)",
                              textTransform: "uppercase",
                            }}
                          >
                            Ertrag 140W LED (Zelt)
                          </span>
                          <strong
                            style={{
                              color: "var(--text)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {strain.ertrag_lo}–{strain.ertrag_hi} g
                          </strong>
                        </div>
                        <div
                          style={{
                            position: "relative",
                            height: "10px",
                            background: "var(--surface-2)",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              top: 0,
                              bottom: 0,
                              background:
                                "linear-gradient(90deg, var(--blue), var(--red))",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                      </div>

                      {/* Key agronomic traits matrix */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "6px",
                          fontSize: "11px",
                          background: "var(--surface-1)",
                          padding: "8px",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <div>
                          <span
                            style={{ color: "var(--muted)", display: "block" }}
                          >
                            Dauer:
                          </span>
                          <span
                            style={{ color: "var(--text)", fontWeight: 600 }}
                          >
                            {strain.zeit.slice(0, 22)}
                          </span>
                        </div>
                        <div>
                          <span
                            style={{ color: "var(--muted)", display: "block" }}
                          >
                            Höhe:
                          </span>
                          <span
                            style={{ color: "var(--text)", fontWeight: 600 }}
                          >
                            {strain.hmax
                              ? `${strain.hmin ?? "?"}–${strain.hmax} cm`
                              : strain.hoehe.slice(0, 18)}
                          </span>
                        </div>
                        <div>
                          <span
                            style={{ color: "var(--muted)", display: "block" }}
                          >
                            Schimmel:
                          </span>
                          <span style={{ color: "var(--text)" }}>
                            {strain.mold.slice(0, 14)}
                          </span>
                        </div>
                        <div>
                          <span
                            style={{ color: "var(--muted)", display: "block" }}
                          >
                            Level:
                          </span>
                          <span style={{ color: "var(--text)" }}>
                            {strain.level}
                          </span>
                        </div>
                      </div>

                      {/* Terpene & Aromatics preview */}
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-2)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        <strong>Aroma:</strong>{" "}
                        {strain.geschmack || strain.wirkung}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        padding: "10px 14px 14px",
                        background: "var(--surface-1)",
                        borderTop: "1px solid var(--line)",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setDrawerStrain(strain)}
                        style={{
                          flex: 1,
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 10px",
                          color: "var(--text)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "center",
                          minHeight: "44px",
                        }}
                      >
                        Details anzeigen
                      </button>

                      {onSelectStrain && (
                        <button
                          type="button"
                          onClick={() => onSelectStrain(strain)}
                          style={{
                            flex: 1.2,
                            background: isSelected
                              ? "var(--green-dim)"
                              : "var(--green)",
                            border: "1px solid var(--green)",
                            borderRadius: "var(--radius-sm)",
                            padding: "8px 10px",
                            color: isSelected
                              ? "var(--green)"
                              : "var(--on-green)",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "center",
                            minHeight: "44px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {isSelected
                            ? "✓ Ausgewählt"
                            : isModal
                              ? "In Setup übernehmen"
                              : "Auswählen"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* ── LIST / AXIS VIEW ─────────────────────────────── */
            <div
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}
            >
              {/* Axis Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "44px minmax(200px, 1.6fr) minmax(140px, 1fr) 100px 90px",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "var(--surface-1)",
                  borderBottom: "1px solid var(--line)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-mono)",
                  alignItems: "center",
                }}
              >
                <span>#</span>
                <span>Sorte & Züchter</span>
                <span>Ertragsband (0–130 g)</span>
                <span>Potenz / THC</span>
                <span style={{ textAlign: "right" }}>Score</span>
              </div>

              {/* List Rows */}
              {filteredStrains.map((strain) => {
                const provColor =
                  strain.prov === "original"
                    ? "var(--green)"
                    : strain.prov === "whitelabel"
                      ? "var(--amber)"
                      : "var(--red)";

                const leftPercent = Math.max(
                  0,
                  Math.min(100, (strain.ertrag_lo / MAXY) * 100),
                );
                const widthPercent = Math.max(
                  3,
                  Math.min(
                    100 - leftPercent,
                    ((strain.ertrag_hi - strain.ertrag_lo) / MAXY) * 100,
                  ),
                );

                return (
                  <button
                    key={strain.id}
                    type="button"
                    onClick={() => setDrawerStrain(strain)}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "44px minmax(200px, 1.6fr) minmax(140px, 1fr) 100px 90px",
                      gap: "12px",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--line)",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      alignItems: "center",
                      width: "100%",
                      transition: "background 0.12s",
                      minHeight: "48px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--muted)",
                      }}
                    >
                      {String(strain.rank).padStart(2, "0")}
                    </span>

                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: provColor,
                            flexShrink: 0,
                          }}
                        />
                        {strain.name}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          marginTop: "2px",
                        }}
                      >
                        {strain.breeder} • {strain.shop} • {strain.typ}
                      </div>
                    </div>

                    {/* Yield Bar */}
                    <div
                      style={{
                        position: "relative",
                        height: "16px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          background: "var(--surface-2)",
                          borderRadius: "2px",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            top: 0,
                            bottom: 0,
                            background:
                              "linear-gradient(90deg, var(--blue), var(--red))",
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "-14px",
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted)",
                        }}
                      >
                        {strain.ertrag_lo}–{strain.ertrag_hi}g
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-2)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {strain.thc.slice(0, 14)}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong
                        style={{
                          fontSize: "15px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--green)",
                        }}
                      >
                        {strain.score}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "9px",
                          color: "var(--muted)",
                        }}
                      >
                        {strain.level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── 3. Sliding Detail Drawer & Backdrop Scrim ────────────────── */}
      {drawerStrain && (
        <div
          className="drawer-scrim"
          onClick={() => setDrawerStrain(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7, 17, 15, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 90,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            className="autoflower-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 100vw)",
              height: "100vh",
              background: "var(--surface-0)",
              borderLeft: "1px solid var(--line-strong)",
              overflowY: "auto",
              padding: "28px 24px 80px",
              boxShadow: "var(--shadow)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              position: "relative",
            }}
          >
            {/* Top Bar with Close Button */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Rang #{String(drawerStrain.rank).padStart(2, "0")} •{" "}
                  {drawerStrain.shop}
                </div>
                <h2
                  id="drawer-title"
                  style={{
                    margin: "4px 0 6px 0",
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "var(--text)",
                    lineHeight: 1.2,
                  }}
                >
                  {drawerStrain.name}
                </h2>
                <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
                  Züchter: <strong>{drawerStrain.breeder}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerStrain(null)}
                aria-label="Schließen"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--muted)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  minHeight: "44px",
                  minWidth: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕ Schließen
              </button>
            </div>

            {/* Badges Cluster */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  background: "rgba(103, 214, 174, 0.15)",
                  color: "var(--green)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--green)",
                }}
              >
                Score {drawerStrain.score} / 100
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              >
                {drawerStrain.typ}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "var(--surface-2)",
                  color:
                    drawerStrain.prov === "original"
                      ? "var(--green)"
                      : "var(--amber)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              >
                Provenienz: {drawerStrain.prov}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              >
                Level: {drawerStrain.level}
              </span>
            </div>

            {/* Warning Box (if strain has warning) */}
            {drawerStrain.warn && (
              <div
                style={{
                  background: "rgba(229, 164, 75, 0.1)",
                  border: "1px solid var(--amber)",
                  borderLeft: "4px solid var(--amber)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 16px",
                  fontSize: "13px",
                  color: "var(--text)",
                }}
              >
                <div
                  style={{
                    color: "var(--amber)",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "4px",
                  }}
                >
                  ⚠️ Genetik- & Provenienz-Hinweis
                </div>
                {drawerStrain.warn}
              </div>
            )}

            {/* Big Yield Box */}
            <div
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--line)",
                borderLeft: "4px solid var(--red)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Ertragsprognose (60×60 cm Zelt, 140 W)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--green)",
                  }}
                >
                  q = {drawerStrain.q}
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                {drawerStrain.ertrag_lo}–{drawerStrain.ertrag_hi} g{" "}
                <span
                  style={{
                    fontSize: "16px",
                    color: "var(--muted)",
                    fontWeight: 500,
                  }}
                >
                  trocken
                </span>
              </div>
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "12px",
                  color: "var(--text-2)",
                  lineHeight: 1.4,
                }}
              >
                {drawerStrain.ertrag_src}
              </p>
            </div>

            {/* Selection Action Button */}
            {onSelectStrain && (
              <button
                type="button"
                onClick={() => {
                  onSelectStrain(drawerStrain);
                  setDrawerStrain(null);
                }}
                style={{
                  width: "100%",
                  background: "var(--green)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px",
                  color: "var(--on-green)",
                  fontSize: "15px",
                  fontWeight: 800,
                  cursor: "pointer",
                  minHeight: "48px",
                  boxShadow: "var(--shadow)",
                }}
              >
                🌱 Diese Sorte in Setup übernehmen
              </button>
            )}

            {/* 2-Column Genetics & Cannabinoids Grid */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px 0",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "6px",
                }}
              >
                Genetik & Cannabinoid-Chemotyp
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "11px",
                    }}
                  >
                    Genetik
                  </small>
                  <strong style={{ color: "var(--text)", fontSize: "13px" }}>
                    {drawerStrain.gen}
                  </strong>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "11px",
                    }}
                  >
                    Kreuzung
                  </small>
                  <strong style={{ color: "var(--text)", fontSize: "13px" }}>
                    {drawerStrain.cross}
                  </strong>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "11px",
                    }}
                  >
                    THC-Gehalt
                  </small>
                  <div style={{ color: "var(--text)", fontSize: "13px" }}>
                    {drawerStrain.thc}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "11px",
                    }}
                  >
                    CBD & CBN
                  </small>
                  <div style={{ color: "var(--text)", fontSize: "13px" }}>
                    CBD: {drawerStrain.cbd} • CBN: {drawerStrain.cbn}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    gridColumn: "1 / -1",
                  }}
                >
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "11px",
                    }}
                  >
                    Minor Cannabinoids
                  </small>
                  <div style={{ color: "var(--text-2)", fontSize: "13px" }}>
                    {drawerStrain.minor}
                  </div>
                </div>
              </div>
            </div>

            {/* Sensory & Terpene Chemistry */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px 0",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "6px",
                }}
              >
                Sensorik & Terpenchemie
              </h4>
              <dl
                style={{
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <dt
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Terpenprofil & Quelllage
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text)",
                    }}
                  >
                    {drawerStrain.terpene}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        marginTop: "4px",
                      }}
                    >
                      Quelle: {drawerStrain.terpene_src}
                    </div>
                  </dd>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <dt
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Ester & Aromaklassen
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text-2)",
                    }}
                  >
                    {drawerStrain.ester}
                  </dd>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <dt
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Geschmack & Geruch im Zelt
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Geschmack:</strong> {drawerStrain.geschmack}
                    <div style={{ marginTop: "4px" }}>
                      <strong>Geruch:</strong> {drawerStrain.geruch}
                    </div>
                  </dd>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <dt
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Wirkung & Nutzerberichte
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text)",
                    }}
                  >
                    {drawerStrain.wirkung}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        marginTop: "4px",
                      }}
                    >
                      Nutzerbewertung: {drawerStrain.reviews}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Agronomic Modeling & Cultivation Parameters */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px 0",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "6px",
                }}
              >
                Agronomie & Anbau-Empfehlungen [C Modell]
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Düngetoleranz: <strong>{drawerStrain.feed}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {drawerStrain.feed_note}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Schimmelresistenz: <strong>{drawerStrain.mold}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {drawerStrain.mold_note}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Erfahrungsniveau: <strong>{drawerStrain.level}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {drawerStrain.level_note}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Wuchs & Zyklus
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text)" }}>
                    <div>
                      <strong>Dauer:</strong> {drawerStrain.zeit}
                    </div>
                    <div>
                      <strong>Höhe:</strong> {drawerStrain.hoehe}
                    </div>
                    <div>
                      <strong>Lieferform:</strong> {drawerStrain.form}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Context & UKD Verdict */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px 0",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "6px",
                }}
              >
                Medizinischer Kontext & Projekturteil
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Medizinische Einordnung
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text)" }}>
                    {drawerStrain.med}
                  </div>
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      marginTop: "4px",
                      fontSize: "11px",
                    }}
                  >
                    Evidenzbasis: {drawerStrain.med_src}
                  </small>
                </div>

                <div
                  style={{
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--green)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: "4px",
                    }}
                  >
                    Masterplan-Projekturteil & Training
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--text)",
                      fontWeight: 600,
                    }}
                  >
                    {drawerStrain.urteil}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "4px",
                    }}
                  >
                    Datenvertrauen: {drawerStrain.evidenz}
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Footnote Disclaimer */}
            <footer
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                lineHeight: 1.4,
                borderTop: "1px solid var(--line)",
                paddingTop: "14px",
                marginTop: "10px",
              }}
            >
              Modellfelder Schimmelresistenz, Düngerverträglichkeit und
              Erfahrungsniveau sind Ableitungen [C], keine Messungen. THC-Werte
              ohne Laborhinweis sind Herstellerangaben. Klinische Evidenz
              besteht für Cannabinoide und Chemotypen, nicht für Sortennamen.
              Bewurzelte Jungpflanzen unterliegen der VG-Köln-Linie (1 L 1051/26
              v. 22.06.2026) — Marktanalyse, keine Rechtsfreigabe.
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
