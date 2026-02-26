import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

const LEAGUE_COLORS = {
  "Serie A": { bg: "#009246", text: "#fff", flag: "🇮🇹" },
  "Premier League": { bg: "#38003c", text: "#00ff85", flag: "🏴" },
  "Champions League": { bg: "#001489", text: "#ffd700", flag: "⭐" },
};

function calcPunti(pred, reale) {
  if (!pred || reale.gol_home === null) return null;
  let pts = 0;
  const esito = (h, a) => h > a ? "1" : h === a ? "X" : "2";
  if (esito(pred.home, pred.away) === esito(reale.gol_home, reale.gol_away)) pts += 5;
  if (pred.home === reale.gol_home) pts += 1;
  if (pred.away === reale.gol_away) pts += 1;
  if ((pred.home - pred.away) === (reale.gol_home - reale.gol_away)) pts += 1;
  if ((pred.home + pred.away > 2.5) === (reale.gol_home + reale.gol_away > 2.5)) pts += 1;
  if ((pred.home > 0 && pred.away > 0) === (reale.gol_home > 0 && reale.gol_away > 0)) pts += 1;
  return pts;
}

function punteggioToGol(punti) {
  if (punti < 40) return 0;
  return Math.floor((punti - 36) / 4);
}

function Lega() {
  const { id } = useParams();
  const [lega, setLega] = useState(null);
  const [utente, setUtente] = useState(null);
  const [partite, setPartite] = useState([]);
  const [pronostici, setPronostici] = useState({});
  const [salvato, setSalvato] = useState({});
  const [tab, setTab] = useState("partite");
  const [filtro, setFiltro] = useState("Tutti");
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);

      // Carica lega
      const { data: legaData } = await supabase
        .from("leghe")
        .select("*")
        .eq("id", id)
        .single();
      if (!legaData) { window.location.href = "/leghe"; return; }
      setLega(legaData);

      // Carica partite
      const { data: partiteData } = await supabase
        .from("partite")
        .select("*")
        .order("match_date");
      if (partiteData) setPartite(partiteData);

      // Carica pronostici
      const { data: pronosticiData } = await supabase
        .from("pronostici")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("lega_id", id);
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
  }, [id]);

  function setPred(partitaId, side, val) {
    const n = parseInt(val);
    if (isNaN(n) || n < 0 || n > 20) return;
    setPronostici(p => ({ ...p, [partitaId]: { ...(p[partitaId] || {}), [side]: n } }));
    setSalvato(s => ({ ...s, [partitaId]: false }));
  }

  async function salvaPronostico(partitaId) {
    const pred = pronostici[partitaId];
    if (pred?.home === undefined || pred?.away === undefined) return;

    const { error } = await supabase
      .from("pronostici")
      .upsert({
        user_id: utente.id,
        partita_id: partitaId,
        lega_id: id,
        gol_home: pred.home,
        gol_away: pred.away,
      }, { onConflict: "user_id,partita_id" });

    if (!error) setSalvato(s => ({ ...s, [partitaId]: true }));
    else alert("Errore nel salvataggio");
  }

  if (caricamento) return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;

  const filtrate = filtro === "Tutti" ? partite : partite.filter(p => p.league === filtro);

  // Classifica demo
  const classificaDemo = [
    { username: "diego", punti: 128, partite_g: 18, isMe: true },
    { username: "marco_r", punti: 142, partite_g: 18 },
    { username: "giulia_t", punti: 115, partite_g: 17 },
  ].sort((a, b) => b.punti - a.punti);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px 60px", fontFamily: "Arial" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/leghe" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← Le mie leghe</a>
      </div>

      {/* Info lega */}
      <div style={{ background: "#1a6b2a", borderRadius: 12, padding: "16px 24px", marginBottom: 24, color: "#fff" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Lega</div>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>{lega.nome}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 20, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <span>🏆 {lega.competizione || "Tutte le competizioni"}</span>
          <span>🔑 Codice: <strong style={{ color: "#ffd700", letterSpacing: 2 }}>{lega.codice}</strong></span>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f5f5f5", borderRadius: 8, padding: 4 }}>
        {["partite", "classifica"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px", borderRadius: 6, border: "none",
            background: tab === t ? "#fff" : "transparent",
            fontWeight: tab === t ? "bold" : "normal",
            color: tab === t ? "#1a6b2a" : "#999",
            cursor: "pointer", fontSize: 14,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
          }}>
            {t === "partite" ? "🗓 Partite" : "🏆 Classifica"}
          </button>
        ))}
      </div>

      {/* TAB PARTITE */}
      {tab === "partite" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
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
              const lc = LEAGUE_COLORS[partita.league] || { bg: "#333", text: "#fff", flag: "⚽" };

              return (
                <div key={partita.id} style={{
                  background: "#fff", color: "#1a1a1a",
                  border: `1px solid ${pts !== null ? (pts >= 7 ? "#00c896" : pts >= 3 ? "#f5c518" : "#ff5050") : "#eee"}`,
                  borderRadius: 12, overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}>
                  <div style={{ background: lc.bg, padding: "6px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: lc.text, fontSize: 12, fontWeight: "bold" }}>{lc.flag} {partita.league}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                      {new Date(partita.match_date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {new Date(partita.match_date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: "bold", fontSize: 18 }}>{partita.home}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>Casa</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {!reale ? (
                          <>
                            <input type="number" min="0" max="20" value={pred?.home ?? ""}
                              onChange={e => setPred(partita.id, "home", e.target.value)}
                              placeholder="–"
                              style={{ width: 52, height: 52, textAlign: "center", fontSize: 22, fontWeight: "bold", border: `2px solid ${hasPred ? "#1a6b2a" : "#ddd"}`, borderRadius: 8, color: "#1a6b2a", outline: "none", background: "#fff" }}
                            />
                            <span style={{ color: "#ccc", fontSize: 20 }}>:</span>
                            <input type="number" min="0" max="20" value={pred?.away ?? ""}
                              onChange={e => setPred(partita.id, "away", e.target.value)}
                              placeholder="–"
                              style={{ width: 52, height: 52, textAlign: "center", fontSize: 22, fontWeight: "bold", border: `2px solid ${hasPred ? "#1a6b2a" : "#ddd"}`, borderRadius: 8, color: "#1a6b2a", outline: "none", background: "#fff" }}
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
                        <div style={{ fontSize: 11, color: "#aaa" }}>Ospite</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#aaa" }}>
                        {hasPred && !reale && (salvato[partita.id]
                          ? <span style={{ color: "#1a6b2a" }}>✓ Salvato: {pred.home}–{pred.away}</span>
                          : <span style={{ color: "#f5a623" }}>● Non salvato</span>)}
                        {!hasPred && !reale && "Inserisci il pronostico"}
                        {reale && pred && <span>Tuo: {pred.home}–{pred.away}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {pts !== null && (
                          <span style={{
                            padding: "4px 12px", borderRadius: 20, fontWeight: "bold", fontSize: 13,
                            background: pts >= 7 ? "rgba(0,200,150,0.1)" : pts >= 3 ? "rgba(245,197,24,0.1)" : "rgba(255,80,80,0.1)",
                            color: pts >= 7 ? "#00c896" : pts >= 3 ? "#d4a017" : "#ff5050"
                          }}>{pts === 10 ? "🔥 " : ""}+{pts} pt</span>
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
      )}

      {/* TAB CLASSIFICA */}
      {tab === "classifica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {classificaDemo.map((g, i) => (
            <div key={g.username} style={{
              background: g.isMe ? "rgba(26,107,42,0.08)" : "#fff",
              border: `1px solid ${g.isMe ? "rgba(26,107,42,0.3)" : "#eee"}`,
              borderRadius: 10, padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 16
            }}>
              <div style={{ fontSize: i < 3 ? 28 : 20, width: 36, textAlign: "center", color: i >= 3 ? "#ccc" : "inherit", fontWeight: "bold" }}>
                {["🥇","🥈","🥉"][i] || `${i+1}°`}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: g.isMe ? "#1a6b2a" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, color: g.isMe ? "#fff" : "#999" }}>
                {g.username.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 15, color: "#333" }}>
                  {g.username}
                  {g.isMe && <span style={{ marginLeft: 8, fontSize: 10, background: "#1a6b2a", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>TU</span>}
                </div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{g.partite_g} partite giocate</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: "bold", color: g.isMe ? "#1a6b2a" : "#333" }}>{g.punti}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{punteggioToGol(g.punti)} gol virtuali</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lega;