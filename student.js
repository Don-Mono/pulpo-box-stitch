(function () {
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const studentOverviewGrid = document.querySelector("#studentOverviewGrid");
  const studentModuleNav = document.querySelector("#studentModuleNav");
  const studentProfileForm = document.querySelector("#studentProfileForm");
  const profileStatus = document.querySelector("#profileStatus");
  const saveProfileButton = document.querySelector("#saveProfileButton");
  const profileContextCard = document.querySelector("#profileContextCard");
  const summaryGrid = document.querySelector("#summaryGrid");
  const assignmentsList = document.querySelector("#assignmentsList");
  const assignmentStatus = document.querySelector("#assignmentStatus");
  const workoutSelect = document.querySelector("#workout_id");
  const exerciseSelect = document.querySelector("#exercise_id");
  const exerciseHint = document.querySelector("#exerciseHint");
  const exercisePreviewCard = document.querySelector("#exercisePreviewCard");
  const studentResultForm = document.querySelector("#studentResultForm");
  const resultStatus = document.querySelector("#resultStatus");
  const workoutHistoryFilter = document.querySelector("#workoutHistoryFilter");
  const exerciseHistoryFilter = document.querySelector("#exerciseHistoryFilter");
  const resultsPageSizeSelect = document.querySelector("#results_page_size");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const resultsPaginationStatus = document.querySelector("#resultsPaginationStatus");
  const previousResultsPageButton = document.querySelector("#previousResultsPageButton");
  const nextResultsPageButton = document.querySelector("#nextResultsPageButton");
  const resultsBody = document.querySelector("#resultsBody");
  const measurementsList = document.querySelector("#measurementsList");
  const healthSummaryGrid = document.querySelector("#healthSummaryGrid");
  const studentSafetyCard = document.querySelector("#studentSafetyCard");
  const medicalNotesStudentList = document.querySelector("#medicalNotesStudentList");
  const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
  const studentCalendarGrid = document.querySelector("#studentCalendarGrid");
  const studentCalendarActivities = document.querySelector("#studentCalendarActivities");
  const calendarStatus = document.querySelector("#calendarStatus");
  const logoutButton = document.querySelector("#logoutButton");
  const studentModuleButtons = Array.from(document.querySelectorAll("[data-student-tab]"));
  const studentModuleSections = Array.from(document.querySelectorAll("[data-student-panel]"));

  let setupRequired = false;
  let currentProfile = null;
  let assignmentsMap = new Map();
  let currentAssignments = [];
  let currentResults = [];
  let currentResultsSummary = null;
  let currentMeasurements = [];
  let currentSummary = null;
  let currentMedicalNotes = [];
  let assignmentPlayerState = new Map();
  let activeStudentTab = "rutina";
  let pendingRoutineFocus = null;
  let currentResultsPage = 1;
  let currentResultsPageSize = Number(resultsPageSizeSelect?.value || 20);
  let currentResultsTotalPages = 1;
  let currentResultsTotal = 0;
  let currentResultsWorkoutId = "";
  let currentResultsExerciseId = "";
  const studentTabs = ["rutina", "progreso", "calendario", "salud", "perfil"];
  const assignmentStateStoragePrefix = "pulpo-student-assignment-state";

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

  function parseCalendarDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function sameCalendarDay(left, right) {
    return (
      left
      && right
      && left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate()
    );
  }

  function formatMonthLabel(date) {
    return date.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value).toFixed(1));
  }

  function formatMetric(value, unit) {
    return value == null ? "--" : `${formatNumber(value)} ${unit}`.trim();
  }

  function countDigits(value) {
    return String(value || "").replace(/\D/g, "").length;
  }

  function isPhoneLike(value) {
    if (!value) return true;
    return countDigits(value) >= 8;
  }

  function getAssignmentStateStorageKey() {
    return currentProfile?.id ? `${assignmentStateStoragePrefix}:${currentProfile.id}` : "";
  }

  function readStoredAssignmentPlayerState() {
    const key = getAssignmentStateStorageKey();
    if (!key || !window.localStorage) return new Map();

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return new Map();
      return new Map(Object.entries(parsed).map(([assignmentId, index]) => [assignmentId, Number(index) || 0]));
    } catch {
      return new Map();
    }
  }

  function persistAssignmentPlayerState() {
    const key = getAssignmentStateStorageKey();
    if (!key || !window.localStorage) return;

    try {
      const payload = Object.fromEntries([...assignmentPlayerState.entries()].map(([assignmentId, index]) => [assignmentId, Number(index) || 0]));
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Ignore storage failures on private sessions.
    }
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

  function getInitialWorkoutHistoryFilter() {
    try {
      return new URLSearchParams(window.location.search).get("workout_id") || "";
    } catch {
      return "";
    }
  }

  function getInitialExerciseHistoryFilter() {
    try {
      return new URLSearchParams(window.location.search).get("exercise_id") || "";
    } catch {
      return "";
    }
  }

  function syncStudentUrl() {
    try {
      const url = new URL(window.location.href);
      if (currentResultsWorkoutId) url.searchParams.set("workout_id", currentResultsWorkoutId);
      else url.searchParams.delete("workout_id");
      if (currentResultsExerciseId) url.searchParams.set("exercise_id", currentResultsExerciseId);
      else url.searchParams.delete("exercise_id");
      url.searchParams.set("results_page", String(currentResultsPage));
      url.searchParams.set("results_page_size", String(currentResultsPageSize));
      url.hash = activeStudentTab;
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors.
    }
  }

  function getAssignmentStatusMeta(status) {
    switch (String(status || "assigned").toLowerCase()) {
      case "completed":
        return {
          code: "completed",
          label: "Completada",
          className: "is-completed",
          helper: "Rutina marcada como realizada.",
        };
      case "skipped":
        return {
          code: "skipped",
          label: "Omitida",
          className: "is-skipped",
          helper: "Rutina marcada como omitida por ahora.",
        };
      default:
        return {
          code: "assigned",
          label: "Pendiente",
          className: "is-assigned",
          helper: "Rutina pendiente por completar.",
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

  function renderGuidedRoutinePlayer(assignment, currentIndex) {
    const exercises = (assignment.exercises || []).map((exercise) => extendExercise(exercise));
    if (!exercises.length) {
      return '<p class="muted">Revisa las indicaciones con tu coach.</p>';
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
          <div class="guided-routine-actions">
            ${videoUrl ? `<a class="button ghost compact-button" href="${escapeHtml(videoUrl)}" rel="noreferrer noopener" target="_blank">Ver video</a>` : ""}
            ${activeExercise.exercise_id ? `<button class="button accent compact-button" data-guided-use="${escapeHtml(assignment.id)}" type="button">Registrar este ejercicio</button>` : ""}
          </div>
        </div>
        <div class="guided-routine-nav">
          <button class="button ghost compact-button" data-guided-prev="${escapeHtml(assignment.id)}" type="button"${activeIndex === 0 ? " disabled" : ""}>Anterior</button>
          <div class="guided-routine-dots">
            ${exercises.map((_, index) => `
              <button
                class="guided-routine-dot${index === activeIndex ? " is-active" : ""}"
                data-guided-step="${escapeHtml(assignment.id)}"
                data-guided-step-index="${index}"
                title="Ir al paso ${index + 1}"
                type="button"
              ></button>
            `).join("")}
          </div>
          <button class="button ghost compact-button" data-guided-next="${escapeHtml(assignment.id)}" type="button"${activeIndex === exercises.length - 1 ? " disabled" : ""}>Siguiente</button>
        </div>
      </div>
    `;
  }

  function setAssignmentPlayerIndex(assignmentId, nextIndex, options = {}) {
    const assignment = currentAssignments.find((item) => item.id === assignmentId);
    if (!assignment) return;

    const maxIndex = Math.max((assignment.exercises || []).length - 1, 0);
    const safeIndex = Math.min(Math.max(Number(nextIndex) || 0, 0), maxIndex);
    assignmentPlayerState.set(assignmentId, safeIndex);
    persistAssignmentPlayerState();

    if (options.rerender !== false) {
      renderAssignments(currentAssignments);
    }
  }

  function shiftAssignmentPlayer(assignmentId, delta) {
    const currentIndex = assignmentPlayerState.get(assignmentId) ?? 0;
    setAssignmentPlayerIndex(assignmentId, currentIndex + delta);
  }

  function getPreferredStudentTab() {
    try {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      return studentTabs.includes(hash) ? hash : "rutina";
    } catch {
      return "rutina";
    }
  }

  function setActiveStudentTab(tab, options = {}) {
    const nextTab = studentTabs.includes(tab) ? tab : "rutina";
    activeStudentTab = nextTab;

    studentModuleButtons.forEach((button) => {
      const isActive = button.dataset.studentTab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    studentModuleSections.forEach((section) => {
      const isActive = section.dataset.studentPanel === nextTab;
      section.classList.toggle("is-active", isActive);
      section.classList.toggle("hidden", !isActive);
    });

    if (options.syncHash !== false) {
      syncStudentUrl();
    }
  }

  function focusAssignmentExercise(assignmentId) {
    const assignment = currentAssignments.find((item) => item.id === assignmentId);
    if (!assignment) return;

    const exercises = assignment.exercises || [];
    if (!exercises.length) return;

    const currentIndex = Math.min(
      Math.max(assignmentPlayerState.get(assignmentId) ?? 0, 0),
      Math.max(exercises.length - 1, 0),
    );
    const activeExercise = exercises[currentIndex];

    workoutSelect.value = assignment.workout_id || "";
    syncExerciseOptions();
    if (activeExercise?.exercise_id) {
      exerciseSelect.value = activeExercise.exercise_id;
      renderSelectedExercisePreview();
    }
    setActiveStudentTab("rutina");
    studentResultForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resolveNextRoutineFocus(workoutId, exerciseId, shouldKeepCurrent = false) {
    const assignment = assignmentsMap.get(workoutId);
    if (!assignment) return null;

    const exercises = assignment.exercises || [];
    if (!exercises.length) {
      return { assignmentId: assignment.id, workoutId, exerciseId: "" };
    }

    const currentIndexFromState = assignmentPlayerState.get(assignment.id);
    const fallbackIndex = exercises.findIndex((exercise) => exercise.exercise_id === exerciseId);
    const baseIndex = Number.isFinite(currentIndexFromState) ? currentIndexFromState : (fallbackIndex >= 0 ? fallbackIndex : 0);
    const nextIndex = shouldKeepCurrent ? baseIndex : Math.min(baseIndex + 1, exercises.length - 1);
    setAssignmentPlayerIndex(assignment.id, nextIndex, { rerender: false });

    return {
      assignmentId: assignment.id,
      workoutId,
      exerciseId: exercises[nextIndex]?.exercise_id || "",
    };
  }

  function applyPendingRoutineFocus() {
    if (!pendingRoutineFocus) return;

    const focus = pendingRoutineFocus;
    pendingRoutineFocus = null;
    if (!focus.workoutId || !assignmentsMap.has(focus.workoutId)) return;

    setActiveStudentTab("rutina", { syncHash: false });
    workoutSelect.value = focus.workoutId;
    syncExerciseOptions();
    if (focus.exerciseId) {
      exerciseSelect.value = focus.exerciseId;
      renderSelectedExercisePreview();
    }
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

    const hasMainPhone = Boolean(profile.phone);
    const hasEmergencyName = Boolean(profile.emergency_contact_name);
    const hasEmergencyPhone = Boolean(profile.emergency_contact_phone);
    const hasEmergencyContact = hasEmergencyName && hasEmergencyPhone;
    const hasCoach = Boolean(profile.primary_coach_name);
    const hasLocation = Boolean(profile.location_name);
    const hasConsent = Boolean(profile.medical_consent_at);
    const missingItems = [
      !hasMainPhone ? "telefono principal" : "",
      !hasEmergencyContact ? "contacto de emergencia completo" : "",
      !hasCoach ? "coach asignado" : "",
      !hasLocation ? "sede asignada" : "",
      !hasConsent ? "consentimiento de salud" : "",
    ].filter(Boolean);
    const readinessLabel = missingItems.length
      ? `Faltan ${missingItems.length} dato(s) clave`
      : "Perfil listo para seguimiento";
    const readinessBody = missingItems.length
      ? `Te conviene completar ${missingItems.join(", ")} para que el equipo pueda acompanarte mejor.`
      : "Tu ficha base ya tiene los datos minimos para operar bien en esta beta privada.";

    profileContextCard.innerHTML = `
      <div class="warning-card">
        <strong>${escapeHtml(readinessLabel)}</strong>
        <p>${escapeHtml(readinessBody)}</p>
        <span${missingItems.length ? "" : ' class="is-ok"'}>${escapeHtml(missingItems.length ? "Revisar perfil" : "Listo para beta")}</span>
      </div>
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
      <article class="mini-list-item">
        <strong>Checklist rapido</strong>
        <span>${escapeHtml(`${hasMainPhone ? "Telefono" : "Telefono faltante"} / ${hasEmergencyContact ? "Emergencia completa" : "Emergencia pendiente"}`)}</span>
        <small>${escapeHtml(`${hasCoach ? "Coach asignado" : "Sin coach"} / ${hasLocation ? "Sede asignada" : "Sin sede"} / ${hasConsent ? "Consentimiento registrado" : "Consentimiento pendiente"}`)}</small>
      </article>
    `;
  }

  function renderStudentOverview(profile, assignments) {
    const assignmentCount = assignments.length;
    const pendingCount = assignments.filter((assignment) => !["completed", "skipped"].includes(String(assignment.status || "").toLowerCase())).length;
    const completedCount = assignments.filter((assignment) => String(assignment.status || "").toLowerCase() === "completed").length;
    const coachName = profile?.primary_coach_name || "--";
    const locationName = profile?.location_name || "--";

    const cards = [
      ["Rutinas activas", String(assignmentCount), assignmentCount ? `${completedCount} completada(s)` : "Aun sin rutinas asignadas"],
      ["Pendientes", String(pendingCount), pendingCount ? "Listas para entrenar" : "Sin pendientes por ahora"],
      ["Coach", coachName, profile?.goal || "Objetivo pendiente"],
      ["Sede", locationName, profile?.email || "Sin email principal"],
    ];

    studentOverviewGrid.innerHTML = cards.map(([label, value, helper]) => `
      <article class="student-overview-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(helper)}</small>
      </article>
    `).join("");
  }

  function getAssignmentCalendarDate(assignment) {
    return parseCalendarDate(assignment?.workout?.workout_date) || parseCalendarDate(assignment?.assigned_at);
  }

  function renderStudentCalendar(assignments) {
    const today = new Date();
    const datedAssignments = assignments
      .map((assignment) => ({ assignment, date: getAssignmentCalendarDate(assignment) }))
      .filter((entry) => entry.date)
      .sort((left, right) => left.date - right.date);

    const baseDate = datedAssignments.find((entry) => entry.date >= today)?.date || datedAssignments[0]?.date || today;
    const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstWeekday);
    const weekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });

    if (calendarMonthLabel) calendarMonthLabel.textContent = formatMonthLabel(baseDate);

    if (!assignments.length) {
      studentCalendarGrid.innerHTML = `
        <article class="mini-list-item private-empty-state">
          <strong>Sin rutinas para calendarizar</strong>
          <span>Cuando tu coach asigne entrenamientos, apareceran aqui.</span>
        </article>
      `;
      studentCalendarActivities.innerHTML = '<p class="muted">No hay actividades programadas.</p>';
      setStatus(calendarStatus, "Reservas reales disponibles en proxima fase.");
      return;
    }

    studentCalendarGrid.innerHTML = [
      ...weekdays.map((weekday) => `<div class="private-calendar-weekday">${weekday}</div>`),
      ...days.map((date) => {
        const dayAssignments = datedAssignments.filter((entry) => sameCalendarDay(entry.date, date));
        const isMuted = date.getMonth() !== baseDate.getMonth();
        const isToday = sameCalendarDay(date, today);
        return `
          <article class="private-calendar-day${isMuted ? " is-muted" : ""}${isToday ? " is-today" : ""}">
            <strong>${date.getDate()}</strong>
            ${dayAssignments.slice(0, 2).map(({ assignment }) => {
              const statusMeta = getAssignmentStatusMeta(assignment.status);
              return `<span class="private-calendar-event ${statusMeta.code === "completed" ? "is-completed" : statusMeta.code === "skipped" ? "is-skipped" : ""}">${escapeHtml(assignment.workout?.title || "Rutina")}</span>`;
            }).join("")}
          </article>
        `;
      }),
    ].join("");

    const upcoming = datedAssignments.filter((entry) => entry.date >= today).slice(0, 5);
    const unscheduled = assignments.filter((assignment) => !getAssignmentCalendarDate(assignment)).slice(0, 3);
    const activityItems = [
      ...upcoming.map(({ assignment, date }) => {
        const statusMeta = getAssignmentStatusMeta(assignment.status);
        return `
          <article class="mini-list-item">
            <strong>${escapeHtml(assignment.workout?.title || "Rutina asignada")}</strong>
            <span>${escapeHtml(formatDate(date))} · ${escapeHtml(statusMeta.label)}</span>
            <small>${escapeHtml(assignment.workout?.level || "Nivel por definir")}</small>
          </article>
        `;
      }),
      ...unscheduled.map((assignment) => `
        <article class="mini-list-item">
          <strong>${escapeHtml(assignment.workout?.title || "Rutina asignada")}</strong>
          <span>Pendiente por programar</span>
          <small>${escapeHtml(getAssignmentStatusMeta(assignment.status).label)}</small>
        </article>
      `),
    ];

    studentCalendarActivities.innerHTML = activityItems.length
      ? activityItems.join("")
      : '<p class="muted">No hay proximas actividades con fecha.</p>';
    setStatus(calendarStatus, "Calendario FASE 1: lectura visual, sin reservas reales todavia.");
  }

  function renderHealthSummary(summary, profile, notes) {
    const visibleToCoachCount = notes.filter((note) => note.visible_to_coach).length;
    const consentLabel = profile?.medical_consent_at ? `Registrado ${formatDate(profile.medical_consent_at)}` : "Pendiente";
    const hasEmergencyContact = Boolean(profile?.emergency_contact_name && profile?.emergency_contact_phone);
    const visibleHealthNotes = notes.length || 0;
    const healthMissing = [
      !profile?.medical_consent_at ? "consentimiento" : "",
      !hasEmergencyContact ? "contacto de emergencia" : "",
      !summary?.latest_height_cm ? "altura base" : "",
      !summary?.latest_weight_kg ? "peso base" : "",
    ].filter(Boolean);
    const values = [
      ["Altura", summary?.latest_height_cm ? `${formatNumber(summary.latest_height_cm)} cm` : "--"],
      ["Peso base", summary?.latest_weight_kg ? `${formatNumber(summary.latest_weight_kg)} kg` : "--"],
      ["Notas medicas", String(notes.length || 0)],
      ["Consentimiento", consentLabel],
    ];

    healthSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");

    studentSafetyCard.innerHTML = `
      <div class="warning-card">
        <strong>${escapeHtml(healthMissing.length ? "Salud con datos pendientes" : "Salud lista para seguimiento")}</strong>
        <p>${escapeHtml(
          healthMissing.length
            ? `Seria ideal completar ${healthMissing.join(", ")} para que tu seguimiento sea mas seguro y claro.`
            : "Tu contexto de salud tiene base suficiente para el seguimiento inicial de esta beta."
        )}</p>
        <span${healthMissing.length ? "" : ' class="is-ok"'}>${escapeHtml(healthMissing.length ? "Completar con admin" : "Seguimiento activo")}</span>
      </div>
      <article class="mini-list-item">
        <strong>Contacto de emergencia</strong>
        <span>${escapeHtml(
          [profile?.emergency_contact_name, profile?.emergency_contact_phone].filter(Boolean).join(" / ")
          || "Sin contacto configurado"
        )}</span>
        <small>Si necesitas corregirlo, hazlo desde la pestaña Perfil.</small>
      </article>
      <article class="mini-list-item">
        <strong>Visibilidad con tu coach</strong>
        <span>${escapeHtml(visibleToCoachCount ? `${visibleToCoachCount} nota(s) visibles para seguimiento.` : "No hay notas visibles para coach.")}</span>
        <small>El equipo admin define que informacion medica se comparte para cuidar tu entrenamiento.</small>
      </article>
      <article class="mini-list-item">
        <strong>Estado del modulo</strong>
        <span>${escapeHtml(`${visibleHealthNotes} nota(s) registradas / ${visibleToCoachCount} compartidas con coach`)}</span>
        <small>${escapeHtml(profile?.medical_consent_at ? "Consentimiento activo para seguimiento." : "Aun falta registrar consentimiento de salud.")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Consentimiento y seguimiento</strong>
        <span>${escapeHtml(profile?.medical_consent_at ? `Consentimiento registrado el ${formatDate(profile.medical_consent_at)}.` : "Consentimiento aun pendiente de registro.")}</span>
        <small>Si notas algo incompleto en salud o emergencia, solicitalo al equipo admin.</small>
      </article>
    `;
  }

  function renderMedicalNotes(notes) {
    if (!notes.length) {
      medicalNotesStudentList.innerHTML = '<p class="muted">No hay observaciones medicas registradas por ahora.</p>';
      return;
    }

    medicalNotesStudentList.innerHTML = notes.map((note) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(note.note_type || "Nota medica")}</strong>
        <span>${escapeHtml(note.description || "")}</span>
        <small>${escapeHtml(`${formatDate(note.created_at)} · ${note.visible_to_coach ? "Visible para coach" : "Solo equipo admin"}`)}</small>
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

  function renderAssignments(assignments) {
    currentAssignments = assignments;
    assignmentsMap = new Map(assignments.map((assignment) => [assignment.workout_id, assignment]));

    if (!assignments.length) {
      assignmentsList.innerHTML = '<p class="muted">Aun no tienes rutinas asignadas.</p>';
      assignmentPlayerState = new Map();
      workoutSelect.innerHTML = '<option value="">Sin rutina</option>';
      exerciseSelect.innerHTML = '<option value="">Sin ejercicios</option>';
      workoutHistoryFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseHistoryFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      exerciseHint.textContent = "Cuando tengas una rutina asignada, aqui podras elegir sus ejercicios.";
      renderSelectedExercisePreview();
      return;
    }

    const nextPlayerState = new Map();
    const storedPlayerState = readStoredAssignmentPlayerState();
    workoutSelect.innerHTML = [
      '<option value="">Selecciona tu rutina</option>',
      ...assignments.map((assignment) => `<option value="${escapeHtml(assignment.workout_id)}">${escapeHtml(assignment.workout?.title || "Rutina asignada")}</option>`),
    ].join("");

    assignmentsList.innerHTML = assignments.map((assignment) => {
      const workout = assignment.workout || {};
      const exercises = assignment.exercises || [];
      const statusMeta = getAssignmentStatusMeta(assignment.status);
      const completedLabel = assignment.completed_at ? formatDate(assignment.completed_at) : "";
      const previousIndex = assignmentPlayerState.get(assignment.id);
      const storedIndex = storedPlayerState.get(assignment.id);
      const resolvedIndex = Number.isFinite(previousIndex) ? previousIndex : storedIndex;
      const activeIndex = Math.min(Math.max(resolvedIndex ?? 0, 0), Math.max(exercises.length - 1, 0));
      nextPlayerState.set(assignment.id, activeIndex);

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
            <h3>${escapeHtml(workout.title || "Rutina asignada")}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          <div class="workout-meta">
            <span>${escapeHtml(formatDate(assignment.assigned_at))}</span>
            <span>${exercises.length} ejercicio(s)</span>
            ${completedLabel ? `<span>${escapeHtml(`Cerrada ${completedLabel}`)}</span>` : ""}
          </div>
          <div class="assignment-action-row">
            <button class="button ghost compact-button${statusMeta.code === "assigned" ? " is-disabled" : ""}" data-assignment-status="${escapeHtml(assignment.id)}" data-assignment-value="assigned" type="button"${statusMeta.code === "assigned" ? " disabled" : ""}>Pendiente</button>
            <button class="button accent compact-button${statusMeta.code === "completed" ? " is-disabled" : ""}" data-assignment-status="${escapeHtml(assignment.id)}" data-assignment-value="completed" type="button"${statusMeta.code === "completed" ? " disabled" : ""}>Completar</button>
            <button class="button ghost compact-button${statusMeta.code === "skipped" ? " is-disabled" : ""}" data-assignment-status="${escapeHtml(assignment.id)}" data-assignment-value="skipped" type="button"${statusMeta.code === "skipped" ? " disabled" : ""}>Omitir</button>
          </div>
          <p class="muted assignment-status-helper">${escapeHtml(statusMeta.helper)}</p>
          ${renderGuidedRoutinePlayer(assignment, activeIndex)}
        </article>
      `;
    }).join("");
    assignmentPlayerState = nextPlayerState;
    persistAssignmentPlayerState();

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

  function renderResultsPagination() {
    currentResultsTotal = Math.max(Number(currentResultsSummary?.total || 0), 0);
    currentResultsTotalPages = Math.max(Math.ceil(currentResultsTotal / currentResultsPageSize), 1);
    const start = currentResultsTotal ? ((currentResultsPage - 1) * currentResultsPageSize) + 1 : 0;
    const end = Math.min(currentResultsPage * currentResultsPageSize, currentResultsTotal);
    const selectedWorkoutLabel = workoutHistoryFilter.options[workoutHistoryFilter.selectedIndex]?.text || "Todas las rutinas";
    const selectedExerciseLabel = exerciseHistoryFilter.options[exerciseHistoryFilter.selectedIndex]?.text || "Todos los ejercicios";

    resultsPaginationStatus.textContent = currentResultsTotal
      ? `Mostrando ${start}-${end} de ${currentResultsTotal} registro(s). Pagina ${currentResultsPage} de ${currentResultsTotalPages}.`
      : "Sin registros para este filtro.";
    previousResultsPageButton.disabled = currentResultsPage <= 1;
    nextResultsPageButton.disabled = currentResultsPage >= currentResultsTotalPages;

    resultsFilterHint.textContent = currentResultsWorkoutId || currentResultsExerciseId
      ? `${currentResultsTotal} registro(s) para ${selectedWorkoutLabel} / ${selectedExerciseLabel}.`
      : "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
  }

  function syncHistoryFilters() {
    const workoutOptions = collectWorkoutHistoryOptions();

    workoutHistoryFilter.innerHTML = [
      '<option value="">Todas las rutinas</option>',
      ...workoutOptions.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(workout.title)}</option>`),
    ].join("");

    if (workoutOptions.some((workout) => workout.id === currentResultsWorkoutId)) {
      workoutHistoryFilter.value = currentResultsWorkoutId;
    } else {
      currentResultsWorkoutId = "";
      workoutHistoryFilter.value = "";
    }

    const exerciseOptions = collectExerciseHistoryOptions(currentResultsWorkoutId);

    exerciseHistoryFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");

    if (exerciseOptions.some((exercise) => exercise.id === currentResultsExerciseId)) {
      exerciseHistoryFilter.value = currentResultsExerciseId;
    } else {
      currentResultsExerciseId = "";
      exerciseHistoryFilter.value = "";
    }

    renderResultsSummary();
    renderResults(currentResults);
    renderResultsPagination();
  }

  async function loadOverview() {
    setupMessage.textContent = "Cargando tu informacion...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';
    resultsPaginationStatus.textContent = "Cargando paginacion...";

    try {
      const params = new URLSearchParams({
        results_page: String(currentResultsPage),
        results_page_size: String(currentResultsPageSize),
      });
      if (currentResultsWorkoutId) params.set("workout_id", currentResultsWorkoutId);
      if (currentResultsExerciseId) params.set("exercise_id", currentResultsExerciseId);
      const response = await fetch(`/api/student/overview?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar tu panel.");

      setupRequired = Boolean(payload.setupRequired);
      currentProfile = payload.studentProfile || null;
      currentResults = payload.results || [];
      currentResultsSummary = payload.resultsSummary || null;
      currentMeasurements = payload.measurements || [];
      currentSummary = payload.summary || null;
      currentMedicalNotes = payload.medicalNotes || [];
      currentResultsWorkoutId = payload.selectedWorkoutId || "";
      currentResultsExerciseId = payload.selectedExerciseId || "";
      currentResultsTotal = Math.max(Number(payload.pagination?.total || 0), 0);
      currentResultsTotalPages = Math.max(Number(payload.pagination?.totalPages || 1), 1);
      currentResultsPage = Math.min(Math.max(Number(payload.pagination?.page || currentResultsPage || 1), 1), currentResultsTotalPages);
      currentResultsPageSize = Number(payload.pagination?.pageSize || currentResultsPageSize || 20);
      resultsPageSizeSelect.value = String(currentResultsPageSize);

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Panel listo. Revisa tu progreso, tus rutinas, actualiza tus datos y registra tus marcas.";
      setStatus(assignmentStatus, "");
      renderProfile(currentProfile);
      renderStudentOverview(currentProfile, payload.assignments || []);
      renderSummary(currentSummary, currentMeasurements);
      renderHealthSummary(currentSummary, currentProfile, currentMedicalNotes);
      renderMedicalNotes(currentMedicalNotes);
      renderAssignments(payload.assignments || []);
      renderStudentCalendar(payload.assignments || []);
      renderMeasurements(currentMeasurements);
      syncHistoryFilters();
      applyPendingRoutineFocus();
      syncStudentUrl();
      setStatus(profileStatus, "");
      setActiveStudentTab(activeStudentTab, { syncHash: false });
    } catch (error) {
      setupMessage.textContent = error.message;
      currentProfile = null;
      currentAssignments = [];
      currentResults = [];
      currentResultsSummary = null;
      currentMeasurements = [];
      currentSummary = null;
      currentMedicalNotes = [];
      currentResultsTotal = 0;
      currentResultsTotalPages = 1;
      renderProfile(null);
      renderStudentOverview(null, []);
      renderSummary(null, []);
      renderHealthSummary(null, null, []);
      renderMedicalNotes([]);
      renderAssignments([]);
      renderStudentCalendar([]);
      renderResults([]);
      renderMeasurements([]);
      workoutHistoryFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseHistoryFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      renderResultsSummary();
      renderResultsPagination();
      setStatus(assignmentStatus, "");
      setStatus(profileStatus, error.message, "error");
    }
  }

  async function updateAssignmentStatusRequest(assignmentId, status) {
    if (setupRequired) {
      setStatus(assignmentStatus, "Tu panel aun no esta activo en Supabase.", "error");
      return;
    }

    if (!assignmentId || !status) return;

    setStatus(assignmentStatus, "Actualizando estado de la rutina...");

    try {
      const response = await fetch("/api/student/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assignment-status",
          assignment_id: assignmentId,
          status,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar el estado.");
      await loadOverview();
      setStatus(assignmentStatus, payload.message || "Estado actualizado correctamente.", "ok");
    } catch (error) {
      setStatus(assignmentStatus, error.message, "error");
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
    const hasEmergencyName = Boolean(String(body.emergency_contact_name || "").trim());
    const hasEmergencyPhone = Boolean(String(body.emergency_contact_phone || "").trim());

    if (hasEmergencyName !== hasEmergencyPhone) {
      setStatus(profileStatus, "Completa nombre y telefono del contacto de emergencia, o deja ambos vacios.", "error");
      return;
    }

    if (!isPhoneLike(body.phone || "")) {
      setStatus(profileStatus, "Ingresa un telefono principal valido para continuar.", "error");
      return;
    }

    if (!isPhoneLike(body.emergency_contact_phone || "")) {
      setStatus(profileStatus, "Ingresa un telefono de emergencia valido para continuar.", "error");
      return;
    }

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
    const previousWorkoutId = workoutSelect.value;
    const previousExerciseId = exerciseSelect.value;
    const shouldKeepCurrent = String(body.mark_completed || "").toLowerCase() === "true";

    try {
      const response = await fetch("/api/student/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar.");
      pendingRoutineFocus = resolveNextRoutineFocus(previousWorkoutId, previousExerciseId, shouldKeepCurrent);
      studentResultForm.reset();
      if (previousWorkoutId) {
        workoutSelect.value = previousWorkoutId;
      } else if (currentAssignments.length === 1 && currentAssignments[0]?.workout_id) {
        workoutSelect.value = currentAssignments[0].workout_id;
      }
      syncExerciseOptions();
      if (previousExerciseId) {
        exerciseSelect.value = previousExerciseId;
        renderSelectedExercisePreview();
      }
      setStatus(resultStatus, payload.message, "ok");
      await loadOverview();
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  studentProfileForm.addEventListener("submit", saveProfile);
  studentResultForm.addEventListener("submit", saveResult);
  studentModuleNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-tab]");
    if (!button) return;
    setActiveStudentTab(button.dataset.studentTab);
  });
  workoutSelect.addEventListener("change", syncExerciseOptions);
  exerciseSelect.addEventListener("change", renderSelectedExercisePreview);
  workoutHistoryFilter.addEventListener("change", () => {
    currentResultsWorkoutId = workoutHistoryFilter.value;
    const previousExerciseId = currentResultsExerciseId;
    const exerciseOptions = collectExerciseHistoryOptions(currentResultsWorkoutId);
    exerciseHistoryFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");
    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      currentResultsExerciseId = previousExerciseId;
      exerciseHistoryFilter.value = previousExerciseId;
    } else {
      currentResultsExerciseId = "";
      exerciseHistoryFilter.value = "";
    }
    currentResultsPage = 1;
    loadOverview();
  });
  exerciseHistoryFilter.addEventListener("change", () => {
    currentResultsExerciseId = exerciseHistoryFilter.value;
    currentResultsPage = 1;
    loadOverview();
  });
  resultsPageSizeSelect.addEventListener("change", () => {
    currentResultsPageSize = Number(resultsPageSizeSelect.value || 20);
    currentResultsPage = 1;
    loadOverview();
  });
  previousResultsPageButton.addEventListener("click", () => {
    if (currentResultsPage <= 1) return;
    currentResultsPage -= 1;
    loadOverview();
  });
  nextResultsPageButton.addEventListener("click", () => {
    if (currentResultsPage >= currentResultsTotalPages) return;
    currentResultsPage += 1;
    loadOverview();
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
      return;
    }

    const stepButton = event.target.closest("[data-guided-step]");
    if (stepButton) {
      setAssignmentPlayerIndex(stepButton.dataset.guidedStep, Number(stepButton.dataset.guidedStepIndex || 0));
      return;
    }

    const useButton = event.target.closest("[data-guided-use]");
    if (useButton) {
      focusAssignmentExercise(useButton.dataset.guidedUse);
      return;
    }

    const statusButton = event.target.closest("[data-assignment-status]");
    if (!statusButton) return;
    updateAssignmentStatusRequest(statusButton.dataset.assignmentStatus, statusButton.dataset.assignmentValue);
  });
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
  window.addEventListener("hashchange", () => {
    setActiveStudentTab(getPreferredStudentTab(), { syncHash: false });
  });

  async function boot() {
    const user = await requireStudentSession();
    if (!user) return;
    activeStudentTab = getPreferredStudentTab();
    currentResultsPage = getInitialResultsPage();
    currentResultsPageSize = getInitialResultsPageSize();
    currentResultsWorkoutId = getInitialWorkoutHistoryFilter();
    currentResultsExerciseId = getInitialExerciseHistoryFilter();
    resultsPageSizeSelect.value = String(currentResultsPageSize);
    setActiveStudentTab(activeStudentTab, { syncHash: false });
    await loadOverview();
  }

  boot();
})();
