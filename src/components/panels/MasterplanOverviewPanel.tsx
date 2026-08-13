import type { RouteId } from "../../types";

export function MasterplanOverviewPanel({ navigate }: { navigate: (route: RouteId) => void }) {

	return (
		<div className="panel-container">
			{/* Page Header */}
			<div className="panel-header">
				<h2>🌱 UKD GROW MASTERPLAN v9</h2>
				<p>Dein kompletter Leitfaden für erfolgreichen und gesunden Anbau</p>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: "24px",
					marginTop: "20px",
				}}
			>
				{/* LEFT COLUMN: Intro & 3-Schritte */}
				<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							border: "2px solid var(--green)",
							padding: "20px",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--green)",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontSize: "18px",
							}}
						>
							▶ START HIER
						</h3>
						<h4 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
							Dein 3-Schritte-Plan
						</h4>
						<ol
							style={{
								margin: 0,
								paddingLeft: "20px",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								color: "var(--text)",
								fontSize: "14px",
							}}
						>
							<li>
								<strong>Heute ansehen</strong>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Was muss ich heute tun?
								</div>
							</li>
							<li>
								<strong>Mischung ansetzen</strong>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Was und wie viel?
								</div>
							</li>
							<li>
								<strong>Durchführen & prüfen</strong>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Messen, Gießen, Notieren
								</div>
							</li>
						</ol>
					</div>

					{/* Problem / Warum dieser Plan */}
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
							borderTop: "4px solid #ef4444",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "#ef4444",
								fontSize: "15px",
							}}
						>
							⚠️ PROBLEM (Warum dieser Plan?)
						</h3>
						<ul
							style={{
								margin: 0,
								paddingLeft: "20px",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								fontSize: "13px",
								color: "var(--text)",
							}}
						>
							<li>
								<strong>Zu viele Infos, unübersichtlich</strong>
								<div style={{ color: "var(--muted)" }}>
									21 Bereiche, schwer zu finden, keine klare Reihenfolge.
								</div>
							</li>
							<li>
								<strong>Fachbegriffe & Abkürzungen</strong>
								<div style={{ color: "var(--muted)" }}>
									Schwer verständlich für Einsteiger.
								</div>
							</li>
							<li>
								<strong>Fehler & Unsicherheit</strong>
								<div style={{ color: "var(--muted)" }}>
									Falsche Mischungen, pH-Probleme, Nährstoffmangel.
								</div>
							</li>
							<li>
								<strong>Daten nicht verknüpft</strong>
								<div style={{ color: "var(--muted)" }}>
									Pläne, Messungen und Aktionen sind nicht verbunden.
								</div>
							</li>
						</ul>
					</div>
				</div>

				{/* MIDDLE COLUMN: Ziele & Lösungen & System */}
				<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
					{/* Ziel */}
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
							borderTop: "4px solid var(--green)",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--green)",
								fontSize: "15px",
							}}
						>
							🎯 ZIEL (GOAL)
						</h3>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr",
								gap: "12px",
								fontSize: "13px",
							}}
						>
							<div>
								<strong>🌿 Gesunde Pflanzen</strong>
								<div style={{ color: "var(--muted)" }}>
									Kraftvolle Wurzeln, starke Stängel, sattes Grün.
								</div>
							</div>
							<div>
								<strong>⚖️ Maximaler Ertrag</strong>
								<div style={{ color: "var(--muted)" }}>
									Diätetische Versorgung in jeder Wachstumsphase.
								</div>
							</div>
							<div>
								<strong>🛡️ Sicher & Einfach</strong>
								<div style={{ color: "var(--muted)" }}>
									Klare Anleitungen, sichere Entscheidungen.
								</div>
							</div>
						</div>
					</div>

					{/* Die Lösung */}
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--text)",
								fontSize: "15px",
							}}
						>
							💡 DIE LÖSUNG (Wie UKD dir hilft)
						</h3>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "16px",
								fontSize: "12px",
							}}
						>
							<div>
								<strong>Klare Struktur</strong>
								<div style={{ color: "var(--muted)" }}>Alles logisch geordnet.</div>
							</div>
							<div>
								<strong>Schritt-für-Schritt</strong>
								<div style={{ color: "var(--muted)" }}>Du weißt immer, was als Nächstes ansteht.</div>
							</div>
							<div>
								<strong>Verständliche Begriffe</strong>
								<div style={{ color: "var(--muted)" }}>Erklärungen immer dort, wo du sie brauchst.</div>
							</div>
							<div>
								<strong>Sichere Entscheidungen</strong>
								<div style={{ color: "var(--muted)" }}>Entscheidungs-Hilfe & Warnungen.</div>
							</div>
							<div style={{ gridColumn: "1 / -1" }}>
								<strong>Alles verknüpft</strong>
								<div style={{ color: "var(--muted)" }}>Pläne, Messungen, Aktionen in einem System.</div>
							</div>
						</div>
					</div>

					{/* Setup / System */}
					<div
						style={{
							background: "var(--surface-2)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
							border: "1px solid var(--line)",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--text)",
								fontSize: "15px",
							}}
						>
							🛠 DEIN ANBAU-SYSTEM AUF EINEN BLICK
						</h3>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "16px",
								fontSize: "13px",
							}}
						>
							<div>
								<h4 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>Ausstattung</h4>
								<ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
									<li><strong>Zelt:</strong> 60x60x180 cm</li>
									<li><strong>Licht:</strong> 150W LED</li>
									<li><strong>Abluft:</strong> AC Infinity T4 + AKF</li>
									<li><strong>Umluft:</strong> 1x NF-A20 + 2x P14</li>
									<li><strong>Medium:</strong> UGro Rhiza Coco</li>
								</ul>
							</div>
							<div>
								<h4 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>Wichtige Ziele</h4>
								<ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
									<li><strong>Temperatur:</strong> 24 – 26 °C</li>
									<li><strong>Luftfeuchte:</strong> 45 – 60 %</li>
									<li><strong>pH-Wert:</strong> 5.8 – 6.2</li>
									<li><strong>EC in Blüte:</strong> 1.6 – 2.2 mS/cm</li>
									<li><strong>Lichtzyklus:</strong> 18/6 & 12/12</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Fachbegriffe & Vermehrung */}
				<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
					{/* Fachbegriffe */}
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
							borderTop: "4px solid #a855f7",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "#a855f7",
								fontSize: "15px",
							}}
						>
							📖 FACHBEGRIFFE EINFACH ERKLÄRT
						</h3>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "16px",
								fontSize: "13px",
							}}
						>
							<div>
								<strong>EC (Leitwert)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Zeigt, wie viele Nährstoffe im Wasser sind.</div>
								<div style={{ fontSize: "11px", color: "#a855f7" }}>Einheit: mS/cm</div>
							</div>
							<div>
								<strong>pH-Wert</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Zeigt, wie sauer oder basisch das Wasser ist.</div>
								<div style={{ fontSize: "11px", color: "#a855f7" }}>Ideal: 5.8 – 6.2 in Erde/Coco</div>
							</div>
							<div>
								<strong>VPD (Luft-Druckdefizit)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Zeigt, wie viel Feuchtigkeit die Luft aufnehmen kann.</div>
								<div style={{ fontSize: "11px", color: "#a855f7" }}>Ideal: 0.8 – 1.2 kPa in der Blüte</div>
							</div>
							<div>
								<strong>DLI (Tageslichtmenge)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Gesamtmenge an Licht pro Tag.</div>
								<div style={{ fontSize: "11px", color: "#a855f7" }}>Einheit: mol/m²/Tag</div>
							</div>
							<div>
								<strong>PPFD (Lichtstärke)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Wie viel Licht auf deine Pflanzen trifft.</div>
								<div style={{ fontSize: "11px", color: "#a855f7" }}>Einheit: µmol/m²/s</div>
							</div>
						</div>
					</div>

					{/* Vermehrung */}
					<div
						style={{
							background: "var(--surface-1)",
							borderRadius: "var(--radius-md)",
							padding: "20px",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--text)",
								fontSize: "15px",
							}}
						>
							🌱 VERMEHRUNG & ERDE
						</h3>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								fontSize: "13px",
							}}
						>
							<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
								<div style={{ background: "var(--surface-2)", padding: "8px", borderRadius: "var(--radius-sm)" }}>1</div>
								<div>
									<strong>Eazy Plug Mini</strong>
									<div style={{ color: "var(--muted)", fontSize: "12px" }}>Keimung im Plug (gepuffert)</div>
								</div>
							</div>
							<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
								<div style={{ background: "var(--surface-2)", padding: "8px", borderRadius: "var(--radius-sm)" }}>2</div>
								<div>
									<strong>Eazy Block Standard</strong>
									<div style={{ color: "var(--muted)", fontSize: "12px" }}>Wurzelentwicklung (gepuffert)</div>
								</div>
							</div>
							<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
								<div style={{ background: "var(--green)", color: "var(--on-green)", padding: "8px", borderRadius: "var(--radius-sm)", fontWeight: 700 }}>3</div>
								<div>
									<strong>UGro Rhiza Coco</strong>
									<div style={{ color: "var(--muted)", fontSize: "12px" }}>Endgültiger Topf (pH 5.5 - 6.5)</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Action Bar */}
			<div
				style={{
					marginTop: "24px",
					display: "flex",
					justifyContent: "center",
					gap: "16px",
					padding: "20px",
					background: "var(--surface-1)",
					borderRadius: "var(--radius-md)",
					flexWrap: "wrap",
				}}
			>
				<button
					type="button"
					onClick={() => navigate("cockpit")}
					style={{
						padding: "12px 24px",
						background: "var(--green)",
						color: "var(--on-green)",
						border: "none",
						borderRadius: "var(--radius-sm)",
						fontWeight: 700,
						fontSize: "15px",
						cursor: "pointer",
					}}
				>
					▶ Jetzt ins Cockpit wechseln
				</button>
				<button
					type="button"
					onClick={() => navigate("setup")}
					style={{
						padding: "12px 24px",
						background: "var(--surface-2)",
						color: "var(--text)",
						border: "1px solid var(--line)",
						borderRadius: "var(--radius-sm)",
						fontWeight: 600,
						fontSize: "15px",
						cursor: "pointer",
					}}
				>
					⚙ Setup & Parameter anpassen
				</button>
			</div>
		</div>
	);
}
