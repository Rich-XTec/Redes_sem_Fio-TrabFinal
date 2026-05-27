import { ref, set } from "firebase/database";
import { db } from "../services/firebase";
import { useState } from "react";

function Controls({ locked, nightEnabled, nightStart, nightEnd }) {

  const [startLocal, setStartLocal] = useState(nightStart || "22:00");
  const [endLocal, setEndLocal] = useState(nightEnd || "06:00");

  const toggleDoor = async () => {
    await set(
      ref(db, "door/locked"),
      !locked
    );
  };

  const toggleNight = async () => {
    await set(ref(db, "security/night_enabled"), !nightEnabled);
  };

  const updateStart = async (value) => {
    setStartLocal(value);
    await set(ref(db, "security/night_start"), value);
  };

  const updateEnd = async (value) => {
    setEndLocal(value);
    await set(ref(db, "security/night_end"), value);
  };

  const isNowInRange = (start, end) => {
    if (!start || !end) return false;
    const now = new Date();
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startDate = new Date(now);
    startDate.setHours(sh, sm, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(eh, em, 0, 0);
    if (startDate <= endDate) {
      return now >= startDate && now <= endDate;
    }
    return now >= startDate || now <= endDate;
  };

  const lockedByNight = nightEnabled && isNowInRange(nightStart || startLocal, nightEnd || endLocal);

  return (
    <div className="card">

      <h2>Controles</h2>

      <button onClick={toggleDoor} disabled={lockedByNight}>
        {locked
          ? "Destrancar Porta"
          : "Trancar Porta"}
      </button>

      <hr />

      <h3>Segurança Noturna</h3>

      <button onClick={toggleNight}>
        {nightEnabled ? "Desativar Segurança Noturna" : "Ativar Segurança Noturna"}
      </button>

      <div style={{ marginTop: 8 }}>
        <label>
          Início:
          <input type="time" value={startLocal} onChange={(e) => updateStart(e.target.value)} />
        </label>
      </div>

      <div style={{ marginTop: 4 }}>
        <label>
          Fim:
          <input type="time" value={endLocal} onChange={(e) => updateEnd(e.target.value)} />
        </label>
      </div>

      {lockedByNight && (
        <p style={{ color: "red", marginTop: 8 }}>Porta bloqueada pela segurança noturna</p>
      )}

    </div>
  );
}

export default Controls;