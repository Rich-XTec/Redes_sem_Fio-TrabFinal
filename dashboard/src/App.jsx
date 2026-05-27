import { useEffect, useState } from "react";

import { ref, onValue, set } from "firebase/database";

import { db } from "./services/firebase";

import StatusCard from "./components/StatusCard";
import EventList from "./components/EventList";
import Controls from "./components/Controls";
import CatStatus from "./components/CatStatus";


import "./App.css";

function App() {

  const [events, setEvents] = useState([]);
  const [locked, setLocked] = useState(false);
  const [catInside, setCatInside] = useState(null);
  const [nightEnabled, setNightEnabled] = useState(false);
  const [nightStart, setNightStart] = useState(null);
  const [nightEnd, setNightEnd] = useState(null);

  useEffect(() => {

    //
    // Escuta a última mensagem do ESP (ex: "saindo" / "entrando")
    const catLastRef = ref(db, "cat_status/last");
    onValue(catLastRef, (snapshot) => {
      const val = snapshot.val();
      if (val === "saindo") setCatInside(false);
      else if (val === "entrando") setCatInside(true);
      else if (typeof val === "boolean") setCatInside(val);
      else setCatInside(null);
    });

    // Histórico de eventos
    const eventsRef = ref(db, "historico_eventos");

    onValue(eventsRef, (snapshot) => {

      const data = snapshot.val();

      if (!data) {
        setEvents([]);
        return;
      }

      const formatted = Object.entries(data).map(
        ([id, value]) => ({
          id,
          ...value
        })
      );

      setEvents(formatted.reverse());

    });

    // Estado da porta
    const lockedRef = ref(db, "door/locked");

    onValue(lockedRef, (snapshot) => {
      setLocked(snapshot.val());
    });

    // Segurança noturna: configurações
    const nightEnabledRef = ref(db, "security/night_enabled");
    onValue(nightEnabledRef, (snapshot) => {
      setNightEnabled(Boolean(snapshot.val()));
    });

    const nightStartRef = ref(db, "security/night_start");
    onValue(nightStartRef, (snapshot) => {
      setNightStart(snapshot.val());
    });

    const nightEndRef = ref(db, "security/night_end");
    onValue(nightEndRef, (snapshot) => {
      setNightEnd(snapshot.val());
    });

  }, []);

  // Aplica bloqueio automático quando estiver no intervalo configurado
  useEffect(() => {
    if (!nightEnabled || !nightStart || !nightEnd) return;

    const isNowInRange = (start, end) => {
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
      // range crosses midnight
      return now >= startDate || now <= endDate;
    };

    const inRange = isNowInRange(nightStart, nightEnd);

    const lockedRef = ref(db, "door/locked");

    if (inRange) {
      set(lockedRef, true);
    } else {
      set(lockedRef, false);
    }

  }, [nightEnabled, nightStart, nightEnd]);

  return (
    <div className="container">

      <h1>
        🐱 Porta Inteligente para Gatos
      </h1>

      <div className="grid">

        <StatusCard locked={locked} />

        <Controls locked={locked} nightEnabled={nightEnabled} nightStart={nightStart} nightEnd={nightEnd} />

        <CatStatus inside={catInside} />

      </div>

      <EventList events={events} />

    </div>
  );
}

export default App;