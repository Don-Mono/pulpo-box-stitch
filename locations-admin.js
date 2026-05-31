(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const locationForm = document.querySelector("#locationForm");
  const locationStatus = document.querySelector("#locationStatus");
  const locationsBody = document.querySelector("#locationsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const formTitle = document.querySelector("#formTitle");
  const formCopy = document.querySelector("#formCopy");
  const submitButton = document.querySelector("#submitButton");
  const cancelEditButton = document.querySelector("#cancelEditButton");
  const idField = document.querySelector("#location_id");
  const activeField = document.querySelector("#is_active");
  const nameField = document.querySelector("#name");
  const addressField = document.querySelector("#address");
  const phoneField = document.querySelector("#phone");
  const whatsappField = document.querySelector("#whatsapp_number");

  let setupRequired = false;
  let currentLocations = [];

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

  function resetForm() {
    locationForm.reset();
    idField.value = "";
    activeField.checked = true;
    formTitle.textContent = "Nueva sede";
    formCopy.textContent = "Crea una sede operativa para usarla al registrar alumnos y ordenar el seguimiento.";
    submitButton.textContent = "Crear sede";
    cancelEditButton.hidden = true;
  }

  function startEdit(locationId) {
    const location = currentLocations.find((item) => item.id === locationId);
    if (!location) return;

    idField.value = location.id;
    nameField.value = location.name || "";
    addressField.value = location.address || "";
    phoneField.value = location.phone || "";
    whatsappField.value = location.whatsapp_number || "";
    activeField.checked = location.is_active !== false;

    formTitle.textContent = "Editar sede";
    formCopy.textContent = "Ajusta contactos o estado sin perder el historial relacionado a esta sede.";
    submitButton.textContent = "Guardar cambios";
    cancelEditButton.hidden = false;
    setStatus(locationStatus, "");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    locationsBody.innerHTML = `<tr><td colspan="5">${escapeHtml(message)}</td></tr>`;
  }

  function renderLocations(locations) {
    currentLocations = locations;
    if (!locations.length) {
      renderEmpty("Todavia no hay sedes registradas.");
      return;
    }

    locationsBody.innerHTML = locations.map((location) => {
      const nextState = location.is_active ? "false" : "true";
      const actionLabel = location.is_active ? "Desactivar" : "Activar";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(location.name)}</strong>
            <small>${escapeHtml(location.address || "Sin direccion registrada")}</small>
          </td>
          <td>
            ${escapeHtml(location.phone || "Sin telefono")}
            <small>${escapeHtml(location.whatsapp_number ? `WhatsApp: ${location.whatsapp_number}` : "Sin WhatsApp")}</small>
          </td>
          <td><span class="status-chip ${location.is_active ? "is-active" : "is-inactive"}">${location.is_active ? "Activa" : "Inactiva"}</span></td>
          <td>${escapeHtml(String(location.student_count || 0))}</td>
          <td>
            <div class="table-actions">
              <button class="button ghost compact-button" data-location-edit="${escapeHtml(location.id)}" type="button">Editar</button>
              <button class="button ghost compact-button" data-location-status="${escapeHtml(location.id)}" data-next-state="${nextState}" type="button">${actionLabel}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadLocations() {
    renderEmpty("Cargando sedes...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const response = await fetch("/api/admin/locations");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar sedes.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes crear, editar y desactivar sedes.";
      renderLocations(payload.locations || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderEmpty(error.message);
    }
  }

  async function saveLocation(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(locationStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const isEditing = Boolean(idField.value);
    setStatus(locationStatus, isEditing ? "Guardando sede..." : "Creando sede...");

    const formData = new FormData(locationForm);
    const body = Object.fromEntries(formData.entries());
    body.is_active = activeField.checked;

    try {
      const response = await fetch("/api/admin/locations", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la sede.");
      resetForm();
      setStatus(locationStatus, payload.message || "Sede guardada correctamente.", "ok");
      await loadLocations();
    } catch (error) {
      setStatus(locationStatus, error.message, "error");
    }
  }

  async function updateLocationStatus(id, isActive) {
    setStatus(locationStatus, "Actualizando sede...");

    try {
      const response = await fetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: isActive }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar la sede.");
      setStatus(locationStatus, payload.message || "Sede actualizada correctamente.", "ok");
      await loadLocations();
    } catch (error) {
      setStatus(locationStatus, error.message, "error");
    }
  }

  locationsBody.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-location-edit]");
    if (editButton) {
      startEdit(editButton.dataset.locationEdit);
      return;
    }

    const statusButton = event.target.closest("[data-location-status]");
    if (!statusButton) return;
    updateLocationStatus(statusButton.dataset.locationStatus, statusButton.dataset.nextState === "true");
  });

  locationForm.addEventListener("submit", saveLocation);
  cancelEditButton.addEventListener("click", () => {
    resetForm();
    setStatus(locationStatus, "Edicion cancelada.");
  });
  refreshButton.addEventListener("click", loadLocations);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    resetForm();
    await loadLocations();
  }

  boot();
})();
