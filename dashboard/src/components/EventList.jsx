function EventList({ events }) {

  return (
    <div className="card">

      <h2>Histórico</h2>

      {events.length === 0 && (
        <p>Nenhum evento encontrado.</p>
      )}

      {events.map((event) => (

        <div key={event.id} className="event-item">

          <div>
            <strong>
              {event.acao === "saindo"
                ? "🐱 Saindo"
                : "🐱 Entrando"}
            </strong>

            <div>
              Gato: {event.tag_gato}
            </div>

            <div>
              Luminosidade: {event.luminosidade}
            </div>
          </div>

          <span>
            {typeof event.timestamp === "number"
              ? new Date(event.timestamp).toLocaleString()
             : event.horario || "Sem horário"}
          </span>

        </div>

      ))}

    </div>
  );
}

export default EventList;