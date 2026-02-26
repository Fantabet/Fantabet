import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { t } from "../i18n";

const LEAGUE_COLORS = {
  "Serie A": { bg: "#009246", text: "#fff", flag: "🇮🇹" },
  "Premier League": { bg: "#38003c", text: "#00ff85", flag: "🏴" },
  "Champions League": { bg: "#001489", text: "#ffd700", flag: "⭐" },
  "Bundesliga": { bg: "#d00000", text: "#fff", flag: "🇩🇪" },
  "La Liga": { bg: "#ee8700", text: "#fff", flag: "🇪🇸" },
  "Ligue 1": { bg: "#003090", text: "#fff", flag: "🇫🇷" },
  "Europa League": { bg: "#f77f00", text: "#fff", flag: "🟠" },
  "Mondiali": { bg: "#006400", text: "#ffd700", flag: "🌍" },
  "Europei": { bg: "#003399", text: "#ffcc00", flag: "🇪🇺" },
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
  const [classifica, setClassifica] = useState([]);
  const [tab, setTab] = useState("partite");
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);

      const { data: legaData } = await supabase
        .from("leghe")
        .select("*")
        .eq("id", id)
        .single();
      if (!legaData) { window.location.href = "/leghe"; return; }
      setLega(legaData);

      const { data: partiteData } = await supabase
        .from("partite")
        .select("*")
        .order("match_date");
      if (partiteData) setPartite(partiteData);

      // Carica pronostici utente corrente
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

      // Carica classifica reale
      const { data: membri } = await supabase
        .from("membri_lega")
        .select("user_id, profiles(username)")
        .eq("lega_id", id);

      if (membri && partiteData) {
        const classificaCalcolata = await Promise.all(membri.map(async (membro) => {
          const { data: pron } = await supabase
            .from("pronostici")
            .select("*")
            .eq("user_id", membro.user_id)
            .eq("lega_id", id);

          let puntiTotali = 0;
          let partiteGiocate = 0;

          (pron || []).forEach(p => {
            const partita = partiteData.find(pt => pt.id === p.partita_id);
            if (partita && partita.gol_home !== null) {
              const pts = calcPunti(
                { home: p.gol_home, away: p.gol_away },
                partita
              );
              if (pts !== null) {
                puntiTotali += pts;
                partiteGiocate++;
              }
            }
          });

          return {
            user_id: membro.user_id,
            username: membro.profiles?.username || "Utente",
            punti: puntiTotali,
            partite_g: partiteGiocate,
            isMe: membro.user_id === data.user.id,
          };
        }));

        setClassifica(classificaCalcolata.sort((a, b) => b.punti - a.punti));
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

  const partiteLega = lega.competizione && lega.competizione !== "Tutte"
    ? partite.filter(p => p.league === lega.competizione)
    : partite;

  const lc = LEAGUE_COLORS[lega.competizione] || { bg: "#1a6b2a", text: "#fff", flag: "⚽" };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px 60px", fontFamily: "Arial" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/leghe" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← {t("mieLeghe")}</a>
      </div>

      <div style={{ background: lc.bg, borderRadius: 12, padding: "16px 24px", marginBottom: 24, color: "#fff" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{t("lega")}</div>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>{lega.nome}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 20, fontSize: 13, color: "rgba(255,255,255,0.7)", flexWrap: "wrap" }}>
          <span>{lc.flag} {lega.competizione || t("tutteCompetizioni")}</span>
          <span>👥 max {lega.max_partecipanti || 8}</span>
          <span>{lega.modalita === "campionato" ? "⚽ " + t("campionato") : "⭐ " + t("torneo")}</span>
          <span>🔑 <strong style={{ color: "#ffd700", letterSpacing: 2 }}>{lega.codice}</strong></span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f5f5f5", borderRadius: 8, padding: 4 }}>
        {["partite", "classifica"].map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, padding: "10px", borderRadius: 6, border: "none",
            background: tab === tb ? "#fff" : "transparent",
            fontWeight: tab === tb ? "bold" : "normal",
            color: tab === tb ? "#1a6b2a" : "#999",
            cursor: "pointer", fontSize: 14,
            boxShadow: tab === tb ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
          }}>
            {tb === "partite" ? `🗓 ${t("partite")}` : `🏆 ${t("classifica")}`}
          </button>
        ))}
      </div>

      {tab === "partite" && (
        <div>
          {partiteLega.length === 0 ? (
            <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
              {t("nessunaPart")} {lega.competizione}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {partiteLega.map(partita => {
                const pred = pronostici[partita.id];
                const hasPred = pred?.home !== undefined && pred?.away !== undefined;
                const reale = partita.gol_home !== null ? partita : null;
                const pts = reale && pred ? calcPunti(pred, reale) : null;
                const plc = LEAGUE_COLORS[partita.league] || { bg: "#333", text: "#fff", flag: "⚽" };

                return (
                  <div key={partita.id} style={{
                    background: "#fff", color: "#1a1a1a",
                    border: `1px solid ${pts !== null ? (pts >= 7 ? "#00c896" : pts >= 3 ? "#f5c518" : "#ff5050") : "#eee"}`,
                    borderRadius: 12, overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                  }}>
                    <div style={{ background: plc.bg, padding: "6px 16px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: plc.text, fontSize: 12, fontWeight: "bold" }}>{plc.flag} {partita.league}</span>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                        {new Date(partita.match_date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {new Date(partita.match_date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div style={{ padding: "20px 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: "bold", fontSize: 18 }}>{partita.home}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{t("casa")}</div>
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
                              <div style={{ fontSize: 11, color: "#aaa" }}>{t("risultatoFinale")}</div>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: "bold", fontSize: 18 }}>{partita.away}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{t("ospite")}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 12, color: "#aaa" }}>
                          {hasPred && !reale && (salvato[partita.id]
                            ? <span style={{ color: "#1a6b2a" }}>✓ {t("salvato")}: {pred.home}–{pred.away}</span>
                            : <span style={{ color: "#f5a623" }}>● {t("nonSalvato")}</span>)}
                          {!hasPred && !reale && t("inserisciPronostico")}
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
                              {t("salva")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "classifica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {classifica.length === 0 ? (
            <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
              Nessun membro nella lega
            </div>
          ) : (
            classifica.map((g, i) => (
              <div key={g.user_id} style={{
                background: g.isMe ? "rgba(26,107,42,0.08)" : "#fff",
                border: `1px solid ${g.isMe ? "rgba(26,107,42,0.3)" : "#eee"}`,
                borderRadius: 10, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
                color: "#1a1a1a"
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
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{g.partite_g} {t("partiteGiocate")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: "bold", color: g.isMe ? "#1a6b2a" : "#333" }}>{g.punti}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{punteggioToGol(g.punti)} {t("golVirtuali")}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Lega;