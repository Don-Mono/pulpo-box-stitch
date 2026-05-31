(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentForm = document.querySelector("#studentForm");
  const studentStatus = document.querySelector("#studentStatus");
  const studentsBody = document.querySelector("#studentsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const coachSelect = document.querySelector("#primary_coach_id");

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
    studentsBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  }

  function renderStudents(students) {
    if (!students.length) {
      renderEmpty("Todavia no hay alumnos registrados.");
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
  }

  function renderCoaches(coaches) {
    const options = ['<option value="">Sin coach asignado</option>'];
    coaches.forEach((coach) => {
      options.push(`<option value="${escapeHtml(coach.id)}">${escapeHtml(coach.full_name)}${coach.email ? ` - ${escapeHtml(coach.email)}` : ""}</option>`);
    });
    coachSelect.innerHTML = options.join("");
  }

  async function loadStudents() {
    renderEmpty("Cargando alumnos...");
    setupMessage.textContent = "Revisando tablas de gestion...";
    try {
      const response = await fetch("/api/admin/students");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar alumnos.");
      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar alumnos cuando lo necesites.";
      renderCoaches(payload.coaches || []);
      renderStudents(payload.students || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderCoaches([]);
      renderEmpty(error.message);
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
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadStudents();
  }

  boot();
})();
