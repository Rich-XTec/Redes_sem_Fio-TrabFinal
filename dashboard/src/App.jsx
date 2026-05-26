import { useEffect, useState } from "react";

import { ref, onValue } from "firebase/database";

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

  useEffect(() => {

    //
    const catRef = ref(db, "cat_status/inside");
    onValue(catRef, (snapshot) => {
      setCatInside(snapshot.val());
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

  }, []);

  return (
    <div className="container">

      <h1>
        🐱 Porta Inteligente para Gatos
      </h1>

      <div className="grid">

        <StatusCard locked={locked} />

        <Controls locked={locked} />

        <CatStatus inside={catInside} />

      </div>

      <EventList events={events} />

    </div>
  );
}

export default App;