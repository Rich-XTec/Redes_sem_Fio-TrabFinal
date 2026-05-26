function StatusCard({ locked }) {
  return (
    <div className="card">
      <h2>Status da Porta</h2>

      <div className={locked ? "status locked" : "status unlocked"}>
        {locked ? "🔴 Bloqueada" : "🟢 Liberada"}
      </div>
    </div>
  );
}

export default StatusCard;