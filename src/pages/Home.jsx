import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { t } from "../i18n";
import LinguaSelector from "../LinguaSelector";

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

  if (caricamento) return (
    <div style={{ background: "var(--crema)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Barlow, sans-serif" }}>
      <div style={{ fontFamily: "Oswald, sans-serif", color: "var(--verde)", letterSpacing: 3, fontSize: 14 }}>CARICAMENTO...</div>
    </div>
  );

  if (!utente) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--crema)" }}>
        {/* Header */}
        <header style={{ background: "var(--verde)", borderBottom: "4px solid var(--giallo)", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, background: "var(--giallo)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transform: "rotate(-3deg)", boxShadow: "3px 3px 0 rgba(0,0,0,0.3)" }}>⚽</div>
            <div>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 34, color: "var(--giallo)", letterSpacing: 3, lineHeight: 1 }}>Fantabet</div>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Chi è il più bravo?</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LinguaSelector />
            <a href="/login" style={{ padding: "9px 20px", border: "2px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", borderRadius: 4, fontFamily: "Oswald, sans-serif", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>{t("accedi")}</a>
            <a href="/register" style={{ padding: "10px 24px", background: "var(--giallo)", color: "var(--verde-scuro)", border: "none", borderRadius: 4, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: 2, boxShadow: "3px 3px 0 var(--giallo-scuro)" }}>{t("registrati")}</a>
          </div>
        </header>

        {/* Hero */}
        <div style={{ background: "var(--verde)", padding: "80px 40px 60px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.03) 60px, rgba(255,255,255,0.03) 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.03) 60px, rgba(255,255,255,0.03) 61px)" }} />
          <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 2, textAlign: "center" }}>
            <div style={{ display: "inline-block", background: "var(--giallo)", color: "var(--verde-scuro)", fontFamily: "Oswald, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", padding: "5px 12px", borderRadius: 2, marginBottom: 20, transform: "rotate(-1deg)" }}>
              Stagione 2025/26
            </div>
            <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px, 10vw, 90px)", lineHeight: 0.92, color: "#fff", letterSpacing: 2, marginBottom: 16 }}>
              Smettila di<br /><span style={{ color: "var(--giallo)" }}>parlare.</span><br />Dimostralo.
            </h1>
            <p style={{ fontFamily: "Barlow, sans-serif", fontSize: 18, fontStyle: "italic", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 36, maxWidth: 420, margin: "0 auto 36px" }}>
              Pronostici sul risultato esatto. Leghe private con gli amici. La classifica non mente.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ padding: "16px 36px", background: "var(--giallo)", color: "var(--verde-scuro)", borderRadius: 4, fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: 2, boxShadow: "5px 5px 0 var(--giallo-scuro)" }}>
                Crea la tua lega — è gratis
              </a>
              <a href="/login" style={{ padding: "16px 36px", border: "2px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 4, fontFamily: "Oswald, sans-serif", fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>
                {t("accedi")}
              </a>
            </div>
            <p style={{ marginTop: 16, fontFamily: "Oswald, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
              ✓ Pronto in 30 secondi · ✓ Nessuna carta di credito
            </p>
          </div>
        </div>

        {/* Come funziona */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "var(--grigio-caldo)", marginBottom: 8 }}>Come funziona</div>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "var(--marrone)", letterSpacing: 2 }}>In <span style={{ color: "var(--verde)" }}>3 mosse</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              { n: "1", titolo: "Crea la lega", desc: "Dai un nome, condividi il codice agli amici. In 30 secondi siete tutti dentro." },
              { n: "2", titolo: "Pronostica", desc: "Inserisci il risultato esatto per ogni partita. Prima del fischio — niente scuse dopo." },
              { n: "3", titolo: "Vinci o perdi", desc: "I punti arrivano in automatico. La classifica non mente. Chi sapeva davvero è lì in cima." },
            ].map(s => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, background: "var(--verde)", color: "var(--giallo)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 32, margin: "0 auto 16px", boxShadow: "4px 4px 0 var(--verde-scuro)" }}>{s.n}</div>
                <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 20, fontWeight: 600, color: "var(--marrone)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{s.titolo}</div>
                <p style={{ fontSize: 15, color: "var(--grigio-caldo)", lineHeight: 1.6, fontStyle: "italic" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--crema)" }}>
      {/* Header */}
      <header style={{ background: "var(--verde)", borderBottom: "4px solid var(--giallo)", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, background: "var(--giallo)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transform: "rotate(-3deg)", boxShadow: "3px 3px 0 rgba(0,0,0,0.3)" }}>⚽</div>
          <div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 34, color: "var(--giallo)", letterSpacing: 3, lineHeight: 1 }}>Fantabet</div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Chi è il più bravo?</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LinguaSelector />
          <button onClick={handleLogout} style={{ padding: "9px 20px", border: "2px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", borderRadius: 4, fontFamily: "Oswald, sans-serif", fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>
            {t("esci")}
          </button>
        </div>
      </header>

      {/* Contenuto */}
      <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "var(--grigio-caldo)", marginBottom: 4 }}>Bentornato</div>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "var(--marrone)", letterSpacing: 2, lineHeight: 1 }}>{utente.email.split("@")[0]}</h1>
        </div>

        <a href="/leghe" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", background: "var(--verde)", border: "none", borderRadius: 6, color: "#fff", boxShadow: "5px 5px 0 var(--verde-scuro)", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, letterSpacing: 2, color: "var(--giallo)" }}>🏆 {t("mieLeghe")}</div>
            <div style={{ fontFamily: "Barlow, sans-serif", fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{t("creaLegaConAmici")}</div>
          </div>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, color: "var(--giallo)" }}>→</div>
        </a>
      </div>
    </div>
  );
}

export default Home;