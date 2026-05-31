(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const coachForm = document.querySelector("#coachForm");
  const coachStatus = document.querySelector("#coachStatus");
  const coachesBody = document.querySelector("#coachesBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;

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

  function renderEmpty(message) {
    coachesBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  }

  function renderCoaches(coaches) {
    if (!coaches.length) {
      renderEmpty("Todavia no hay coaches registrados.");
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
              <button class="button ghost compact-button" data-coach-status="${escapeHtml(coach.id)}" data-next-state="${nextState}" type="button">${actionLabel}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadCoaches() {
    renderEmpty("Cargando coaches...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const response = await fetch("/api/admin/coaches");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar coaches.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar coaches cuando lo necesites.";
      renderCoaches(payload.coaches || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderEmpty(error.message);
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

  coachesBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-coach-status]");
    if (!button) return;
    updateCoachStatus(button.dataset.coachStatus, button.dataset.nextState === "true");
  });

  coachForm.addEventListener("submit", createCoach);
  refreshButton.addEventListener("click", loadCoaches);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadCoaches();
  }

  boot();
})();
