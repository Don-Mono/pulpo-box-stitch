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
  const workoutFilter = document.querySelector("#workoutFilter");
  const exerciseFilter = document.querySelector("#exerciseFilter");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const resultsBody = document.querySelector("#resultsBody");
  const medicalCard = document.querySelector("#medicalCard");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentStudentId = "";
  let currentStudent = null;
  let currentSummary = null;
  let currentAssignments = [];
  let currentMeasurements = [];
  let currentResults = [];

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

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value).toFixed(1));
  }

  function formatMetric(value, unit) {
    return value == null ? "--" : `${formatNumber(value)} ${unit}`.trim();
  }

  function formatDelta(current, baseline, unit) {
    if (current == null || baseline == null) return "--";
    const delta = Number(current) - Number(baseline);
    if (!Number.isFinite(delta)) return "--";
    const prefix = delta > 0 ? "+" : "";
    return `${prefix}${formatNumber(delta)} ${unit}`.trim();
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

  function renderSummary(summary, measurements) {
    const latestMeasurement = measurements[0] || null;
    const oldestMeasurement = measurements[measurements.length - 1] || null;
    const hasBaseline = latestMeasurement && oldestMeasurement && latestMeasurement.id !== oldestMeasurement.id;

    const values = [
      ["Peso actual", formatMetric(summary?.latest_weight_kg, "kg")],
      ["Cambio peso", hasBaseline ? formatDelta(latestMeasurement.body_weight_kg, oldestMeasurement.body_weight_kg, "kg") : "--"],
      ["Cintura", formatMetric(summary?.latest_waist_cm, "cm")],
      ["Cambio cintura", hasBaseline ? formatDelta(latestMeasurement.waist_cm, oldestMeasurement.waist_cm, "cm") : "--"],
      ["Marcas", summary ? `${summary.result_count || 0}` : "--"],
      ["Mediciones", summary ? `${summary.measurement_count || 0}` : "--"],
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

  function collectWorkoutOptions() {
    const workoutMap = new Map();

    currentAssignments.forEach((assignment) => {
      if (assignment.workout_id) {
        workoutMap.set(assignment.workout_id, assignment.workout?.title || "Rutina asignada");
      }
    });

    currentResults.forEach((result) => {
      if (result.workout_id && !workoutMap.has(result.workout_id)) {
        workoutMap.set(result.workout_id, result.workout_title || "Rutina registrada");
      }
    });

    return [...workoutMap.entries()].map(([id, title]) => ({ id, title }));
  }

  function collectExerciseOptions(selectedWorkoutId) {
    const exerciseMap = new Map();

    currentAssignments.forEach((assignment) => {
      if (selectedWorkoutId && assignment.workout_id !== selectedWorkoutId) return;
      (assignment.exercises || []).forEach((exercise) => {
        if (exercise.exercise_id) {
          exerciseMap.set(exercise.exercise_id, exercise.exercise_name || "Ejercicio");
        }
      });
    });

    currentResults.forEach((result) => {
      if (selectedWorkoutId && result.workout_id !== selectedWorkoutId) return;
      if (result.exercise_id && !exerciseMap.has(result.exercise_id)) {
        exerciseMap.set(result.exercise_id, result.exercise_name || "Ejercicio");
      }
    });

    return [...exerciseMap.entries()].map(([id, name]) => ({ id, name }));
  }

  function getFilteredResults() {
    const selectedWorkoutId = workoutFilter.value;
    const selectedExerciseId = exerciseFilter.value;

    return currentResults.filter((result) => {
      if (selectedWorkoutId && result.workout_id !== selectedWorkoutId) return false;
      if (selectedExerciseId && result.exercise_id !== selectedExerciseId) return false;
      return true;
    });
  }

  function renderResultsSummary(filteredResults) {
    const latestResult = filteredResults[0] || null;
    const bestWeight = filteredResults
      .map((result) => result.weight_kg)
      .filter((value) => value != null)
      .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);
    const bestReps = filteredResults
      .map((result) => result.reps)
      .filter((value) => value != null)
      .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);

    const values = [
      ["Registros", String(filteredResults.length)],
      ["Ultimo registro", latestResult ? formatDate(latestResult.logged_at) : "--"],
      ["Mejor carga", Number.isFinite(bestWeight) ? `${formatNumber(bestWeight)} kg` : "--"],
      ["Mayor reps", Number.isFinite(bestReps) ? String(bestReps) : "--"],
    ];

    resultsSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderResults(filteredResults) {
    if (!filteredResults.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">No hay marcas para este filtro.</td></tr>';
      return;
    }

    resultsBody.innerHTML = filteredResults.map((result) => {
      const notes = [
        result.student_notes ? `Alumno: ${result.student_notes}` : "",
        result.coach_notes ? `Coach: ${result.coach_notes}` : "",
      ].filter(Boolean).join(" | ") || "Sin notas";

      return `
        <tr>
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

  function refreshResultsView() {
    const filteredResults = getFilteredResults();
    const selectedWorkoutLabel = workoutFilter.options[workoutFilter.selectedIndex]?.text || "Todas las rutinas";
    const selectedExerciseLabel = exerciseFilter.options[exerciseFilter.selectedIndex]?.text || "Todos los ejercicios";

    resultsFilterHint.textContent = workoutFilter.value || exerciseFilter.value
      ? `${filteredResults.length} registro(s) para ${selectedWorkoutLabel} / ${selectedExerciseLabel}.`
      : "Filtra por rutina o ejercicio para revisar una tendencia puntual.";

    renderResultsSummary(filteredResults);
    renderResults(filteredResults);
  }

  function syncResultFilters() {
    const previousWorkoutId = workoutFilter.value;
    const workoutOptions = collectWorkoutOptions();

    workoutFilter.innerHTML = [
      '<option value="">Todas las rutinas</option>',
      ...workoutOptions.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(workout.title)}</option>`),
    ].join("");

    if (workoutOptions.some((workout) => workout.id === previousWorkoutId)) {
      workoutFilter.value = previousWorkoutId;
    }

    const previousExerciseId = exerciseFilter.value;
    const exerciseOptions = collectExerciseOptions(workoutFilter.value);

    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");

    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseFilter.value = previousExerciseId;
    }

    refreshResultsView();
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
      currentStudentId = payload.selectedStudentId || preferredStudentId || "";
      currentStudent = payload.student || null;
      currentSummary = payload.summary || null;
      currentAssignments = payload.assignments || [];
      currentMeasurements = payload.measurements || [];
      currentResults = payload.results || [];

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Ficha conectada. Aqui ves solo alumnos asignados a tu perfil.";
      renderStudents(payload.students || [], currentStudentId);
      renderSummary(currentSummary, currentMeasurements);
      renderProfile(currentStudent);
      renderAssignments(currentAssignments);
      renderMeasurements(currentMeasurements);
      renderMedical(payload.consent || null, payload.medicalNotes || []);
      syncResultFilters();
      syncUrl(currentStudentId);
      setStatus(measurementStatus, "");
    } catch (error) {
      currentStudentId = "";
      currentStudent = null;
      currentSummary = null;
      currentAssignments = [];
      currentMeasurements = [];
      currentResults = [];
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderSummary(null, []);
      renderProfile(null);
      renderAssignments([]);
      renderMeasurements([]);
      renderMedical(null, []);
      workoutFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      renderResultsSummary([]);
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

  studentFilter.addEventListener("change", () => {
    workoutFilter.value = "";
    exerciseFilter.value = "";
    loadStudentDetail(studentFilter.value);
  });
  workoutFilter.addEventListener("change", () => {
    const previousExerciseId = exerciseFilter.value;
    const exerciseOptions = collectExerciseOptions(workoutFilter.value);
    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");
    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseFilter.value = previousExerciseId;
    }
    refreshResultsView();
  });
  exerciseFilter.addEventListener("change", refreshResultsView);
  measurementForm.addEventListener("submit", createMeasurement);
  refreshButton.addEventListener("click", () => loadStudentDetail(currentStudentId || studentFilter.value));
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
