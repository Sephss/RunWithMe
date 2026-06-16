// firebase.js — Firebase SDK v10+ modular initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiV1OONb8o4mmkT1sMxRDMc9kuAyp4tUc",
  authDomain: "runwithme-6c376.firebaseapp.com",
  databaseURL: "https://runwithme-6c376-default-rtdb.firebaseio.com",
  projectId: "runwithme-6c376",
  storageBucket: "runwithme-6c376.firebasestorage.app",
  messagingSenderId: "608499930083",
  appId: "1:608499930083:web:96280338a54bc2f19686d6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
