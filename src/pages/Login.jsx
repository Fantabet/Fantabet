import { useState } from "react";
import { supabase } from "../supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setCaricamento(true);
    setErrore("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrore("Email o password errati");
    } else {
      window.location.href = "/";
    }
    setCaricamento(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 40, fontFamily: "Arial", background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <h1 style={{ color: "#1a6b2a", marginBottom: 8 }}>⚽ Fantabet</h1>
      <h2 style={{ marginBottom: 24, fontWeight: 400, color: "#555" }}>Accedi al tuo account</h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
          />
        </div>

        {errore && <p style={{ color: "red", marginBottom: 16, fontSize: 14 }}>{errore}</p>}

        <button
          type="submit"
          disabled={caricamento}
          style={{ width: "100%", padding: "12px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer" }}
        >
          {caricamento ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "#666" }}>
        Non hai un account? <a href="/register" style={{ color: "#1a6b2a", fontWeight: "bold" }}>Registrati</a>
      </p>
    </div>
  );
}

export default Login;