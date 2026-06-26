import { useEffect, useState, useRef } from "react";

import { ref, onValue, set } from "firebase/database";

import { db } from "./services/firebase";

import StatusCard from "./components/StatusCard";
import EventList from "./components/EventList";
import Controls from "./components/Controls";
import CatStatus from "./components/CatStatus";
import Analytics from "./components/Analytics";

import "./App.css";

function App() {

  const [events, setEvents] = useState([]);
  const [locked, setLocked] = useState(false);
  const [catInside, setCatInside] = useState(null);
  const [nightEnabled, setNightEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("panel"); // "panel", "history" ou "analytics"
  const prevInRangeRef = useRef(null);

  // Decode the calendar date from Firebase Push ID
  const decodeFirebasePushId = (id) => {
    if (!id || id.length < 8 || id.charAt(0) !== '-') return null;
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    const part = id.substring(0, 8);
    let timestamp = 0;
    for (let i = 0; i < part.length; i++) {
      const c = part.charAt(i);
      const index = PUSH_CHARS.indexOf(c);
      if (index === -1) return null;
      timestamp = timestamp * 64 + index;
    }
    if (timestamp > 1577836800000 && timestamp < 3250368000000) {
      return timestamp;
    }
    return null;
  };

  useEffect(() => {

    // Histórico de eventos
    const eventsRef = ref(db, "historico_eventos");

    onValue(eventsRef, (snapshot) => {

      const data = snapshot.val();

      if (!data) {
        setEvents([]);
        setCatInside(null);
        return;
      }

      const formatted = Object.entries(data).map(
        ([id, value]) => {
          const decodedTime = decodeFirebasePushId(id);
          return {
            id,
            ...value,
            decodedTimestamp: decodedTime,
            actualTimestamp: typeof value.timestamp === "number"
              ? value.timestamp
              : (decodedTime || null)
          };
        }
      );

      const reversed = formatted.reverse();
      setEvents(reversed);

      // Pega a última ação do histórico para determinar o status do gato
      if (reversed.length > 0) {
        const lastAction = reversed[0].acao;
        if (lastAction === "saindo" || lastAction === "saindo_manual") setCatInside(false);
        else if (lastAction === "entrando" || lastAction === "entrando_manual") setCatInside(true);
        else setCatInside(null);
        console.log("Última ação:", lastAction, "Status:", lastAction === "entrando" || lastAction === "entrando_manual");
      }

    });

    // Estado da porta
    const lockedRef = ref(db, "door/locked");

    onValue(lockedRef, (snapshot) => {
      const val = snapshot.val();
      console.log("door/locked valor:", val);
      setLocked(Boolean(val));
    });

    // Segurança noturna: configurações
    const nightEnabledRef = ref(db, "security/night_enabled");
    onValue(nightEnabledRef, (snapshot) => {
      setNightEnabled(Boolean(snapshot.val()));
    });

  }, []);

  // Helper function to check if current time is inside start-end interval
  const isNowInRange = (start, end) => {
    if (!start || !end) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Over midnight, e.g. 22:00 to 06:00
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  };

  // Aplica bloqueio automático baseado no tempo (fixo 22:00 às 06:00)
  // Utiliza useRef para monitorar a transição entre dia/noite e não sobrescrever o trinco manual
  useEffect(() => {
    if (!nightEnabled) {
      prevInRangeRef.current = null;
      return;
    }

    const start = "22:00";
    const end = "06:00";

    const checkSchedule = () => {
      const inRange = isNowInRange(start, end);
      const lockedRef = ref(db, "door/locked");
      
      if (prevInRangeRef.current === null) {
        // Primeira checagem desde que ativou a segurança noturna
        if (inRange) {
          set(lockedRef, true); // Força trancar se for noite
        }
        prevInRangeRef.current = inRange;
      } else if (prevInRangeRef.current !== inRange) {
        // Ocorreu uma transição de horário!
        if (inRange) {
          set(lockedRef, true); // Dia -> Noite: tranca a porta
        } else {
          set(lockedRef, false); // Noite -> Dia: destranca a porta
        }
        prevInRangeRef.current = inRange;
      }
    };

    // Executa imediatamente
    checkSchedule();

    // Executa a cada 10 segundos para verificar transições de minutos
    const intervalId = setInterval(checkSchedule, 10000);

    return () => clearInterval(intervalId);
  }, [nightEnabled]);

  return (
    <div className="container">

      <header className="header">
        <h1>
          <span>🐱</span> Porta Inteligente para Gatos
        </h1>
        <p className="subtitle">Painel de Controle e Monitoramento de Acesso</p>
      </header>

      {/* Navegação de Abas */}
      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === "panel" ? "active" : ""}`}
          onClick={() => setActiveTab("panel")}
        >
          🏠 Painel de Controle
        </button>
        <button 
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📊 Estatísticas
        </button>
        <button 
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 Histórico
        </button>
      </nav>

      {/* Renderização condicional por Aba */}
      {activeTab === "panel" && (
        <div className="grid">
          <StatusCard locked={locked} />
          <CatStatus inside={catInside} events={events} />
          <Controls 
            locked={locked} 
            nightEnabled={nightEnabled} 
            isNowInRange={isNowInRange}
          />
        </div>
      )}

      {activeTab === "history" && (
        <EventList events={events} />
      )}

      {activeTab === "analytics" && (
        <Analytics events={events} />
      )}

    </div>
  );
}

export default App;