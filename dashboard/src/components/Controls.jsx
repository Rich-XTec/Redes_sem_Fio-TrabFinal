import { ref, set } from "firebase/database";
import { db } from "../services/firebase";

function Controls({ locked }) {

  const toggleDoor = async () => {

    await set(
      ref(db, "door/locked"),
      !locked
    );

  };

  return (
    <div className="card">

      <h2>Controles</h2>

      <button onClick={toggleDoor}>
        {locked
          ? "Destrancar Porta"
          : "Trancar Porta"}
      </button>

    </div>
  );
}

export default Controls;