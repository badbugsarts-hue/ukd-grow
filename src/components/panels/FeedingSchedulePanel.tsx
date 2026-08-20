

export function FeedingSchedulePanel() {
	return (
		<div className="panel-container">
			<div className="panel-header">
				<h2>💧 UKD v10 · FÜTTERUNGSPLAN · UGro Rhiza Coco</h2>
				<p>
					Eazy Plug Mini -{">"} Eazy Block Standard -{">"} UGro Rhiza Coco ·
					exakte UKD-Planwerte, keine Hersteller-Fütterungstabelle
				</p>
			</div>

			<div
				style={{
					background: "var(--surface-1)",
					padding: "16px",
					borderRadius: "var(--radius-md)",
					marginTop: "20px",
					border: "1px solid var(--green)",
				}}
			>
				<h3 style={{ margin: "0 0 8px 0", color: "var(--green)", fontSize: "14px", textTransform: "uppercase" }}>
					Anzucht- und Medium-Pfad
				</h3>
				<p style={{ margin: 0, fontSize: "13px", color: "var(--text)" }}>
					<strong>Eazy Plug Mini -{">"} Eazy Block Standard -{">"} UGro Rhiza Coco</strong>
					<br />
					<span style={{ color: "var(--muted)", fontSize: "12px" }}>
						Umtopfen nach Wurzel-/Pflanzenzustand; Substrat-pH/EC sind Referenzwerte, keine Gießwasser-Sollwerte.
					</span>
				</p>
			</div>

			<div style={{ overflowX: "auto", marginTop: "20px" }}>
				<table
					style={{
						width: "100%",
						minWidth: "1200px",
						borderCollapse: "collapse",
						fontSize: "12px",
						textAlign: "left",
					}}
				>
					<thead>
						<tr
							style={{
								background: "var(--surface-2)",
								borderBottom: "2px solid var(--line)",
							}}
						>
							<th style={{ padding: "12px", width: "150px" }}>Produkt / Rolle</th>
							<th style={{ padding: "12px", width: "120px" }}>Planstatus</th>
							<th style={{ padding: "12px", width: "300px" }}>Bedingung / Erklärung</th>
							<th style={{ padding: "12px" }}>W1<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Keimung</span></th>
							<th style={{ padding: "12px" }}>W2<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Etablierung</span></th>
							<th style={{ padding: "12px" }}>W3<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Early Veg</span></th>
							<th style={{ padding: "12px" }}>W4<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Veg / LST</span></th>
							<th style={{ padding: "12px" }}>W5<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Stretch (B1)</span></th>
							<th style={{ padding: "12px" }}>W6<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Early Fl. (B2)</span></th>
							<th style={{ padding: "12px" }}>W7<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Flower (B3)</span></th>
							<th style={{ padding: "12px" }}>W8<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Peak Fl. (B4)</span></th>
							<th style={{ padding: "12px" }}>W9<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Peak Fl. (B5)</span></th>
							<th style={{ padding: "12px" }}>W10<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Late Fl. (B6)</span></th>
							<th style={{ padding: "12px" }}>W11<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Ripening (B7)</span></th>
							<th style={{ padding: "12px" }}>W12<br /><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>Harvest</span></th>
						</tr>
					</thead>
					<tbody>
						{/* Medium-Pfad */}
						<tr style={{ borderBottom: "1px solid var(--line)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Medium-Pfad</td>
							<td style={{ padding: "12px", color: "#3b82f6", fontWeight: "bold" }}>REFERENZ</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Eazy Plug Mini -{">"} Eazy Block Standard -{">"} UGro Rhiza Coco</td>
							<td style={{ padding: "12px" }}>EazyBlock</td>
							<td style={{ padding: "12px" }}>EazyBlock</td>
							<td style={{ padding: "12px" }}>EazyBlock</td>
							<td style={{ padding: "12px" }}>EazyBlock</td>
							<td colSpan={8} style={{ padding: "12px", textAlign: "center", background: "rgba(255,255,255,0.02)" }}>UGro Rhiza</td>
						</tr>

						{/* HESI Basis */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.1)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>HESI Basis</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Tageswerte sind mögliche Planwerte; Basisdünger startet nur nach Freigabe.</td>
							<td style={{ padding: "12px" }}>TNT 1.25</td>
							<td style={{ padding: "12px" }}>TNT 1.25</td>
							<td style={{ padding: "12px" }}>TNT 2.0</td>
							<td style={{ padding: "12px" }}>TNT 2.5</td>
							<td style={{ padding: "12px" }}>Coco 2.5</td>
							<td style={{ padding: "12px" }}>Coco 3.25</td>
							<td style={{ padding: "12px" }}>Coco 3.75</td>
							<td style={{ padding: "12px" }}>Coco 4.0</td>
							<td style={{ padding: "12px" }}>Coco 4.0</td>
							<td style={{ padding: "12px" }}>Coco 3.5</td>
							<td style={{ padding: "12px" }}>Coco 2.5</td>
							<td style={{ padding: "12px" }}>Coco 1.5</td>
						</tr>

						{/* Wurzel Complex */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.05)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Wurzel Complex</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV FRÜH</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>2.5 ml/L = halbe Herstellerdosis für langfristige Nutzung.</td>
							<td style={{ padding: "12px" }}>2.5 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							<td style={{ padding: "12px" }}>2.5 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							<td style={{ padding: "12px" }}>2.5 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td colSpan={9} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						{/* PowerZyme */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.05)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>PowerZyme</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>2 ml/L sind bis Blütetag 49 im Plan möglich; tatsächliche Anwendung getrennt.</td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>3 Tage</span></td>
							{[...Array(10)].map((_, i) => (
								<td key={i} style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							))}
							<td style={{ padding: "12px", color: "var(--muted)" }}>—</td>
						</tr>

						{/* SuperVit */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.05)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>SuperVit</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>0.015 ml/L Plan-Mikrodosis; keine Bewässerung erzwingen.</td>
							{[...Array(11)].map((_, i) => (
								<td key={i} style={{ padding: "12px" }}>0.015 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							))}
							<td style={{ padding: "12px" }}>0.015 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>4 Tage</span></td>
						</tr>

						{/* HESI Boost */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.05)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>HESI Boost</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV BLÜTE</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Bevorzugter vorhandener Blüte-Biostim-Pfad; UKD plant konservativ ein Ereignis pro Woche.</td>
							<td colSpan={4} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
							{[...Array(8)].map((_, i) => (
								<td key={i} style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							))}
						</tr>

						{/* HESI PK13/14 */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(34, 197, 94, 0.05)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>HESI PK 13/14</td>
							<td style={{ padding: "12px", color: "var(--green)", fontWeight: "bold" }}>AKTIV SPÄT</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Bevorzugter vorhandener PK-Pfad; 0.25 -{">"} 0.5 ml/L an Blütetag 29-42.</td>
							<td colSpan={8} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
							<td style={{ padding: "12px" }}>0.25 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							<td style={{ padding: "12px" }}>0.5 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>7 Tage</span></td>
							<td colSpan={2} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						{/* Voodoo Juice & Tarantula (Optional / Ausgewählte Ergänzung) */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(168, 85, 247, 0.1)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Voodoo Juice</td>
							<td style={{ padding: "12px", color: "#a855f7", fontWeight: "bold" }}>AUSGEWÄHLTE<br/>ERGÄNZUNG</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Definierte frische UKD-Ereignisse; Hersteller-Kompatibilität ist kein Beweis.</td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td colSpan={2} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td colSpan={6} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(168, 85, 247, 0.1)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Tarantula</td>
							<td style={{ padding: "12px", color: "#a855f7", fontWeight: "bold" }}>AUSGEWÄHLTE<br/>ERGÄNZUNG</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Mit Voodoo ausgewählt; gleiche konservative Frisch-Ereignisse.</td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td colSpan={2} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td style={{ padding: "12px" }}>2 ml/L<br /><span style={{ fontSize: "10px", color: "var(--muted)" }}>1 Tage</span></td>
							<td colSpan={6} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						{/* Nur Bedingt */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(234, 179, 8, 0.1)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Athena Balance</td>
							<td style={{ padding: "12px", color: "#eab308", fontWeight: "bold" }}>NUR BEDINGT</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Bevorzugter Silizium-/pH-Pfad; keine universelle Kalenderdosis.</td>
							<td colSpan={12} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						<tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(234, 179, 8, 0.1)" }}>
							<td style={{ padding: "12px", fontWeight: "bold" }}>Sensi CalMag Xtra</td>
							<td style={{ padding: "12px", color: "#eab308", fontWeight: "bold" }}>NUR BEDINGT</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Vorhandene CalMag-Quelle; Dosis nur über ausdrücklich freigegebenen CalMag-Plan.</td>
							<td colSpan={12} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						{/* Ausgeschlossen */}
						<tr style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
							<td style={{ padding: "12px", fontWeight: "bold", color: "var(--muted)" }}>Tasty Terpenes</td>
							<td style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>VORHANDEN / AUS</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Nur späterer isolierter A/B-Test; keine Referenz-Kalenderdosis.</td>
							<td colSpan={12} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>

						<tr style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
							<td style={{ padding: "12px", fontWeight: "bold", color: "var(--muted)" }}>CarboLoad</td>
							<td style={{ padding: "12px", color: "var(--muted)", fontWeight: "bold" }}>RESTMENGE / AUS</td>
							<td style={{ padding: "12px", color: "var(--muted)" }}>Kein Nachkauf; Restmenge nicht zusätzlich verwenden, solange HESI Boost der Referenzpfad ist.</td>
							<td colSpan={12} style={{ padding: "12px", color: "var(--muted)", textAlign: "center" }}>—</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div style={{ marginTop: "16px", padding: "16px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--muted)" }}>
				<strong>SO LIEST DU DIE TABELLE:</strong> Die Zellen zeigen die aufgelösten UKD-v10-Planwerte. '7 Tage' bedeutet sieben Kalendertage mit positivem Planwert - nicht sieben erzwungene Gießvorgänge. Tatsächlich angewendet wird nur, wenn ein reales Gieß-/Mischereignis stattfindet und dokumentiert wird. Produkte mit 'nur bedingt' bleiben bis zur Freigabe auf 0.
			</div>
		</div>
	);
}
