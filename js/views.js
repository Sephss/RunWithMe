// views.js — All dashboard view renderers

import { getCurrentUser, getUserData, logout } from "./auth.js";
import { getCoupleData, getPartnerId, watchCouple } from "./couple.js";
import {
  getUserActivities,
  logActivity,
  computeStats,
  groupByDate,
  ACTIVITY_TYPES,
  todayStr,
  calcPace,
} from "./activities.js";
import {
  getDailyMotivation,
  sendMessage,
  watchMessages,
  setWeeklyGoal,
  getWeeklyGoal,
  setSharedGoal,
  ACHIEVEMENTS,
  checkAndUnlockAchievements,
  watchAchievements,
} from "./goals.js";
import {
  toast,
  openModal,
  setButtonLoading,
  fmtDate,
  fmtTime,
  fmtRelative,
  initials,
  showPageLoader,
} from "./ui.js";
import {
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from "./firebase.js";

// Shared state within session
let _couple = null,
  _myActivities = [],
  _partnerActivities = [],
  _myData = null,
  _partnerData = null;

export async function loadAppState() {
  const user = getCurrentUser();
  _myData = await getUserData(user.uid);
  if (!_myData?.coupleId) return false;

  _couple = await getCoupleData(_myData.coupleId);
  const partnerId = getPartnerId(_couple, user.uid);

  if (partnerId) {
    _partnerData = await getUserData(partnerId);
    _myActivities = await getUserActivities(user.uid, _myData.coupleId);
    _partnerActivities = await getUserActivities(partnerId, _myData.coupleId);
  } else {
    _myActivities = await getUserActivities(user.uid, _myData.coupleId);
  }
  return true;
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
export function renderSidebar(activeView) {
  const user = getCurrentUser();
  const name = _myData?.name || user?.displayName || "You";

  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "log", icon: "➕", label: "Log Activity" },
    { id: "history", icon: "📋", label: "Activity Log" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "goals", icon: "🎯", label: "Goals" },
    { id: "messages", icon: "💬", label: "Messages" },
    { id: "achievements", icon: "🏆", label: "Achievements" },
  ];

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
       
        <div class="sidebar-logo-text">RunWithMe <span>Every Step Together</span></div>
      </div>
      <div class="nav-section">
        <div class="nav-label">Menu</div>
        ${navItems
          .map(
            (n) => `
          <div class="nav-item ${activeView === n.id ? "active" : ""}" data-view="${n.id}" role="button" tabindex="0">
            <i>${n.icon}</i> ${n.label}
          </div>`,
          )
          .join("")}
      </div>
      <div class="sidebar-bottom">
        <div class="user-pill" id="logout-btn">
          <div class="user-avatar">${initials(name)}</div>
          <div class="user-pill-info"><strong>${name}</strong><span>Sign out</span></div>
          <span>↩</span>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>`;
}

// ─── APP SHELL ─────────────────────────────────────────────────────
export function renderShell(viewContent, activeView, pageTitle = "") {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(activeView)}
      <div class="main-content" id="main-content">
        <div class="topbar">
          <div class="topbar-left">
            <h2>${pageTitle}</h2>
          </div>
          <div class="topbar-actions">
            <button class="hamburger" id="hamburger-btn" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
        <div id="view-container"></div>
      </div>
    </div>`;

  document.getElementById("view-container").innerHTML = viewContent;
  bindShellEvents();
}

function bindShellEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach((el) => {
    el.addEventListener("click", () => {
      switchView(el.dataset.view);
      closeSidebar();
    });
  });

  document
    .getElementById("logout-btn")
    ?.addEventListener("click", () => logout());

  const hamburger = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  hamburger?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
  });
  overlay?.addEventListener("click", closeSidebar);
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-overlay")?.classList.remove("active");
}

