(function () {
  const userEmail = document.querySelector("#userEmail");
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const studentMeta = document.querySelector("#studentMeta");
  const studentFilter = document.querySelector("#studentFilter");
  const coachStudentOverviewGrid = document.querySelector("#coachStudentOverviewGrid");
  const coachStudentModuleNav = document.querySelector("#coachStudentModuleNav");
  const summaryGrid = document.querySelector("#summaryGrid");
  const studentProfileCard = document.querySelector("#studentProfileCard");
  const coachStudentActionList = document.querySelector("#coachStudentActionList");
  const measurementForm = document.querySelector("#measurementForm");
  const measurementStatus = document.querySelector("#measurementStatus");
  const assignmentsList = document.querySelector("#assignmentsList");
  const coachStudentRoutineHelper = document.querySelector("#coachStudentRoutineHelper");
  const measurementsList = document.querySelector("#measurementsList");
  const workoutFilter = document.querySelector("#workoutFilter");
  const exerciseFilter = document.querySelector("#exerciseFilter");
  const resultsPageSizeSelect = document.querySelector("#results_page_size");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const resultsPaginationStatus = document.querySelector("#resultsPaginationStatus");
  const previousResultsPageButton = document.querySelector("#previousResultsPageButton");
  const nextResultsPageButton = document.querySelector("#nextResultsPageButton");
  const resultsBody = document.querySelector("#resultsBody");
  const coachStudentProgressHelper = document.querySelector("#coachStudentProgressHelper");
  const medicalCard = document.querySelector("#medicalCard");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const coachStudentHealthHelper = document.querySelector("#coachStudentHealthHelper");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const coachStudentModuleButtons = Array.from(document.querySelectorAll("[data-coach-student-tab]"));
  const coachStudentModuleSections = Array.from(document.querySelectorAll("[data-coach-student-panel]"));

  let setupRequired = false;
  let currentStudentId = "";
  let currentStudent = null;
  let currentSummary = null;
  let currentAssignments = [];
  let currentMeasurements = [];
  let currentResults = [];
  let currentResultsSummary = null;
  let currentResultsPage = Number(resultsPageSizeSelect?.dataset.initialPage || 1);
  let currentResultsPageSize = Number(resultsPageSizeSelect?.value || 20);
  let currentResultsTotalPages = 1;
  let currentResultsTotal = 0;
  let currentResultsWorkoutId = "";
  let currentResultsExerciseId = "";
  let assignmentPlayerState = new Map();
  let activeCoachStudentTab = "perfil";
  const coachStudentTabs = ["perfil", "rutina", "progreso", "salud"];

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

  function getInitialResultsPage() {
    try {
      const page = Number(new URLSearchParams(window.location.search).get("results_page") || "1");
      return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    } catch {
      return 1;
    }
  }

  function getInitialResultsPageSize() {
    try {
      const pageSize = Number(new URLSearchParams(window.location.search).get("results_page_size") || String(currentResultsPageSize));
      if ([10, 20, 50].includes(pageSize)) return pageSize;
      return currentResultsPageSize;
    } catch {
      return currentResultsPageSize;
    }
  }

  function getInitialWorkoutFilter() {
    try {
      return new URLSearchParams(window.location.search).get("workout_id") || "";
    } catch {
      return "";
    }
  }

  function getInitialExerciseFilter() {
    try {
      return new URLSearchParams(window.location.search).get("exercise_id") || "";
    } catch {
      return "";
    }
  }

  function getAssignmentStatusMeta(status) {
    switch (String(status || "assigned").toLowerCase()) {
      case "completed":
        return {
          label: "Completada",
          className: "is-completed",
          helper: "Rutina cerrada por el alumno.",
        };
      case "skipped":
        return {
          label: "Omitida",
          className: "is-skipped",
          helper: "El alumno marco esta rutina como omitida.",
        };
      default:
        return {
          label: "Pendiente",
          className: "is-assigned",
          helper: "Rutina aun pendiente por completar.",
        };
    }
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

  function extendExercise(exercise) {
    const flow = window.PulpoWorkoutFlow;
    if (flow?.extendExercise) return flow.extendExercise(exercise);
    return {
      ...exercise,
      block_label: exercise.block_label || "",
      rest_label: exercise.rest_label || "",
      tempo_label: exercise.tempo_label || "",
      display_prescription: exercise.prescription || "",
    };
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
    const view = extendExercise(exercise);
    return [
      exercise.movement_type || "",
      view.tempo_label ? `tempo ${view.tempo_label}` : "",
      view.rest_label ? `descanso ${view.rest_label}` : "",
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
          const view = extendExercise(exercise);
          const meta = buildExerciseMeta(view);
          const description = view.exercise_description || "";
          const prescription = view.display_prescription || "";
          const videoUrl = safeExternalUrl(view.video_url);

          return `
            <article class="exercise-item-card">
              <div class="exercise-item-head">
                <div>
                  <div class="exercise-item-topline">
                    ${view.block_label ? `<span class="section-pill is-accent">${escapeHtml(view.block_label)}</span>` : ""}
                  </div>
                  <h4 class="exercise-item-title">${escapeHtml(view.exercise_name || "Ejercicio")}</h4>
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

  function renderGuidedRoutinePlayer(assignment, currentIndex) {
    const exercises = (assignment.exercises || []).map((exercise) => extendExercise(exercise));
    if (!exercises.length) {
      return '<p class="muted">Sin ejercicios cargados.</p>';
    }

    const activeIndex = Math.min(Math.max(currentIndex, 0), exercises.length - 1);
    const activeExercise = exercises[activeIndex];
    const meta = buildExerciseMeta(activeExercise);
    const videoUrl = safeExternalUrl(activeExercise.video_url);

    return `
      <div class="guided-routine-player">
        <div class="guided-routine-head">
          ${activeExercise.block_label ? `<span class="section-pill is-accent">${escapeHtml(activeExercise.block_label)}</span>` : '<span class="section-pill">Sesion</span>'}
          <span class="guided-routine-counter">Paso ${activeIndex + 1} / ${exercises.length}</span>
        </div>
        <div class="guided-routine-surface">
          <h4>${escapeHtml(activeExercise.exercise_name || "Ejercicio")}</h4>
          ${meta.length ? `<div class="guided-routine-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
          ${activeExercise.exercise_description ? `<p class="guided-routine-description">${escapeHtml(activeExercise.exercise_description)}</p>` : ""}
          ${activeExercise.display_prescription ? `<p class="guided-routine-instruction">${escapeHtml(activeExercise.display_prescription)}</p>` : ""}
          ${videoUrl ? `<div class="guided-routine-actions"><a class="button ghost compact-button" href="${escapeHtml(videoUrl)}" rel="noreferrer noopener" target="_blank">Ver video</a></div>` : ""}
        </div>
        <div class="guided-routine-nav">
          <button class="button ghost compact-button" data-guided-prev="${escapeHtml(assignment.id)}" type="button"${activeIndex === 0 ? " disabled" : ""}>Anterior</button>
          <div class="guided-routine-dots">
            ${exercises.map((_, index) => `<span class="guided-routine-dot${index === activeIndex ? " is-active" : ""}"></span>`).join("")}
          </div>
          <button class="button ghost compact-button" data-guided-next="${escapeHtml(assignment.id)}" type="button"${activeIndex === exercises.length - 1 ? " disabled" : ""}>Siguiente</button>
        </div>
      </div>
    `;
  }

  function shiftAssignmentPlayer(assignmentId, delta) {
    const assignment = currentAssignments.find((item) => item.id === assignmentId);
    if (!assignment) return;

    const maxIndex = Math.max((assignment.exercises || []).length - 1, 0);
    const currentIndex = assignmentPlayerState.get(assignmentId) ?? 0;
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), maxIndex);
    assignmentPlayerState.set(assignmentId, nextIndex);
    renderAssignments(currentAssignments);
  }

  function getInitialStudentId() {
    try {
      return new URLSearchParams(window.location.search).get("id") || "";
    } catch {
      return "";
    }
  }

  function getPreferredCoachStudentTab() {
    try {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      return coachStudentTabs.includes(hash) ? hash : "perfil";
    } catch {
      return "perfil";
    }
  }

  function setActiveCoachStudentTab(tab, options = {}) {
    const nextTab = coachStudentTabs.includes(tab) ? tab : "perfil";
    activeCoachStudentTab = nextTab;

    coachStudentModuleButtons.forEach((button) => {
      const isActive = button.dataset.coachStudentTab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    coachStudentModuleSections.forEach((section) => {
      const isActive = section.dataset.coachStudentPanel === nextTab;
      section.classList.toggle("is-active", isActive);
      section.classList.toggle("hidden", !isActive);
    });

    if (options.syncHash !== false) {
      try {
        const url = new URL(window.location.href);
        url.hash = nextTab;
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Ignore hash sync errors.
      }
    }
  }

  function syncUrl(studentId) {
    try {
      const url = new URL(window.location.href);
      if (studentId) url.searchParams.set("id", studentId);
      else url.searchParams.delete("id");
      if (currentResultsWorkoutId) url.searchParams.set("workout_id", currentResultsWorkoutId);
      else url.searchParams.delete("workout_id");
      if (currentResultsExerciseId) url.searchParams.set("exercise_id", currentResultsExerciseId);
      else url.searchParams.delete("exercise_id");
      url.searchParams.set("results_page", String(currentResultsPage));
      url.searchParams.set("results_page_size", String(currentResultsPageSize));
      url.hash = activeCoachStudentTab;
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

  function renderCoachStudentOverview(student, assignments, resultsSummary, medicalNotes) {
    const cards = [
      ["Alumno", student?.full_name || "--", student?.goal || "Objetivo pendiente"],
      ["Rutinas activas", String(assignments.length || 0), assignments.length ? "Cargadas para seguimiento" : "Sin rutinas activas"],
      ["Ultima marca", resultsSummary?.latestLoggedAt ? formatDate(resultsSummary.latestLoggedAt) : "--", `${resultsSummary?.total || 0} registro(s) dentro del filtro activo`],
      ["Notas visibles", String(medicalNotes.length || 0), medicalNotes.length ? "Disponibles para el coach" : "Sin notas compartidas"],
    ];

    coachStudentOverviewGrid.innerHTML = cards.map(([label, value, helper]) => `
      <article class="student-overview-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(helper)}</small>
      </article>
    `).join("");
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

  function renderCoachStudentActions(profile) {
    if (!profile?.id) {
      coachStudentActionList.innerHTML = '<p class="muted">Selecciona un alumno para ver accesos rapidos.</p>';
      return;
    }

    const studentId = encodeURIComponent(profile.id);
    coachStudentActionList.innerHTML = `
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Ver progreso completo</strong>
          <span>Abre la lectura detallada del alumno con sus marcas y mediciones.</span>
          <small>Ideal para revisar la evolucion antes o despues de una clase.</small>
        </div>
        <a class="button ghost compact-button" href="/coach-student.html?id=${studentId}#progreso">Abrir</a>
      </article>
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Volver a alumnos</strong>
          <span>Regresa al panel general del coach.</span>
          <small>Desde ahi puedes revisar a todo tu grupo o dejar feedback rapido.</small>
        </div>
        <a class="button ghost compact-button" href="/coach.html#alumnos">Abrir</a>
      </article>
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Mis rutinas</strong>
          <span>Abre el constructor privado del coach.</span>
          <small>Util para ajustar sesiones sin perder el hilo del seguimiento.</small>
        </div>
        <a class="button ghost compact-button" href="/coach-workouts.html">Abrir</a>
      </article>
    `;
  }

  function renderAssignments(assignments) {
    if (!assignments.length) {
      assignmentsList.innerHTML = '<p class="muted">No hay rutinas asignadas a este alumno.</p>';
      coachStudentRoutineHelper.innerHTML = '<p class="muted">Cuando tenga rutinas activas, aqui veras una lectura rapida de la sesion.</p>';
      assignmentPlayerState = new Map();
      return;
    }

    const nextPlayerState = new Map();
    assignmentsList.innerHTML = assignments.map((assignment) => {
      const workout = assignment.workout || {};
      const exercises = assignment.exercises || [];
      const assignedAt = assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString("es-CL") : "Sin fecha";
      const statusMeta = getAssignmentStatusMeta(assignment.status);
      const completedLabel = assignment.completed_at ? formatDate(assignment.completed_at) : "";
      const activeIndex = Math.min(Math.max(assignmentPlayerState.get(assignment.id) ?? 0, 0), Math.max(exercises.length - 1, 0));
      nextPlayerState.set(assignment.id, activeIndex);

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
            <h3>${escapeHtml(workout.title || "Rutina asignada")}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          <div class="workout-meta">
            <span>${escapeHtml(workout.workout_date || assignedAt)}</span>
            <span>${exercises.length} ejercicio(s)</span>
            ${completedLabel ? `<span>${escapeHtml(`Cerrada ${completedLabel}`)}</span>` : ""}
          </div>
          <p class="muted assignment-status-helper">${escapeHtml(statusMeta.helper)}</p>
          ${renderGuidedRoutinePlayer(assignment, activeIndex)}
        </article>
      `;
    }).join("");
    assignmentPlayerState = nextPlayerState;

    const latestAssignment = assignments[0] || null;
    const completedAssignments = assignments.filter((assignment) => String(assignment.status || "").toLowerCase() === "completed").length;
    coachStudentRoutineHelper.innerHTML = `
      <article class="mini-list-item">
        <strong>Rutina mas reciente</strong>
        <span>${escapeHtml(latestAssignment?.workout?.title || "Sin rutina")}</span>
        <small>${escapeHtml(latestAssignment?.assigned_at ? `Asignada el ${formatDate(latestAssignment.assigned_at)}.` : "Sin fecha de asignacion.")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Estado del trabajo</strong>
        <span>${escapeHtml(`${completedAssignments} completada(s) de ${assignments.length}.`)}</span>
        <small>El estado lo marca el alumno desde su propio portal.</small>
      </article>
      <article class="mini-list-item">
        <strong>Uso sugerido</strong>
        <span>Entra a cada paso de la sesion para revisar el ejercicio activo, su descripcion y el video de apoyo.</span>
        <small>Asi puedes corregir tecnica sin salir de esta ficha.</small>
      </article>
    `;
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
      coachStudentHealthHelper.innerHTML = `
        <article class="mini-list-item">
          <strong>Sin restricciones visibles</strong>
          <span>No hay notas compartidas por administracion para este alumno.</span>
          <small>Si cambia algo sensible, el equipo admin lo reflejara aqui.</small>
        </article>
      `;
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

    coachStudentHealthHelper.innerHTML = `
      <article class="mini-list-item">
        <strong>Consentimiento</strong>
        <span>${escapeHtml(consent ? "Existe consentimiento registrado para seguimiento." : "Solo ves notas explicitamente compartidas.")}</span>
        <small>La visibilidad la controla administracion segun la ficha del alumno.</small>
      </article>
      <article class="mini-list-item">
        <strong>Notas visibles</strong>
        <span>${escapeHtml(`${notes.length} registro(s) compartido(s) para este seguimiento.`)}</span>
        <small>Revisa tipo y descripcion antes de definir cargas o tecnica.</small>
      </article>
    `;
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

  function renderResultsSummary() {
    const values = [
      ["Registros", String(currentResultsSummary?.total || 0)],
      ["Ultimo registro", currentResultsSummary?.latestLoggedAt ? formatDate(currentResultsSummary.latestLoggedAt) : "--"],
      ["Mejor carga", currentResultsSummary?.bestWeightKg != null ? `${formatNumber(currentResultsSummary.bestWeightKg)} kg` : "--"],
      ["Mayor reps", currentResultsSummary?.bestReps != null ? String(currentResultsSummary.bestReps) : "--"],
    ];

    resultsSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">No hay marcas para este filtro.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
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

  function renderResultsPagination() {
    currentResultsTotal = Math.max(Number(currentResultsSummary?.total || 0), 0);
    currentResultsTotalPages = Math.max(Math.ceil(currentResultsTotal / currentResultsPageSize), 1);
    const start = currentResultsTotal ? ((currentResultsPage - 1) * currentResultsPageSize) + 1 : 0;
    const end = Math.min(currentResultsPage * currentResultsPageSize, currentResultsTotal);
    const selectedWorkoutLabel = workoutFilter.options[workoutFilter.selectedIndex]?.text || "Todas las rutinas";
    const selectedExerciseLabel = exerciseFilter.options[exerciseFilter.selectedIndex]?.text || "Todos los ejercicios";

    resultsPaginationStatus.textContent = currentResultsTotal
      ? `Mostrando ${start}-${end} de ${currentResultsTotal} registro(s). Pagina ${currentResultsPage} de ${currentResultsTotalPages}.`
      : "Sin registros para este filtro.";
    previousResultsPageButton.disabled = currentResultsPage <= 1;
    nextResultsPageButton.disabled = currentResultsPage >= currentResultsTotalPages;

    resultsFilterHint.textContent = currentResultsWorkoutId || currentResultsExerciseId
      ? `${currentResultsTotal} registro(s) para ${selectedWorkoutLabel} / ${selectedExerciseLabel}.`
      : "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
  }

  function refreshResultsView() {
    renderResultsSummary();
    renderResults(currentResults);
    renderResultsPagination();

    const latestResult = currentResults[0] || null;
    const resultsWithCoachNotes = currentResults.filter((result) => String(result.coach_notes || "").trim()).length;
    coachStudentProgressHelper.innerHTML = `
      <article class="mini-list-item">
        <strong>Ultima marca del filtro</strong>
        <span>${escapeHtml(latestResult ? `${latestResult.exercise_name || "Ejercicio"} - ${formatDate(latestResult.logged_at)}` : "Sin registros para este filtro")}</span>
        <small>${escapeHtml(latestResult?.student_notes || "Cuando el alumno deje notas, se veran aqui junto a su ultima marca.")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Feedback registrado</strong>
        <span>${escapeHtml(`${resultsWithCoachNotes} registro(s) del filtro ya tienen observacion del coach.`)}</span>
        <small>Usa esto para detectar rapido si falta cerrar el seguimiento tecnico.</small>
      </article>
      <article class="mini-list-item">
        <strong>Lectura sugerida</strong>
        <span>${escapeHtml(currentResultsWorkoutId || currentResultsExerciseId ? "El filtro esta afinado para revisar una tendencia puntual." : "Activa un filtro para leer mejor la progresion por rutina o ejercicio.")}</span>
        <small>La tabla y el resumen cambian juntos para facilitar la lectura.</small>
      </article>
    `;
  }

  function syncResultFilters() {
    const workoutOptions = collectWorkoutOptions();

    workoutFilter.innerHTML = [
      '<option value="">Todas las rutinas</option>',
      ...workoutOptions.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(workout.title)}</option>`),
    ].join("");

    if (workoutOptions.some((workout) => workout.id === currentResultsWorkoutId)) {
      workoutFilter.value = currentResultsWorkoutId;
    } else {
      workoutFilter.value = "";
      currentResultsWorkoutId = "";
    }

    const exerciseOptions = collectExerciseOptions(workoutFilter.value);

    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");

    if (exerciseOptions.some((exercise) => exercise.id === currentResultsExerciseId)) {
      exerciseFilter.value = currentResultsExerciseId;
    } else {
      exerciseFilter.value = "";
      currentResultsExerciseId = "";
    }

    refreshResultsView();
  }

  async function loadStudentDetail(preferredStudentId = studentFilter.value || getInitialStudentId()) {
    setupMessage.textContent = "Revisando progreso del alumno...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
      const url = preferredStudentId
        ? `/api/coach/student-detail?student_id=${encodeURIComponent(preferredStudentId)}&results_page=${encodeURIComponent(currentResultsPage)}&results_page_size=${encodeURIComponent(currentResultsPageSize)}&workout_id=${encodeURIComponent(currentResultsWorkoutId)}&exercise_id=${encodeURIComponent(currentResultsExerciseId)}`
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
      currentResultsSummary = payload.resultsSummary || null;
      currentResultsPage = Math.max(Number(payload.pagination?.page || currentResultsPage || 1), 1);
      currentResultsPageSize = Number(payload.pagination?.pageSize || currentResultsPageSize || 20);
      currentResultsTotalPages = Math.max(Number(payload.pagination?.totalPages || 1), 1);
      currentResultsTotal = Math.max(Number(payload.pagination?.total || 0), 0);
      currentResultsWorkoutId = payload.selectedWorkoutId || "";
      currentResultsExerciseId = payload.selectedExerciseId || "";
      const visibleMedicalNotes = payload.medicalNotes || [];

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Ficha conectada. Aqui ves solo alumnos asignados a tu perfil.";
      renderStudents(payload.students || [], currentStudentId);
      renderCoachStudentOverview(currentStudent, currentAssignments, currentResultsSummary, visibleMedicalNotes);
      renderSummary(currentSummary, currentMeasurements);
      renderProfile(currentStudent);
      renderCoachStudentActions(currentStudent);
      renderAssignments(currentAssignments);
      renderMeasurements(currentMeasurements);
      renderMedical(payload.consent || null, visibleMedicalNotes);
      syncResultFilters();
      syncUrl(currentStudentId);
      setStatus(measurementStatus, "");
      setActiveCoachStudentTab(activeCoachStudentTab, { syncHash: false });
    } catch (error) {
      currentStudentId = "";
      currentStudent = null;
      currentSummary = null;
      currentAssignments = [];
      currentMeasurements = [];
      currentResults = [];
      currentResultsSummary = null;
      currentResultsPage = 1;
      currentResultsTotalPages = 1;
      currentResultsTotal = 0;
      currentResultsWorkoutId = "";
      currentResultsExerciseId = "";
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderCoachStudentOverview(null, [], null, []);
      renderSummary(null, []);
      renderProfile(null);
      renderCoachStudentActions(null);
      renderAssignments([]);
      renderMeasurements([]);
      renderMedical(null, []);
      workoutFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      if (resultsPageSizeSelect) resultsPageSizeSelect.value = String(currentResultsPageSize);
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      resultsPaginationStatus.textContent = "Sin registros para este filtro.";
      renderResultsSummary();
      resultsBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
      coachStudentProgressHelper.innerHTML = '<p class="muted">No fue posible cargar la lectura del progreso.</p>';
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
    currentResultsWorkoutId = "";
    currentResultsExerciseId = "";
    currentResultsPage = 1;
    loadStudentDetail(studentFilter.value);
  });
  workoutFilter.addEventListener("change", () => {
    currentResultsWorkoutId = workoutFilter.value;
    const previousExerciseId = exerciseFilter.value;
    const exerciseOptions = collectExerciseOptions(workoutFilter.value);
    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");
    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseFilter.value = previousExerciseId;
      currentResultsExerciseId = previousExerciseId;
    } else {
      exerciseFilter.value = "";
      currentResultsExerciseId = "";
    }
    currentResultsPage = 1;
    loadStudentDetail(currentStudentId || studentFilter.value);
  });
  exerciseFilter.addEventListener("change", () => {
    currentResultsExerciseId = exerciseFilter.value;
    currentResultsPage = 1;
    loadStudentDetail(currentStudentId || studentFilter.value);
  });
  resultsPageSizeSelect?.addEventListener("change", () => {
    currentResultsPageSize = Number(resultsPageSizeSelect.value || 20);
    currentResultsPage = 1;
    loadStudentDetail(currentStudentId || studentFilter.value);
  });
  previousResultsPageButton?.addEventListener("click", () => {
    if (currentResultsPage <= 1) return;
    currentResultsPage -= 1;
    loadStudentDetail(currentStudentId || studentFilter.value);
  });
  nextResultsPageButton?.addEventListener("click", () => {
    if (currentResultsPage >= currentResultsTotalPages) return;
    currentResultsPage += 1;
    loadStudentDetail(currentStudentId || studentFilter.value);
  });
  assignmentsList.addEventListener("click", (event) => {
    const previousButton = event.target.closest("[data-guided-prev]");
    if (previousButton) {
      shiftAssignmentPlayer(previousButton.dataset.guidedPrev, -1);
      return;
    }

    const nextButton = event.target.closest("[data-guided-next]");
    if (nextButton) {
      shiftAssignmentPlayer(nextButton.dataset.guidedNext, 1);
    }
  });
  measurementForm.addEventListener("submit", createMeasurement);
  refreshButton.addEventListener("click", () => loadStudentDetail(currentStudentId || studentFilter.value));
  coachStudentModuleNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-coach-student-tab]");
    if (!button) return;
    setActiveCoachStudentTab(button.dataset.coachStudentTab);
  });
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
  window.addEventListener("hashchange", () => {
    setActiveCoachStudentTab(getPreferredCoachStudentTab(), { syncHash: false });
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    currentResultsPage = getInitialResultsPage();
    currentResultsPageSize = getInitialResultsPageSize();
    currentResultsWorkoutId = getInitialWorkoutFilter();
    currentResultsExerciseId = getInitialExerciseFilter();
    if (resultsPageSizeSelect) resultsPageSizeSelect.value = String(currentResultsPageSize);
    activeCoachStudentTab = getPreferredCoachStudentTab();
    setActiveCoachStudentTab(activeCoachStudentTab, { syncHash: false });
    await loadStudentDetail();
  }

  boot();
})();
