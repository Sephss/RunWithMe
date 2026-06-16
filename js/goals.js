// goals.js — Goals, messages, achievements, motivation

import { db } from "./firebase.js";
import { ref, set, get, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── WEEKLY GOAL ────────────────────────────────────────────────
export async function setWeeklyGoal(uid, coupleId, km) {
  await set(ref(db, `goals/${coupleId}/${uid}/weekly`), { target: parseFloat(km), updatedAt: Date.now() });
  await update(ref(db, `users/${uid}`), { weeklyGoal: parseFloat(km) });
}

export async function getWeeklyGoal(uid, coupleId) {
  const snap = await get(ref(db, `goals/${coupleId}/${uid}/weekly`));
  return snap.exists() ? snap.val().target : 20;
}

// ─── SHARED GOAL ────────────────────────────────────────────────
export async function setSharedGoal(coupleId, target, title) {
  await update(ref(db, `couples/${coupleId}/sharedGoal`), { target: parseFloat(target), title, updatedAt: Date.now() });
}

// ─── ENCOURAGEMENT MESSAGES ─────────────────────────────────────
export async function sendMessage(coupleId, uid, name, text) {
  if (!text.trim() || text.length > 150) throw new Error("Message must be 1–150 characters.");
  const msgRef = push(ref(db, `messages/${coupleId}`));
  await set(msgRef, { uid, name, text: text.trim(), sentAt: Date.now() });
}

export function watchMessages(coupleId, callback) {
  return onValue(ref(db, `messages/${coupleId}`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const msgs = Object.values(snap.val()).sort((a, b) => b.sentAt - a.sentAt).slice(0, 20);
    callback(msgs);
  });
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: "first_walk",   emoji: "🏅", title: "First Steps",     desc: "Logged your first walk",              check: (s) => s.totalActivities >= 1 && s.hasWalk },
  { id: "first_jog",   emoji: "🏅", title: "Jogger",           desc: "Logged your first jog",              check: (s) => s.hasJog },
  { id: "first_run",   emoji: "🏅", title: "Runner",           desc: "Logged your first run",              check: (s) => s.hasRun },
  { id: "km_10",       emoji: "🎯", title: "10 KM Club",       desc: "Ran 10 KM total",                    check: (s) => s.totalDist >= 10 },
  { id: "km_50",       emoji: "🌟", title: "50 KM Warrior",    desc: "Ran 50 KM total",                    check: (s) => s.totalDist >= 50 },
  { id: "km_100",      emoji: "💫", title: "Century Runner",   desc: "Ran 100 KM total",                   check: (s) => s.totalDist >= 100 },
  { id: "streak_7",    emoji: "🔥", title: "Week Streak",      desc: "7 day activity streak",              check: (s) => s.streak >= 7 },
  { id: "streak_30",   emoji: "🔥", title: "Month Streak",     desc: "30 day activity streak",             check: (s) => s.streak >= 30 },
  { id: "activities_10", emoji: "🏃", title: "Active Soul",   desc: "Logged 10 activities",               check: (s) => s.totalActivities >= 10 },
  { id: "activities_50", emoji: "🏆", title: "Dedicated",     desc: "Logged 50 activities",               check: (s) => s.totalActivities >= 50 },
  { id: "couple_500",  emoji: "💑", title: "500 KM Together", desc: "Covered 500 KM as a couple",         check: (s) => s.coupleDist >= 500 },
  { id: "couple_100",  emoji: "❤️", title: "100 KM Together", desc: "Covered 100 KM as a couple",         check: (s) => s.coupleDist >= 100 },
];

export async function checkAndUnlockAchievements(uid, coupleId, stats) {
  const achRef = ref(db, `achievements/${coupleId}/${uid}`);
  const snap = await get(achRef);
  const unlocked = snap.exists() ? snap.val() : {};
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (!unlocked[ach.id] && ach.check(stats)) {
      unlocked[ach.id] = { unlockedAt: Date.now() };
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    await set(achRef, unlocked);
  }
  return { unlocked, newlyUnlocked };
}

export function watchAchievements(uid, coupleId, callback) {
  return onValue(ref(db, `achievements/${coupleId}/${uid}`), (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// ─── DAILY MOTIVATION ───────────────────────────────────────────
const MOTIVATIONS = [
  "Small steps become great journeys.",
  "Every kilometer counts.",
  "Consistency beats perfection.",
  "Together, you run farther.",
  "The only bad run is the one that didn't happen.",
  "You don't have to go fast. You just have to go.",
  "Two hearts, one finish line.",
  "Progress over perfection, every single day.",
  "Your only competition is yesterday's self.",
  "Running side by side makes every mile worthwhile.",
  "Sweat together, stay together.",
  "Push each other, lift each other.",
  "Every step you take is a step forward.",
  "Champions aren't made in gyms — they're made in the streets with their partner.",
  "Your body can do it. Trust your heart.",
  "The miracle is not that you finished. It's that you had the courage to start.",
  "Pain is temporary. Pride is forever.",
  "Couples who run together, stay together.",
  "One step at a time, one day at a time.",
  "Run the mile you're in.",
  "The road is long but it's better together.",
  "Your feet hurt? Good. That means you're alive.",
  "Don't stop when you're tired. Stop when you're done.",
  "Make your lungs burn and your heart sing.",
  "Love is the pace that never slows.",
  "Every run starts with a single step.",
  "The best partner is the one who matches your stride.",
  "Slow miles are still miles.",
  "Be the reason your partner smiles after a run.",
  "New day. New run. New beginning.",
  "Distance creates no challenge when love leads the way.",
  "Run with intention, recover with love.",
  "Your streak is your superpower.",
  "It always seems impossible until it's done.",
  "When it gets hard, remember why you started.",
  "The greatest runs are the ones you share.",
  "Breathe in courage, breathe out doubt.",
  "Your goals are worth every step.",
  "Leave it all on the road.",
  "Not all heroes wear capes. Some wear running shoes.",
  "The finish line is just the beginning.",
  "Earn your rest. Celebrate your effort.",
  "Together is always better.",
  "You've come farther than you think.",
  "Let your legs do the talking today.",
  "Keep moving. Keep loving. Keep running.",
  "A run a day keeps the worries away.",
  "The best time to run was yesterday. The second best time is now.",
  "Own the roads. Own your goals.",
  "Love is the best fuel for any journey.",
];

export function getDailyMotivation() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return MOTIVATIONS[dayOfYear % MOTIVATIONS.length];
}
