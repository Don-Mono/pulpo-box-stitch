(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentForm = document.querySelector("#studentForm");
  const studentStatus = document.querySelector("#studentStatus");
  const studentsBody = document.querySelector("#studentsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const coachSelect = document.querySelector("#primary_coach_id");
  const locationSelect = document.querySelector("#location_id");
  const studentSearch = document.querySelector("#studentSearch");
  const coachFilter = document.querySelector("#coachFilter");
  const locationFilter = document.querySelector("#locationFilter");
  const statusFilter = document.querySelector("#statusFilter");
  const studentsPageSize = document.querySelector("#studentsPageSize");
  const studentsPaginationStatus = document.querySelector("#studentsPaginationStatus");
  const previousStudentsPageButton = document.querySelector("#previousStudentsPageButton");
  const nextStudentsPageButton = document.querySelector("#nextStudentsPageButton");

  let setupRequired = false;
  let currentPage = Number(studentsPageSize?.dataset.initialPage || 1);
  let currentPageSize = Number(studentsPageSize?.value || 20);
  let currentTotalPages = 1;
  let currentTotalStudents = 0;
  let currentSearch = "";
  let currentCoachFilter = "";
  let currentLocationFilter = "";
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
      if (currentCoachFilter) url.searchParams.set("coach_id", currentCoachFilter);
      else url.searchParams.delete("coach_id");
      if (currentLocationFilter) url.searchParams.set("location_id", currentLocationFilter);
      else url.searchParams.delete("location_id");
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

  function renderEmpty(message) {
    studentsBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  }

  function renderPagination() {
    const start = currentTotalStudents ? ((currentPage - 1) * currentPageSize) + 1 : 0;
    const end = Math.min(currentPage * currentPageSize, currentTotalStudents);
    studentsPaginationStatus.textContent = currentTotalStudents
      ? `Mostrando ${start}-${end} de ${currentTotalStudents} alumno(s). Pagina ${currentPage} de ${currentTotalPages}.`
      : "Sin alumnos para este filtro.";
    previousStudentsPageButton.disabled = currentPage <= 1;
    nextStudentsPageButton.disabled = currentPage >= currentTotalPages;
  }

  function renderStudents(students) {
    if (!students.length) {
      renderEmpty("Todavia no hay alumnos registrados.");
      renderPagination();
      return;
    }

    studentsBody.innerHTML = students.map((student) => {
      const measures = [
        student.height_cm ? `${student.height_cm} cm` : "",
        student.current_weight_kg ? `${student.current_weight_kg} kg` : "",
      ].filter(Boolean).join(" / ") || "Pendiente";
      const nextState = student.is_active ? "false" : "true";
      const actionLabel = student.is_active ? "Desactivar" : "Activar";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(student.full_name)}</strong>
            <small>${escapeHtml(student.location_name || "Sin sede asignada")}</small>
          </td>
          <td>
            ${escapeHtml(student.email || "Sin email")}
            <small>${escapeHtml(student.phone || "Sin telefono")}</small>
          </td>
          <td>${escapeHtml(student.goal || "Pendiente")}</td>
          <td>${escapeHtml(measures)}</td>
          <td><span class="status-chip ${student.is_active ? "is-active" : "is-inactive"}">${student.is_active ? "Activo" : "Inactivo"}</span></td>
          <td>
            <div class="table-actions">
              <a class="button ghost compact-button" href="/student-detail.html?student_id=${encodeURIComponent(student.id)}">Ver ficha</a>
              <button class="button ghost compact-button" data-student-reset="${escapeHtml(student.id)}" type="button">Resetear clave</button>
              <button class="button ghost compact-button" data-student-status="${escapeHtml(student.id)}" data-next-state="${nextState}" type="button">${actionLabel}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    renderPagination();
  }

  function renderCoaches(coaches) {
    const options = ['<option value="">Sin coach asignado</option>'];
    coaches.forEach((coach) => {
      options.push(`<option value="${escapeHtml(coach.id)}">${escapeHtml(coach.full_name)}${coach.email ? ` - ${escapeHtml(coach.email)}` : ""}</option>`);
    });
    coachSelect.innerHTML = options.join("");

    const filterOptions = ['<option value="">Todos</option>'];
    coaches.forEach((coach) => {
      filterOptions.push(`<option value="${escapeHtml(coach.id)}">${escapeHtml(coach.full_name)}</option>`);
    });
    coachFilter.innerHTML = filterOptions.join("");
    coachFilter.value = currentCoachFilter;
  }

  function renderLocations(locations) {
    const options = ['<option value="">Sin sede asignada</option>'];
    locations
      .filter((location) => location.is_active !== false)
      .forEach((location) => {
        options.push(`<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`);
      });
    locationSelect.innerHTML = options.join("");

    const filterOptions = ['<option value="">Todas</option>'];
    locations.forEach((location) => {
      filterOptions.push(`<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`);
    });
    locationFilter.innerHTML = filterOptions.join("");
    locationFilter.value = currentLocationFilter;
  }

  async function loadStudents() {
    renderEmpty("Cargando alumnos...");
    setupMessage.textContent = "Revisando tablas de gestion...";
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentSearch) params.set("q", currentSearch);
      if (currentCoachFilter) params.set("coach_id", currentCoachFilter);
      if (currentLocationFilter) params.set("location_id", currentLocationFilter);
      if (currentStatusFilter) params.set("status", currentStatusFilter);

      const response = await fetch(`/api/admin/students?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar alumnos.");
      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar alumnos cuando lo necesites.";
      currentPage = Math.max(Number(payload.pagination?.page || currentPage || 1), 1);
      currentPageSize = Number(payload.pagination?.pageSize || currentPageSize || 20);
      currentTotalPages = Math.max(Number(payload.pagination?.totalPages || 1), 1);
      currentTotalStudents = Math.max(Number(payload.pagination?.total || 0), 0);
      currentSearch = payload.filters?.q || "";
      currentCoachFilter = payload.filters?.coachId || "";
      currentLocationFilter = payload.filters?.locationId || "";
      currentStatusFilter = payload.filters?.status || "";
      studentSearch.value = currentSearch;
      statusFilter.value = currentStatusFilter;
      studentsPageSize.value = String(currentPageSize);
      renderCoaches(payload.coaches || []);
      renderLocations(payload.locations || []);
      renderStudents(payload.students || []);
      syncUrl();
    } catch (error) {
      setupMessage.textContent = error.message;
      renderCoaches([]);
      renderLocations([]);
      currentTotalStudents = 0;
      currentTotalPages = 1;
      renderEmpty(error.message);
      renderPagination();
    }
  }

  async function createStudent(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(studentStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(studentStatus, "Creando alumno...");
    const formData = new FormData(studentForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo crear el alumno.");
      studentForm.reset();
      setStatus(studentStatus, `${payload.message} Clave temporal: ${payload.temporaryPassword}`, "ok");
      await loadStudents();
    } catch (error) {
      setStatus(studentStatus, error.message, "error");
    }
  }

  async function updateStudentStatus(id, isActive) {
    setStatus(studentStatus, "Actualizando alumno...");
    try {
      const response = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: isActive }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar.");
      setStatus(studentStatus, "Alumno actualizado.", "ok");
      await loadStudents();
    } catch (error) {
      setStatus(studentStatus, error.message, "error");
    }
  }

  async function resetStudentAccess(id) {
    setStatus(studentStatus, "Regenerando clave temporal...");
    try {
      const response = await fetch("/api/admin/access-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: "student" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo regenerar la clave.");
      setStatus(studentStatus, `${payload.message} Nueva clave temporal: ${payload.temporaryPassword}`, "ok");
    } catch (error) {
      setStatus(studentStatus, error.message, "error");
    }
  }

  studentsBody.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-student-reset]");
    if (resetButton) {
      resetStudentAccess(resetButton.dataset.studentReset);
      return;
    }
    const button = event.target.closest("[data-student-status]");
    if (!button) return;
    updateStudentStatus(button.dataset.studentStatus, button.dataset.nextState === "true");
  });

  studentForm.addEventListener("submit", createStudent);
  refreshButton.addEventListener("click", loadStudents);
  studentSearch.addEventListener("change", () => {
    currentSearch = studentSearch.value.trim();
    currentPage = 1;
    loadStudents();
  });
  coachFilter.addEventListener("change", () => {
    currentCoachFilter = coachFilter.value;
    currentPage = 1;
    loadStudents();
  });
  locationFilter.addEventListener("change", () => {
    currentLocationFilter = locationFilter.value;
    currentPage = 1;
    loadStudents();
  });
  statusFilter.addEventListener("change", () => {
    currentStatusFilter = statusFilter.value;
    currentPage = 1;
    loadStudents();
  });
  studentsPageSize.addEventListener("change", () => {
    currentPageSize = Number(studentsPageSize.value || 20);
    currentPage = 1;
    loadStudents();
  });
  previousStudentsPageButton.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    loadStudents();
  });
  nextStudentsPageButton.addEventListener("click", () => {
    if (currentPage >= currentTotalPages) return;
    currentPage += 1;
    loadStudents();
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
    currentCoachFilter = getInitialFilter("coach_id");
    currentLocationFilter = getInitialFilter("location_id");
    currentStatusFilter = getInitialFilter("status");
    studentSearch.value = currentSearch;
    statusFilter.value = currentStatusFilter;
    studentsPageSize.value = String(currentPageSize);
    await loadStudents();
  }

  boot();
})();
