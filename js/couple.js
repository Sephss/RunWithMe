// couple.js — Couple pairing: create/join couple
import { db } from "./firebase.js";
import {
  ref, set, get, update, onValue, push, query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/** Generate a random RUN-XXXXXX code */
export function generateCoupleCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RUN-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Create a new couple, returns coupleId */
export async function createCouple(uid, userName) {
  const code = generateCoupleCode();
  const coupleRef = push(ref(db, "couples"));
  const coupleId = coupleRef.key;

  await set(coupleRef, {
    code,
    createdAt: Date.now(),
    members: { [uid]: { name: userName, joinedAt: Date.now() } },
    sharedGoal: { target: 500, title: "500 KM Together" },
    totalDistance: 0,
    totalActivities: 0
  });

  await update(ref(db, `users/${uid}`), { coupleId });
  return { coupleId, code };
}

/** Join an existing couple by code */
export async function joinCouple(uid, userName, code) {
  const snap = await get(ref(db, "couples"));
  if (!snap.exists()) throw new Error("No couples found.");

  let foundId = null;
  snap.forEach((child) => {
    if (child.val().code === code.toUpperCase()) {
      foundId = child.key;
    }
  });

  if (!foundId) throw new Error("Invalid code. Double-check and try again.");

  const coupleSnap = await get(ref(db, `couples/${foundId}`));
  const members = coupleSnap.val().members || {};
  if (Object.keys(members).length >= 2) throw new Error("This couple is already full.");
  if (members[uid]) throw new Error("You're already in this couple.");

  await update(ref(db, `couples/${foundId}/members/${uid}`), {
    name: userName,
    joinedAt: Date.now()
  });
  await update(ref(db, `users/${uid}`), { coupleId: foundId });
  return foundId;
}

/** Get couple data */
export async function getCoupleData(coupleId) {
  const snap = await get(ref(db, `couples/${coupleId}`));
  return snap.exists() ? { id: coupleId, ...snap.val() } : null;
}

/** Watch couple data in realtime */
export function watchCouple(coupleId, callback) {
  return onValue(ref(db, `couples/${coupleId}`), (snap) => {
    callback(snap.exists() ? { id: coupleId, ...snap.val() } : null);
  });
}

/** Get partner uid */
export function getPartnerId(coupleData, myUid) {
  if (!coupleData?.members) return null;
  return Object.keys(coupleData.members).find((k) => k !== myUid) || null;
}
