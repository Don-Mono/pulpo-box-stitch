(function () {
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const studentProfileForm = document.querySelector("#studentProfileForm");
  const profileStatus = document.querySelector("#profileStatus");
  const saveProfileButton = document.querySelector("#saveProfileButton");
  const profileContextCard = document.querySelector("#profileContextCard");
  const summaryGrid = document.querySelector("#summaryGrid");
  const assignmentsList = document.querySelector("#assignmentsList");
  const workoutSelect = document.querySelector("#workout_id");
  const exerciseSelect = document.querySelector("#exercise_id");
  const exerciseHint = document.querySelector("#exerciseHint");
  const exercisePreviewCard = document.querySelector("#exercisePreviewCard");
  const studentResultForm = document.querySelector("#studentResultForm");
  const resultStatus = document.querySelector("#resultStatus");
  const workoutHistoryFilter = document.querySelector("#workoutHistoryFilter");
  const exerciseHistoryFilter = document.querySelector("#exerciseHistoryFilter");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const resultsBody = document.querySelector("#resultsBody");
  const measurementsList = document.querySelector("#measurementsList");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentProfile = null;
  let assignmentsMap = new Map();
  let currentAssignments = [];
  let currentResults = [];
  let currentMeasurements = [];
  let currentSummary = null;

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

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value).toFixed(1));
  }

  function formatMetric(value, unit) {
    return value == null ? "--" : `${formatNumber(value)} ${unit}`.trim();
  }

  function safeExternalUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value).trim());
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
      return "";
    }
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

  function buildExerciseMeta(exercise) {
    return [
      exercise.movement_type || "",
      exercise.sets ? `${exercise.sets} series` : "",
      exercise.reps || "",
      exercise.time_cap_seconds ? `cap ${exercise.time_cap_seconds} seg` : "",
    ].filter(Boolean);
  }

  function renderExerciseStack(exercises, emptyMessage = "Sin ejercicios cargados.") {
    if (!exercises.length) {
      return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
    }

    return `
      <div class="exercise-stack">
        ${exercises.map((exercise) => {
          const meta = buildExerciseMeta(exercise);
          const description = exercise.exercise_description || "";
          const prescription = exercise.prescription || "";
          const videoUrl = safeExternalUrl(exercise.video_url);

          return `
            <article class="exercise-item-card">
              <div class="exercise-item-head">
                <div>
                  <h4 class="exercise-item-title">${escapeHtml(exercise.exercise_name || "Ejercicio")}</h4>
                  ${meta.length ? `
                    <div class="exercise-item-meta">
                      ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                    </div>
                  ` : ""}
                </div>
                ${videoUrl ? `
                  <div class="exercise-item-actions">
                    <a class="button ghost compact-button" href="${escapeHtml(videoUrl)}" rel="noreferrer noopener" target="_blank">Ver video</a>
                  </div>
                ` : ""}
              </div>
              ${description ? `<p class="exercise-item-copy">${escapeHtml(description)}</p>` : ""}
              ${prescription ? `<p class="exercise-item-prescription"><strong>Indicacion:</strong> ${escapeHtml(prescription)}</p>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSelectedExercisePreview() {
    const workoutId = workoutSelect.value;
    const selectedExerciseId = exerciseSelect.value;
    const assignment = assignmentsMap.get(workoutId);
    const exercises = assignment?.exercises || [];

    if (!workoutId) {
      exercisePreviewCard.innerHTML = '<p class="muted">Selecciona una rutina para revisar la descripcion y el video del ejercicio.</p>';
      return;
    }

    if (!selectedExerciseId) {
      exercisePreviewCard.innerHTML = exercises.length
        ? '<p class="muted">Selecciona un ejercicio para revisar descripcion, enfoque y video disponible antes de guardar tu marca.</p>'
        : '<p class="muted">Esta rutina aun no tiene ejercicios detallados.</p>';
      return;
    }

    const selectedExercise = exercises.find((exercise) => exercise.exercise_id === selectedExerciseId);
    if (!selectedExercise) {
      exercisePreviewCard.innerHTML = '<p class="muted">No se encontro informacion detallada para este ejercicio.</p>';
      return;
    }

    exercisePreviewCard.innerHTML = renderExerciseStack([selectedExercise]);
  }

  async function requireStudentSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      window.location.href = "/login.html";
      return null;
    }

    const payload = await response.json();
    if (payload.user?.role !== "student") {
      window.location.href = "/dashboard.html";
      return null;
    }

    userEmail.textContent = payload.user.email || "";
    studentTitle.textContent = payload.user.name ? `Hola, ${payload.user.name}` : "Mi entrenamiento";
    return payload.user;
  }

  function renderProfile(profile) {
    currentProfile = profile || null;
    studentProfileForm.full_name.value = profile?.full_name || "";
    studentProfileForm.email.value = profile?.email || "";
    studentProfileForm.phone.value = profile?.phone || "";
    studentProfileForm.emergency_contact_name.value = profile?.emergency_contact_name || "";
    studentProfileForm.emergency_contact_phone.value = profile?.emergency_contact_phone || "";
    saveProfileButton.disabled = !profile;

    if (!profile) {
      profileContextCard.innerHTML = '<p class="muted">No encontramos tu contexto aun. Cuando la base este completa aqui veras sede, coach y objetivo.</p>';
      return;
    }

    profileContextCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(profile.full_name || "Alumno")}</strong>
        <span>${escapeHtml(profile.goal || "Objetivo pendiente")}</span>
        <small>${escapeHtml([profile.email, profile.phone].filter(Boolean).join(" / ") || "Sin contacto principal")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Coach y sede</strong>
        <span>${escapeHtml(profile.primary_coach_name || "Sin coach asignado")}</span>
        <small>${escapeHtml(profile.location_name || "Sin sede asignada")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Emergencia</strong>
        <span>${escapeHtml(
          [profile.emergency_contact_name, profile.emergency_contact_phone].filter(Boolean).join(" / ")
          || "Sin contacto de emergencia"
        )}</span>
        <small>Si necesitas cambiar coach, sede u objetivo, solicita apoyo al equipo admin.</small>
      </article>
    `;
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

  function renderAssignments(assignments) {
    currentAssignments = assignments;
    assignmentsMap = new Map(assignments.map((assignment) => [assignment.workout_id, assignment]));

    if (!assignments.length) {
      assignmentsList.innerHTML = '<p class="muted">Aun no tienes rutinas asignadas.</p>';
      workoutSelect.innerHTML = '<option value="">Sin rutina</option>';
      exerciseSelect.innerHTML = '<option value="">Sin ejercicios</option>';
      workoutHistoryFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseHistoryFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      exerciseHint.textContent = "Cuando tengas una rutina asignada, aqui podras elegir sus ejercicios.";
      renderSelectedExercisePreview();
      return;
    }

    workoutSelect.innerHTML = [
      '<option value="">Selecciona tu rutina</option>',
      ...assignments.map((assignment) => `<option value="${escapeHtml(assignment.workout_id)}">${escapeHtml(assignment.workout?.title || "Rutina asignada")}</option>`),
    ].join("");

    assignmentsList.innerHTML = assignments.map((assignment) => {
      const workout = assignment.workout || {};
      const exercises = assignment.exercises || [];

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill">${escapeHtml(workout.level || assignment.status || "Asignada")}</span>
            <h3>${escapeHtml(workout.title || "Rutina asignada")}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          ${renderExerciseStack(exercises, "Revisa las indicaciones con tu coach.")}
        </article>
      `;
    }).join("");

    if (assignments.length === 1) {
      workoutSelect.value = assignments[0].workout_id || "";
    }

    syncExerciseOptions();
    syncHistoryFilters();
  }

  function syncExerciseOptions() {
    const workoutId = workoutSelect.value;
    const assignment = assignmentsMap.get(workoutId);
    const exercises = assignment?.exercises || [];
    const previousExerciseId = exerciseSelect.value;

    if (!workoutId) {
      exerciseSelect.innerHTML = '<option value="">Selecciona una rutina primero</option>';
      exerciseHint.textContent = "Elige la rutina para ver los ejercicios asignados.";
      renderSelectedExercisePreview();
      return;
    }

    if (!exercises.length) {
      exerciseSelect.innerHTML = '<option value="">Rutina sin ejercicios</option>';
      exerciseHint.textContent = "Esta rutina aun no tiene ejercicios detallados.";
      renderSelectedExercisePreview();
      return;
    }

    exerciseSelect.innerHTML = [
      '<option value="">Selecciona el ejercicio realizado</option>',
      ...exercises.map((exercise) => {
        const details = [
          exercise.sets ? `${exercise.sets} series` : "",
          exercise.reps || "",
          exercise.prescription || "",
        ].filter(Boolean).join(" / ");
        return `<option value="${escapeHtml(exercise.exercise_id || "")}">${escapeHtml(exercise.exercise_name || "Ejercicio")}${details ? ` - ${escapeHtml(details)}` : ""}</option>`;
      }),
    ].join("");

    if (exercises.some((exercise) => exercise.exercise_id === previousExerciseId)) {
      exerciseSelect.value = previousExerciseId;
    } else if (exercises.length === 1 && exercises[0].exercise_id) {
      exerciseSelect.value = exercises[0].exercise_id;
    }

    exerciseHint.textContent = `${exercises.length} ejercicio(s) disponibles para esta rutina.`;
    renderSelectedExercisePreview();
  }

  function renderMeasurements(measurements) {
    currentMeasurements = measurements;

    if (!measurements.length) {
      measurementsList.innerHTML = '<p class="muted">Aun no tienes mediciones registradas.</p>';
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
        </article>
      `;
    }).join("");
  }

  function collectWorkoutHistoryOptions() {
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

  function collectExerciseHistoryOptions(selectedWorkoutId) {
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
    const selectedWorkoutId = workoutHistoryFilter.value;
    const selectedExerciseId = exerciseHistoryFilter.value;

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
        result.student_notes ? `Tu nota: ${result.student_notes}` : "",
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
    const selectedWorkoutLabel = workoutHistoryFilter.options[workoutHistoryFilter.selectedIndex]?.text || "Todas las rutinas";
    const selectedExerciseLabel = exerciseHistoryFilter.options[exerciseHistoryFilter.selectedIndex]?.text || "Todos los ejercicios";

    resultsFilterHint.textContent = workoutHistoryFilter.value || exerciseHistoryFilter.value
      ? `${filteredResults.length} registro(s) para ${selectedWorkoutLabel} / ${selectedExerciseLabel}.`
      : "Filtra por rutina o ejercicio para revisar una tendencia puntual.";

    renderResultsSummary(filteredResults);
    renderResults(filteredResults);
  }

  function syncHistoryFilters() {
    const previousWorkoutId = workoutHistoryFilter.value;
    const workoutOptions = collectWorkoutHistoryOptions();

    workoutHistoryFilter.innerHTML = [
      '<option value="">Todas las rutinas</option>',
      ...workoutOptions.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(workout.title)}</option>`),
    ].join("");

    if (workoutOptions.some((workout) => workout.id === previousWorkoutId)) {
      workoutHistoryFilter.value = previousWorkoutId;
    }

    const previousExerciseId = exerciseHistoryFilter.value;
    const exerciseOptions = collectExerciseHistoryOptions(workoutHistoryFilter.value);

    exerciseHistoryFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");

    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseHistoryFilter.value = previousExerciseId;
    }

    refreshResultsView();
  }

  async function loadOverview() {
    setupMessage.textContent = "Cargando tu informacion...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
      const response = await fetch("/api/student/overview");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar tu panel.");

      setupRequired = Boolean(payload.setupRequired);
      currentProfile = payload.studentProfile || null;
      currentResults = payload.results || [];
      currentMeasurements = payload.measurements || [];
      currentSummary = payload.summary || null;

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Panel listo. Revisa tu progreso, tus rutinas, actualiza tus datos y registra tus marcas.";
      renderProfile(currentProfile);
      renderSummary(currentSummary, currentMeasurements);
      renderAssignments(payload.assignments || []);
      renderMeasurements(currentMeasurements);
      syncHistoryFilters();
      setStatus(profileStatus, "");
    } catch (error) {
      setupMessage.textContent = error.message;
      currentProfile = null;
      currentAssignments = [];
      currentResults = [];
      currentMeasurements = [];
      currentSummary = null;
      renderProfile(null);
      renderSummary(null, []);
      renderAssignments([]);
      renderResults([]);
      renderMeasurements([]);
      workoutHistoryFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseHistoryFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      renderResultsSummary([]);
      setStatus(profileStatus, error.message, "error");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(profileStatus, "Tu panel aun no esta activo en Supabase.", "error");
      return;
    }

    if (!currentProfile) {
      setStatus(profileStatus, "Todavia no hay perfil disponible para actualizar.", "error");
      return;
    }

    setStatus(profileStatus, "Guardando tus datos...");
    const formData = new FormData(studentProfileForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/student/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudieron guardar tus datos.");
      setStatus(profileStatus, payload.message || "Tus datos fueron actualizados.", "ok");
      await loadOverview();
    } catch (error) {
      setStatus(profileStatus, error.message, "error");
    }
  }

  async function saveResult(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(resultStatus, "Tu panel aun no esta activo en Supabase.", "error");
      return;
    }

    setStatus(resultStatus, "Guardando resultado...");
    const formData = new FormData(studentResultForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/student/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar.");
      studentResultForm.reset();
      if (currentAssignments.length === 1 && currentAssignments[0]?.workout_id) {
        workoutSelect.value = currentAssignments[0].workout_id;
      }
      syncExerciseOptions();
      setStatus(resultStatus, payload.message, "ok");
      await loadOverview();
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  studentProfileForm.addEventListener("submit", saveProfile);
  studentResultForm.addEventListener("submit", saveResult);
  workoutSelect.addEventListener("change", syncExerciseOptions);
  exerciseSelect.addEventListener("change", renderSelectedExercisePreview);
  workoutHistoryFilter.addEventListener("change", () => {
    const previousExerciseId = exerciseHistoryFilter.value;
    const exerciseOptions = collectExerciseHistoryOptions(workoutHistoryFilter.value);
    exerciseHistoryFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");
    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseHistoryFilter.value = previousExerciseId;
    }
    refreshResultsView();
  });
  exerciseHistoryFilter.addEventListener("change", refreshResultsView);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireStudentSession();
    if (!user) return;
    await loadOverview();
  }

  boot();
})();
