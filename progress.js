(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentFilter = document.querySelector("#studentFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const measurementForm = document.querySelector("#measurementForm");
  const measurementStatus = document.querySelector("#measurementStatus");
  const measurementsList = document.querySelector("#measurementsList");
  const workoutFilter = document.querySelector("#workoutFilter");
  const exerciseFilter = document.querySelector("#exerciseFilter");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const personalBestsList = document.querySelector("#personalBestsList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentMeasurements = [];
  let currentResults = [];
  let currentSummary = null;

  function getInitialStudentId() {
    try {
      return new URLSearchParams(window.location.search).get("student_id") || "";
    } catch {
      return "";
    }
  }

  function syncUrl(studentId) {
    try {
      const url = new URL(window.location.href);
      if (studentId) url.searchParams.set("student_id", studentId);
      else url.searchParams.delete("student_id");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors in constrained environments.
    }
  }

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

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value).toFixed(1));
  }

  function formatMetric(value, unit) {
    return value == null ? "--" : `${formatNumber(value)} ${unit}`.trim();
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
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
      ["Mejor carga", formatMetric(summary?.best_weight_kg, "kg")],
      ["Registros", summary ? `${summary.result_count || 0} marcas` : "--"],
    ];

    summaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
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

  function collectWorkoutOptions() {
    const workoutMap = new Map();

    currentResults.forEach((result) => {
      if (result.workout_id && !workoutMap.has(result.workout_id)) {
        workoutMap.set(result.workout_id, result.workout_title || "Rutina");
      }
    });

    return [...workoutMap.entries()].map(([id, title]) => ({ id, title }));
  }

  function collectExerciseOptions(selectedWorkoutId) {
    const exerciseMap = new Map();

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

  function renderPersonalBests(filteredResults) {
    if (!filteredResults.length) {
      personalBestsList.innerHTML = '<p class="muted">No hay mejores marcas para este filtro.</p>';
      return;
    }

    const bestByExercise = new Map();
    filteredResults.forEach((result) => {
      const key = result.exercise_id || `${result.workout_id || "sin-rutina"}:${result.exercise_name || "sin-ejercicio"}`;
      const current = bestByExercise.get(key);
      const candidateWeight = result.weight_kg ?? Number.NEGATIVE_INFINITY;
      const currentWeight = current?.weight_kg ?? Number.NEGATIVE_INFINITY;
      const candidateReps = result.reps ?? Number.NEGATIVE_INFINITY;
      const currentReps = current?.reps ?? Number.NEGATIVE_INFINITY;
      const shouldReplace = !current
        || candidateWeight > currentWeight
        || (candidateWeight === currentWeight && candidateReps > currentReps)
        || (candidateWeight === currentWeight && candidateReps === currentReps && (result.logged_at || "") > (current.logged_at || ""));

      if (shouldReplace) bestByExercise.set(key, result);
    });

    const entries = [...bestByExercise.values()]
      .sort((left, right) => (right.weight_kg || 0) - (left.weight_kg || 0) || (right.reps || 0) - (left.reps || 0))
      .slice(0, 8);

    personalBestsList.innerHTML = entries.map((result) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(result.exercise_name || "Ejercicio")}</strong>
        <span>${escapeHtml(formatMark(result))}</span>
        <small>${escapeHtml(`${result.workout_title || "Sin rutina"} · ${formatDate(result.logged_at)}`)}</small>
      </article>
    `).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">Todavia no hay marcas para este alumno.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
      const notes = [result.student_notes, result.coach_notes].filter(Boolean).join(" | ") || "Sin notas";

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
    renderPersonalBests(filteredResults);
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

  async function loadProgress(preferredStudentId = studentFilter.value) {
    setupMessage.textContent = "Revisando progreso...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
      const url = preferredStudentId
        ? `/api/admin/progress?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/progress";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar progreso.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Puedes registrar mediciones y revisar el historial.";
      const selectedStudentId = payload.selectedStudentId || preferredStudentId || "";
      currentMeasurements = payload.measurements || [];
      currentResults = payload.results || [];
      currentSummary = payload.summary || null;
      renderStudents(payload.students || [], selectedStudentId);
      renderSummary(currentSummary, currentMeasurements);
      renderMeasurements(currentMeasurements);
      syncResultFilters();
      syncUrl(selectedStudentId);
    } catch (error) {
      setupMessage.textContent = error.message;
      currentMeasurements = [];
      currentResults = [];
      currentSummary = null;
      renderStudents([], "");
      renderSummary(null, []);
      renderMeasurements([]);
      workoutFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      renderResultsSummary([]);
      renderPersonalBests([]);
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
      const response = await fetch("/api/admin/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la medicion.");
      measurementForm.reset();
      setStatus(measurementStatus, payload.message, "ok");
      await loadProgress(studentId);
    } catch (error) {
      setStatus(measurementStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => {
    workoutFilter.value = "";
    exerciseFilter.value = "";
    loadProgress(studentFilter.value);
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
  refreshButton.addEventListener("click", () => loadProgress(studentFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadProgress(getInitialStudentId());
  }

  boot();
})();
