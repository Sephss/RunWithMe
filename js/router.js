// router.js — Vanilla JS SPA router using history.pushState

const routes = {};

export function register(path, handler) {
  routes[path] = handler;
}

export function navigate(path, replace = false) {
  console.log("NAVIGATE:", path);
  if (replace) {
    history.replaceState({}, "", path);
  } else {
    history.pushState({}, "", path);
  }
  resolve(path);
}

export function resolve(path) {
  // Strip query params for matching
  const cleanPath = path.split("?")[0];
  const handler = routes[cleanPath] || routes["/404"] || routes["/"];
  if (handler) handler();
}

export function initRouter() {
  window.addEventListener("popstate", () => {
    resolve(window.location.pathname);
  });

  // Intercept link clicks for SPA navigation
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
      e.preventDefault();
      navigate(link.getAttribute("href") || link.dataset.href);
    }
  });
}
