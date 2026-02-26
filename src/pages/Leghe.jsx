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
    // Carica leghe create dall'utente
    const { data: legheCreate } = await supabase
      .from("leghe")
      .select("*")
      .eq("creatore_id", userId);

    // Carica leghe a cui l'utente si è unito
    const { data: membranze } = await supabase
      .from("membri_lega")
      .select("lega_id, leghe(*)")
      .eq("user_id", userId);

    const legheJoin = membranze?.map(m => m.leghe) || [];

    // Unisci evitando duplicati
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
      nome: nomeLega,
      codice,
      creatore_id: utente.id,
      competizione,
      modalita: modalitaAuto,
      max_partecipanti: maxPartecipanti,
    }).select().single();

    if (error) { setErrore("Errore nella creazione della lega"); return; }

    // Aggiungi il creatore come membro
    await supabase.from("membri_lega").insert({
      lega_id: data.id,
      user_id: utente.id,
    });

    setSuccesso(`Lega "${nomeLega}" creata! Codice: ${codice}`);
    setNomeLega("");
    setMostraForm(false);
    await caricaLeghe(utente.id);
  }

  async function uniscitiLega(e) {
    e.preventDefault();
    setErrore(""); setSuccesso("");

    const { data: legaData, error } = await supabase
      .from("leghe")
      .select("*")
      .eq("codice", codiceJoin.toUpperCase())
      .single();

    if (error || !legaData) { setErrore("Codice non valido"); return; }

    // Controlla se già membro
    const { data: giaMembro } = await supabase
      .from("membri_lega")
      .select("id")
      .eq("lega_id", legaData.id)
      .eq("user_id", utente.id)
      .single();

    if (giaMembro) { setErrore("Sei già in questa lega!"); return; }

    // Controlla se lega piena
    const { count } = await supabase
      .from("membri_lega")
      .select("id", { count: "exact" })
      .eq("lega_id", legaData.id);

    if (count >= legaData.max_partecipanti) { setErrore("Lega al completo!"); return; }

    // Aggiungi membro
    const { error: joinError } = await supabase.from("membri_lega").insert({
      lega_id: legaData.id,
      user_id: utente.id,
    });

    if (joinError) { setErrore("Errore nell'iscrizione"); return; }

    setSuccesso(`Sei entrato nella lega "${legaData.nome}"!`);
    setCodiceJoin("");
    await caricaLeghe(utente.id);
  }

  if (caricamento) return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 40, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← {t("home")}</a>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2>🏆 {t("mieLeghe")}</h2>
        <button onClick={() => setMostraForm(!mostraForm)} style={{ padding: "10px 20px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>
          {mostraForm ? "✕ Annulla" : `+ ${t("creaLega")}`}
        </button>
      </div>

      {mostraForm && (
        <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20, color: "#333" }}>Nuova lega</h3>
          <form onSubmit={creaLega}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>{t("nomeLega")}</label>
              <input value={nomeLega} onChange={e => setNomeLega(e.target.value)} placeholder="Es. Serie & Friends" required
                style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>{t("competizione")}</label>
              <select value={competizione} onChange={e => setCompetizione(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box", background: "#fff" }}>
                <optgroup label="🏆 Campionati">
                  {COMPETIZIONI.filter(c => c.modalita === "campionato").map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="⭐ Tornei">
                  {COMPETIZIONI.filter(c => c.modalita === "torneo").map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div style={{ marginBottom: 16, background: modalitaAuto === "campionato" ? "rgba(26,107,42,0.08)" : "rgba(0,20,137,0.08)", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ fontSize: 13, color: modalitaAuto === "campionato" ? "#1a6b2a" : "#001489", fontWeight: "bold" }}>
                {modalitaAuto === "campionato" ? `⚽ ${t("modalitaCampionato")}` : `⭐ ${t("modalitaTorneo")}`}
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>{t("partecipanti")}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[4, 6, 8, 10, 12, 16].map(n => (
                  <button key={n} type="button" onClick={() => setMaxPartecipanti(n)} style={{
                    padding: "8px 16px", borderRadius: 6,
                    border: `2px solid ${maxPartecipanti === n ? "#1a6b2a" : "#ddd"}`,
                    background: maxPartecipanti === n ? "#1a6b2a" : "transparent",
                    color: maxPartecipanti === n ? "#fff" : "#666",
                    cursor: "pointer", fontWeight: "bold", fontSize: 15
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <button type="submit" style={{ width: "100%", padding: "12px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer" }}>
              {t("creaLega")}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16, color: "#333" }}>{t("entraLega")}</h3>
        <form onSubmit={uniscitiLega} style={{ display: "flex", gap: 10 }}>
          <input value={codiceJoin} onChange={e => setCodiceJoin(e.target.value.toUpperCase())}
            placeholder={t("inserisciCodice")} required maxLength={6}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, letterSpacing: 3, fontWeight: "bold" }} />
          <button type="submit" style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" }}>
            Entra
          </button>
        </form>
      </div>

      {errore && <p style={{ color: "red", marginBottom: 16 }}>{errore}</p>}
      {successo && <p style={{ color: "#1a6b2a", fontWeight: "bold", marginBottom: 16 }}>{successo}</p>}

      {leghe.length === 0 ? (
        <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
          {t("nonHaiLeghe")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {leghe.map(lega => (
            <a key={lega.id} href={`/lega/${lega.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 16, color: "#333" }}>{lega.nome}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4, display: "flex", gap: 12 }}>
                    <span>{lega.competizione || "Tutte"}</span>
                    <span>👥 max {lega.max_partecipanti || 8}</span>
                    <span>🔑 <strong style={{ letterSpacing: 2, color: "#1a6b2a" }}>{lega.codice}</strong></span>
                  </div>
                </div>
                <span style={{ color: "#1a6b2a", fontSize: 20 }}>→</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leghe;