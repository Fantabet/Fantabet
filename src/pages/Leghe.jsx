import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Leghe() {
  const [leghe, setLeghe] = useState([]);
  const [utente, setUtente] = useState(null);
  const [nomeLega, setNomeLega] = useState("");
  const [codiceJoin, setCodiceJoin] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

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
    const { data } = await supabase
      .from("leghe")
      .select("*")
      .eq("creatore_id", userId);
    if (data) setLeghe(data);
  }

  function generaCodice() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function creaLega(e) {
    e.preventDefault();
    setErrore(""); setSuccesso("");
    const codice = generaCodice();
    const { error } = await supabase.from("leghe").insert({
      nome: nomeLega,
      codice,
      creatore_id: utente.id
    });
    if (error) { setErrore("Errore nella creazione della lega"); return; }
    setSuccesso(`Lega "${nomeLega}" creata! Codice: ${codice}`);
    setNomeLega("");
    await caricaLeghe(utente.id);
  }

  async function uniscitiLega(e) {
    e.preventDefault();
    setErrore(""); setSuccesso("");
    const { data, error } = await supabase
      .from("leghe")
      .select("*")
      .eq("codice", codiceJoin.toUpperCase())
      .single();
    if (error || !data) { setErrore("Codice non valido"); return; }
    setSuccesso(`Sei entrato nella lega "${data.nome}"!`);
    setCodiceJoin("");
  }

  if (caricamento) return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 40, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <a href="/" style={{ color: "#999", fontSize: 14, textDecoration: "none" }}>← Home</a>
      </div>

      <h2 style={{ marginBottom: 24 }}>🏆 Le tue leghe</h2>

      {/* Crea lega */}
      <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16, color: "#333" }}>Crea una nuova lega</h3>
        <form onSubmit={creaLega} style={{ display: "flex", gap: 10 }}>
          <input
            value={nomeLega}
            onChange={e => setNomeLega(e.target.value)}
            placeholder="Nome della lega..."
            required
            style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15 }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" }}>
            Crea
          </button>
        </form>
      </div>

      {/* Unisciti */}
      <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16, color: "#333" }}>Entra in una lega</h3>
        <form onSubmit={uniscitiLega} style={{ display: "flex", gap: 10 }}>
          <input
            value={codiceJoin}
            onChange={e => setCodiceJoin(e.target.value.toUpperCase())}
            placeholder="Inserisci codice..."
            required
            maxLength={6}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, letterSpacing: 3, fontWeight: "bold" }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" }}>
            Entra
          </button>
        </form>
      </div>

      {errore && <p style={{ color: "red", marginBottom: 16 }}>{errore}</p>}
      {successo && <p style={{ color: "#1a6b2a", fontWeight: "bold", marginBottom: 16 }}>{successo}</p>}

      {/* Lista leghe */}
      {leghe.length === 0 ? (
        <div style={{ border: "2px dashed #ddd", borderRadius: 10, padding: 32, textAlign: "center", color: "#aaa" }}>
          Non hai ancora creato nessuna lega
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {leghe.map(lega => (
            <a key={lega.id} href={`/lega/${lega.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 16, color: "#333" }}>{lega.nome}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    Codice: <strong style={{ letterSpacing: 2, color: "#1a6b2a" }}>{lega.codice}</strong>
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