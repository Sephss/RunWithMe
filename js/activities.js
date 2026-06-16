// activities.js — Activity logging, fetching, stats
import { db } from "./firebase.js";
import {
  ref, push, set, get, onValue, query, orderByChild, update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const ACTIVITY_TYPES = {
  walk: { label: "Walk", icon: "🚶", color: "#7C3AED" },
  jog:  { label: "Jog",  icon: "🏃", color: "#A855F7" },
  run:  { label: "Run",  icon: "⚡", color: "#EC4899" }
};

/** Log a new activity */
export async function logActivity(uid, coupleId, data) {
  const actRef = push(ref(db, `activities/${coupleId}/${uid}`));
  const activity = {
    id: actRef.key,
    uid,
    coupleId,
    type: data.type,
    distance: parseFloat(data.distance),
    duration: parseInt(data.duration),
    pace: calcPace(data.distance, data.duration),
    notes: data.notes || "",
    date: data.date || todayStr(),
    createdAt: Date.now()
  };
  await set(actRef, activity);

  // Update couple totals
  const coupleRef = ref(db, `couples/${coupleId}`);
  const snap = await get(coupleRef);
  if (snap.exists()) {
    const current = snap.val();
    await update(coupleRef, {
      totalDistance: (current.totalDistance || 0) + activity.distance,
      totalActivities: (current.totalActivities || 0) + 1
    });
  }

  return activity;
}

/** Calculate pace string mm:ss / KM */
export function calcPace(distKm, durationMin) {
  if (!distKm || !durationMin) return "—";
  const perKm = durationMin / parseFloat(distKm);
  const min = Math.floor(perKm);
  const sec = Math.round((perKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} / KM`;
}

/** Today's date string YYYY-MM-DD */
export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/** Get all activities for a user within a couple */
export async function getUserActivities(uid, coupleId) {
  const snap = await get(ref(db, `activities/${coupleId}/${uid}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => b.createdAt - a.createdAt);
}

/** Watch activities realtime */
export function watchActivities(coupleId, callback) {
  return onValue(ref(db, `activities/${coupleId}`), (snap) => {
    const all = { myActivities: [], partnerActivities: [] };
    if (snap.exists()) {
      const data = snap.val();
      Object.entries(data).forEach(([uid, acts]) => {
        callback(uid, Object.values(acts));
      });
    } else {
      callback(null, []);
    }
  });
}

/** Compute stats: today / weekly / monthly / streak */
export function computeStats(activities) {
  const today = todayStr();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayDist = 0, weekDist = 0, monthDist = 0;
  const activeDays = new Set();

  activities.forEach((a) => {
    const d = parseFloat(a.distance) || 0;
    const date = new Date(a.date);
    activeDays.add(a.date);
    if (a.date === today) todayDist += d;
    if (date >= weekStart) weekDist += d;
    if (date >= monthStart) monthDist += d;
  });

  return {
    todayDist: todayDist.toFixed(1),
    weekDist: weekDist.toFixed(1),
    monthDist: monthDist.toFixed(1),
    streak: calcStreak(activeDays),
    activeDays
  };
}

/** Calculate streak in days */
function calcStreak(activeDaysSet) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (activeDaysSet.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Group activities by date */
export function groupByDate(activities) {
  return activities.reduce((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});
}
