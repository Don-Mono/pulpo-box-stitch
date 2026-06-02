(function () {
  const coachTitle = document.querySelector("#coachTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const coachOverviewGrid = document.querySelector("#coachOverviewGrid");
  const coachModuleNav = document.querySelector("#coachModuleNav");
  const coachStudentSummaryGrid = document.querySelector("#coachStudentSummaryGrid");
  const coachContextList = document.querySelector("#coachContextList");
  const studentsList = document.querySelector("#studentsList");
  const resultsStudentFilter = document.querySelector("#resultsStudentFilter");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const coachResultsSummaryGrid = document.querySelector("#coachResultsSummaryGrid");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const feedbackForm = document.querySelector("#feedbackForm");
  const feedbackStudentSelect = document.querySelector("#feedback_student_id");
  const feedbackResultSelect = document.querySelector("#feedback_result_id");
  const resultContext = document.querySelector("#resultContext");
  const feedbackNotesInput = document.querySelector("#coach_feedback");
  const feedbackStatus = document.querySelector("#feedbackStatus");
  const saveFeedbackButton = document.querySelector("#saveFeedbackButton");
  const feedbackHelperList = document.querySelector("#feedbackHelperList");
  const coachProfileCard = document.querySelector("#coachProfileCard");
  const coachActionList = document.querySelector("#coachActionList");
  const coachModuleButtons = Array.from(document.querySelectorAll("[data-coach-tab]"));
  const coachModuleSections = Array.from(document.querySelectorAll("[data-coach-panel]"));

  let currentCoachProfile = null;
  let currentStudents = [];
  let currentResults = [];
  let activeCoachTab = "alumnos";
  const coachTabs = ["alumnos", "seguimiento", "feedback", "perfil"];

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

  function formatMark(result) {
    return [
      result.weight_kg ? `${result.weight_kg} kg` : "",
      result.reps ? `${result.reps} reps` : "",
      result.rounds ? `${result.rounds} rondas` : "",
      result.time_seconds ? `${result.time_seconds} seg` : "",
      result.score_text || "",
    ].filter(Boolean).join(" / ") || "Sin marca";
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function getPreferredCoachTab() {
    try {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      return coachTabs.includes(hash) ? hash : "alumnos";
    } catch {
      return "alumnos";
    }
  }

  function setActiveCoachTab(tab, options = {}) {
    const nextTab = coachTabs.includes(tab) ? tab : "alumnos";
    activeCoachTab = nextTab;

    coachModuleButtons.forEach((button) => {
      const isActive = button.dataset.coachTab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    coachModuleSections.forEach((section) => {
      const isActive = section.dataset.coachPanel === nextTab;
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

  function renderFeedbackContext(result) {
    if (!result) {
      resultContext.innerHTML = `
        <strong>Selecciona un resultado</strong>
        <span>Aqui veras la marca, la fecha y las notas del alumno antes de guardar tu feedback.</span>
        <small>El coach solo puede intervenir resultados de sus alumnos asignados.</small>
      `;
      feedbackNotesInput.value = "";
      feedbackNotesInput.disabled = true;
      saveFeedbackButton.disabled = true;
      return;
    }

    resultContext.innerHTML = `
      <strong>${escapeHtml(result.student_name || "Alumno")} - ${escapeHtml(result.workout_title || "Sin rutina")}</strong>
      <span>${escapeHtml(result.exercise_name || "Sin ejercicio")} - ${escapeHtml(formatMark(result))} - ${escapeHtml(formatDate(result.logged_at))}</span>
      <small>${escapeHtml(result.student_notes || "El alumno no dejo notas en este resultado.")}</small>
    `;
    feedbackNotesInput.value = result.coach_notes || "";
    feedbackNotesInput.disabled = false;
    saveFeedbackButton.disabled = false;
  }

  function renderCoachOverview(students, results) {
    const studentsWithResults = new Set(results.map((result) => result.student_id).filter(Boolean)).size;
    const latestResult = results[0] || null;
    const cards = [
      ["Alumnos", String(students.length), students.length ? "Asignados a tu panel activo" : "Aun sin alumnos asignados"],
      ["Marcas recientes", String(results.length), results.length ? "Listas para seguimiento tecnico" : "Sin marcas por revisar"],
      ["Con actividad", String(studentsWithResults), studentsWithResults ? "Ya registraron marcas recientes" : "Sin actividad registrada"],
      ["Ultimo registro", latestResult ? formatDate(latestResult.logged_at) : "--", latestResult ? (latestResult.student_name || "Alumno") : "Aun sin resultados"],
    ];

    coachOverviewGrid.innerHTML = cards.map(([label, value, helper]) => `
      <article class="student-overview-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(helper)}</small>
      </article>
    `).join("");
  }

  function renderCoachStudentSummary(students, results) {
    const studentsWithPhone = students.filter((student) => student.phone).length;
    const goalsCount = new Set(students.map((student) => String(student.goal || "").trim()).filter(Boolean)).size;
    const studentsWithResults = new Set(results.map((result) => result.student_id).filter(Boolean)).size;
    const studentsWithoutResults = Math.max(students.length - studentsWithResults, 0);

    const values = [
      ["Objetivos activos", String(goalsCount)],
      ["Con telefono", String(studentsWithPhone)],
      ["Rutinas con marcas", String(studentsWithResults)],
      ["Sin actividad", String(studentsWithoutResults)],
    ];

    coachStudentSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderCoachContext(students, results) {
    if (!students.length) {
      coachContextList.innerHTML = '<p class="muted">Cuando tengas alumnos asignados, aqui veras focos rapidos de tu grupo.</p>';
      return;
    }

    const latestResult = results[0] || null;
    const resultCountByStudent = new Map();
    results.forEach((result) => {
      const key = result.student_id || "";
      resultCountByStudent.set(key, (resultCountByStudent.get(key) || 0) + 1);
    });

    const mostActiveStudent = students
      .map((student) => ({
        ...student,
        resultCount: resultCountByStudent.get(student.profile_id || "") || 0,
      }))
      .sort((left, right) => right.resultCount - left.resultCount)[0];

    coachContextList.innerHTML = `
      <article class="mini-list-item">
        <strong>Ultima actividad del grupo</strong>
        <span>${escapeHtml(
          latestResult
            ? `${latestResult.student_name || "Alumno"} - ${latestResult.workout_title || "Sin rutina"}`
            : "Aun no hay marcas registradas"
        )}</span>
        <small>${escapeHtml(latestResult ? formatDate(latestResult.logged_at) : "Sin fecha")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Alumno con mas actividad</strong>
        <span>${escapeHtml(mostActiveStudent?.full_name || "Sin datos")}</span>
        <small>${escapeHtml(mostActiveStudent?.resultCount ? `${mostActiveStudent.resultCount} registro(s) recientes.` : "Todavia no registra marcas.")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Accion sugerida</strong>
        <span>${escapeHtml(
          results.length
            ? "Revisa Seguimiento para ver que alumnos ya registraron marcas y deja feedback tecnico desde el modulo Feedback."
            : "Empieza asignando o revisando rutinas desde Mis rutinas para activar el trabajo del grupo."
        )}</span>
        <small>La idea es que no tengas que saltar entre pantallas para leer el estado general.</small>
      </article>
    `;
  }

  function renderCoachProfile(profile) {
    coachProfileCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(profile?.full_name || "Coach Pulpo Box")}</strong>
        <span>${escapeHtml(profile?.email || "Sin email principal")}</span>
        <small>Tu panel solo muestra alumnos asociados directamente a tu perfil.</small>
      </article>
      <article class="mini-list-item">
        <strong>Panel conectado</strong>
        <span>${escapeHtml(currentStudents.length ? `${currentStudents.length} alumno(s) activos en tu grupo.` : "Aun no hay alumnos asignados.")}</span>
        <small>${escapeHtml(currentResults.length ? `${currentResults.length} resultado(s) recientes disponibles para seguimiento.` : "Cuando los alumnos registren marcas, apareceran aqui.")}</small>
      </article>
    `;
  }

  function renderCoachActions() {
    coachActionList.innerHTML = `
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Mis rutinas</strong>
          <span>Crear, editar y asignar rutinas a tu grupo.</span>
          <small>Ideal para entrar directo al constructor de sesiones.</small>
        </div>
        <a class="button ghost compact-button" href="/coach-workouts.html">Abrir</a>
      </article>
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Cambiar clave</strong>
          <span>Gestiona tu acceso sin pasar por admin.</span>
          <small>Manten tu acceso actualizado para el trabajo diario.</small>
        </div>
        <a class="button ghost compact-button" href="/change-password.html">Abrir</a>
      </article>
      <article class="mini-list-item action-list-item">
        <div>
          <strong>Panel general</strong>
          <span>Volver al dashboard privado.</span>
          <small>Desde ahi puedes entrar a otros modulos segun tu rol.</small>
        </div>
        <a class="button ghost compact-button" href="/dashboard.html">Abrir</a>
      </article>
    `;
  }

  function renderFeedbackHelpers(results) {
    const resultsWithoutFeedback = results.filter((result) => !String(result.coach_notes || "").trim()).length;
    const latestResult = results[0] || null;

    feedbackHelperList.innerHTML = `
      <article class="mini-list-item">
        <strong>Resultados sin feedback</strong>
        <span>${escapeHtml(String(resultsWithoutFeedback))}</span>
        <small>Usa este numero como lectura rapida de seguimiento pendiente.</small>
      </article>
      <article class="mini-list-item">
        <strong>Ultimo registro recibido</strong>
        <span>${escapeHtml(latestResult ? `${latestResult.student_name || "Alumno"} - ${formatDate(latestResult.logged_at)}` : "Sin resultados recientes")}</span>
        <small>${escapeHtml(latestResult?.student_notes || "Cuando un alumno deje notas en su marca, las veras aqui antes de responder.")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Buena practica</strong>
        <span>Deja una correccion breve, accionable y facil de recordar para la siguiente sesion.</span>
        <small>Ejemplo: postura, ritmo, rango o foco tecnico principal.</small>
      </article>
    `;
  }

  function renderResultsSummary(results) {
    const latestResult = results[0] || null;
    const withFeedback = results.filter((result) => String(result.coach_notes || "").trim()).length;
    const withoutFeedback = Math.max(results.length - withFeedback, 0);

    const values = [
      ["Registros", String(results.length)],
      ["Ultimo registro", latestResult ? formatDate(latestResult.logged_at) : "--"],
      ["Con feedback", String(withFeedback)],
      ["Sin feedback", String(withoutFeedback)],
    ];

    coachResultsSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function getFilteredResults() {
    const studentId = resultsStudentFilter.value;
    return studentId
      ? currentResults.filter((result) => result.student_id === studentId)
      : currentResults;
  }

  function syncResultOptions(preferredResultId = "") {
    const studentId = feedbackStudentSelect.value;
    const filteredResults = studentId
      ? currentResults.filter((result) => result.student_id === studentId)
      : currentResults;

    if (!filteredResults.length) {
      feedbackResultSelect.innerHTML = '<option value="">Sin resultados disponibles</option>';
      renderFeedbackContext(null);
      return;
    }

    feedbackResultSelect.innerHTML = [
      '<option value="">Selecciona un resultado</option>',
      ...filteredResults.map((result) => {
        const label = [
          result.student_name || "Alumno",
          result.workout_title || "Sin rutina",
          result.exercise_name || "Sin ejercicio",
          formatDate(result.logged_at),
        ].join(" - ");
        return `<option value="${escapeHtml(result.id)}">${escapeHtml(label)}</option>`;
      }),
    ].join("");

    const resultIdToSelect = filteredResults.some((result) => result.id === preferredResultId)
      ? preferredResultId
      : filteredResults[0]?.id || "";

    feedbackResultSelect.value = resultIdToSelect;
    const selectedResult = filteredResults.find((result) => result.id === feedbackResultSelect.value) || null;
    renderFeedbackContext(selectedResult);
  }

  function renderStudents(students) {
    if (!students.length) {
      studentsList.innerHTML = '<p class="muted">Aun no tienes alumnos asignados.</p>';
      feedbackStudentSelect.innerHTML = '<option value="">Sin alumnos disponibles</option>';
      feedbackResultSelect.innerHTML = '<option value="">Sin resultados disponibles</option>';
      resultsStudentFilter.innerHTML = '<option value="">Todos mis alumnos</option>';
      renderFeedbackContext(null);
      return;
    }

    studentsList.innerHTML = students.map((student) => `
      <article class="mini-list-item action-list-item">
        <div>
          <strong>${escapeHtml(student.full_name)}</strong>
          <span>${escapeHtml(student.goal || "Objetivo pendiente")}</span>
          <small>${escapeHtml([student.email, student.phone].filter(Boolean).join(" / ") || "Sin contacto")}</small>
        </div>
        <a class="button ghost compact-button" href="/coach-student.html?id=${encodeURIComponent(student.profile_id || "")}">Ver ficha</a>
      </article>
    `).join("");

    feedbackStudentSelect.innerHTML = [
      '<option value="">Todos mis alumnos</option>',
      ...students.map((student) => `<option value="${escapeHtml(student.profile_id)}">${escapeHtml(student.full_name)}</option>`),
    ].join("");

    resultsStudentFilter.innerHTML = [
      '<option value="">Todos mis alumnos</option>',
      ...students.map((student) => `<option value="${escapeHtml(student.profile_id)}">${escapeHtml(student.full_name)}</option>`),
    ].join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="5">Aun no hay marcas registradas para tus alumnos.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
      const notes = [
        result.student_notes ? `Alumno: ${result.student_notes}` : "",
        result.coach_notes ? `Coach: ${result.coach_notes}` : "",
      ].filter(Boolean).join(" | ") || "Sin notas";

      return `
        <tr>
          <td><a href="/coach-student.html?id=${encodeURIComponent(result.student_id || "")}"><strong>${escapeHtml(result.student_name)}</strong></a></td>
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
    const selectedLabel = resultsStudentFilter.options[resultsStudentFilter.selectedIndex]?.text || "Todos mis alumnos";
    resultsFilterHint.textContent = resultsStudentFilter.value
      ? `${filteredResults.length} registro(s) para ${selectedLabel}.`
      : "Filtra por alumno para revisar una tendencia puntual.";
    renderResultsSummary(filteredResults);
    renderResults(filteredResults);
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
    coachTitle.textContent = payload.user.name ? `Hola, ${payload.user.name}` : "Mis alumnos";
    return payload.user;
  }

  async function loadOverview(options = {}) {
    setupMessage.textContent = "Cargando alumnos asignados...";

    try {
      const response = await fetch("/api/coach/overview");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar tu panel.");

      currentCoachProfile = payload.coachProfile || null;
      currentStudents = payload.students || [];
      currentResults = payload.results || [];

      setupMessage.textContent = payload.setupRequired
        ? payload.message
        : "Panel conectado. Estos datos corresponden solo a tus alumnos asignados y ya puedes dejar feedback tecnico.";
      renderCoachOverview(currentStudents, currentResults);
      renderCoachStudentSummary(currentStudents, currentResults);
      renderCoachContext(currentStudents, currentResults);
      renderCoachProfile(currentCoachProfile);
      renderCoachActions();
      renderFeedbackHelpers(currentResults);
      renderStudents(currentStudents);

      if (options.studentId && currentStudents.some((student) => student.profile_id === options.studentId)) {
        feedbackStudentSelect.value = options.studentId;
        resultsStudentFilter.value = options.studentId;
      }

      refreshResultsView();
      syncResultOptions(options.resultId || feedbackResultSelect.value);
    } catch (error) {
      setupMessage.textContent = error.message;
      currentCoachProfile = null;
      currentStudents = [];
      currentResults = [];
      renderCoachOverview([], []);
      renderCoachStudentSummary([], []);
      renderCoachContext([], []);
      renderCoachProfile(null);
      renderCoachActions();
      renderFeedbackHelpers([]);
      renderStudents([]);
      renderResultsSummary([]);
      renderResults([]);
      setStatus(feedbackStatus, error.message, "error");
    }
  }

  async function saveFeedback(event) {
    event.preventDefault();
    const resultId = feedbackResultSelect.value;

    if (!resultId) {
      setStatus(feedbackStatus, "Debes seleccionar un resultado antes de guardar feedback.", "error");
      return;
    }

    setStatus(feedbackStatus, "Guardando feedback...");

    try {
      const response = await fetch("/api/coach/results", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_id: resultId,
          coach_notes: feedbackNotesInput.value,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar el feedback.");

      setStatus(feedbackStatus, payload.message, "ok");
      await loadOverview({
        studentId: feedbackStudentSelect.value,
        resultId,
      });
    } catch (error) {
      setStatus(feedbackStatus, error.message, "error");
    }
  }

  feedbackStudentSelect.addEventListener("change", () => {
    syncResultOptions();
    setStatus(feedbackStatus, "");
  });

  feedbackResultSelect.addEventListener("change", () => {
    const selectedResult = currentResults.find((result) => result.id === feedbackResultSelect.value) || null;
    renderFeedbackContext(selectedResult);
    setStatus(feedbackStatus, "");
  });

  feedbackForm.addEventListener("submit", saveFeedback);
  refreshButton.addEventListener("click", () => loadOverview({
    studentId: feedbackStudentSelect.value,
    resultId: feedbackResultSelect.value,
  }));
  coachModuleNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-coach-tab]");
    if (!button) return;
    setActiveCoachTab(button.dataset.coachTab);
  });
  resultsStudentFilter.addEventListener("change", refreshResultsView);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
  window.addEventListener("hashchange", () => {
    setActiveCoachTab(getPreferredCoachTab(), { syncHash: false });
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    activeCoachTab = getPreferredCoachTab();
    setActiveCoachTab(activeCoachTab, { syncHash: false });
    renderFeedbackContext(null);
    await loadOverview();
  }

  boot();
})();
