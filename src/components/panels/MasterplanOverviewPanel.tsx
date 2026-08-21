import { DAILY_COLUMNS, numberAt, textAt, type DayPlan } from "../../domain";
import type { RouteId, RunPackage } from "../../types";

export function MasterplanOverviewPanel({
	navigate,
	run,
	plan,
}: {
	navigate: (route: RouteId) => void;
	run: RunPackage;
	plan: DayPlan;
}) {
	const lightIdentity = run.config.light
		? [run.config.light.manufacturer, run.config.light.model].filter(Boolean).join(" ")
		: "Hersteller/Modell nicht erfasst";
	const medium = run.config.mediumProduct || run.config.medium || "Nicht erfasst";

	return (
		<div className="panel-container">
			{/* Page Header */}
			<div className="panel-header">
				<h2>🌱 UKD GROW MASTERPLAN v11 Variante B</h2>
				<p>Evidenzgeschützte Orientierung auf Basis des aktiven Runs und des kanonischen Tagesplans</p>
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
							borderTop: "4px solid var(--red)",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--red)",
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
									Nachvollziehbare Versorgung in jeder Wachstumsphase.
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
									<li><strong>Zelt:</strong> {run.config.tentWidthCm} × {run.config.tentDepthCm} × {run.config.tentHeightCm} cm</li>
									<li><strong>Licht:</strong> {run.config.ledMaxW} W max. · {lightIdentity}</li>
									<li><strong>Bewässerung:</strong> {run.config.irrigationSystem || "Nicht erfasst"}</li>
									<li><strong>Topf:</strong> {run.config.pot.nominalVolumeLiters} L · Typ {run.config.pot.type}</li>
									<li><strong>Medium:</strong> {medium}</li>
									<li><strong>Genetik:</strong> <span style={{ color: "var(--green)", fontWeight: "bold" }}>{run.config.genetics || "Keine ausgewählt"}</span></li>
									<li><strong>Pflanzenanzahl:</strong> {run.config.plantCount}</li>
								</ul>
							</div>
							<div>
								<h4 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>Kanonische Ziele · Tag {plan.day}</h4>
								<ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
									<li><strong>Phase:</strong> {textAt(plan, DAILY_COLUMNS.phase)}</li>
									<li><strong>Temperatur Licht:</strong> {numberAt(plan, DAILY_COLUMNS.tempLight)} °C</li>
									<li><strong>Luftfeuchte:</strong> {numberAt(plan, DAILY_COLUMNS.humidity)} %</li>
									<li><strong>pH / EC:</strong> {numberAt(plan, DAILY_COLUMNS.ph).toFixed(1)} / {numberAt(plan, DAILY_COLUMNS.ec).toFixed(2)} mS/cm</li>
									<li><strong>Photoperiode:</strong> {numberAt(plan, DAILY_COLUMNS.lightHours)} h</li>
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
							borderTop: "4px solid var(--purple)",
						}}
					>
						<h3
							style={{
								margin: "0 0 16px 0",
								color: "var(--purple)",
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
								<div style={{ fontSize: "11px", color: "var(--purple)" }}>Einheit: mS/cm</div>
							</div>
							<div>
								<strong>pH-Wert</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Zeigt, wie sauer oder basisch das Wasser ist.</div>
								<div style={{ fontSize: "11px", color: "var(--purple)" }}>Zielwerte kommen aus dem kanonischen Tagesplan.</div>
							</div>
							<div>
								<strong>VPD (Luft-Druckdefizit)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Zeigt, wie viel Feuchtigkeit die Luft aufnehmen kann.</div>
								<div style={{ fontSize: "11px", color: "var(--purple)" }}>Ziel ist phasen- und datenabhängig.</div>
							</div>
							<div>
								<strong>DLI (Tageslichtmenge)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Gesamtmenge an Licht pro Tag.</div>
								<div style={{ fontSize: "11px", color: "var(--purple)" }}>Einheit: mol/m²/Tag</div>
							</div>
							<div>
								<strong>PPFD (Lichtstärke)</strong>
								<div style={{ color: "var(--muted)", marginBottom: "2px" }}>Wie viel Licht auf deine Pflanzen trifft.</div>
								<div style={{ fontSize: "11px", color: "var(--purple)" }}>Einheit: µmol/m²/s</div>
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
									<strong>Pot9 Rhiza</strong>
									<div style={{ color: "var(--muted)", fontSize: "12px" }}>Endgültiger Topf (pH 5.5 - 6.5) + LST</div>
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
