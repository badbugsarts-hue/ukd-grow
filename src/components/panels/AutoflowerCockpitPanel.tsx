import { useMemo, useState } from "react";
import type { RouteId } from "../../types";
import { TermTooltip } from "../common";
import cockpitData from "../../data/autoflower-cockpit.json";

export function AutoflowerCockpitPanel({
	navigate,
}: {
	navigate: (route: RouteId) => void;
}) {
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(["Autoflower", "Fast Version"]));
	const [activeProvenienz, setActiveProvenienz] = useState<Set<string>>(new Set());
	const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set());

	const filteredData = useMemo(() => {
		return cockpitData.filter((item) => {
			if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) && !item.description.toLowerCase().includes(searchTerm.toLowerCase())) {
				return false;
			}
			if (activeTypes.size > 0 && !activeTypes.has(item.type)) {
				return false;
			}
			if (activeProvenienz.size > 0 && !activeProvenienz.has(item.provenienz)) {
				return false;
			}
			if (activeLevels.size > 0 && !activeLevels.has(item.level)) {
				return false;
			}
			return true;
		});
	}, [searchTerm, activeTypes, activeProvenienz, activeLevels]);

	const toggleFilter = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
		const next = new Set(set);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		setter(next);
	};

	return (
		<div className="page-stack">
			<section className="page-header" style={{ marginBottom: "var(--space-md)" }}>
				<div>
					<div className="eyebrow">
						Bibliothek <span>›</span> Genetics Cockpit
					</div>
					<h1>UKD Genetics Cockpit</h1>
					<p>Master Class Autoflower Selection & Fast Version Matrix</p>
				</div>
			</section>

			<section className="metric-grid" style={{ marginBottom: "var(--space-md)" }}>
				<div className="metric-card" style={{ background: "var(--surface-2)", padding: "16px", borderRadius: "8px" }}>
					<small style={{ color: "var(--muted)" }}>Verfügbare Genetiken</small>
					<strong style={{ fontSize: "24px", color: "var(--ink)", display: "block", marginTop: "4px" }}>{cockpitData.length}</strong>
				</div>
				<div className="metric-card" style={{ background: "var(--surface-2)", padding: "16px", borderRadius: "8px" }}>
					<small style={{ color: "var(--muted)" }}>
						<TermTooltip term="Autoflower">Autoflower</TermTooltip> Ratio
					</small>
					<strong style={{ fontSize: "24px", color: "var(--green)", display: "block", marginTop: "4px" }}>
						{Math.round((cockpitData.filter(d => d.type === "Autoflower").length / cockpitData.length) * 100)}%
					</strong>
				</div>
				<div className="metric-card" style={{ background: "var(--surface-2)", padding: "16px", borderRadius: "8px" }}>
					<small style={{ color: "var(--muted)" }}>Zertifizierte Quellen</small>
					<strong style={{ fontSize: "24px", color: "var(--ink)", display: "block", marginTop: "4px" }}>3</strong>
				</div>
			</section>

			<section style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
				<input
					type="search"
					placeholder="Suche Genetik, Aromen..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					style={{ flex: "1 1 300px" }}
				/>
				
				<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
					<small style={{ color: "var(--muted)", marginRight: "8px" }}>Typ:</small>
					{["Autoflower", "Fast Version"].map(t => (
						<label key={t} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "var(--surface-2)", padding: "4px 12px", borderRadius: "16px" }}>
							<input type="checkbox" checked={activeTypes.has(t)} onChange={() => toggleFilter(activeTypes, setActiveTypes, t)} />
							<span>{t}</span>
						</label>
					))}
				</div>

				<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
					<small style={{ color: "var(--muted)", marginRight: "8px" }}>Level:</small>
					{["Anfänger", "Fortgeschritten", "Expert"].map(t => (
						<label key={t} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "var(--surface-2)", padding: "4px 12px", borderRadius: "16px" }}>
							<input type="checkbox" checked={activeLevels.has(t)} onChange={() => toggleFilter(activeLevels, setActiveLevels, t)} />
							<span>{t}</span>
						</label>
					))}
				</div>
			</section>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
				{filteredData.map((item, idx) => (
					<article key={idx} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
						<div style={{ background: "var(--surface-3)", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
							<div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
								🌱
							</div>
						</div>
						<div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
							<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
								<span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", background: item.type === "Autoflower" ? "rgba(91, 140, 255, 0.15)" : "rgba(242, 169, 59, 0.15)", color: item.type === "Autoflower" ? "var(--blue)" : "var(--warn)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600 }}>
									{item.type}
								</span>
								<span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(111, 227, 168, 0.15)", color: "var(--signal)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600 }}>
									{item.provenienz}
								</span>
							</div>
							<h3 style={{ margin: "0 0 8px 0", fontSize: "18px", lineHeight: 1.3 }}>{item.title}</h3>
							<p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--muted)", lineHeight: 1.5, flex: 1 }}>{item.description}</p>
							
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--surface-1)", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
								<div>
									<small style={{ color: "var(--faint)", display: "block", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>Ertrags-Potenzial</small>
									<strong style={{ fontSize: "14px", color: "var(--ink)" }}>{item.yield}</strong>
								</div>
								<div>
									<small style={{ color: "var(--faint)", display: "block", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>Erfahrungslevel</small>
									<strong style={{ fontSize: "14px", color: "var(--ink)" }}>{item.level}</strong>
								</div>
							</div>

							<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
								{item.tags.map(tag => (
									<span key={tag} style={{ fontSize: "12px", color: "var(--ink)", background: "var(--surface-3)", padding: "4px 10px", borderRadius: "12px", border: "1px solid var(--line)" }}>
										{tag}
									</span>
								))}
							</div>
						</div>
					</article>
				))}
			</div>
			{filteredData.length === 0 && (
				<div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
					Keine Genetik entspricht den gewählten Filtern.
				</div>
			)}
		</div>
	);
}
