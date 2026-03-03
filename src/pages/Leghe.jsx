import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { t } from "../i18n";

const COMPETIZIONI = [
  { value: "Serie A", label: "🇮🇹 Serie A", modalita: "campionato" },
  { value: "Premier League", label: "🏴 Premier League", modalita: "campionato" },
  { value: "Bundesliga", label: "🇩🇪 Bundesliga", modalita: "campionato" },
  { value: "La Liga", label: "🇪🇸 La Liga", modalita: "campionato" },
  { value: "Ligue 1", label: "🇫🇷 Ligue 1", modalita: "campionato" },
  { value: "Champions League", label: "⭐ Champions League", modalita: "torneo" },
  { value: "Europa League", label: "🟠 Europa League", modalita: "torneo" },
  { value: "Mondiali", label: "🌍 Mondiali", modalita: "torneo" },
  { value: "Europei", label: "🇪🇺 Europei", modalita: "torneo" },
];

const LEAGUE_COLORS = {
  "Serie A": "#009246",
  "Premier League": "#38003c",
  "Champions League": "#001489",
  "Bundesliga": "#d00000",
  "La Liga": "#ee8700",
  "Ligue 1": "#003090",
  "Europa League": "#f77f00",
  "Mondiali": "#006400",
  "Europei": "#003399",
};

