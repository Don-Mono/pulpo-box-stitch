(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const resultForm = document.querySelector("#resultForm");
  const resultStatus = document.querySelector("#resultStatus");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const studentSelect = document.querySelector("#student_id");
  const workoutSelect = document.querySelector("#workout_id");
  const exerciseSelect = document.querySelector("#exercise_id");
  const exerciseHint = document.querySelector("#exerciseHint");

  let setupRequired = false;
  let workoutExerciseMap = new Map();

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

  function fillSelect(select, placeholder, options, labelKey) {
    const html = [`<option value="">${escapeHtml(placeholder)}</option>`];
    options.forEach((option) => {
      html.push(`<option value="${escapeHtml(option.id)}">${escapeHtml(option[labelKey])}</option>`);
    });
    select.innerHTML = html.join("");
  }

  function syncExerciseOptions() {
    const workoutId = workoutSelect.value;
    const exercises = workoutExerciseMap.get(workoutId) || [];

    if (!workoutId) {
      exerciseSelect.innerHTML = '<option value="">Sin ejercicio</option>';
      exerciseHint.textContent = "Si eliges una rutina, aqui apareceran sus ejercicios.";
      return;
    }

    if (!exercises.length) {
      exerciseSelect.innerHTML = '<option value="">Rutina sin ejercicios</option>';
      exerciseHint.textContent = "La rutina seleccionada no tiene ejercicios detallados.";
      return;
    }

    exerciseSelect.innerHTML = [
      '<option value="">Selecciona el ejercicio</option>',
      ...exercises.map((exercise) => {
        const details = [
          exercise.sets ? `${exercise.sets} series` : "",
          exercise.reps || "",
          exercise.prescription || "",
        ].filter(Boolean).join(" / ");
        return `<option value="${escapeHtml(exercise.exercise_id || "")}">${escapeHtml(exercise.exercise_name || "Ejercicio")}${details ? ` - ${escapeHtml(details)}` : ""}</option>`;
      }),
    ].join("");

    exerciseHint.textContent = `${exercises.length} ejercicio(s) disponibles para esta rutina.`;
  }

  function renderEmpty(message) {
    resultsBody.innerHTML = `<tr><td colspan="5">${escapeHtml(message)}</td></tr>`;
  }

  function renderResults(results) {
    if (!results.length) {
      renderEmpty("Todavia no hay resultados registrados.");
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
      const notes = [result.student_notes, result.coach_notes].filter(Boolean).join(" | ") || "Sin notas";
      const date = result.logged_at ? new Date(result.logged_at).toLocaleDateString("es-CL") : "Sin fecha";

      return `
        <tr>
          <td><strong>${escapeHtml(result.student_name)}</strong></td>
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

  async function loadResults(preferredStudentId = studentSelect.value || getInitialStudentId()) {
    renderEmpty("Cargando resultados...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const url = preferredStudentId
        ? `/api/admin/results?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/results";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar resultados.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar resultados cuando lo necesites.";
      fillSelect(studentSelect, "Seleccionar alumno", payload.students || [], "full_name");
      studentSelect.value = payload.selectedStudentId || preferredStudentId || "";
      fillSelect(workoutSelect, "Sin rutina", payload.workouts || [], "title");
      workoutExerciseMap = new Map();
      (payload.workoutExercises || []).forEach((exercise) => {
        const list = workoutExerciseMap.get(exercise.workout_id) || [];
        list.push(exercise);
        workoutExerciseMap.set(exercise.workout_id, list);
      });
      syncExerciseOptions();
      renderResults(payload.results || []);
      syncUrl(studentSelect.value);
    } catch (error) {
      setupMessage.textContent = error.message;
      fillSelect(studentSelect, "Seleccionar alumno", [], "full_name");
      fillSelect(workoutSelect, "Sin rutina", [], "title");
      fillSelect(exerciseSelect, "Sin ejercicio", [], "name");
      workoutExerciseMap = new Map();
      exerciseHint.textContent = error.message;
      renderEmpty(error.message);
    }
  }

  async function createResult(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(resultStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(resultStatus, "Guardando resultado...");
    const formData = new FormData(resultForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar el resultado.");
      resultForm.reset();
      syncExerciseOptions();
      setStatus(resultStatus, payload.message, "ok");
      await loadResults();
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  resultForm.addEventListener("submit", createResult);
  workoutSelect.addEventListener("change", syncExerciseOptions);
  studentSelect.addEventListener("change", () => loadResults(studentSelect.value));
  refreshButton.addEventListener("click", () => loadResults(studentSelect.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadResults(getInitialStudentId());
  }

  boot();
})();
