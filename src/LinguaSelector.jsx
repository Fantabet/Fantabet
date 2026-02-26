import { lingue, getLingua, setLingua } from "./i18n";

function LinguaSelector() {
  const linguaAttuale = getLingua();

  return (
    <select
      value={linguaAttuale}
      onChange={e => setLingua(e.target.value)}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid #ddd",
        background: "transparent",
        color: "#999",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {lingue.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}

export default LinguaSelector;