// app.js — Main SPA entry point
// RunWithMe — Every Step Together ❤️

import { initAuth, getCurrentUser, getUserData } from "./auth.js";
import { register, resolve, navigate, initRouter } from "./router.js";
import { renderLogin, renderRegister, renderPairing } from "./auth-views.js";
import { loadAppState, renderShell, switchView } from "./views.js";

// ─── BOOT ──────────────────────────────────────────────────────────
async function boot() {
  // Show loading screen
  document.getElementById("app").innerHTML = `
    <div class="page-loader">
      <div style="text-align:center">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;animation:corePulse 2s ease-in-out infinite">❤️‍🔥</div>
        <div class="text-gradient" style="font-size:1.5rem;font-weight:800;margin-bottom:0.35rem">RunWithMe</div>
        <p style="font-size:0.85rem;color:var(--text-muted)">Every Step Together ❤️</p>
      </div>
    </div>`;

  // Initialize router
  initRouter();

  // Wait for Firebase Auth to resolve
  const user = await initAuth();

  // ─── ROUTE DEFINITIONS ──────────────────────────────────────────
  register("/login", () => {
    if (getCurrentUser()) return redirectToDashboard();
    renderLogin();
  });
  register("/register", () => {
    if (getCurrentUser()) return redirectToDashboard();
    renderRegister();
  });
  register("/", () => {
    if (!getCurrentUser()) return navigate("/login", true);
    redirectToDashboard();
  });
  register("/dashboard", () => {
    if (!getCurrentUser()) return navigate("/login", true);
    redirectToDashboard();
  });
  register("/404", () => {
    document.getElementById("app").innerHTML = `
      <div class="page-loader">
        <div style="text-align:center">
          <div style="font-size:3rem;margin-bottom:1rem">🔍</div>
          <h2 style="margin-bottom:0.5rem">Page Not Found</h2>
          <p style="margin-bottom:1.5rem">That page doesn't exist.</p>
          <button class="btn btn-primary" onclick="history.back()">← Go Back</button>
        </div>
      </div>`;
  });

  // Listen for auth state changes → redirect accordingly
  import("./auth.js").then(({ onAuth }) => {
    onAuth((user) => {
      const path = window.location.pathname;

      if (!user) {
        if (path !== "/login" && path !== "/register") {
          navigate("/login", true);
        }
        return;
      }

      if (path === "/login" || path === "/register" || path === "/") {
        navigate("/dashboard", true);
      }
    });
  });

  // Resolve initial route
  const path = window.location.pathname;
  resolve(path || "/");
}

async function redirectToDashboard() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }

  // Get user data to check coupling
  const userData = await getUserData(user.uid);

  if (!userData?.coupleId) {
    renderPairing(
      userData || {
        name: user.displayName || "Runner",
      },
    );
    return;
  }

  // Check if couple has partner
  const { getCoupleData, getPartnerId } = await import("./couple.js");
  const couple = await getCoupleData(userData.coupleId);
  const partnerId = getPartnerId(couple, user.uid);

  if (!couple || !partnerId) {
    // Still waiting for partner (user created couple, code not used yet)
    renderPairing(userData);
    return;
  }

  // All good — load full dashboard

  const loaded = await loadAppState();

  if (!loaded) {
    renderPairing(userData);
    return;
  }

  renderShell("", "dashboard", "Dashboard");
  await switchView("dashboard");
}

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────
window.addEventListener("unhandledrejection", (e) => {
  console.error("RunWithMe error:", e.reason);
  import("./ui.js").then(({ toast }) => {
    toast("Something went wrong. Please refresh.", "error");
  });
});

// ─── START ─────────────────────────────────────────────────────────
boot();
