import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCzB9FvqwWxcbFKA2oYgHmrA8KRd5CWiYY",
  authDomain: "portagatoiot.firebaseapp.com",
  databaseURL: "https://portagatoiot-default-rtdb.firebaseio.com",
  projectId: "portagatoiot",
  storageBucket: "portagatoiot.firebasestorage.app",
  messagingSenderId: "380585192511",
  appId: "1:380585192511:web:65f2741be5a3f6f3101c8a",
  measurementId: "G-KKEKZS8YXM"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);