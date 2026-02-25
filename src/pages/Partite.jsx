import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const LEAGUE_COLORS = {
  "Serie A": { bg: "#009246", text: "#fff", flag: "🇮🇹" },
  "Premier League": { bg: "#38003c", text: "#00ff85", flag: "🏴" },
  "Champions League": { bg: "#001489", text: "#ffd700", flag: "⭐" },
};

function calcPunti(pred, reale) {
  if (!pred || reale.gol_home === null) return 0;
  let pts = 0;
  const esito = g => g[0] > g[1] ? "1" : g[0] === g[1] ? "X" : "2";
  if (esito([pred.home, pred.away]) === esito([reale.gol_home, reale.gol_away])) pts += 5;
  if (pred.home === reale.gol_home) pts += 1;
  if (pred.away === reale.gol_away) pts += 1;
  if ((pred.home - pred.away) === (reale.gol_home - reale.gol_away)) pts += 1;
  if ((pred.home + pred.away > 2.5) === (reale.gol_home + reale.gol_away > 2.5)) pts += 1;
  if ((pred.home > 0 && pred.away > 0) === (reale.gol_home > 0 && reale.gol_away > 0)) pts += 1;
  return pts;
}

function Partite() {
  const [utente, setUtente] = useState(null);
  const [partite, setPartite] = useState([]);
  const [pronostici, setPronostici] = useState({});
  const [salvato, setSalvato] = useState({});
  const [filtro, setFiltro] = useState("Tutti");
  const [caricamento, setCaricamento] = useState(true);
  const [legaId, setLegaId] = useState(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);

      // Carica partite
      const { data: partiteData } = await supabase
        .from("partite")
        .select("*")
        .order("match_date");
      if (partiteData) setPartite(partiteData);

      // Carica prima lega dell'utente
      const { data: legheData } = await supabase
        .from("leghe")
        .select("id")
        .eq("creatore_id", data.user.id)
        .limit(1);
      if (legheData && legheData.length > 0) setLegaId(legheData[0].id);

      // Carica pronostici già salvati
      const { data: pronosticiData } = await supabase
        .from("pronostici")
        .select("*")
        .eq("user_id", data.user.id);
      if (pronosticiData) {
        const map = {};
        pronosticiData.forEach(p => {
          map[p.partita_id] = { home: p.gol_home, away: p.gol_away };
        });
        setPronostici(map);
        setSalvato(Object.fromEntries(pronosticiData.map(p => [p.partita_id, true])));
      }

      setCaricamento(false);
    }
    init();
  }, []);

  function setPred(id, side, val) {
    const n = parseInt(val);
    if (isNaN(n) || n < 0 || n > 20) return;
    setPronostici(p => ({ ...p, [id]: { ...(p[id] || {}), [side]: n } }));
    setSalvato(s => ({ ...s, [id]: false }));
  }

  async function salvaPronostico(partitaId) {
    const pred = pronostici[partitaId];
    if (pred?.home === undefined || pred?.away === undefined) return;
    if (!legaId) { alert("Devi prima creare una lega!"); return; }

    const { error } = await supabase
      .from("pronostici")
      .upsert({
        user_id: utente.id,
        partita_id: partitaId,
        lega_id: legaId,
        gol_home: pred.home,
        gol_away: pred.away,
      }, { onConflict: "user_id,partita_id" });

    if (!error) setSalvato(s => ({ ...s, [partitaId]: true }));
    else alert("Errore nel salvataggio");
  }

  const filtrate = filtro === "Tutti" ? partite : partite.filter(p => p.league === filtro);

  if (caricamento) return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px 60px", fontFamily: "Arial" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← Home</a>
      </div>

      <h2 style={{ marginBottom: 20 }}>🗓 Partite</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {["Tutti", "Serie A", "Premier League", "Champions League"].map(l => (
          <button key={l} onClick={() => setFiltro(l)} style={{
            padding: "6px 14px", borderRadius: 20,
            border: `1px solid ${filtro === l ? "#1a6b2a" : "#ddd"}`,
            background: filtro === l ? "#1a6b2a" : "transparent",
            color: filtro === l ? "#fff" : "#666",
            cursor: "pointer", fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtrate.map(partita => {
          const pred = pronostici[partita.id];
          const hasPred = pred?.home !== undefined && pred?.away !== undefined;
          const reale = partita.gol_home !== null ? partita : null;
          const pts = reale && pred ? calcPunti(pred, reale) : null;
          const lc = LEAGUE_COLORS[partita.league];

          return (
            <div key={partita.id} style={{
              background: "#fff",
              border: `1px solid ${reale ? (pts >= 7 ? "#00c896" : pts >= 3 ? "#f5c518" : "#ff5050") : "#eee"}`,
              borderRadius: 12, overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              color: "#1a1a1a"
            }}>
              <div style={{ background: lc.bg, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: lc.text, fontSize: 12, fontWeight: "bold", letterSpacing: 1 }}>
                  {lc.flag} {partita.league}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                  {new Date(partita.match_date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {new Date(partita.match_date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", fontSize: 18 }}>{partita.home}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Casa</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!reale ? (
                      <>
                        <input type="number" min="0" max="20"
                          value={pred?.home ?? ""}
                          onChange={e => setPred(partita.id, "home", e.target.value)}
                          placeholder="–"
                          style={{ width: 52, height: 52, textAlign: "center", fontSize: 22, fontWeight: "bold", border: `2px solid ${hasPred ? "#1a6b2a" : "#ddd"}`, borderRadius: 8, color: "#1a6b2a", outline: "none" }}
                        />
                        <span style={{ color: "#ccc", fontSize: 20 }}>:</span>
                        <input type="number" min="0" max="20"
                          value={pred?.away ?? ""}
                          onChange={e => setPred(partita.id, "away", e.target.value)}
                          placeholder="–"
                          style={{ width: 52, height: 52, textAlign: "center", fontSize: 22, fontWeight: "bold", border: `2px solid ${hasPred ? "#1a6b2a" : "#ddd"}`, borderRadius: 8, color: "#1a6b2a", outline: "none" }}
                        />
                      </>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, fontWeight: "bold" }}>{reale.gol_home} – {reale.gol_away}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>Risultato finale</div>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", fontSize: 18 }}>{partita.away}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Ospite</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    {hasPred && !reale && (
                      salvato[partita.id]
                        ? <span style={{ color: "#1a6b2a" }}>✓ Salvato: {pred.home}–{pred.away}</span>
                        : <span style={{ color: "#f5a623" }}>● Non salvato</span>
                    )}
                    {!hasPred && !reale && "Inserisci il pronostico"}
                    {reale && pred && <span>Tuo: {pred.home}–{pred.away}</span>}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {pts !== null && (
                      <span style={{
                        padding: "4px 12px", borderRadius: 20, fontWeight: "bold", fontSize: 13,
                        background: pts >= 7 ? "rgba(0,200,150,0.1)" : pts >= 3 ? "rgba(245,197,24,0.1)" : "rgba(255,80,80,0.1)",
                        color: pts >= 7 ? "#00c896" : pts >= 3 ? "#d4a017" : "#ff5050"
                      }}>
                        {pts === 10 ? "🔥 " : ""}+{pts} pt
                      </span>
                    )}
                    {hasPred && !reale && !salvato[partita.id] && (
                      <button onClick={() => salvaPronostico(partita.id)} style={{ padding: "6px 14px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                        Salva
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Partite;