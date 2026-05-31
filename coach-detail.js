(function () {
  const userEmail = document.querySelector("#userEmail");
  const coachTitle = document.querySelector("#coachTitle");
  const coachMeta = document.querySelector("#coachMeta");
  const setupMessage = document.querySelector("#setupMessage");
  const coachFilter = document.querySelector("#coachFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const coachDetailForm = document.querySelector("#coachDetailForm");
  const coachDetailStatus = document.querySelector("#coachDetailStatus");
  const saveButton = document.querySelector("#saveButton");
  const coachProfileCard = document.querySelector("#coachProfileCard");
  const studentsList = document.querySelector("#studentsList");
  const workoutsList = document.querySelector("#workoutsList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentCoachId = "";
  let currentCoach = null;

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

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function formatMetric(value, unit) {
    return value == null || value === ""
      ? "--"
      : `${String(Number.isInteger(value) ? value : Number(value).toFixed(1))} ${unit}`.trim();
  }

  function formatMark(result) {
    return [
      result.weight_kg ? `${result.weight_kg} kg` : "",
      result.reps ? `${result.reps} reps` : "",
      result.rounds ? `${result.rounds} rondas` : "",
      result.time_seconds ? `${result.time_seconds} seg` : "",
      result.score_text || "",
    ].filter(Boolean).join(" / ") || "Sin marca";
  }

  function getInitialCoachId() {
    try {
      const search = new URLSearchParams(window.location.search);
      return search.get("coach_id") || search.get("id") || "";
    } catch {
      return "";
    }
  }

  function syncUrl(coachId) {
    try {
      const url = new URL(window.location.href);
      if (coachId) url.searchParams.set("coach_id", coachId);
      else url.searchParams.delete("coach_id");
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors in constrained environments.
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

  function fillCoachFilter(coaches, selectedCoachId) {
    const options = ['<option value="">Seleccionar coach</option>'];
    coaches.forEach((coach) => {
      const selected = coach.id === selectedCoachId ? " selected" : "";
      options.push(`<option value="${escapeHtml(coach.id)}"${selected}>${escapeHtml(coach.full_name)}</option>`);
    });
    coachFilter.innerHTML = options.join("");
  }

  function renderSummary(summary) {
    const values = [
      ["Alumnos", summary ? String(summary.student_count || 0) : "--"],
      ["Activos", summary ? String(summary.active_student_count || 0) : "--"],
      ["Rutinas", summary ? String(summary.workout_count || 0) : "--"],
      ["Ultimas marcas", summary ? String(summary.recent_result_count || 0) : "--"],
    ];

    summaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderProfileCard(coach) {
    if (!coach) {
      coachTitle.textContent = "Ficha del coach";
      coachMeta.textContent = "Selecciona un coach para revisar su perfil operativo, alumnos y actividad reciente.";
      coachProfileCard.innerHTML = '<p class="muted">No hay ficha disponible para este coach.</p>';
      return;
    }

    coachTitle.textContent = coach.full_name || "Ficha del coach";
    coachMeta.textContent = coach.specialty
      ? `Especialidad principal: ${coach.specialty}`
      : "Aun no hay especialidad registrada para este coach.";

    coachProfileCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(coach.full_name || "Coach")}</strong>
        <span>${escapeHtml(coach.specialty || "Especialidad pendiente")}</span>
        <small>${escapeHtml([coach.email, coach.phone].filter(Boolean).join(" / ") || "Sin contacto")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Perfil operativo</strong>
        <span>${escapeHtml(coach.photo_url || "Sin foto asignada")}</span>
        <small>${escapeHtml(`Creado: ${formatDate(coach.created_at)} · Ultima actualizacion: ${formatDate(coach.updated_at)}`)}</small>
      </article>
    `;
  }

  function renderForm(coach) {
    coachDetailForm.full_name.value = coach?.full_name || "";
    coachDetailForm.email.value = coach?.email || "";
    coachDetailForm.phone.value = coach?.phone || "";
    coachDetailForm.specialty.value = coach?.specialty || "";
    coachDetailForm.photo_url.value = coach?.photo_url || "";
    coachDetailForm.bio.value = coach?.bio || "";
    coachDetailForm.is_active.checked = Boolean(coach?.is_active);
    saveButton.disabled = !coach;
  }

  function renderStudents(students) {
    if (!students.length) {
      studentsList.innerHTML = '<p class="muted">Este coach aun no tiene alumnos asignados.</p>';
      return;
    }

    studentsList.innerHTML = students.map((student) => `
      <article class="mini-list-item action-list-item">
        <div>
          <strong>${escapeHtml(student.full_name || "Alumno")}</strong>
          <span>${escapeHtml(student.goal || "Objetivo pendiente")}</span>
          <small>${escapeHtml([student.location_name, student.email].filter(Boolean).join(" / ") || "Sin contexto adicional")}</small>
        </div>
        <a class="button ghost compact-button" href="/student-detail.html?student_id=${encodeURIComponent(student.id || "")}">Ver ficha</a>
      </article>
    `).join("");
  }

  function renderWorkouts(workouts) {
    if (!workouts.length) {
      workoutsList.innerHTML = '<p class="muted">Este coach aun no ha creado rutinas.</p>';
      return;
    }

    workoutsList.innerHTML = workouts.map((workout) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(workout.title || "Rutina")}</strong>
        <span>${escapeHtml(workout.summary || "Sin resumen")}</span>
        <small>${escapeHtml(
          [
            workout.workout_date || "",
            `${workout.assignment_count || 0} asignaciones`,
            workout.active_assignment_count ? `${workout.active_assignment_count} activas` : "",
          ].filter(Boolean).join(" / ") || "Sin contexto adicional"
        )}</small>
      </article>
    `).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="5">Todavia no hay actividad reciente alrededor de este coach.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
      const notes = [
        result.student_notes ? `Alumno: ${result.student_notes}` : "",
        result.coach_notes ? `Coach: ${result.coach_notes}` : "",
      ].filter(Boolean).join(" | ") || "Sin notas";

      return `
        <tr>
          <td><a href="/student-detail.html?student_id=${encodeURIComponent(result.student_id || "")}"><strong>${escapeHtml(result.student_name || "Alumno")}</strong></a></td>
          <td>
            ${escapeHtml(result.workout_title || "Sin rutina")}
            <small>${escapeHtml(result.exercise_name || "Sin ejercicio")}</small>
          </td>
          <td>${escapeHtml(formatMark(result))}</td>
          <td>${escapeHtml(notes)}</td>
          <td>${escapeHtml(formatDate(result.logged_at))}</td>
        </tr>
      `;
    }).join("");
  }

  async function loadCoachDetail(preferredCoachId = coachFilter.value || getInitialCoachId()) {
    setupMessage.textContent = "Cargando ficha del coach...";
    resultsBody.innerHTML = '<tr><td colspan="5">Cargando actividad...</td></tr>';

    try {
      const url = preferredCoachId
        ? `/api/admin/coach-detail?coach_id=${encodeURIComponent(preferredCoachId)}`
        : "/api/admin/coach-detail";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar la ficha del coach.");

      setupRequired = Boolean(payload.setupRequired);
      currentCoachId = payload.selectedCoachId || preferredCoachId || "";
      currentCoach = payload.coach || null;

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Ficha conectada. Ya puedes editar el coach y revisar su carga operativa.";
      fillCoachFilter(payload.coaches || [], currentCoachId);
      renderSummary(payload.summary || null);
      renderProfileCard(currentCoach);
      renderForm(currentCoach);
      renderStudents(payload.students || []);
      renderWorkouts(payload.workouts || []);
      renderResults(payload.results || []);
      syncUrl(currentCoachId);
      setStatus(coachDetailStatus, "");
    } catch (error) {
      currentCoachId = "";
      currentCoach = null;
      setupMessage.textContent = error.message;
      fillCoachFilter([], "");
      renderSummary(null);
      renderProfileCard(null);
      renderForm(null);
      renderStudents([]);
      renderWorkouts([]);
      resultsBody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
      setStatus(coachDetailStatus, error.message, "error");
    }
  }

  async function saveCoachDetail(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(coachDetailStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    if (!currentCoachId) {
      setStatus(coachDetailStatus, "Selecciona un coach antes de guardar.", "error");
      return;
    }

    setStatus(coachDetailStatus, "Guardando cambios...");
    const formData = new FormData(coachDetailForm);
    const body = Object.fromEntries(formData.entries());
    body.id = currentCoachId;
    body.is_active = coachDetailForm.is_active.checked;

    try {
      const response = await fetch("/api/admin/coach-detail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la ficha.");
      setStatus(coachDetailStatus, payload.message || "Coach actualizado correctamente.", "ok");
      await loadCoachDetail(currentCoachId);
    } catch (error) {
      setStatus(coachDetailStatus, error.message, "error");
    }
  }

  coachFilter.addEventListener("change", () => loadCoachDetail(coachFilter.value));
  coachDetailForm.addEventListener("submit", saveCoachDetail);
  refreshButton.addEventListener("click", () => loadCoachDetail(currentCoachId || coachFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadCoachDetail();
  }

  boot();
})();
