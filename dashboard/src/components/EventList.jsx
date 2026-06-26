import { useState } from "react";

function EventList({ events }) {
  const [timeFilter, setTimeFilter] = useState("todos"); // "semana", "mes", "todos"

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

  const getFormattedDateTime = (event) => {
    if (typeof event.timestamp === "number") {
      return new Date(event.timestamp).toLocaleString("pt-BR");
    }
    
    const decodedTimestamp = decodeFirebasePushId(event.id);
    if (decodedTimestamp) {
      return new Date(decodedTimestamp).toLocaleString("pt-BR");
    }

    return event.horario || "Sem horário";
  };

  // Filtra os eventos de acordo com o intervalo selecionado
  const getFilteredEvents = () => {
    if (timeFilter === "todos") return events;

    if (timeFilter === "dia") {
      const todayStr = new Date().toLocaleDateString("pt-BR");
      return events.filter(event => {
        const ts = event.actualTimestamp || decodeFirebasePushId(event.id);
        if (!ts) return false;
        return new Date(ts).toLocaleDateString("pt-BR") === todayStr;
      });
    }

    const now = new Date();
    const limitDate = new Date();

    if (timeFilter === "semana") {
      limitDate.setDate(now.getDate() - 7);
    } else if (timeFilter === "mes") {
      limitDate.setDate(now.getDate() - 30);
    }

    limitDate.setHours(0, 0, 0, 0);

    return events.filter(event => {
      const ts = event.actualTimestamp || decodeFirebasePushId(event.id);
      if (!ts) return false;
      return ts >= limitDate.getTime();
    });
  };

  const filteredEvents = getFilteredEvents().filter(
    (event) => event.acao !== "saindo_manual" && event.acao !== "entrando_manual"
  );

  const getActionBadge = (acao) => {
    if (acao === "saindo") {
      return <span className="badge-action badge-saindo">🚪 Saindo</span>;
    } else if (acao === "saindo_manual") {
      return <span className="badge-action badge-saindo-manual">✏️ Fora (Manual)</span>;
    } else if (acao === "entrando_manual") {
      return <span className="badge-action badge-entrando-manual">✏️ Dentro (Manual)</span>;
    }
    return <span className="badge-action badge-entrando">🚪 Entrando</span>;
  };

  return (
    <div className="card event-list-card" style={{ gridColumn: "span 2" }}>
      <div className="card-header-actions">
        <h2>Histórico de Acessos</h2>
        <div className="filter-group">
          <button 
            className={`filter-btn ${timeFilter === "dia" ? "active" : ""}`}
            onClick={() => setTimeFilter("dia")}
          >
            Dia
          </button>
          <button 
            className={`filter-btn ${timeFilter === "semana" ? "active" : ""}`}
            onClick={() => setTimeFilter("semana")}
          >
            Semana
          </button>
          <button 
            className={`filter-btn ${timeFilter === "mes" ? "active" : ""}`}
            onClick={() => setTimeFilter("mes")}
          >
            Mês
          </button>
          <button 
            className={`filter-btn ${timeFilter === "todos" ? "active" : ""}`}
            onClick={() => setTimeFilter("todos")}
          >
            Todos
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="no-events">Nenhum evento registrado no intervalo selecionado.</p>
      ) : (
        <div className="events-container" style={{ maxHeight: "500px" }}>
          {filteredEvents.map((event) => (
            <div key={event.id} className="event-row">
              <div className="event-main">
                {getActionBadge(event.acao)}
                <div className="event-meta">
                  <div className="meta-item">
                    <span className="meta-label">ID do Gato:</span>
                    <span className="meta-val">{event.tag_gato}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Luz Ambiente:</span>
                    <span className="meta-val">
                      {event.luminosidade} 
                      <span className="light-indicator" style={{ opacity: Math.min(event.luminosidade / 4095, 1) }}>☀️</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="event-time">
                {getFormattedDateTime(event)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EventList;