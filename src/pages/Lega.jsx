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
  "Serie A": 38, "Premier League": 38, "Bundesliga": 34,
  "La Liga": 38, "Ligue 1": 34, "Champions League": 8,
  "Europa League": 8, "Mondiali": 7, "Europei": 7,
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

      const { data: legaData } = await supabase.from("leghe").select("*").eq("id", id).single();
      if (!legaData) { window.location.href = "/leghe"; return; }
      setLega(legaData);

      const { data: partiteData } = await supabase.from("partite").select("*").order("match_date");
      if (partiteData) setPartite(partiteData);

      const { data: pronosticiData } = await supabase.from("pronostici").select("*").eq("user_id", data.user.id).eq("lega_id", id);
      if (pronosticiData) {
        const map = {};
        pronosticiData.forEach(p => { map[p.partita_id] = { home: p.gol_home, away: p.gol_away }; });
        setPronostici(map);
        setSalvato(Object.fromEntries(pronosticiData.map(p => [p.partita_id, true])));
      }

      const { data: membriData } = await supabase.from("membri_lega").select("user_id, profiles(username)").eq("lega_id", id);
      const membriList = (membriData || []).map(m => ({ user_id: m.user_id, username: m.profiles?.username || "Utente" }));
      setMembri(membriList);

      if (membriList.length > 0 && partiteData) {
        const classificaCalcolata = await Promise.all(membriList.map(async (membro) => {
          const { data: pron } = await supabase.from("pronostici").select("*").eq("user_id", membro.user_id).eq("lega_id", id);
          let puntiTotali = 0, partiteGiocate = 0;
          (pron || []).forEach(p => {
            const partita = partiteData.find(pt => pt.id === p.partita_id);
            if (partita && partita.gol_home !== null) {
              const pts = calcPunti({ home: p.gol_home, away: p.gol_away }, partita);
              if (pts !== null) { puntiTotali += pts; partiteGiocate++; }
            }
          });
          return { ...membro, punti: puntiTotali, partite_g: partiteGiocate, isMe: membro.user_id === data.user.id, gol: punteggioToGol(puntiTotali) };
        }));
        setClassifica(classificaCalcolata.sort((a, b) => b.punti - a.punti));

        if (legaData.modalita === "campionato") {
          const { data: calData } = await supabase.from("calendario").select("*").eq("lega_id", id).order("giornata");
          if (calData && calData.length > 0) {
            setCalendarioLega(calData);
          } else if (membriList.length >= 2) {
            const giornateDisp = GIORNATE_PER_COMPETIZIONE[legaData.competizione] || 38;
            const nuovoCalendario = generaCalendario(membriList, giornateDisp);
            if (nuovoCalendario.length > 0) {
              const { data: calInserito } = await supabase.from("calendario").insert(nuovoCalendario.map(c => ({ ...c, lega_id: id }))).select();
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
      user_id: utente.id, partita_id: partitaId, lega_id: id,
      gol_home: pred.home, gol_away: pred.away,
    }, { onConflict: "user_id,partita_id" });
    if (!error) setSalvato(s => ({ ...s, [partitaId]: true }));
    else alert("Errore nel salvataggio");
  }

  if (caricamento) return (
    <div style={{ background: "var(--crema)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Oswald, sans-serif", color: "var(--verde)", letterSpacing: 3, fontSize: 14 }}>CARICAMENTO...</div>
    </div>
  );

  const partiteLega = lega.competizione && lega.competizione !== "Tutte"
    ? partite.filter(p => p.league === lega.competizione)
    : partite;

  const lc = LEAGUE_COLORS[lega.competizione] || { bg: "var(--verde)", text: "#fff", flag: "⚽" };
  const giornateUniche = [...new Set(calendarioLega.map(c => c.giornata))].sort((a, b) => a - b);
  const partiteGiornata = calendarioLega.filter(c => c.giornata === giornataSelezionata);
  const classificaCampionato = calcolaClassificaCampionato(calendarioLega);
  const classificaConNomi = classificaCampionato.map(c => ({
    ...c,
    username: membri.find(m => m.user_id === c.user_id)?.username || "Utente",
    isMe: c.user_id === utente.id,
  }));

  const tabs = ["partite", "classifica", ...(lega.modalita === "campionato" ? ["calendario"] : [])];

  return (
    <div style={{ minHeight: "100vh", background: "var(--crema)" }}>

      {/* Header */}
      <header style={{ background: "var(--verde)", borderBottom: "4px solid var(--giallo)", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, background: "var(--giallo)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transform: "rotate(-3deg)", boxShadow: "3px 3px 0 rgba(0,0,0,0.3)" }}>⚽</div>
          <div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 34, color: "var(--giallo)", letterSpacing: 3, lineHeight: 1 }}>Fantabet</div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Chi è il più bravo?</div>
          </div>
        </a>
        <a href="/leghe" style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>← {t("mieLeghe")}</a>
      </header>

      {/* Banner lega */}
      <div style={{ background: lc.bg, borderBottom: "4px solid var(--giallo)", padding: "24px 40px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>{t("lega")}</div>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 42, color: "#fff", letterSpacing: 2, lineHeight: 1 }}>{lega.nome}</div>
          <div style={{ display: "flex", gap: 24, marginTop: 8, fontFamily: "Oswald, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", flexWrap: "wrap", letterSpacing: 1 }}>
            <span>{lc.flag} {lega.competizione || t("tutteCompetizioni")}</span>
            <span>{"👥"} {membri.length}/{lega.max_partecipanti}</span>
            <span>{lega.modalita === "campionato" ? "⚽ " + t("campionato") : "⭐ " + t("torneo")}</span>
            <span>{"🔑"} <strong style={{ color: "var(--giallo)", letterSpacing: 4, fontFamily: "Bebas Neue, sans-serif", fontSize: 16 }}>{lega.codice}</strong></span>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div style={{ background: "var(--verde-scuro)", borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex" }}>
          {tabs.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              padding: "14px 28px", border: "none", background: "transparent",
              fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 2,
              color: tab === tb ? "var(--giallo)" : "rgba(255,255,255,0.4)",
              cursor: "pointer", borderBottom: tab === tb ? "3px solid var(--giallo)" : "3px solid transparent",
              textTransform: "uppercase"
            }}>
              {tb === "partite" ? `🗓 ${t("partite")}` : tb === "classifica" ? `🏆 ${t("classifica")}` : "📅 Calendario"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 40px 60px" }}>

        {/* TAB PARTITE */}
        {tab === "partite" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {partiteLega.length === 0 ? (
              <div style={{ border: "3px dashed #ddd", borderRadius: 6, padding: 40, textAlign: "center", color: "var(--grigio-caldo)", fontFamily: "Oswald, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
                {t("nessunaPart")} {lega.competizione}
              </div>
            ) : partiteLega.map(partita => {
              const pred = pronostici[partita.id];
              const hasPred = pred?.home !== undefined && pred?.away !== undefined;
              const reale = partita.gol_home !== null ? partita : null;
              const pts = reale && pred ? calcPunti(pred, reale) : null;
              const plc = LEAGUE_COLORS[partita.league] || { bg: "var(--verde-scuro)", text: "#fff", flag: "⚽" };

              return (
                <div key={partita.id} style={{
                  background: "#fff", border: "2px solid #e8e0d5", borderRadius: 6,
                  overflow: "hidden", boxShadow: "4px 4px 0 rgba(0,0,0,0.08)",
                  borderLeft: pts !== null ? `6px solid ${pts >= 7 ? "#00c896" : pts >= 3 ? "var(--giallo)" : "var(--rosso)"}` : "2px solid #e8e0d5"
                }}>
                  {/* Header partita */}
                  <div style={{ background: plc.bg, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: plc.text, fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>{plc.flag} {partita.league}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Barlow, sans-serif", fontSize: 11 }}>
                      {new Date(partita.match_date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {new Date(partita.match_date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: 1, color: "var(--marrone)" }}>{partita.home}</div>
                        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 10, color: "var(--grigio-caldo)", letterSpacing: 2, textTransform: "uppercase" }}>{t("casa")}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {!reale ? (
                          <>
                            <input type="number" min="0" max="20" value={pred?.home ?? ""}
                              onChange={e => setPred(partita.id, "home", e.target.value)}
                              placeholder="–"
                              style={{ width: 56, height: 56, textAlign: "center", fontSize: 24, fontWeight: "bold", fontFamily: "Bebas Neue, sans-serif", border: `3px solid ${hasPred ? "var(--verde)" : "#ddd"}`, borderRadius: 4, color: "var(--verde)", outline: "none", background: "var(--crema)" }}
                            />
                            <span style={{ color: "#ccc", fontSize: 24, fontFamily: "Bebas Neue, sans-serif" }}>:</span>
                            <input type="number" min="0" max="20" value={pred?.away ?? ""}
                              onChange={e => setPred(partita.id, "away", e.target.value)}
                              placeholder="–"
                              style={{ width: 56, height: 56, textAlign: "center", fontSize: 24, fontWeight: "bold", fontFamily: "Bebas Neue, sans-serif", border: `3px solid ${hasPred ? "var(--verde)" : "#ddd"}`, borderRadius: 4, color: "var(--verde)", outline: "none", background: "var(--crema)" }}
                            />
                          </>
                        ) : (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 36, letterSpacing: 2, color: "var(--marrone)" }}>{reale.gol_home} – {reale.gol_away}</div>
                            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 10, color: "var(--grigio-caldo)", letterSpacing: 2, textTransform: "uppercase" }}>{t("risultatoFinale")}</div>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: 1, color: "var(--marrone)" }}>{partita.away}</div>
                        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 10, color: "var(--grigio-caldo)", letterSpacing: 2, textTransform: "uppercase" }}>{t("ospite")}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0ebe3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontFamily: "Barlow, sans-serif", fontSize: 12, color: "var(--grigio-caldo)", fontStyle: "italic" }}>
                        {hasPred && !reale && (salvato[partita.id]
                          ? <span style={{ color: "var(--verde)" }}>✓ {t("salvato")}: {pred.home}–{pred.away}</span>
                          : <span style={{ color: "var(--giallo-scuro)" }}>● {t("nonSalvato")}</span>)}
                        {!hasPred && !reale && t("inserisciPronostico")}
                        {reale && pred && <span>Tuo: {pred.home}–{pred.away}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {pts !== null && (
                          <span style={{
                            padding: "4px 12px", borderRadius: 2, fontFamily: "Bebas Neue, sans-serif", fontSize: 16, letterSpacing: 1,
                            background: pts >= 7 ? "rgba(0,200,150,0.1)" : pts >= 3 ? "rgba(245,197,24,0.15)" : "rgba(192,57,43,0.1)",
                            color: pts >= 7 ? "#00c896" : pts >= 3 ? "var(--giallo-scuro)" : "var(--rosso)",
                            border: `1px solid ${pts >= 7 ? "#00c896" : pts >= 3 ? "var(--giallo)" : "var(--rosso)"}`
                          }}>{pts === 10 ? "🔥 " : ""}+{pts} PT</span>
                        )}
                        {hasPred && !reale && !salvato[partita.id] && (
                          <button onClick={() => salvaPronostico(partita.id)} style={{ padding: "6px 16px", background: "var(--verde)", color: "var(--giallo)", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "Bebas Neue, sans-serif", fontSize: 16, letterSpacing: 1, boxShadow: "2px 2px 0 var(--verde-scuro)" }}>
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
              <div style={{ background: "#fff", border: "2px solid #e8e0d5", borderRadius: 6, overflow: "hidden", boxShadow: "4px 4px 0 rgba(0,0,0,0.08)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr repeat(6, 36px)", gap: 0, background: "var(--verde-scuro)", padding: "10px 16px" }}>
                  {["#", "GIOCATORE", "G", "V", "P", "S", "GF:GS", "PTS"].map((h, i) => (
                    <div key={i} style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textAlign: i > 1 ? "center" : "left" }}>{h}</div>
                  ))}
                </div>
                {classificaConNomi.map((g, i) => (
                  <div key={g.user_id} style={{
                    display: "grid", gridTemplateColumns: "40px 1fr repeat(6, 36px)",
                    padding: "14px 16px", alignItems: "center",
                    borderTop: "1px solid #f0ebe3",
                    background: g.isMe ? "rgba(26,107,42,0.05)" : "#fff"
                  }}>
                    <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 18, color: i < 3 ? "var(--giallo-scuro)" : "var(--grigio-caldo)" }}>{i + 1}</div>
                    <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 15, color: g.isMe ? "var(--verde)" : "var(--marrone)", fontWeight: g.isMe ? "bold" : "normal", letterSpacing: 1 }}>
                      {g.username}
                      {g.isMe && <span style={{ marginLeft: 8, fontSize: 9, background: "var(--verde)", color: "#fff", padding: "2px 6px", borderRadius: 2 }}>TU</span>}
                    </div>
                    {[g.v + g.p + g.s, g.v, g.p, g.s, `${g.gf}:${g.gs}`, g.punti].map((val, j) => (
                      <div key={j} style={{ textAlign: "center", fontFamily: j === 5 ? "Bebas Neue, sans-serif" : "Oswald, sans-serif", fontSize: j === 5 ? 20 : 13, color: j === 1 ? "#00c896" : j === 3 ? "var(--rosso)" : j === 5 ? (g.isMe ? "var(--verde)" : "var(--marrone)") : "var(--grigio-caldo)", fontWeight: j === 5 ? "bold" : "normal" }}>{val}</div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {classifica.map((g, i) => (
                  <div key={g.user_id} style={{
                    background: g.isMe ? "rgba(26,107,42,0.06)" : "#fff",
                    border: `2px solid ${g.isMe ? "rgba(26,107,42,0.3)" : "#e8e0d5"}`,
                    borderRadius: 6, padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 16,
                    boxShadow: "3px 3px 0 rgba(0,0,0,0.06)"
                  }}>
                    <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: i < 3 ? 32 : 22, width: 40, textAlign: "center", color: i < 3 ? "var(--giallo-scuro)" : "var(--grigio-caldo)" }}>
                      {["🥇","🥈","🥉"][i] || `${i+1}°`}
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: g.isMe ? "var(--verde)" : "var(--crema)", border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 16, color: g.isMe ? "var(--giallo)" : "var(--grigio-caldo)" }}>
                      {g.username.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 16, color: "var(--marrone)", letterSpacing: 1 }}>
                        {g.username}
                        {g.isMe && <span style={{ marginLeft: 8, fontSize: 9, background: "var(--verde)", color: "#fff", padding: "2px 6px", borderRadius: 2 }}>TU</span>}
                      </div>
                      <div style={{ fontFamily: "Barlow, sans-serif", fontSize: 12, color: "var(--grigio-caldo)", fontStyle: "italic", marginTop: 2 }}>{g.partite_g} {t("partiteGiocate")}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, color: g.isMe ? "var(--verde)" : "var(--marrone)", letterSpacing: 1 }}>{g.punti}</div>
                      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, color: "var(--grigio-caldo)", letterSpacing: 1 }}>{g.gol} {t("golVirtuali")}</div>
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
            <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
              {giornateUniche.slice(0, 20).map(g => (
                <button key={g} onClick={() => setGiornataSelezionata(g)} style={{
                  padding: "6px 14px", borderRadius: 4,
                  border: `2px solid ${giornataSelezionata === g ? "var(--verde)" : "#ddd"}`,
                  background: giornataSelezionata === g ? "var(--verde)" : "transparent",
                  color: giornataSelezionata === g ? "var(--giallo)" : "var(--grigio-caldo)",
                  cursor: "pointer", fontFamily: "Bebas Neue, sans-serif", fontSize: 16, letterSpacing: 1
                }}>G{g}</button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {partiteGiornata.map((match, i) => {
                const p1 = membri.find(m => m.user_id === match.player1_id);
                const p2 = membri.find(m => m.user_id === match.player2_id);
                const hasResult = match.gol_player1 > 0 || match.gol_player2 > 0;

                return (
                  <div key={i} style={{ background: "#fff", border: "2px solid #e8e0d5", borderRadius: 6, padding: 24, boxShadow: "4px 4px 0 rgba(0,0,0,0.08)" }}>
                    <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, color: "var(--grigio-caldo)", marginBottom: 16, textAlign: "center", letterSpacing: 2, textTransform: "uppercase" }}>
                      Girone {match.girone} · Giornata {match.giornata}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: match.player1_id === utente.id ? "var(--verde)" : "var(--crema)", border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 16, color: match.player1_id === utente.id ? "var(--giallo)" : "var(--grigio-caldo)", margin: "0 auto 8px" }}>
                          {(p1?.username || "?").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "var(--marrone)", letterSpacing: 1 }}>{p1?.username || "?"}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        {hasResult
                          ? <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, color: "var(--marrone)", letterSpacing: 2 }}>{match.gol_player1} – {match.gol_player2}</div>
                          : <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 24, color: "var(--grigio-caldo)", letterSpacing: 2 }}>VS</div>
                        }
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: match.player2_id === utente.id ? "var(--verde)" : "var(--crema)", border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 16, color: match.player2_id === utente.id ? "var(--giallo)" : "var(--grigio-caldo)", margin: "0 auto 8px" }}>
                          {(p2?.username || "?").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 14, color: "var(--marrone)", letterSpacing: 1 }}>{p2?.username || "?"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {partiteGiornata.length === 0 && (
                <div style={{ border: "3px dashed #ddd", borderRadius: 6, padding: 40, textAlign: "center", color: "var(--grigio-caldo)", fontFamily: "Oswald, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
                  Nessuna partita per questa giornata
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lega;