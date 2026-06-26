function StatusCard({ locked }) {
  return (
    <div className={`card status-card ${locked ? "status-locked-bg" : "status-unlocked-bg"}`}>
      <div className="card-icon">
        {locked ? "🔒" : "🔓"}
      </div>
      <div>
        <h2>Status da Porta</h2>
        <div className={`status-badge ${locked ? "badge-locked" : "badge-unlocked"}`}>
          {locked ? "Trancada" : "Liberada"}
        </div>
      </div>
    </div>
  );
}

export default StatusCard;