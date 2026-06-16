// ui.js — Toast notifications, modals, loading helpers

// ─── TOAST ────────────────────────────────────────────────────────
let toastContainer;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const ICONS = { success: "✅", error: "❌", info: "ℹ️" };

export function toast(msg, type = "info", duration = 3000) {
  const container = getToastContainer();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${ICONS[type] || "💬"}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = "toastOut 0.3s ease-in forwards"; setTimeout(() => el.remove(), 300); }, duration);
}

// ─── MODAL ────────────────────────────────────────────────────────
export function openModal(htmlContent, opts = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close btn-ghost btn";
  closeBtn.innerHTML = "✕";

  modal.innerHTML = htmlContent;
  modal.prepend(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  function close() {
    overlay.classList.add("closing");
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = "";
    }, 200);
    opts.onClose?.();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  return { overlay, modal, close };
}

// ─── LOADING STATES ────────────────────────────────────────────────
export function setButtonLoading(btn, loading, text = "") {
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span>`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || text;
    btn.disabled = false;
  }
}

// ─── PAGE LOADER ───────────────────────────────────────────────────
export function showPageLoader(container) {
  container.innerHTML = `
    <div class="page-loader">
      <div class="spinner" style="width:36px;height:36px;border-width:3px"></div>
      <p style="color:var(--text-muted);font-size:0.9rem">Loading…</p>
    </div>`;
}

// ─── FORMAT HELPERS ────────────────────────────────────────────────
export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export function fmtRelative(ts) {
  const diff = Date.now() - ts;
  const sec  = diff / 1000;
  const min  = sec  / 60;
  const hr   = min  / 60;
  const day  = hr   / 24;
  if (sec < 60)  return "just now";
  if (min < 60)  return `${Math.floor(min)}m ago`;
  if (hr  < 24)  return `${Math.floor(hr)}h ago`;
  return `${Math.floor(day)}d ago`;
}

export function initials(name = "") {
  return name.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2);
}

// ─── CONFIRM DIALOG ────────────────────────────────────────────────
export function confirm(msg) {
  return new Promise((resolve) => {
    const { modal, close } = openModal(`
      <h3 style="margin-bottom:0.5rem">Confirm</h3>
      <p style="color:var(--text-muted);margin-bottom:1.5rem">${msg}</p>
      <div style="display:flex;gap:0.75rem">
        <button id="conf-cancel" class="btn btn-outline btn-full">Cancel</button>
        <button id="conf-ok" class="btn btn-primary btn-full">Confirm</button>
      </div>`);
    modal.querySelector("#conf-cancel").addEventListener("click", () => { close(); resolve(false); });
    modal.querySelector("#conf-ok").addEventListener("click", () => { close(); resolve(true); });
  });
}
