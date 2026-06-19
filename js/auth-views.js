// auth-views.js — Login and Register page renderers

import { login, register } from "./auth.js";
import { navigate } from "./router.js";
import { toast, setButtonLoading } from "./ui.js";
import { createCouple, joinCouple } from "./couple.js";
import { getCurrentUser, getUserData } from "./auth.js";

// ─── LOGIN PAGE ────────────────────────────────────────────────────
export function renderLogin() {
  document.getElementById("app").innerHTML = `
  <div class="page auth-page">
    <div class="auth-brand">
      <div class="auth-brand-inner">
        <div class="heartbeat-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
          <div class="ring-core"></div>
        </div>
        <div class="auth-logo-name text-gradient">RunWithMe</div>
        <p class="auth-tagline">Every Step Together ❤️</p>
        <ul class="auth-features">
          <li><span>🏃</span><span>Log walks, jogs &amp; runs together</span></li>
          <li><span>🔥</span><span>Build streaks &amp; stay consistent</span></li>
          <li><span>🎯</span><span>Set &amp; crush shared goals</span></li>
          <li><span>💬</span><span>Cheer each other on daily</span></li>
          <li><span>🏆</span><span>Unlock achievements together</span></li>
        </ul>
      </div>
    </div>
    <div class="auth-form-panel">
      <div class="auth-form-wrap">
        <div class="auth-form-header">
          <h2>Welcome back</h2>
        
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="login-email" class="form-input" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="login-pass" class="form-input" placeholder="Your password" autocomplete="current-password">
        </div>
        <div id="login-error" class="form-error" style="margin-bottom:0.75rem"></div>
        <button id="login-btn" class="btn btn-primary btn-full btn-lg">Sign In →</button>

        <div class="auth-divider">or</div>
        <p style="text-align:center;font-size:0.85rem;color:var(--text-muted)">
          New here? <a href="/register" data-link style="color:var(--violet-light);font-weight:600">Create an account</a>
        </p>
      </div>
    </div>
  </div>`;

  bindLoginEvents();
}

function bindLoginEvents() {
  const btn = document.getElementById("login-btn");
  const errEl = document.getElementById("login-error");

  async function attempt() {
    errEl.textContent = "";
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (!email || !pass) {
      errEl.textContent = "Please fill in all fields.";
      return;
    }

    setButtonLoading(btn, true);
    try {
      await login(email, pass);
      // Will redirect via auth state change in app.js
    } catch (e) {
      errEl.textContent = friendlyAuthError(e.code);
      setButtonLoading(btn, false);
    }
  }

  btn.addEventListener("click", attempt);
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attempt();
  });
}

// ─── REGISTER PAGE ─────────────────────────────────────────────────
export function renderRegister() {
  document.getElementById("app").innerHTML = `
  <div class="page auth-page">
    <div class="auth-brand">
      <div class="auth-brand-inner">
        <div class="heartbeat-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
          <div class="ring-core">❤️‍🔥</div>
        </div>
        <div class="auth-logo-name text-gradient">RunWithMe</div>
        <p class="auth-tagline">Every Step Together ❤️</p>
        <ul class="auth-features">
          <li><span>🏃</span><span>Log walks, jogs &amp; runs together</span></li>
          <li><span>🔥</span><span>Build streaks &amp; stay consistent</span></li>
          <li><span>🎯</span><span>Set &amp; crush shared goals</span></li>
          <li><span>💬</span><span>Cheer each other on daily</span></li>
          <li><span>🏆</span><span>Unlock achievements together</span></li>
        </ul>
      </div>
    </div>
    <div class="auth-form-panel">
      <div class="auth-form-wrap">
        <div class="auth-form-header">
          <h2>Create account</h2>
          <p>Already have one? <a href="/login" data-link>Sign in</a></p>
        </div>

        <div class="form-group">
          <label class="form-label">Your Name</label>
          <input type="text" id="reg-name" class="form-input" placeholder="e.g. Maria" autocomplete="name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="reg-email" class="form-input" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-pass" class="form-input" placeholder="Min. 6 characters" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" id="reg-pass2" class="form-input" placeholder="Repeat password" autocomplete="new-password">
          </div>
        </div>
        <div id="reg-error" class="form-error" style="margin-bottom:0.75rem"></div>
        <button id="reg-btn" class="btn btn-primary btn-full btn-lg">Create Account →</button>
      </div>
    </div>
  </div>`;

  bindRegisterEvents();
}

