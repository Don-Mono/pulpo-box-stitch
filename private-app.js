(function () {
  const routes = [
    { href: "/dashboard.html", label: "Inicio", icon: "⌂" },
    { href: "/student.html", label: "Mi rutina", icon: "▦" },
    { href: "/workouts.html", label: "Rutinas", icon: "▤" },
    { href: "/exercises.html", label: "Biblioteca", icon: "◫" },
    { href: "/progress.html", label: "Progreso", icon: "↗" },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function getInitialsAvatar(nameOrEmail) {
    const parts = String(nameOrEmail || "PB").trim().split(/\s+|@/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PB";
  }

  function createMetricCard({ label, value = "--", helper = "", tone = "" }) {
    return `
      <article class="metric-card ${tone ? `is-${escapeHtml(tone)}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        ${helper ? `<small>${escapeHtml(helper)}</small>` : ""}
      </article>
    `;
  }

  function createStatusChip(label, status = "") {
    return `<span class="status-pill ${status ? `is-${escapeHtml(status)}` : ""}">${escapeHtml(label)}</span>`;
  }

  function createEmptyState({ title = "Sin datos por ahora", message = "Cuando exista informacion, aparecera aqui.", action = "" } = {}) {
    return `
      <article class="mini-list-item private-empty-state">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
        ${action ? `<small>${escapeHtml(action)}</small>` : ""}
      </article>
    `;
  }

  function renderSkeleton(count = 3) {
    return Array.from({ length: count }, () => '<article class="mini-list-item private-skeleton"><strong></strong><span></span></article>').join("");
  }

  function showToast(message, type = "info") {
    let toast = document.querySelector(".private-app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "private-app-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function setActiveTab(buttons, panels, nextTab) {
    buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.studentTab === nextTab));
    panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.studentPanel === nextTab));
  }

  function markActiveTopbarLink() {
    const path = window.location.pathname;
    document.querySelectorAll(".management-topbar a[href], .private-app-bottom-nav a[href]").forEach((link) => {
      const href = new URL(link.getAttribute("href"), window.location.origin).pathname;
      link.classList.toggle("is-active", href === path);
    });
  }

  function createBottomNav() {
    if (document.querySelector(".student-module-nav") || document.querySelector(".private-app-bottom-nav")) return;
    const nav = document.createElement("nav");
    nav.className = "private-app-bottom-nav";
    nav.setAttribute("aria-label", "Navegacion privada");
    nav.innerHTML = routes.map((route) => `
      <a href="${route.href}">
        <span aria-hidden="true">${route.icon}</span>
        <strong>${route.label}</strong>
      </a>
    `).join("");
    document.body.appendChild(nav);
  }

  function enhanceTables() {
    document.querySelectorAll(".table-shell").forEach((tableShell) => {
      tableShell.setAttribute("tabindex", "0");
      tableShell.setAttribute("aria-label", tableShell.getAttribute("aria-label") || "Tabla desplazable");
    });
  }

  function init() {
    document.body.dataset.privateApp = "true";
    createBottomNav();
    markActiveTopbarLink();
    enhanceTables();
  }

  window.PulpoPrivateApp = {
    createMetricCard,
    createStatusChip,
    createEmptyState,
    escapeHtml,
    formatDate,
    formatNumber,
    getInitialsAvatar,
    renderSkeleton,
    setActiveTab,
    showToast,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