// ─── VIEW SWITCHER ──────────────────────────────────────────────────
export async function switchView(viewName) {
  // Refresh data
  await loadAppState();

  const container = document.getElementById("view-container");
  if (!container) return;
  showPageLoader(container);

  // Update active nav
  document.querySelectorAll(".nav-item[data-view]").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === viewName);
  });

  const topbarTitle = document.querySelector(".topbar-left h2");
  const titles = {
    dashboard: "Dashboard",
    log: "Log Activity",
    history: "Activity Log",
    calendar: "Calendar",
    goals: "Goals",
    messages: "Messages",
    achievements: "Achievements",
  };
  if (topbarTitle) topbarTitle.textContent = titles[viewName] || "";

  switch (viewName) {
    case "dashboard":
      container.innerHTML = await buildDashboardView();
      bindDashboardEvents();
      break;
    case "log":
      container.innerHTML = buildLogView();
      bindLogEvents();
      break;
    case "history":
      container.innerHTML = await buildHistoryView();
      bindHistoryEvents();
      break;
    case "calendar":
      container.innerHTML = await buildCalendarView();
      break;
    case "goals":
      container.innerHTML = await buildGoalsView();
      bindGoalEvents();
      break;
    case "messages":
      container.innerHTML = buildMessagesView();
      bindMessageEvents();
      break;
    case "achievements":
      container.innerHTML = await buildAchievementsView();
      break;
    default:
      container.innerHTML = `<div class="view"><p>Not found.</p></div>`;
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════
async function buildDashboardView() {
  const user = getCurrentUser();
  const myStats = computeStats(_myActivities);
  const partnerStats = _partnerActivities.length
    ? computeStats(_partnerActivities)
    : null;
  const coupleDist = parseFloat(_couple?.totalDistance || 0);
  const sharedGoal = _couple?.sharedGoal || {
    target: 500,
    title: "500 KM Together",
  };
  const sharedPct = Math.min(
    100,
    Math.round((coupleDist / sharedGoal.target) * 100),
  );
  const myWeekGoal = _myData?.weeklyGoal || 20;
  const myWeekPct = Math.min(
    100,
    Math.round((parseFloat(myStats.weekDist) / myWeekGoal) * 100),
  );
  const recentActs = _myActivities.slice(0, 5);
  const partnerName = _partnerData?.name || "Partner";

  return `<div class="view">
    <!-- Motivation Hero -->
    <div class="dashboard-hero">
      <div class="motivation-label">Daily Motivation</div>
      <div class="motivation-text">"${getDailyMotivation()}"</div>
    </div>

    <!-- Streaks Banner -->
    <div class="streak-banner">
      <div class="streak-item">
        <div class="streak-value text-gradient">🔥 ${myStats.streak}</div>
        <div class="streak-label">Your Streak</div>
      </div>
      <div class="streak-divider"></div>
      <div class="streak-item">
        <div class="streak-value text-gradient">❤️ ${_couple?.totalActivities || 0}</div>
        <div class="streak-label">Total Activities</div>
      </div>
      <div class="streak-divider"></div>
      <div class="streak-item">
        <div class="streak-value text-gradient">🔥 ${partnerStats?.streak || 0}</div>
        <div class="streak-label">${partnerName}'s Streak</div>
      </div>
    </div>

    <!-- Shared Couple Goal -->
    <div class="shared-goal-card">
      <div class="goal-couple-avatars">
        <div class="goal-avatar">${initials(_myData?.name || "Me")}</div>
        <div class="goal-avatar">${initials(partnerName)}</div>
        <span class="goal-heart"></span>
        <span style="font-size:0.78rem;color:var(--text-muted)">Couple Goal</span>
      </div>
      <h3 style="margin-bottom:0.6rem">${sharedGoal.title}</h3>
      <div class="goal-header">
        <div class="goal-numbers">
          <span class="goal-current">${coupleDist.toFixed(1)}</span>
          <span class="goal-target"> / ${sharedGoal.target} KM</span>
        </div>
        <div class="goal-pct">${sharedPct}%</div>
      </div>
      <div class="progress-track progress-lg">
        <div class="progress-fill" style="width:${sharedPct}%"></div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.6rem">
        ${(sharedGoal.target - coupleDist).toFixed(1)} KM left to reach your goal together
      </p>
    </div>

    <div class="dashboard-grid">
      <div>
        <!-- My Stats -->
        <h3 style="margin-bottom:0.9rem">My Stats</h3>
        <div class="stats-grid" style="margin-bottom:1.5rem">
          ${statCard("Today", myStats.todayDist, "KM", "")}
          ${statCard("This Week", myStats.weekDist, "KM", "")}
          ${statCard("This Month", myStats.monthDist, "KM", "")}
          ${statCard("Week Goal", `${myWeekPct}%`, "", "", `${myStats.weekDist}/${myWeekGoal} KM`)}
        </div>

        <!-- Recent Activities -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.9rem">
          <h3>Recent Activities</h3>
          <button class="btn btn-ghost btn-sm" data-view="history">View All →</button>
        </div>
        <div id="recent-acts">
          ${
            recentActs.length
              ? recentActs.map(activityCardHtml).join("")
              : `<div class="empty-state"><div class="empty-icon">🏃</div><h3>No activities yet</h3><p>Log your first run to get started!</p></div>`
          }
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <!-- Partner Stats -->
        ${
          partnerStats
            ? `
          <div class="partner-card" style="margin-bottom:1.25rem">
            <div class="partner-card-header">
              <div class="partner-avatar-sm">${initials(partnerName)}</div>
              <div>
                <div style="font-weight:700;font-size:0.9rem">${partnerName}</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">Partner Stats</div>
              </div>
            </div>
            <div class="stats-grid" style="grid-template-columns:1fr 1fr;gap:0.6rem">
              ${statCard("Today", partnerStats.todayDist, "KM", "", "", true)}
              ${statCard("Week", partnerStats.weekDist, "KM", "", "", true)}
              ${statCard("Month", partnerStats.monthDist, "KM", "", "", true)}
              ${statCard("Streak", partnerStats.streak + " days", "", "", "", true)}
            </div>
          </div>`
            : ""
        }

        <!-- Weekly Goal -->
        <div class="card" style="margin-bottom:1.25rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3>Weekly Goal</h3>
            <button class="btn btn-ghost btn-sm" id="edit-week-goal-btn">Edit</button>
          </div>
          <div class="weekly-goal-numbers">
            <span class="weekly-current">${myStats.weekDist}</span>
            <span class="weekly-target">/ ${myWeekGoal} KM</span>
          </div>
          <div class="progress-track" style="margin-bottom:0.4rem">
            <div class="progress-fill" style="width:${myWeekPct}%"></div>
          </div>
          <p style="font-size:0.78rem;color:var(--text-muted)">${myWeekPct}% complete this week</p>
        </div>

        <!-- Quick Log -->
        <div class="card card-glow">
          <h3 style="margin-bottom:0.85rem">Quick Log</h3>
          <button class="btn btn-primary btn-full" data-view="log"> Log Activity</button>
        </div>
      </div>
    </div>
  </div>`;
}

function statCard(label, value, unit, icon, sub = "", compact = false) {
  return `<div class="stat-card">
    <div class="stat-icon">${icon}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-value font-num">${value}${unit ? ` <span style="font-size:0.9rem;font-weight:400;color:var(--text-muted)">${unit}</span>` : ""}</div>
    ${sub ? `<div class="stat-unit">${sub}</div>` : ""}
  </div>`;
}

function activityCardHtml(a) {
  const type = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.walk;
  return `<div class="activity-card" style="margin-bottom:0.6rem">
    <div class="activity-type-icon">${type.icon}</div>
    <div class="activity-info">
      <div class="activity-type-label">${type.label}</div>
      <div class="activity-dist">${a.distance} KM <span style="font-size:0.8rem;color:var(--text-muted);font-weight:400">· ${a.duration} min · ${a.pace}</span></div>
      <div class="activity-meta">
        <span>${fmtDate(a.date)}</span>
      </div>
      ${a.notes ? `<div class="activity-note">"${a.notes}"</div>` : ""}
    </div>
  </div>`;
}

function bindDashboardEvents() {
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", () => switchView(el.dataset.view));
  });

  document
    .getElementById("edit-week-goal-btn")
    ?.addEventListener("click", showWeeklyGoalModal);
}

