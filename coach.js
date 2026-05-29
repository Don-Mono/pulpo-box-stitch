(function () {
  const coachTitle = document.querySelector("#coachTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const studentsList = document.querySelector("#studentsList");
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

  let currentStudents = [];
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
      <strong>${escapeHtml(result.student_name || "Alumno")} · ${escapeHtml(result.workout_title || "Sin rutina")}</strong>
      <span>${escapeHtml(result.exercise_name || "Sin ejercicio")} · ${escapeHtml(formatMark(result))} · ${escapeHtml(formatDate(result.logged_at))}</span>
      <small>${escapeHtml(result.student_notes || "El alumno no dejo notas en este resultado.")}</small>
    `;
    feedbackNotesInput.value = result.coach_notes || "";
    feedbackNotesInput.disabled = false;
    saveFeedbackButton.disabled = false;
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
        ].join(" · ");
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
      renderFeedbackContext(null);
      return;
    }

    studentsList.innerHTML = students.map((student) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(student.full_name)}</strong>
        <span>${escapeHtml(student.goal || "Objetivo pendiente")}</span>
        <small>${escapeHtml([student.email, student.phone].filter(Boolean).join(" / ") || "Sin contacto")}</small>
      </article>
    `).join("");

    feedbackStudentSelect.innerHTML = [
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
          <td><strong>${escapeHtml(result.student_name)}</strong></td>
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

      currentStudents = payload.students || [];
      currentResults = payload.results || [];

      setupMessage.textContent = payload.setupRequired
        ? payload.message
        : "Panel conectado. Estos datos corresponden solo a tus alumnos asignados y ya puedes dejar feedback tecnico.";
      renderStudents(currentStudents);
      renderResults(currentResults);

      if (options.studentId && currentStudents.some((student) => student.profile_id === options.studentId)) {
        feedbackStudentSelect.value = options.studentId;
      }

      syncResultOptions(options.resultId || feedbackResultSelect.value);
    } catch (error) {
      setupMessage.textContent = error.message;
      currentStudents = [];
      currentResults = [];
      renderStudents([]);
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
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    renderFeedbackContext(null);
    await loadOverview();
  }

  boot();
})();
