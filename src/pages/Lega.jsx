import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { t } from "../i18n";
import { generaCalendario, calcolaGol, calcolaClassificaCampionato } from "../calendario";

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

const GIORNATE_PER_COMPETIZIONE = {
  "Serie A": 38,
  "Premier League": 38,
  "Bundesliga": 34,
  "La Liga": 38,
  "Ligue 1": 34,
  "Champions League": 8,
  "Europa League": 8,
  "Mondiali": 7,
  "Europei": 7,
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

function Lega() {
  const { id } = useParams();
  const [lega, setLega] = useState(null);
  const [utente, setUtente] = useState(null);
  const [partite, setPartite] = useState([]);
  const [pronostici, setPronostici] = useState({});
  const [salvato, setSalvato] = useState({});
  const [classifica, setClassifica] = useState([]);
  const [calendarioLega, setCalendarioLega] = useState([]);
  const [membri, setMembri] = useState([]);
  const [tab, setTab] = useState("partite");
  const [giornataSelezionata, setGiornataSelezionata] = useState(1);
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

      // Carica membri
      const { data: membriData } = await supabase
        .from("membri_lega")
        .select("user_id, profiles(username)")
        .eq("lega_id", id);

      const membriList = (membriData || []).map(m => ({
        user_id: m.user_id,
        username: m.profiles?.username || "Utente",
      }));
      setMembri(membriList);

      // Calcola classifica punti pronostici
      if (membriList.length > 0 && partiteData) {
        const classificaCalcolata = await Promise.all(membriList.map(async (membro) => {
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
              const pts = calcPunti({ home: p.gol_home, away: p.gol_away }, partita);
              if (pts !== null) { puntiTotali += pts; partiteGiocate++; }
            }
          });

          return {
            ...membro,
            punti: puntiTotali,
            partite_g: partiteGiocate,
            isMe: membro.user_id === data.user.id,
            gol: calcolaGol(puntiTotali),
          };
        }));
        setClassifica(classificaCalcolata.sort((a, b) => b.punti - a.punti));

        // Carica o genera calendario per modalità campionato
        if (legaData.modalita === "campionato") {
          const { data: calData } = await supabase
            .from("calendario")
            .select("*")
            .eq("lega_id", id)
            .order("giornata");

          if (calData && calData.length > 0) {
            setCalendarioLega(calData);
          } else if (membriList.length >= 2) {
            // Genera calendario
            const giornateDisp = GIORNATE_PER_COMPETIZIONE[legaData.competizione] || 38;
            const nuovoCalendario = generaCalendario(membriList, giornateDisp);

            if (nuovoCalendario.length > 0) {
              const { data: calInserito } = await supabase
                .from("calendario")
                .insert(nuovoCalendario.map(c => ({ ...c, lega_id: id })))
                .select();
              if (calInserito) setCalendarioLega(calInserito);
            }
          }
        }
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
    const { error } = await supabase.from("pronostici").upsert({
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

  const giornateUniche = [...new Set(calendarioLega.map(c => c.giornata))].sort((a, b) => a - b);
  const partiteGiornata = calendarioLega.filter(c => c.giornata === giornataSelezionata);

  const classificaCampionato = calcolaClassificaCampionato(calendarioLega);
  const classificaConNomi = classificaCampionato.map(c => ({
    ...c,
    username: membri.find(m => m.user_id === c.user_id)?.username || "Utente",
    isMe: c.user_id === utente.id,
  }));

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
          <span>👥 {membri.length}/{lega.max_partecipanti}</span>
          <span>{lega.modalita === "campionato" ? "⚽ " + t("campionato") : "⭐ " + t("torneo")}</span>
          <span>🔑 <strong style={{ color: "#ffd700", letterSpacing: 2 }}>{lega.codice}</strong></span>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f5f5f5", borderRadius: 8, padding: 4 }}>
        {["partite", "classifica", ...(lega.modalita === "campionato" ? ["calendario"] : [])].map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, padding: "10px", borderRadius: 6, border: "none",
            background: tab === tb ? "#fff" : "transparent",
            fontWeight: tab === tb ? "bold" : "normal",
            color: tab === tb ? "#1a6b2a" : "#999",
            cursor: "pointer", fontSize: 14,
            boxShadow: tab === tb ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
          }}>
            {tb === "partite" ? `🗓 ${t("partite")}` : tb === "classifica" ? `🏆 ${t("classifica")}` : "📅 Calendario"}
          </button>
        ))}
      </div>

      {/* TAB PARTITE */}
      {tab === "partite" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {partiteLega.length === 0 ? (
            <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
              {t("nessunaPart")} {lega.competizione}
            </div>
          ) : partiteLega.map(partita => {
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

      {/* TAB CLASSIFICA */}
      {tab === "classifica" && (
        <div>
          {lega.modalita === "campionato" && classificaConNomi.length > 0 ? (
            <>
              {/* Classifica campionato V/P/S */}
              <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #eee", marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr repeat(6, auto)", gap: 0, background: "#f5f5f5", padding: "10px 16px", fontSize: 11, color: "#999", fontWeight: "bold", letterSpacing: 1 }}>
                  <div style={{ width: 32 }}>#</div>
                  <div>GIOCATORE</div>
                  <div style={{ width: 32, textAlign: "center" }}>G</div>
                  <div style={{ width: 32, textAlign: "center" }}>V</div>
                  <div style={{ width: 32, textAlign: "center" }}>P</div>
                  <div style={{ width: 32, textAlign: "center" }}>S</div>
                  <div style={{ width: 48, textAlign: "center" }}>GF:GS</div>
                  <div style={{ width: 40, textAlign: "center" }}>PTS</div>
                </div>
                {classificaConNomi.map((g, i) => (
                  <div key={g.user_id} style={{
                    display: "grid", gridTemplateColumns: "auto 1fr repeat(6, auto)",
                    gap: 0, padding: "12px 16px", alignItems: "center",
                    borderTop: "1px solid #f5f5f5",
                    background: g.isMe ? "rgba(26,107,42,0.05)" : "#fff",
                    color: "#1a1a1a"
                  }}>
                    <div style={{ width: 32, fontWeight: "bold", color: "#999", fontSize: 13 }}>{i + 1}</div>
                    <div style={{ fontWeight: g.isMe ? "bold" : "normal", color: g.isMe ? "#1a6b2a" : "#333" }}>
                      {g.username}
                      {g.isMe && <span style={{ marginLeft: 6, fontSize: 9, background: "#1a6b2a", color: "#fff", padding: "1px 5px", borderRadius: 3 }}>TU</span>}
                    </div>
                    <div style={{ width: 32, textAlign: "center", fontSize: 13, color: "#666" }}>{g.v + g.p + g.s}</div>
                    <div style={{ width: 32, textAlign: "center", fontSize: 13, color: "#00c896", fontWeight: "bold" }}>{g.v}</div>
                    <div style={{ width: 32, textAlign: "center", fontSize: 13, color: "#f5a623" }}>{g.p}</div>
                    <div style={{ width: 32, textAlign: "center", fontSize: 13, color: "#ff5050" }}>{g.s}</div>
                    <div style={{ width: 48, textAlign: "center", fontSize: 12, color: "#666" }}>{g.gf}:{g.gs}</div>
                    <div style={{ width: 40, textAlign: "center", fontWeight: "bold", fontSize: 16, color: g.isMe ? "#1a6b2a" : "#333" }}>{g.punti}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {classifica.map((g, i) => (
                <div key={g.user_id} style={{
                  background: g.isMe ? "rgba(26,107,42,0.08)" : "#fff",
                  border: `1px solid ${g.isMe ? "rgba(26,107,42,0.3)" : "#eee"}`,
                  borderRadius: 10, padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 16,
                  color: "#1a1a1a"
                }}>
                  <div style={{ fontSize: i < 3 ? 28 : 20, width: 36, textAlign: "center", fontWeight: "bold", color: i >= 3 ? "#ccc" : "inherit" }}>
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
                    <div style={{ fontSize: 11, color: "#aaa" }}>{g.gol} {t("golVirtuali")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CALENDARIO */}
      {tab === "calendario" && (
        <div>
          {/* Selettore giornata */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {giornateUniche.slice(0, 20).map(g => (
              <button key={g} onClick={() => setGiornataSelezionata(g)} style={{
                padding: "6px 12px", borderRadius: 6,
                border: `1px solid ${giornataSelezionata === g ? "#1a6b2a" : "#ddd"}`,
                background: giornataSelezionata === g ? "#1a6b2a" : "transparent",
                color: giornataSelezionata === g ? "#fff" : "#666",
                cursor: "pointer", fontSize: 13, fontWeight: "bold"
              }}>G{g}</button>
            ))}
          </div>

          {/* Partite della giornata */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {partiteGiornata.map((match, i) => {
              const p1 = membri.find(m => m.user_id === match.player1_id);
              const p2 = membri.find(m => m.user_id === match.player2_id);
              const hasResult = match.gol_player1 > 0 || match.gol_player2 > 0;

              return (
                <div key={i} style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #eee", color: "#1a1a1a" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12, textAlign: "center" }}>
                    Girone {match.girone} · Giornata {match.giornata}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: match.player1_id === utente.id ? "#1a6b2a" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, color: match.player1_id === utente.id ? "#fff" : "#999", margin: "0 auto 8px" }}>
                        {(p1?.username || "?").slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>{p1?.username || "?"}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {hasResult ? (
                        <div style={{ fontSize: 28, fontWeight: "bold" }}>{match.gol_player1} – {match.gol_player2}</div>
                      ) : (
                        <div style={{ fontSize: 22, color: "#ccc" }}>vs</div>
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: match.player2_id === utente.id ? "#1a6b2a" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, color: match.player2_id === utente.id ? "#fff" : "#999", margin: "0 auto 8px" }}>
                        {(p2?.username || "?").slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>{p2?.username || "?"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {partiteGiornata.length === 0 && (
              <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
                Nessuna partita per questa giornata
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Lega;