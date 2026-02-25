import { useState } from "react";
import { supabase } from "../supabase";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState(false);
  const [caricamento, setCaricamento] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setCaricamento(true);
    setErrore("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setErrore(error.message);
      setCaricamento(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, username });

      if (profileError) {
        setErrore("Username già in uso, scegline un altro");
        setCaricamento(false);
        return;
      }
    }

    setSuccesso(true);
    setCaricamento(false);
  }

  if (successo) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 40, fontFamily: "Arial", background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#1a6b2a" }}>Registrazione completata!</h2>
        <p style={{ color: "#666", marginTop: 8 }}>Controlla la tua email per confermare l'account.</p>
        <a href="/login" style={{ display: "block", marginTop: 24, padding: "12px", background: "#1a6b2a", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 16 }}>Vai al Login</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 40, fontFamily: "Arial", background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <h1 style={{ color: "#1a6b2a", marginBottom: 8 }}>⚽ Fantabet</h1>
      <h2 style={{ marginBottom: 24, fontWeight: 400, color: "#555" }}>Crea il tuo account</h2>

      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            placeholder="es. marco_r"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
          />
        </div>

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
            minLength={6}
            placeholder="minimo 6 caratteri"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
          />
        </div>

        {errore && <p style={{ color: "red", marginBottom: 16, fontSize: 14 }}>{errore}</p>}

        <button
          type="submit"
          disabled={caricamento}
          style={{ width: "100%", padding: "12px", background: "#1a6b2a", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer" }}
        >
          {caricamento ? "Registrazione in corso..." : "Registrati"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "#666" }}>
        Hai già un account? <a href="/login" style={{ color: "#1a6b2a", fontWeight: "bold" }}>Accedi</a>
      </p>
    </div>
  );
}

export default Register;