import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { getRisultati, LEAGUE_IDS } from "../api";

const COMPETIZIONI = Object.keys(LEAGUE_IDS);

function Admin() {
  const [utente, setUtente] = useState(null);
  const [competizione, setCompetizione] = useState("Serie A");
  const [giornata, setGiornata] = useState(27);
  const [partiteAPI, setPartiteAPI] = useState([]);
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);
    }
    init();
  }, []);

  async function cercaPartite() {
    setCaricamento(true);
    setMessaggio("");
    setPartiteAPI([]);
    try {
      const partite = await getRisultati(competizione, giornata);
      setPartiteAPI(partite);
      if (partite.length === 0) setMessaggio("Nessuna partita trovata.");
    } catch (e) {
      setMessaggio("Errore: " + e.message);
    }
    setCaricamento(false);
  }

  async function salvaPartite() {
    setCaricamento(true);
    setMessaggio("");
    let salvate = 0;
    let errori = 0;

    for (const p of partiteAPI) {
      const { error } = await supabase
        .from("partite")
        .upsert({
          id_esterno: p.id_esterno,
          home: p.home,
          away: p.away,
          league: p.league,
          match_date: p.match_date,
          gol_home: p.gol_home,
          gol_away: p.gol_away,
        }, { onConflict: "id_esterno" });

      if (error) errori++;
      else salvate++;
    }

    setMessaggio(`✅ ${salvate} partite salvate. ${errori > 0 ? `❌ ${errori} errori.` : ""}`);
    setCaricamento(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 40, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet — Admin</h1>
        <a href="/" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← Home</a>
      </div>

      <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20 }}>📥 Carica partite da API</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#666" }}>Competizione</label>
            <select value={competizione} onChange={e => setCompetizione(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}>
              {COMPETIZIONI.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#666" }}>Giornata</label>
            <input type="number" min="1" max="38" value={giornata} onChange={e => setGiornata(parseInt(e.target.value))}
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
          </div>
        </div>

        <button onClick={cercaPartite} disabled={caricamento}
          style={{ padding: "10px 24px", background: "#333", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer", marginRight: 10 }}>
          {caricamento ? "Caricamento..." : "🔍 Cerca partite"}
        </button>

        {partiteAPI.length > 0 && (
          <button onClick={salvaPartite} disabled={caricamento}
            style={{ padding: "10px 24px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>
            💾 Salva {partiteAPI.length} partite nel database
          </button>
        )}
      </div>

      {messaggio && (
        <div style={{ padding: 16, background: "#f0fff4", border: "1px solid #1a6b2a", borderRadius: 8, marginBottom: 20, color: "#1a6b2a", fontWeight: "bold" }}>
          {messaggio}
        </div>
      )}

      {partiteAPI.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#f5f5f5", fontWeight: "bold", fontSize: 13, color: "#666" }}>
            {partiteAPI.length} partite trovate — {competizione} Giornata {giornata}
          </div>
          {partiteAPI.map((p, i) => (
            <div key={i} style={{ padding: "12px 20px", borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#333" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: "bold" }}>{p.home}</span>
                <span style={{ color: "#aaa", margin: "0 8px" }}>vs</span>
                <span style={{ fontWeight: "bold" }}>{p.away}</span>
              </div>
              <div style={{ fontSize: 12, color: "#aaa", marginRight: 16 }}>
                {new Date(p.match_date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {new Date(p.match_date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {p.gol_home !== null && (
                <div style={{ fontWeight: "bold", color: "#1a6b2a", marginRight: 12 }}>{p.gol_home} – {p.gol_away}</div>
              )}
              <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: p.status === "FINISHED" ? "#e8f5e9" : "#f5f5f5", color: p.status === "FINISHED" ? "#1a6b2a" : "#999" }}>
                {p.status === "FINISHED" ? "✓" : p.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Admin;