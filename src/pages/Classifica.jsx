import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const CLASSIFICA_DEMO = [
  { username: "marco_r", punti: 142, partite: 18, trend: "+8" },
  { username: "diego", punti: 128, partite: 18, trend: "+5", isMe: true },
  { username: "giulia_t", punti: 115, partite: 17, trend: "+10" },
  { username: "luca_m", punti: 98, partite: 16, trend: "+3" },
  { username: "sara_b", punti: 74, partite: 15, trend: "0" },
];

function Classifica() {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUtente(data.user);
      setCaricamento(false);
    }
    init();
  }, []);

  if (caricamento) return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;

  const medaglie = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px 60px", fontFamily: "Arial" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← Home</a>
      </div>

      <h2 style={{ marginBottom: 8 }}>🏆 Classifica</h2>

      {/* Lega attiva */}
      <div style={{ background: "#1a6b2a", borderRadius: 10, padding: "14px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Lega attiva</div>
          <div style={{ color: "#ffd700", fontWeight: "bold", fontSize: 18 }}>⚽ Serie & Friends</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Giornata</div>
          <div style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>28</div>
        </div>
      </div>

      {/* Classifica */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CLASSIFICA_DEMO.map((giocatore, i) => (
          <div key={giocatore.username} style={{
            background: giocatore.isMe ? "rgba(26,107,42,0.08)" : "#fff",
            border: `1px solid ${giocatore.isMe ? "rgba(26,107,42,0.3)" : "#eee"}`,
            borderRadius: 10, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
          }}>
            {/* Posizione */}
            <div style={{ fontSize: i < 3 ? 28 : 20, width: 36, textAlign: "center", color: i < 3 ? "inherit" : "#ccc", fontWeight: "bold" }}>
              {i < 3 ? medaglie[i] : `${i + 1}°`}
            </div>

            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: giocatore.isMe ? "#1a6b2a" : "#f0f0f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", fontSize: 14,
              color: giocatore.isMe ? "#fff" : "#999"
            }}>
              {giocatore.username.slice(0, 2).toUpperCase()}
            </div>

            {/* Nome */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: 15, color: "#333" }}>
                {giocatore.username}
                {giocatore.isMe && <span style={{ marginLeft: 8, fontSize: 10, background: "#1a6b2a", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>TU</span>}
              </div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{giocatore.partite} partite giocate</div>
            </div>

            {/* Punti e trend */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: "bold", color: giocatore.isMe ? "#1a6b2a" : "#333" }}>
                {giocatore.punti}
              </div>
              <div style={{ fontSize: 11, color: giocatore.trend.startsWith("+") ? "#00c896" : "#aaa" }}>
                {giocatore.trend} questa sett.
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra progressi */}
      <div style={{ marginTop: 24, background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 13, color: "#999", marginBottom: 16, fontWeight: "bold" }}>ANDAMENTO</div>
        {CLASSIFICA_DEMO.map((g, i) => (
          <div key={g.username} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: g.isMe ? "#1a6b2a" : "#666" }}>{g.username}</span>
              <span style={{ fontSize: 12, color: "#aaa" }}>{g.punti}pt</span>
            </div>
            <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(g.punti / 142) * 100}%`,
                background: g.isMe ? "linear-gradient(90deg, #1a6b2a, #2d8b45)" : "#ddd",
                borderRadius: 3,
                transition: "width 0.8s ease"
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Classifica;