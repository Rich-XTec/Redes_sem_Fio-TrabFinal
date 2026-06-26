import { useState } from "react";
import { ref, push } from "firebase/database";
import { db } from "../services/firebase";

function CatStatus({ inside, events = [] }) {
  const [showOverride, setShowOverride] = useState(false);

  const getTodayExits = () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("pt-BR");
    let exitsToday = 0;
    let lastExitTime = null;
    let lastEntryTime = null;

    events.forEach(event => {
      if (event.actualTimestamp) {
        const date = new Date(event.actualTimestamp);
        if (date.toLocaleDateString("pt-BR") === todayStr) {
          if (event.acao === "saindo") {
            exitsToday++;
            if (!lastExitTime) {
              lastExitTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            }
          } else if (event.acao === "entrando") {
            if (!lastEntryTime) {
              lastEntryTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            }
          }
        }
      }
    });
    return { exitsToday, lastExitTime, lastEntryTime };
  };

  const handleManualOverride = async (acao, tag_gato) => {
    const eventsRef = ref(db, "historico_eventos");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR");
    
    const newEvent = {
      acao,
      horario: timeStr,
      luminosidade: 0,
      tag_gato,
      timestamp: Date.now()
    };

    try {
      await push(eventsRef, newEvent);
      setShowOverride(false);
    } catch (e) {
      console.error("Erro ao sobrescrever status do gato:", e);
    }
  };

  const { exitsToday, lastExitTime, lastEntryTime } = getTodayExits();

  return (
    <div className={`card cat-status-card ${inside === null ? "cat-unknown-bg" : inside ? "cat-inside-bg" : "cat-outside-bg"}`} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
      <div className="card-content-wrapper" style={{ display: "flex", gap: "24px", alignItems: "center", width: "100%" }}>
        <div className="card-icon">
          {inside === null ? "❓" : inside ? "🏠" : "🌳"}
        </div>
        <div style={{ flexGrow: 1 }}>
          <h2>Status do Gato</h2>
          {inside === null ? (
            <div className="status-badge badge-unknown">⚠️ Aguardando dados...</div>
          ) : inside ? (
            <>
              <div className="status-badge badge-inside" style={{ marginBottom: "10px" }}>Dentro de Casa</div>
              <p className="status-subtext" style={{ margin: 0, fontSize: "0.95rem", opacity: 0.85, fontWeight: "500" }}>
                {exitsToday === 0 
                  ? "Ainda não saiu hoje." 
                  : `Já saiu ${exitsToday} ${exitsToday === 1 ? "vez" : "vezes"} hoje. Retornou às ${lastEntryTime || "indefinido"}.`}
              </p>
            </>
          ) : (
            <>
              <div className="status-badge badge-outside" style={{ marginBottom: "10px" }}>Fora de Casa</div>
              <p className="status-subtext" style={{ margin: 0, fontSize: "0.95rem", opacity: 0.85, fontWeight: "500" }}>
                Na rua desde as {lastExitTime || "indefinido"}. (Saídas hoje: {exitsToday}).
              </p>
            </>
          )}
        </div>
      </div>

      <div className="override-section" style={{ marginTop: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "14px", width: "100%" }}>
        {!showOverride ? (
          <button 
            className="btn-text-only"
            onClick={() => setShowOverride(true)}
            style={{ background: "transparent", border: "none", color: "var(--accent-blue)", padding: 0, cursor: "pointer", fontSize: "0.9rem", fontWeight: "700" }}
          >
            ⚙️ Corrigir localização do gato
          </button>
        ) : (
          <div className="override-actions">
            <p className="override-actions-title">
              Onde o gato realmente está?
            </p>
            
            <div className="override-buttons-container">
              {(inside === null || !inside) && (
                <button 
                  className="btn-override-action"
                  onClick={() => handleManualOverride("entrando_manual", "Correção Manual")}
                >
                  🏠 Dentro de Casa
                </button>
              )}
              {(inside === null || inside) && (
                <button 
                  className="btn-override-action"
                  onClick={() => handleManualOverride("saindo_manual", "Correção Manual")}
                >
                  🌳 Fora de Casa
                </button>
              )}
              <button 
                className="btn-override-cancel"
                onClick={() => setShowOverride(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CatStatus;