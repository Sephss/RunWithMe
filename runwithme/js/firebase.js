// firebase.js — Firebase SDK v10+ modular initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiV1OAyp4tUc",
  authDomain: "runwithme-seapp.com",
  databaseURL: "https://runwithme-6c376-default-rtdb.firebaseio.com",
  projectId: "ruc376",
  storageBucket: "runwasestorage.app",
  messagingSenderId: "60849",
  appId: "1:608499930054bc2f19686d6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
