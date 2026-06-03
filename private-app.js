(function () {
  const routeGroups = {
    admin: [
      { href: "/dashboard.html", label: "Inicio", icon: "IN" },
      { href: "/students.html", label: "Alumnos", icon: "AL" },
      { href: "/workouts.html", label: "Rutinas", icon: "RU" },
      { href: "/exercises.html", label: "Biblioteca", icon: "BI" },
      { href: "/progress.html", label: "Progreso", icon: "PR" },
    ],
    coach: [
      { href: "/coach.html", label: "Inicio", icon: "IN" },
      { href: "/coach-workouts.html", label: "Rutinas", icon: "RU" },
      { href: "/coach.html#seguimiento", label: "Progreso", icon: "PR" },
      { href: "/coach.html#feedback", label: "Feedback", icon: "FB" },
      { href: "/coach.html#perfil", label: "Perfil", icon: "PE" },
    ],
    student: [
      { href: "/student.html#rutina", label: "Rutina", icon: "RU" },
      { href: "/student.html#progreso", label: "Progreso", icon: "PR" },
      { href: "/student.html#calendario", label: "Agenda", icon: "AG" },
      { href: "/student.html#salud", label: "Salud", icon: "SA" },
      { href: "/student.html#perfil", label: "Perfil", icon: "PE" },
    ],
  };

  const pageRoles = new Map([
    ["/student.html", "student"],
    ["/coach.html", "coach"],
    ["/coach-workouts.html", "coach"],
    ["/coach-student.html", "coach"],
  ]);

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

  function createSectionHeader({ eyebrow = "", title = "", copy = "", action = "" } = {}) {
    return `
      <header class="private-section-heading">
        <div>
          ${eyebrow ? `<span class="private-eyebrow">${escapeHtml(eyebrow)}</span>` : ""}
          ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
          ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
        </div>
        ${action || ""}
      </header>
    `;
  }

  function createProfileMiniCard({ name = "Pulpo Box", role = "Activo", helper = "", image = "", tone = "" } = {}) {
    const avatar = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">`
      : `<span>${escapeHtml(getInitialsAvatar(name))}</span>`;

    return `
      <article class="private-profile-mini ${tone ? `is-${escapeHtml(tone)}` : ""}">
        <div class="private-avatar">${avatar}</div>
        <div>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(role)}</small>
          ${helper ? `<p>${escapeHtml(helper)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function createAppBadge(label, tone = "") {
    return `<span class="private-app-badge ${tone ? `is-${escapeHtml(tone)}` : ""}">${escapeHtml(label)}</span>`;
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
    buttons.forEach((button) => {
      const tab = button.dataset.studentTab || button.dataset.coachTab;
      const isActive = tab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });
    panels.forEach((panel) => {
      const tab = panel.dataset.studentPanel || panel.dataset.coachPanel;
      const isActive = tab === nextTab;
      panel.classList.toggle("is-active", isActive);
      panel.classList.toggle("hidden", !isActive);
    });
  }

  function getPageRole() {
    const path = window.location.pathname;
    if (pageRoles.has(path)) return pageRoles.get(path);
    if (path.includes("coach")) return "coach";
    return "admin";
  }

  function getPrivateRoutes() {
    return routeGroups[getPageRole()] || routeGroups.admin;
  }

  function markActiveTopbarLink() {
    const path = window.location.pathname;
    document.querySelectorAll(".management-topbar a[href], .private-app-bottom-nav a[href]").forEach((link) => {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      const href = url.pathname;
      const hashMatches = url.hash ? url.hash === window.location.hash : true;
      link.classList.toggle("is-active", href === path && hashMatches);
    });
  }

  function createBottomNav() {
    if (document.querySelector(".student-module-nav") || document.querySelector(".private-app-bottom-nav")) return;
    const nav = document.createElement("nav");
    nav.className = "private-app-bottom-nav";
    nav.setAttribute("aria-label", "Navegacion privada");
    nav.innerHTML = getPrivateRoutes().map((route) => `
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
    const pageName = window.location.pathname.replace(/^\//, "").replace(/\.html$/, "") || "dashboard";
    document.body.dataset.privateApp = "true";
    document.body.dataset.privatePage = pageName;
    document.body.dataset.privateRole = getPageRole();
    document.body.classList.add("private-app-page", `private-page-${pageName}`);
    createBottomNav();
    markActiveTopbarLink();
    enhanceTables();
    window.addEventListener("hashchange", markActiveTopbarLink);
  }

  window.PulpoPrivateApp = {
    createAppBadge,
    createEmptyState,
    createMetricCard,
    createProfileMiniCard,
    createSectionHeader,
    createStatusChip,
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