async function showWeeklyGoalModal() {
  const current = _myData?.weeklyGoal || 20;
  const { close } = openModal(`
    <h3 style="margin-bottom:0.35rem">Set Weekly Goal</h3>
    <p style="font-size:0.85rem;margin-bottom:1.25rem">How many KM do you want to cover this week?</p>
    <div class="form-group">
      <label class="form-label">Weekly Distance Goal (KM)</label>
      <input type="number" id="wgoal-input" class="form-input" value="${current}" min="1" max="500" step="0.5">
    </div>
    <button id="save-wgoal" class="btn btn-primary btn-full">Save Goal</button>`);

  document.getElementById("save-wgoal").addEventListener("click", async () => {
    const val = parseFloat(document.getElementById("wgoal-input").value);
    if (!val || val < 1) {
      toast("Enter a valid goal.", "error");
      return;
    }
    try {
      await setWeeklyGoal(getCurrentUser().uid, _myData.coupleId, val);
      toast("Weekly goal updated! 🎯", "success");
      close();
      await loadAppState();
      switchView("dashboard");
    } catch (e) {
      toast(e.message, "error");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// LOG ACTIVITY VIEW
// ═══════════════════════════════════════════════════════════════════
function buildLogView() {
  return `<div class="view" style="max-width:560px">
    <div class="card">
      <h2 style="margin-bottom:0.35rem">Log Activity</h2>
      <p style="font-size:0.85rem;margin-bottom:1.5rem">Track your walk, jog, or run</p>

      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" id="act-date" class="form-input" value="${todayStr()}" max="${todayStr()}">
      </div>

      <div class="form-group">
        <label class="form-label">Activity Type</label>
        <select id="act-type" class="form-input form-select">
          <option value="walk">🚶 Walk</option>
          <option value="jog">🏃 Jog</option>
          <option value="run">⚡ Run</option>
        </select>
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label">Distance (KM)</label>
          <input type="number" id="act-dist" class="form-input" placeholder="e.g. 5.3" min="0.01" max="200" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Duration (min)</label>
          <input type="number" id="act-dur" class="form-input" placeholder="e.g. 48" min="1" max="1440">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Calculated Pace</label>
        <div id="pace-preview" style="padding:0.65rem 1rem;background:rgba(255,255,255,0.04);border-radius:8px;color:var(--text-muted);font-family:'Inter',sans-serif;font-size:0.9rem">— / KM</div>
      </div>

      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <textarea id="act-notes" class="form-input" rows="3" maxlength="300" placeholder="How did it feel? Weather? Highlights…" style="resize:vertical"></textarea>
      </div>

      <div id="log-error" class="form-error" style="margin-bottom:0.75rem"></div>
      <button id="log-submit" class="btn btn-primary btn-full btn-lg">Save Activity</button>
    </div>
  </div>`;
}

function bindLogEvents() {
  const distEl = document.getElementById("act-dist");
  const durEl = document.getElementById("act-dur");
  const paceEl = document.getElementById("pace-preview");
  const submitBtn = document.getElementById("log-submit");
  const errEl = document.getElementById("log-error");

  function updatePace() {
    const dist = parseFloat(distEl.value);
    const dur = parseInt(durEl.value);
    paceEl.textContent = dist > 0 && dur > 0 ? calcPace(dist, dur) : "— / KM";
  }

  distEl.addEventListener("input", updatePace);
  durEl.addEventListener("input", updatePace);

  submitBtn.addEventListener("click", async () => {
    errEl.textContent = "";
    const date = document.getElementById("act-date").value;
    const type = document.getElementById("act-type").value;
    const dist = parseFloat(distEl.value);
    const dur = parseInt(durEl.value);
    const notes = document.getElementById("act-notes").value.trim();

    if (!date) {
      errEl.textContent = "Please select a date.";
      return;
    }
    if (!dist || dist <= 0) {
      errEl.textContent = "Enter a valid distance.";
      return;
    }
    if (!dur || dur <= 0) {
      errEl.textContent = "Enter a valid duration.";
      return;
    }

    setButtonLoading(submitBtn, true);
    try {
      const user = getCurrentUser();
      const activity = await logActivity(user.uid, _myData.coupleId, {
        date,
        type,
        distance: dist,
        duration: dur,
        notes,
      });

      // Check achievements
      await loadAppState();
      const myStats = computeStats(_myActivities);
      const coupleDist = parseFloat(_couple?.totalDistance || 0);
      await checkAndUnlockAchievements(user.uid, _myData.coupleId, {
        totalActivities: _myActivities.length,
        totalDist: parseFloat(
          _myActivities.reduce((s, a) => s + a.distance, 0),
        ),
        streak: myStats.streak,
        hasWalk: _myActivities.some((a) => a.type === "walk"),
        hasJog: _myActivities.some((a) => a.type === "jog"),
        hasRun: _myActivities.some((a) => a.type === "run"),
        coupleDist,
      });

      toast(
        `${ACTIVITY_TYPES[type].icon} ${dist} KM logged! Great job!`,
        "success",
      );
      switchView("dashboard");
    } catch (e) {
      errEl.textContent = e.message;
      setButtonLoading(submitBtn, false);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY VIEW
// ═══════════════════════════════════════════════════════════════════
async function buildHistoryView() {
  return `<div class="view">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
      <h2>Activity Log</h2>
      <div style="display:flex;gap:0.5rem">
        <input type="text" id="hist-search" class="form-input" placeholder="Search notes…" style="width:180px;padding:0.5rem 0.85rem;font-size:0.85rem">
        <select id="hist-filter" class="form-input form-select" style="width:110px;padding:0.5rem 0.85rem;font-size:0.85rem">
          <option value="all">All Types</option>
          <option value="walk">Walk</option>
          <option value="jog">Jog</option>
          <option value="run">Run</option>
        </select>
        <select id="hist-sort" class="form-input form-select" style="width:110px;padding:0.5rem 0.85rem;font-size:0.85rem">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:1.25rem" id="hist-tabs">
      <div class="tab active" data-who="me">My Activities (${_myActivities.length})</div>
      ${_partnerData ? `<div class="tab" data-who="partner">${_partnerData.name}'s Activities (${_partnerActivities.length})</div>` : ""}
    </div>

    <div id="hist-list"></div>
  </div>`;
}

function bindHistoryEvents() {
  let currentWho = "me";
  renderHistList(currentWho);

  document.querySelectorAll("#hist-tabs .tab").forEach((t) => {
    t.addEventListener("click", () => {
      document
        .querySelectorAll("#hist-tabs .tab")
        .forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      currentWho = t.dataset.who;
      renderHistList(currentWho);
    });
  });

  ["hist-search", "hist-filter", "hist-sort"].forEach((id) => {
    document
      .getElementById(id)
      ?.addEventListener("input", () => renderHistList(currentWho));
  });
}

function renderHistList(who) {
  const listEl = document.getElementById("hist-list");
  if (!listEl) return;
  let acts = who === "me" ? [..._myActivities] : [..._partnerActivities];
  const search =
    document.getElementById("hist-search")?.value.toLowerCase() || "";
  const filter = document.getElementById("hist-filter")?.value || "all";
  const sort = document.getElementById("hist-sort")?.value || "newest";

  if (filter !== "all") acts = acts.filter((a) => a.type === filter);
  if (search)
    acts = acts.filter(
      (a) =>
        (a.notes || "").toLowerCase().includes(search) ||
        a.type.includes(search),
    );
  acts.sort((a, b) =>
    sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
  );

  if (!acts.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No activities found</h3><p>Try a different filter or log a new activity.</p></div>`;
    return;
  }
  listEl.innerHTML = acts.map(activityCardHtml).join("");
}

// ═══════════════════════════════════════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════════
async function buildCalendarView() {
  const now = new Date();
  let calYear = now.getFullYear();
  let calMonth = now.getMonth();

  const myDates = new Set(_myActivities.map((a) => a.date));
  const partnerDates = new Set(_partnerActivities.map((a) => a.date));

  function buildCal(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();
    const monthName = new Date(year, month).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map((d) => `<div class="cal-header">${d}</div>`)
      .join("");

    let cells = "";
    for (let i = 0; i < firstDay; i++)
      cells += `<div class="cal-day empty faded"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isMy = myDates.has(dateStr);
      const isPar = partnerDates.has(dateStr);
      const isToday = dateStr === today;
      let cls = "cal-day";
      if (isMy && isPar) cls += " both";
      else if (isMy) cls += " mine";
      else if (isPar) cls += " partner";
      if (isToday) cls += " today";
      cells += `<div class="${cls}" data-date="${dateStr}" title="${dateStr}">${d}</div>`;
    }

    return { monthName, dayNames, cells };
  }

  const cal = buildCal(calYear, calMonth);

  return `<div class="view">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <button class="btn btn-ghost btn-sm" id="cal-prev">← Prev</button>
        <h3 id="cal-month-label">${cal.monthName}</h3>
        <button class="btn btn-ghost btn-sm" id="cal-next">Next →</button>
      </div>
      <div id="cal-grid">
        <div class="calendar-grid">${cal.dayNames}${cal.cells}</div>
      </div>
      <!-- Legend -->
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.1rem;font-size:0.78rem;color:var(--text-muted)">
        <span style="display:flex;align-items:center;gap:0.35rem"><span style="width:12px;height:12px;border-radius:3px;background:rgba(16,185,129,0.4);display:inline-block"></span>Both active</span>
        <span style="display:flex;align-items:center;gap:0.35rem"><span style="width:12px;height:12px;border-radius:3px;background:rgba(124,58,237,0.4);display:inline-block"></span>You only</span>
        <span style="display:flex;align-items:center;gap:0.35rem"><span style="width:12px;height:12px;border-radius:3px;background:rgba(236,72,153,0.4);display:inline-block"></span>Partner only</span>
      </div>
    </div>

    <div id="cal-detail" style="margin-top:1.25rem"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// GOALS VIEW
// ═══════════════════════════════════════════════════════════════════
async function buildGoalsView() {
  const user = getCurrentUser();
  const myStats = computeStats(_myActivities);
  const myWGoal = _myData?.weeklyGoal || 20;
  const myWPct = Math.min(
    100,
    Math.round((parseFloat(myStats.weekDist) / myWGoal) * 100),
  );
  const partnerStats = _partnerActivities.length
    ? computeStats(_partnerActivities)
    : null;
  const partnerWGoal = _partnerData
    ? (await getUserData(getPartnerId(_couple, user.uid)))?.weeklyGoal || 20
    : 20;
  const partnerWPct = partnerStats
    ? Math.min(
        100,
        Math.round((parseFloat(partnerStats.weekDist) / partnerWGoal) * 100),
      )
    : 0;
  const coupleDist = parseFloat(_couple?.totalDistance || 0);
  const sharedGoal = _couple?.sharedGoal || {
    target: 500,
    title: "500 KM Together",
  };
  const sharedPct = Math.min(
    100,
    Math.round((coupleDist / sharedGoal.target) * 100),
  );

  return `<div class="view">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.5rem" class="goals-top-grid">
      <!-- My Weekly Goal -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
          <div>
            <h3>My Weekly Goal</h3>
            <p style="font-size:0.8rem">Distance target for this week</p>
          </div>
          <button class="btn btn-outline btn-sm" id="edit-my-wgoal">Edit</button>
        </div>
        <div class="weekly-goal-numbers">
          <span class="weekly-current">${myStats.weekDist}</span>
          <span class="weekly-target">/ ${myWGoal} KM</span>
        </div>
        <div class="progress-track" style="margin:0.65rem 0 0.4rem">
          <div class="progress-fill" style="width:${myWPct}%"></div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted)">${myWPct}% complete · ${(myWGoal - parseFloat(myStats.weekDist)).toFixed(1)} KM remaining</p>
      </div>

      <!-- Partner Weekly Goal -->
      ${
        partnerStats
          ? `<div class="card partner-card">
        <div style="margin-bottom:1rem">
          <h3>${_partnerData?.name || "Partner"}'s Weekly Goal</h3>
          <p style="font-size:0.8rem">Their progress this week</p>
        </div>
        <div class="weekly-goal-numbers">
          <span class="weekly-current">${partnerStats.weekDist}</span>
          <span class="weekly-target">/ ${partnerWGoal} KM</span>
        </div>
        <div class="progress-track" style="margin:0.65rem 0 0.4rem">
          <div class="progress-fill" style="width:${partnerWPct}%"></div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted)">${partnerWPct}% complete</p>
      </div>`
          : `<div class="card"><div class="empty-state"><div class="empty-icon">👥</div><h3>Waiting for partner</h3></div></div>`
      }
    </div>

    <!-- Shared Goal -->
    <div class="shared-goal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
        <div>
          <h3>${sharedGoal.title}</h3>
          <p style="font-size:0.8rem">Your couple's shared distance goal</p>
        </div>
        <button class="btn btn-outline btn-sm" id="edit-shared-goal">Edit</button>
      </div>
      <div class="goal-header">
        <div class="goal-numbers">
          <span class="goal-current">${coupleDist.toFixed(1)}</span>
          <span class="goal-target"> / ${sharedGoal.target} KM</span>
        </div>
        <div class="goal-pct">${sharedPct}%</div>
      </div>
      <div class="progress-track progress-lg" style="margin:0.75rem 0 0.6rem">
        <div class="progress-fill" style="width:${sharedPct}%"></div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted)">${(sharedGoal.target - coupleDist).toFixed(1)} KM left together 💑</p>
    </div>
  </div>`;
}

function bindGoalEvents() {
  document
    .getElementById("edit-my-wgoal")
    ?.addEventListener("click", showWeeklyGoalModal);
  document
    .getElementById("edit-shared-goal")
    ?.addEventListener("click", showSharedGoalModal);
}

async function showSharedGoalModal() {
  const sg = _couple?.sharedGoal || { target: 500, title: "500 KM Together" };
  const { close } = openModal(`
    <h3 style="margin-bottom:0.35rem">Edit Couple Goal</h3>
    <p style="font-size:0.85rem;margin-bottom:1.25rem">Set a shared distance milestone for you two.</p>
    <div class="form-group">
      <label class="form-label">Goal Title</label>
      <input type="text" id="sg-title" class="form-input" value="${sg.title}" maxlength="60">
    </div>
    <div class="form-group">
      <label class="form-label">Target Distance (KM)</label>
      <input type="number" id="sg-target" class="form-input" value="${sg.target}" min="1" max="10000">
    </div>
    <button id="save-sg" class="btn btn-primary btn-full">Save Couple Goal</button>`);

  document.getElementById("save-sg").addEventListener("click", async () => {
    const title = document.getElementById("sg-title").value.trim();
    const target = parseFloat(document.getElementById("sg-target").value);
    if (!title || !target || target < 1) {
      toast("Please fill in all fields.", "error");
      return;
    }
    try {
      await setSharedGoal(_myData.coupleId, target, title);
      toast("Couple goal updated! 💑", "success");
      close();
      switchView("goals");
    } catch (e) {
      toast(e.message, "error");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGES VIEW
// ═══════════════════════════════════════════════════════════════════
function buildMessagesView() {
  return `<div class="view" style="max-width:620px">
    <div class="card" style="margin-bottom:1.25rem">
      <h3 style="margin-bottom:0.85rem">Send Encouragement</h3>
      <div class="form-group" style="margin-bottom:0.75rem">
        <textarea id="msg-input" class="form-input" rows="2" maxlength="150"
          placeholder="Write your message..." style="resize:none"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:0.25rem">
          <span id="msg-chars" style="font-size:0.72rem;color:var(--text-dim)">0 / 150</span>
        </div>
      </div>
      <button id="send-msg-btn" class="btn btn-primary">Send Message</button>
    </div>
    <h3 style="margin-bottom:0.85rem">Messages</h3>
    <div id="messages-list">
      <div class="page-loader" style="min-height:auto;padding:2rem"><div class="spinner"></div></div>
    </div>
  </div>`;
}

function bindMessageEvents() {
  const input = document.getElementById("msg-input");
  const charEl = document.getElementById("msg-chars");
  const sendBtn = document.getElementById("send-msg-btn");

  input?.addEventListener("input", () => {
    charEl.textContent = `${input.value.length} / 150`;
  });

  sendBtn?.addEventListener("click", async () => {
    const text = input?.value.trim();
    if (!text) {
      toast("Write something encouraging!", "error");
      return;
    }
    setButtonLoading(sendBtn, true);
    try {
      const user = getCurrentUser();
      await sendMessage(
        _myData.coupleId,
        user.uid,
        _myData?.name || "You",
        text,
      );
      input.value = "";
      charEl.textContent = "0 / 150";
      toast("Message sent! ❤️", "success");
    } catch (e) {
      toast(e.message, "error");
    }
    setButtonLoading(sendBtn, false);
  });

  // Realtime watch
  watchMessages(_myData.coupleId, (msgs) => {
    const listEl = document.getElementById("messages-list");
    if (!listEl) return;
    if (!msgs.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h3>No messages yet</h3><p>Send the first encouragement!</p></div>`;
      return;
    }
    const user = getCurrentUser();
    listEl.innerHTML = msgs
      .map(
        (m) => `
      <div class="message-bubble ${m.uid === user.uid ? "mine" : ""}" style="margin-bottom:0.75rem">
        <div class="message-meta">
          <span style="font-weight:600;color:${m.uid === user.uid ? "var(--violet-light)" : "var(--pink-light)"}">${m.name}</span>
          <span>${fmtRelative(m.sentAt)}</span>
        </div>
        <div class="message-text">${m.text}</div>
      </div>`,
      )
      .join("");
  });
}

// ═══════════════════════════════════════════════════════════════════
// ACHIEVEMENTS VIEW
// ═══════════════════════════════════════════════════════════════════
async function buildAchievementsView() {
  const user = getCurrentUser();
  return new Promise((resolve) => {
    watchAchievements(user.uid, _myData.coupleId, (unlocked) => {
      const html = `<div class="view">
        <h2 style="margin-bottom:0.4rem">Achievements </h2>
        <p style="margin-bottom:1.5rem;font-size:0.88rem">${Object.keys(unlocked).length} / ${ACHIEVEMENTS.length} unlocked</p>
        <div class="achievements-grid">
          ${ACHIEVEMENTS.map((ach) => {
            const isUnlocked = !!unlocked[ach.id];
            const unlockedAt = unlocked[ach.id]?.unlockedAt;
            return `<div class="achievement-item ${isUnlocked ? "unlocked" : "locked"}" title="${ach.desc}">
              <span class="achievement-emoji">${ach.emoji}</span>
              <div class="achievement-title">${ach.title}</div>
              <div class="achievement-desc">${ach.desc}</div>
              ${isUnlocked ? `<div style="font-size:0.62rem;color:var(--success);margin-top:0.3rem">✓ Unlocked</div>` : ""}
            </div>`;
          }).join("")}
        </div>
      </div>`;
      resolve(html);
    });
  });
}
