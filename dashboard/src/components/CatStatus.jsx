function CatStatus({ inside }) {

  return (
    <div className="card">

      <h2>Status do Gato</h2>

      {inside === null ? (
        <p>⚠️ Aguardando dados do Firebase...</p>
      ) : inside ? (
        <div className="status unlocked">
          🟢 Dentro de casa
        </div>
      ) : (
        <div className="status locked">
          🔴 Fora de casa
        </div>
      )}

    </div>
  );
}

export default CatStatus;