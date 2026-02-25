import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Home() {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function getUtente() {
      const { data } = await supabase.auth.getUser();
      setUtente(data.user);
      setCaricamento(false);
    }
    getUtente();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUtente(null);
  }

  if (caricamento) {
    return <div style={{ padding: 40, fontFamily: "Arial" }}>Caricamento...</div>;
  }

  if (!utente) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: 40, fontFamily: "Arial", textAlign: "center" }}>
        <h1 style={{ color: "#1a6b2a", fontSize: 48 }}>⚽ Fantabet</h1>
        <h2 style={{ fontWeight: 400, color: "#555", marginBottom: 32 }}>Smettila di parlare. Dimostralo.</h2>
        <a href="/register" style={{ display: "inline-block", padding: "14px 32px", background: "#1a6b2a", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 18, marginRight: 12 }}>
          Registrati gratis
        </a>
        <a href="/login" style={{ display: "inline-block", padding: "14px 32px", background: "transparent", color: "#1a6b2a", borderRadius: 6, textDecoration: "none", fontSize: 18, border: "2px solid #1a6b2a" }}>
          Accedi
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 40, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#1a6b2a" }}>⚽ Fantabet</h1>
        <button
          onClick={handleLogout}
          style={{ padding: "8px 16px", background: "transparent", color: "#999", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
        >
          Esci
        </button>
      </div>

      <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <p style={{ color: "#333", fontSize: 16 }}>👋 Bentornato, <strong>{utente.email}</strong></p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href="/leghe" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20, background: "#fff", border: "1px solid #eee", borderRadius: 10, textDecoration: "none", color: "#333" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 16 }}>🏆 Le mie leghe</div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Crea o entra in una lega con gli amici</div>
          </div>
          <span style={{ color: "#1a6b2a", fontSize: 20 }}>→</span>
        </a>

        <a href="/partite" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20, background: "#fff", border: "1px solid #eee", borderRadius: 10, textDecoration: "none", color: "#333" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 16 }}>⚽ Partite</div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Inserisci i tuoi pronostici</div>
          </div>
          <span style={{ color: "#1a6b2a", fontSize: 20 }}>→</span>
        </a>

        <a href="/classifica" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20, background: "#fff", border: "1px solid #eee", borderRadius: 10, textDecoration: "none", color: "#333" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 16 }}>📊 Classifica</div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Chi è il più bravo?</div>
          </div>
          <span style={{ color: "#1a6b2a", fontSize: 20 }}>→</span>
        </a>
      </div>
    </div>
  );
}

export default Home;