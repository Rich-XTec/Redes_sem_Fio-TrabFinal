import { ref, set } from "firebase/database";
import { db } from "../services/firebase";

function Controls({ locked, nightEnabled, isNowInRange }) {

  const toggleDoor = async () => {
    await set(
      ref(db, "door/locked"),
      !locked
    );
  };

  const toggleNight = async () => {
    await set(ref(db, "security/night_enabled"), !nightEnabled);
  };

  const lockedByNight = nightEnabled && isNowInRange("22:00", "06:00");

  return (
    <div className="card controls-card">

      <h2>Painel de Controles</h2>

      <div className="control-group">
        <h3>Trinco Manual</h3>
        <button 
          onClick={toggleDoor} 
          disabled={lockedByNight}
          className={`btn-toggle-door ${locked ? "btn-locked" : "btn-unlocked"} ${lockedByNight ? "btn-disabled" : ""}`}
        >
          {lockedByNight ? "🔒 Bloqueada por Horário" : locked ? "🔓 Destrancar Porta" : "🔒 Trancar Porta"}
        </button>
      </div>

      <hr className="divider" />

      <div className="control-group">
        <div className="switch-header">
          <h3>Segurança Noturna</h3>
          <label className="switch">
            <input type="checkbox" checked={nightEnabled} onChange={toggleNight} />
            <span className="slider round"></span>
          </label>
        </div>
        <p className="description" style={{ marginBottom: 0 }}>
          Quando ativa, tranca a porta automaticamente entre <strong>22:00 e 06:00</strong> para impedir saídas noturnas do gato.
        </p>
      </div>

      {lockedByNight && (
        <div className="alert-badge">
          <span className="alert-icon">🌙</span>
          <span>Toque de recolher ativo (Saídas bloqueadas: 22h às 6h)</span>
        </div>
      )}

    </div>
  );
}

export default Controls;