function bindRegisterEvents() {
  const btn = document.getElementById("reg-btn");
  const errEl = document.getElementById("reg-error");

  btn.addEventListener("click", async () => {
    errEl.textContent = "";
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass = document.getElementById("reg-pass").value;
    const pass2 = document.getElementById("reg-pass2").value;

    if (!name) {
      errEl.textContent = "Enter your name.";
      return;
    }
    if (!email) {
      errEl.textContent = "Enter a valid email.";
      return;
    }
    if (pass.length < 6) {
      errEl.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (pass !== pass2) {
      errEl.textContent = "Passwords do not match.";
      return;
    }

    setButtonLoading(btn, true);
    try {
      await register(name, email, pass);
      // Auth state change will trigger pairing screen
    } catch (e) {
      errEl.textContent = friendlyAuthError(e.code);
      setButtonLoading(btn, false);
    }
  });
}

// ─── PAIRING SCREEN ────────────────────────────────────────────────
export function renderPairing(userData) {
  document.getElementById("app").innerHTML = `
  <div class="page" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:var(--night)">
    <div style="width:100%;max-width:480px">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:2rem">
        <div style="font-size:3rem;margin-bottom:0.75rem">💑</div>
        <h2>Connect with your partner</h2>
        <p>Create a couple or join with an invite code</p>
      </div>

      <div class="tabs" style="margin-bottom:1.5rem" id="pair-tabs">
        <div class="tab active" data-tab="create">Create Couple</div>
        <div class="tab" data-tab="join">Join Couple</div>
      </div>

      <!-- Create Panel -->
      <div id="pair-create" class="card">
        <h3 style="margin-bottom:0.5rem">Start a new couple 🌟</h3>
        <p style="font-size:0.85rem;margin-bottom:1.25rem">Generate a unique code and share it with your partner.</p>
        <button id="create-couple-btn" class="btn btn-primary btn-full btn-lg">Generate Invite Code</button>
        <div id="couple-code-result" style="margin-top:1.25rem"></div>
      </div>

      <!-- Join Panel -->
      <div id="pair-join" class="card hidden">
        <h3 style="margin-bottom:0.5rem">Join with a code 🔑</h3>
        <p style="font-size:0.85rem;margin-bottom:1.25rem">Enter the invite code your partner shared with you.</p>
        <div class="form-group">
          <label class="form-label">Invite Code</label>
          <input type="text" id="join-code-input" class="form-input"
            placeholder="RUN-XXXXXX" maxlength="10"
            style="text-transform:uppercase;font-size:1.1rem;letter-spacing:0.1em;text-align:center">
        </div>
        <div id="join-error" class="form-error" style="margin-bottom:0.75rem"></div>
        <button id="join-couple-btn" class="btn btn-primary btn-full btn-lg">Join Couple ❤️</button>
      </div>

      <div style="margin-top:1rem;text-align:center">
        <button class="btn btn-ghost btn-sm" id="pair-logout">Sign out</button>
      </div>
    </div>
  </div>`;

  bindPairingEvents(userData);
}

function bindPairingEvents(userData) {
  // Tabs
  document.querySelectorAll("#pair-tabs .tab").forEach((t) => {
    t.addEventListener("click", () => {
      document
        .querySelectorAll("#pair-tabs .tab")
        .forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      document
        .getElementById("pair-create")
        .classList.toggle("hidden", t.dataset.tab !== "create");
      document
        .getElementById("pair-join")
        .classList.toggle("hidden", t.dataset.tab !== "join");
    });
  });

  // Create couple
  document
    .getElementById("create-couple-btn")
    .addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      setButtonLoading(btn, true);
      try {
        const user = getCurrentUser();
        const { coupleId, code } = await createCouple(user.uid, userData.name);
        document.getElementById("couple-code-result").innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(236,72,153,0.15));border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem;text-align:center">
          <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.5rem">Your invite code</p>
          <div style="font-size:2rem;font-weight:900;font-family:'Inter',sans-serif;letter-spacing:0.12em;color:var(--text)">${code}</div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem">Share this with your partner so they can join.</p>
          <button id="copy-code-btn" class="btn btn-ghost btn-sm" style="margin-top:0.75rem">📋 Copy Code</button>
        </div>
        <p style="text-align:center;font-size:0.82rem;color:var(--text-muted);margin-top:0.75rem">Waiting for your partner to join…</p>`;

        document
          .getElementById("copy-code-btn")
          ?.addEventListener("click", () => {
            navigator.clipboard
              .writeText(code)
              .then(() => toast("Code copied! 📋", "success"));
          });

        // Watch for partner to join
        import("./couple.js").then(({ watchCouple }) => {
          watchCouple(coupleId, (couple) => {
            if (couple && Object.keys(couple.members || {}).length >= 2) {
              toast("Your partner joined! 🎉", "success");
              setTimeout(() => location.reload(), 1000);
            }
          });
        });
      } catch (e) {
        toast(e.message, "error");
      }
      setButtonLoading(btn, false);
    });

  // Join couple
  document
    .getElementById("join-couple-btn")
    .addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const code = document.getElementById("join-code-input").value.trim();
      const errEl = document.getElementById("join-error");
      errEl.textContent = "";
      if (!code) {
        errEl.textContent = "Enter an invite code.";
        return;
      }
      setButtonLoading(btn, true);
      try {
        const user = getCurrentUser();
        await joinCouple(user.uid, userData.name, code);
        toast("Joined! Welcome to your couple 💑", "success");
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        errEl.textContent = e.message;
        setButtonLoading(btn, false);
      }
    });

  document.getElementById("pair-logout").addEventListener("click", () => {
    import("./auth.js").then(({ logout }) => logout());
  });
}

// ─── FRIENDLY ERROR MESSAGES ───────────────────────────────────────
function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
