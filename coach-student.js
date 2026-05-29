(function () {
  const userEmail = document.querySelector("#userEmail");
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const studentMeta = document.querySelector("#studentMeta");
  const studentFilter = document.querySelector("#studentFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const studentProfileCard = document.querySelector("#studentProfileCard");
  const measurementForm = document.querySelector("#measurementForm");
  const measurementStatus = document.querySelector("#measurementStatus");
  const assignmentsList = document.querySelector("#assignmentsList");
  const measurementsList = document.querySelector("#measurementsList");
  const resultsBody = document.querySelector("#resultsBody");
  const medicalCard = document.querySelector("#medicalCard");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status ${type}`.trim();
  }

  function getInitialStudentId() {
    try {
      return new URLSearchParams(window.location.search).get("id") || "";
    } catch {
      return "";
    }
  }

  function syncUrl(studentId) {
    try {
      const url = new URL(window.location.href);
      if (studentId) url.searchParams.set("id", studentId);
      else url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors in constrained environments.
    }
  }

  async function requireCoachSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      window.location.href = "/login.html";
      return null;
    }

    const payload = await response.json();
    if (payload.user?.role !== "coach") {
      window.location.href = "/dashboard.html";
      return null;
    }

    userEmail.textContent = payload.user.email || "";
    return payload.user;
  }

  function renderStudents(students, selectedStudentId) {
    const options = ['<option value="">Seleccionar alumno</option>'];
    students.forEach((student) => {
      const selected = student.id === selectedStudentId ? " selected" : "";
      options.push(`<option value="${escapeHtml(student.id)}"${selected}>${escapeHtml(student.full_name)}</option>`);
    });
    studentFilter.innerHTML = options.join("");
  }

  function renderSummary(summary) {
    const values = [
      ["Peso actual", summary?.latest_weight_kg ? `${summary.latest_weight_kg} kg` : "--"],
      ["Estatura", summary?.latest_height_cm ? `${summary.latest_height_cm} cm` : "--"],
      ["Cintura", summary?.latest_waist_cm ? `${summary.latest_waist_cm} cm` : "--"],
      ["Marcas", summary ? `${summary.result_count || 0}` : "--"],
    ];

    summaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderProfile(profile) {
    if (!profile) {
      studentProfileCard.innerHTML = '<p class="muted">No hay ficha disponible para este alumno.</p>';
      studentTitle.textContent = "Ficha del alumno";
      studentMeta.textContent = "Selecciona uno de tus alumnos para revisar su estado completo.";
      return;
    }

    studentTitle.textContent = profile.full_name || "Ficha del alumno";
    studentMeta.textContent = profile.goal
      ? `Objetivo principal: ${profile.goal}`
      : "Aun no hay objetivo cargado para este alumno.";

    studentProfileCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(profile.full_name || "Alumno")}</strong>
        <span>${escapeHtml(profile.goal || "Objetivo pendiente")}</span>
        <small>${escapeHtml([profile.email, profile.phone].filter(Boolean).join(" / ") || "Sin contacto")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Sede y emergencias</strong>
        <span>${escapeHtml(profile.location_name || "Sin sede asignada")}</span>
        <small>${escapeHtml(
          [profile.emergency_contact_name, profile.emergency_contact_phone].filter(Boolean).join(" / ")
          || "Sin contacto de emergencia"
        )}</small>
      </article>
    `;
  }

  function renderAssignments(assignments) {
    if (!assignments.length) {
      assignmentsList.innerHTML = '<p class="muted">No hay rutinas asignadas a este alumno.</p>';
      return;
    }

    assignmentsList.innerHTML = assignments.map((assignment) => {
      const workout = assignment.workout || {};
      const exercises = assignment.exercises || [];
      const exerciseSummary = exercises.length
        ? exercises.map((exercise) => {
          const details = [
            exercise.sets ? `${exercise.sets} series` : "",
            exercise.reps || "",
            exercise.prescription || "",
          ].filter(Boolean).join(" / ");
          return `<li><strong>${escapeHtml(exercise.exercise_name || "Ejercicio")}</strong>${details ? `: ${escapeHtml(details)}` : ""}</li>`;
        }).join("")
        : "<li>Sin ejercicios cargados.</li>";
      const assignedAt = assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString("es-CL") : "Sin fecha";

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill">${escapeHtml(assignment.status || "assigned")}</span>
            <h3>${escapeHtml(workout.title || "Rutina asignada")}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          <div class="workout-meta">
            <span>${escapeHtml(workout.workout_date || assignedAt)}</span>
            <span>${exercises.length} ejercicio(s)</span>
          </div>
          <ul class="check-list">${exerciseSummary}</ul>
        </article>
      `;
    }).join("");
  }

  function renderMeasurements(measurements) {
    if (!measurements.length) {
      measurementsList.innerHTML = '<p class="muted">Todavia no hay mediciones.</p>';
      return;
    }

    measurementsList.innerHTML = measurements.map((measurement) => {
      const date = measurement.measured_at ? new Date(measurement.measured_at).toLocaleDateString("es-CL") : "Sin fecha";
      const values = [
        measurement.body_weight_kg ? `${measurement.body_weight_kg} kg` : "",
        measurement.height_cm ? `${measurement.height_cm} cm` : "",
        measurement.waist_cm ? `cintura ${measurement.waist_cm} cm` : "",
      ].filter(Boolean).join(" / ") || "Sin medidas";

      return `
        <article class="mini-list-item">
          <strong>${escapeHtml(date)}</strong>
          <span>${escapeHtml(values)}</span>
          <small>${escapeHtml(measurement.notes || "")}</small>
        </article>
      `;
    }).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">Todavia no hay marcas para este alumno.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
      const mark = [
        result.weight_kg ? `${result.weight_kg} kg` : "",
        result.reps ? `${result.reps} reps` : "",
        result.rounds ? `${result.rounds} rondas` : "",
        result.time_seconds ? `${result.time_seconds} seg` : "",
        result.score_text || "",
      ].filter(Boolean).join(" / ") || "Sin marca";
      const notes = [
        result.student_notes ? `Alumno: ${result.student_notes}` : "",
        result.coach_notes ? `Coach: ${result.coach_notes}` : "",
      ].filter(Boolean).join(" | ") || "Sin notas";
      const date = result.logged_at ? new Date(result.logged_at).toLocaleDateString("es-CL") : "Sin fecha";

      return `
        <tr>
          <td>
            ${escapeHtml(result.workout_title || "Sin rutina")}
            <small>${escapeHtml(result.exercise_name || "Sin ejercicio")}</small>
          </td>
          <td>${escapeHtml(mark)}</td>
          <td>${escapeHtml(notes)}</td>
          <td>${escapeHtml(date)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderMedical(consent, notes) {
    if (!consent && !notes.length) {
      medicalCard.innerHTML = `
        <strong>Sin datos visibles</strong>
        <p>Aqui apareceran restricciones o notas medicas que administracion haya compartido contigo.</p>
        <span>Pendiente</span>
      `;
      medicalNotesList.innerHTML = '<p class="muted">No hay notas compartidas para este alumno.</p>';
      return;
    }

    medicalCard.innerHTML = consent
      ? `
        <strong>Consentimiento registrado</strong>
        <p>Administracion habilito el uso de datos sensibles para seguimiento cuando corresponda.</p>
        <span class="is-ok">Compartido con coach</span>
      `
      : `
        <strong>Sin consentimiento visible</strong>
        <p>Solo veras notas explicitamente marcadas para coach.</p>
        <span>Pendiente</span>
      `;

    if (!notes.length) {
      medicalNotesList.innerHTML = '<p class="muted">No hay notas medicas visibles para este alumno.</p>';
      return;
    }

    medicalNotesList.innerHTML = notes.map((note) => {
      const date = note.created_at ? new Date(note.created_at).toLocaleDateString("es-CL") : "Sin fecha";
      return `
        <article class="mini-list-item">
          <strong>${escapeHtml(note.note_type || "Nota medica")}</strong>
          <span>${escapeHtml(note.description || "")}</span>
          <small>${escapeHtml(date)}</small>
        </article>
      `;
    }).join("");
  }

  async function loadStudentDetail(preferredStudentId = studentFilter.value || getInitialStudentId()) {
    setupMessage.textContent = "Revisando progreso del alumno...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
      const url = preferredStudentId
        ? `/api/coach/student-detail?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/coach/student-detail";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar la ficha del alumno.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Ficha conectada. Aqui ves solo alumnos asignados a tu perfil.";
      renderStudents(payload.students || [], payload.selectedStudentId || preferredStudentId);
      renderSummary(payload.summary || null);
      renderProfile(payload.student || null);
      renderAssignments(payload.assignments || []);
      renderMeasurements(payload.measurements || []);
      renderResults(payload.results || []);
      renderMedical(payload.consent || null, payload.medicalNotes || []);
      syncUrl(payload.selectedStudentId || "");
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderSummary(null);
      renderProfile(null);
      renderAssignments([]);
      renderMeasurements([]);
      renderResults([]);
      renderMedical(null, []);
      resultsBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function createMeasurement(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(measurementStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const studentId = studentFilter.value;
    if (!studentId) {
      setStatus(measurementStatus, "Selecciona un alumno antes de guardar.", "error");
      return;
    }

    setStatus(measurementStatus, "Guardando medicion...");
    const formData = new FormData(measurementForm);
    const body = Object.fromEntries(formData.entries());
    body.student_id = studentId;

    try {
      const response = await fetch("/api/coach/student-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la medicion.");
      measurementForm.reset();
      setStatus(measurementStatus, payload.message, "ok");
      await loadStudentDetail(studentId);
    } catch (error) {
      setStatus(measurementStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => loadStudentDetail(studentFilter.value));
  measurementForm.addEventListener("submit", createMeasurement);
  refreshButton.addEventListener("click", () => loadStudentDetail(studentFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    await loadStudentDetail();
  }

  boot();
})();
