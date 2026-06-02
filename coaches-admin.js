(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const coachForm = document.querySelector("#coachForm");
  const coachStatus = document.querySelector("#coachStatus");
  const coachesBody = document.querySelector("#coachesBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const coachSearch = document.querySelector("#coachSearch");
  const coachStatusFilter = document.querySelector("#coachStatusFilter");
  const coachesPageSize = document.querySelector("#coachesPageSize");
  const coachesPaginationStatus = document.querySelector("#coachesPaginationStatus");
  const previousCoachesPageButton = document.querySelector("#previousCoachesPageButton");
  const nextCoachesPageButton = document.querySelector("#nextCoachesPageButton");

  let setupRequired = false;
  let currentPage = Number(coachesPageSize?.dataset.initialPage || 1);
  let currentPageSize = Number(coachesPageSize?.value || 20);
  let currentTotalPages = 1;
  let currentTotalCoaches = 0;
  let currentSearch = "";
  let currentStatusFilter = "";

  function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status ${type}`.trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getInitialPage() {
    try {
      const page = Number(new URLSearchParams(window.location.search).get("page") || "1");
      return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    } catch {
      return 1;
    }
  }

  function getInitialPageSize() {
    try {
      const pageSize = Number(new URLSearchParams(window.location.search).get("page_size") || String(currentPageSize));
      if ([10, 20, 50].includes(pageSize)) return pageSize;
      return currentPageSize;
    } catch {
      return currentPageSize;
    }
  }

  function getInitialFilter(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch {
      return "";
    }
  }

  function syncUrl() {
    try {
      const url = new URL(window.location.href);
      if (currentSearch) url.searchParams.set("q", currentSearch);
      else url.searchParams.delete("q");
      if (currentStatusFilter) url.searchParams.set("status", currentStatusFilter);
      else url.searchParams.delete("status");
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("page_size", String(currentPageSize));
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors.
    }
  }

  async function requireAdminSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      window.location.href = "/login.html";
      return null;
    }

    const payload = await response.json();
    if (payload.user?.role !== "admin") {
      window.location.href = "/dashboard.html";
      return null;
    }

    userEmail.textContent = payload.user.email || "";
    return payload.user;
  }

  function renderPagination() {
    const start = currentTotalCoaches ? ((currentPage - 1) * currentPageSize) + 1 : 0;
    const end = Math.min(currentPage * currentPageSize, currentTotalCoaches);
    coachesPaginationStatus.textContent = currentTotalCoaches
      ? `Mostrando ${start}-${end} de ${currentTotalCoaches} coach(es). Pagina ${currentPage} de ${currentTotalPages}.`
      : "Sin coaches para este filtro.";
    previousCoachesPageButton.disabled = currentPage <= 1;
    nextCoachesPageButton.disabled = currentPage >= currentTotalPages;
  }

  function renderEmpty(message) {
    coachesBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  }

  function renderCoaches(coaches) {
    if (!coaches.length) {
      renderEmpty("Todavia no hay coaches registrados.");
      renderPagination();
      return;
    }

    coachesBody.innerHTML = coaches.map((coach) => {
      const nextState = coach.is_active ? "false" : "true";
      const actionLabel = coach.is_active ? "Desactivar" : "Activar";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(coach.full_name)}</strong>
            <small>${escapeHtml(coach.photo_url || "Sin foto asignada")}</small>
          </td>
          <td>
            ${escapeHtml(coach.email || "Sin email")}
            <small>${escapeHtml(coach.phone || "Sin telefono")}</small>
          </td>
          <td>${escapeHtml(coach.specialty || "Pendiente")}</td>
          <td>${escapeHtml(coach.bio || "Pendiente")}</td>
          <td><span class="status-chip ${coach.is_active ? "is-active" : "is-inactive"}">${coach.is_active ? "Activo" : "Inactivo"}</span></td>
          <td>
            <div class="table-actions">
              <a class="button ghost compact-button" href="/coach-detail.html?coach_id=${encodeURIComponent(coach.id)}">Ver ficha</a>
              <button class="button ghost compact-button" data-coach-reset="${escapeHtml(coach.id)}" type="button">Resetear clave</button>
              <button class="button ghost compact-button" data-coach-status="${escapeHtml(coach.id)}" data-next-state="${nextState}" type="button">${actionLabel}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    renderPagination();
  }

  async function loadCoaches() {
    renderEmpty("Cargando coaches...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentSearch) params.set("q", currentSearch);
      if (currentStatusFilter) params.set("status", currentStatusFilter);

      const response = await fetch(`/api/admin/coaches?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar coaches.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar coaches cuando lo necesites.";
      currentPage = Math.max(Number(payload.pagination?.page || currentPage || 1), 1);
      currentPageSize = Number(payload.pagination?.pageSize || currentPageSize || 20);
      currentTotalPages = Math.max(Number(payload.pagination?.totalPages || 1), 1);
      currentTotalCoaches = Math.max(Number(payload.pagination?.total || 0), 0);
      currentSearch = payload.filters?.q || "";
      currentStatusFilter = payload.filters?.status || "";
      coachSearch.value = currentSearch;
      coachStatusFilter.value = currentStatusFilter;
      coachesPageSize.value = String(currentPageSize);
      renderCoaches(payload.coaches || []);
      syncUrl();
    } catch (error) {
      setupMessage.textContent = error.message;
      currentTotalCoaches = 0;
      currentTotalPages = 1;
      renderEmpty(error.message);
      renderPagination();
    }
  }

  async function createCoach(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(coachStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(coachStatus, "Creando coach...");
    const formData = new FormData(coachForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo crear el coach.");
      coachForm.reset();
      setStatus(coachStatus, `${payload.message} Clave temporal: ${payload.temporaryPassword}`, "ok");
      await loadCoaches();
    } catch (error) {
      setStatus(coachStatus, error.message, "error");
    }
  }

  async function updateCoachStatus(id, isActive) {
    setStatus(coachStatus, "Actualizando coach...");

    try {
      const response = await fetch("/api/admin/coaches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: isActive }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar.");
      setStatus(coachStatus, "Coach actualizado.", "ok");
      await loadCoaches();
    } catch (error) {
      setStatus(coachStatus, error.message, "error");
    }
  }

  async function resetCoachAccess(id) {
    setStatus(coachStatus, "Regenerando clave temporal...");

    try {
      const response = await fetch("/api/admin/access-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: "coach" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo regenerar la clave.");
      setStatus(coachStatus, `${payload.message} Nueva clave temporal: ${payload.temporaryPassword}`, "ok");
    } catch (error) {
      setStatus(coachStatus, error.message, "error");
    }
  }

  coachesBody.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-coach-reset]");
    if (resetButton) {
      resetCoachAccess(resetButton.dataset.coachReset);
      return;
    }
    const button = event.target.closest("[data-coach-status]");
    if (!button) return;
    updateCoachStatus(button.dataset.coachStatus, button.dataset.nextState === "true");
  });

  coachForm.addEventListener("submit", createCoach);
  refreshButton.addEventListener("click", loadCoaches);
  coachSearch.addEventListener("change", () => {
    currentSearch = coachSearch.value.trim();
    currentPage = 1;
    loadCoaches();
  });
  coachStatusFilter.addEventListener("change", () => {
    currentStatusFilter = coachStatusFilter.value;
    currentPage = 1;
    loadCoaches();
  });
  coachesPageSize.addEventListener("change", () => {
    currentPageSize = Number(coachesPageSize.value || 20);
    currentPage = 1;
    loadCoaches();
  });
  previousCoachesPageButton.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    loadCoaches();
  });
  nextCoachesPageButton.addEventListener("click", () => {
    if (currentPage >= currentTotalPages) return;
    currentPage += 1;
    loadCoaches();
  });
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    currentPage = getInitialPage();
    currentPageSize = getInitialPageSize();
    currentSearch = getInitialFilter("q");
    currentStatusFilter = getInitialFilter("status");
    coachSearch.value = currentSearch;
    coachStatusFilter.value = currentStatusFilter;
    coachesPageSize.value = String(currentPageSize);
    await loadCoaches();
  }

  boot();
})();