function Leghe() {
  const [leghe, setLeghe] = useState([]);
  const [utente, setUtente] = useState(null);
  const [nomeLega, setNomeLega] = useState("");
  const [competizione, setCompetizione] = useState("Serie A");
  const [maxPartecipanti, setMaxPartecipanti] = useState(8);
  const [codiceJoin, setCodiceJoin] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [mostraForm, setMostraForm] = useState(false);

  const modalitaAuto = COMPETIZIONI.find(c => c.value === competizione)?.modalita || "campionato";

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);
      await caricaLeghe(data.user.id);
      setCaricamento(false);
    }
    init();
  }, []);

  async function caricaLeghe(userId) {
    const { data: legheCreate } = await supabase.from("leghe").select("*").eq("creatore_id", userId);
    const { data: membranze } = await supabase.from("membri_lega").select("lega_id, leghe(*)").eq("user_id", userId);
    const legheJoin = membranze?.map(m => m.leghe) || [];
    const tuttiIds = new Set((legheCreate || []).map(l => l.id));
    const legheExtra = legheJoin.filter(l => !tuttiIds.has(l.id));
    setLeghe([...(legheCreate || []), ...legheExtra]);
  }

  function generaCodice() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function creaLega(e) {
    e.preventDefault();
    setErrore(""); setSuccesso("");
    const codice = generaCodice();
    const { data, error } = await supabase.from("leghe").insert({
      nome: nomeLega, codice, creatore_id: utente.id,
      competizione, modalita: modalitaAuto, max_partecipanti: maxPartecipanti,
    }).select().single();
    if (error) { setErrore("Errore nella creazione"); return; }
    await supabase.from("membri_lega").insert({ lega_id: data.id, user_id: utente.id });
    setSuccesso(`Lega "${nomeLega}" creata! Codice: ${codice}`);
    setNomeLega("");
    setMostraForm(false);
    await caricaLeghe(utente.id);
  }

  async function uniscitiLega(e) {
    e.preventDefault();
    setErrore(""); setSuccesso("");
    const { data: legaData, error } = await supabase.from("leghe").select("*").eq("codice", codiceJoin.toUpperCase()).single();
    if (error || !legaData) { setErrore("Codice non valido"); return; }
    const { data: giaMembro } = await supabase.from("membri_lega").select("id").eq("lega_id", legaData.id).eq("user_id", utente.id).single();
    if (giaMembro) { setErrore("Sei già in questa lega!"); return; }
    const { count } = await supabase.from("membri_lega").select("id", { count: "exact" }).eq("lega_id", legaData.id);
    if (count >= legaData.max_partecipanti) { setErrore("Lega al completo!"); return; }
    const { error: joinError } = await supabase.from("membri_lega").insert({ lega_id: legaData.id, user_id: utente.id });
    if (joinError) { setErrore("Errore nell'iscrizione"); return; }
    setSuccesso(`Sei entrato nella lega "${legaData.nome}"!`);
    setCodiceJoin("");
    await caricaLeghe(utente.id);
  }

  if (caricamento) return (
    <div style={{ background: "var(--crema)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Oswald, sans-serif", color: "var(--verde)", letterSpacing: 3, fontSize: 14 }}>CARICAMENTO...</div>
    </div>
  );

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
        <a href="/" style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>← Home</a>
      </header>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 40px" }}>

        {/* Titolo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "var(--grigio-caldo)", marginBottom: 4 }}>Le tue leghe</div>
            <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "var(--marrone)", letterSpacing: 2, lineHeight: 1 }}>🏆 {t("mieLeghe")}</h1>
          </div>
          <button onClick={() => setMostraForm(!mostraForm)} style={{
            padding: "10px 20px", background: mostraForm ? "var(--marrone)" : "var(--verde)",
            color: mostraForm ? "#fff" : "var(--giallo)", border: "none", borderRadius: 4,
            fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 2,
            cursor: "pointer", boxShadow: "3px 3px 0 rgba(0,0,0,0.2)"
          }}>
            {mostraForm ? "✕ Annulla" : `+ ${t("creaLega")}`}
          </button>
        </div>

        {/* Form crea lega */}
        {mostraForm && (
          <div style={{ background: "#fff", border: "3px solid var(--marrone)", borderRadius: 6, padding: 28, marginBottom: 24, boxShadow: "6px 6px 0 rgba(0,0,0,0.15)" }}>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 24, letterSpacing: 2, color: "var(--marrone)", marginBottom: 20 }}>Nuova lega</div>
            <form onSubmit={creaLega}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--grigio-caldo)" }}>{t("nomeLega")}</label>
                <input value={nomeLega} onChange={e => setNomeLega(e.target.value)} placeholder="Es. Serie & Friends" required
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 4, border: "2px solid #ddd", fontSize: 16, fontFamily: "Barlow, sans-serif", boxSizing: "border-box", background: "var(--crema)" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--grigio-caldo)" }}>{t("competizione")}</label>
                <select value={competizione} onChange={e => setCompetizione(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 4, border: "2px solid #ddd", fontSize: 16, fontFamily: "Barlow, sans-serif", boxSizing: "border-box", background: "var(--crema)" }}>
                  <optgroup label="🏆 Campionati">
                    {COMPETIZIONI.filter(c => c.modalita === "campionato").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="⭐ Tornei">
                    {COMPETIZIONI.filter(c => c.modalita === "torneo").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                </select>
              </div>

              <div style={{ marginBottom: 16, background: modalitaAuto === "campionato" ? "rgba(26,107,42,0.08)" : "rgba(0,20,137,0.08)", borderRadius: 4, padding: "10px 14px", border: `2px solid ${modalitaAuto === "campionato" ? "rgba(26,107,42,0.2)" : "rgba(0,20,137,0.2)"}` }}>
                <span style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, color: modalitaAuto === "campionato" ? "var(--verde)" : "#001489", fontWeight: "bold", letterSpacing: 1 }}>
                  {modalitaAuto === "campionato" ? `⚽ ${t("modalitaCampionato")}` : `⭐ ${t("modalitaTorneo")}`}
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 10, fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--grigio-caldo)" }}>{t("partecipanti")}</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[4, 6, 8, 10, 12, 16].map(n => (
                    <button key={n} type="button" onClick={() => setMaxPartecipanti(n)} style={{
                      padding: "8px 16px", borderRadius: 4, border: `2px solid ${maxPartecipanti === n ? "var(--verde)" : "#ddd"}`,
                      background: maxPartecipanti === n ? "var(--verde)" : "transparent",
                      color: maxPartecipanti === n ? "var(--giallo)" : "var(--grigio-caldo)",
                      cursor: "pointer", fontFamily: "Bebas Neue, sans-serif", fontSize: 20, letterSpacing: 1
                    }}>{n}</button>
                  ))}
                </div>
              </div>

              <button type="submit" style={{ width: "100%", padding: 14, background: "var(--verde)", color: "var(--giallo)", border: "none", borderRadius: 4, fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: 2, cursor: "pointer", boxShadow: "4px 4px 0 var(--verde-scuro)" }}>
                {t("creaLega")}
              </button>
            </form>
          </div>
        )}

        {/* Form entra lega */}
        <div style={{ background: "#fff", border: "2px solid #ddd", borderRadius: 6, padding: 20, marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 6, fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--grigio-caldo)" }}>{t("entraLega")}</label>
            <input value={codiceJoin} onChange={e => setCodiceJoin(e.target.value.toUpperCase())}
              placeholder={t("inserisciCodice")} maxLength={6}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 4, border: "2px solid #ddd", fontSize: 20, fontFamily: "Bebas Neue, sans-serif", letterSpacing: 4, boxSizing: "border-box", background: "var(--crema)" }} />
          </div>
          <button onClick={uniscitiLega} style={{ padding: "12px 24px", background: "var(--marrone)", color: "#fff", border: "none", borderRadius: 4, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 2, cursor: "pointer", boxShadow: "3px 3px 0 rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
            Entra →
          </button>
        </div>

        {errore && <div style={{ padding: "12px 16px", background: "rgba(192,57,43,0.1)", border: "2px solid var(--rosso)", borderRadius: 4, marginBottom: 16, fontFamily: "Oswald, sans-serif", fontSize: 14, color: "var(--rosso)", letterSpacing: 1 }}>{errore}</div>}
        {successo && <div style={{ padding: "12px 16px", background: "rgba(26,107,42,0.1)", border: "2px solid var(--verde)", borderRadius: 4, marginBottom: 16, fontFamily: "Oswald, sans-serif", fontSize: 14, color: "var(--verde)", letterSpacing: 1 }}>{successo}</div>}

        {/* Lista leghe */}
        {leghe.length === 0 ? (
          <div style={{ border: "3px dashed #ddd", borderRadius: 6, padding: 40, textAlign: "center", color: "var(--grigio-caldo)", fontFamily: "Oswald, sans-serif", letterSpacing: 2, textTransform: "uppercase", fontSize: 14 }}>
            {t("nonHaiLeghe")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leghe.map(lega => (
              <a key={lega.id} href={`/lega/${lega.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#fff", border: "2px solid #e8e0d5", borderRadius: 6, padding: "20px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  boxShadow: "4px 4px 0 rgba(0,0,0,0.08)", transition: "all 0.15s",
                  borderLeft: `6px solid ${LEAGUE_COLORS[lega.competizione] || "var(--verde)"}`
                }}>
                  <div>
                    <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 24, letterSpacing: 2, color: "var(--marrone)" }}>{lega.nome}</div>
                    <div style={{ display: "flex", gap: 16, marginTop: 4, fontFamily: "Oswald, sans-serif", fontSize: 12, color: "var(--grigio-caldo)", letterSpacing: 1, textTransform: "uppercase" }}>
                      <span>{lega.competizione || "Tutte"}</span>
                      <span>👥 max {lega.max_partecipanti || 8}</span>
                      <span>🔑 <strong style={{ letterSpacing: 3, color: "var(--verde)" }}>{lega.codice}</strong></span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, color: "var(--verde)" }}>→</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leghe;