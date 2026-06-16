// auth.js — Firebase Auth module
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { db } from "./firebase.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { navigate } from "./router.js";

let currentUser = null;
let authCallbacks = [];

export function onAuth(callback) {
  authCallbacks.push(callback);
  if (currentUser !== undefined) callback(currentUser);
}

export function getCurrentUser() {
  return currentUser;
}

export function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      authCallbacks.forEach((cb) => cb(user));
      resolve(user);
    });
  });
}

export async function register(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  // Create user record in DB
  await set(ref(db, `users/${cred.user.uid}`), {
    name,
    email,
    uid: cred.user.uid,
    createdAt: Date.now(),
    coupleId: null,
    weeklyGoal: 20
  });
  return cred.user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  navigate("/login", true);
}

export async function getUserData(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}
