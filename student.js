(function () {
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const assignmentsList = document.querySelector("#assignmentsList");
  const workoutSelect = document.querySelector("#workout_id");
  const exerciseSelect = document.querySelector("#exercise_id");
  const exerciseHint = document.querySelector("#exerciseHint");
  const studentResultForm = document.querySelector("#studentResultForm");
  const resultStatus = document.querySelector("#resultStatus");
  const resultsBody = document.querySelector("#resultsBody");
  const measurementsList = document.querySelector("#measurementsList");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let assignmentsMap = new Map();

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

  function renderAssignments(assignments) {
    assignmentsMap = new Map(assignments.map((assignment) => [assignment.workout_id, assignment]));

    if (!assignments.length) {
      assignmentsList.innerHTML = '<p class="muted">Aun no tienes rutinas asignadas.</p>';
      workoutSelect.innerHTML = '<option value="">Sin rutina</option>';
      exerciseSelect.innerHTML = '<option value="">Sin ejercicios</option>';
      exerciseHint.textContent = "Cuando tengas una rutina asignada, aqui podras elegir sus ejercicios.";
      return;
    }

    workoutSelect.innerHTML = [
      '<option value="">Selecciona tu rutina</option>',
      ...assignments.map((assignment) => `<option value="${escapeHtml(assignment.workout_id)}">${escapeHtml(assignment.workout?.title || "Rutina asignada")}</option>`),
    ].join("");

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
        : "<li>Revisa las indicaciones con tu coach.</li>";

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill">${escapeHtml(workout.level || assignment.status || "Asignada")}</span>
            <h3>${escapeHtml(workout.title || "Rutina asignada")}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          <ul class="check-list">${exerciseSummary}</ul>
        </article>
      `;
    }).join("");

    if (assignments.length === 1) {
      workoutSelect.value = assignments[0].workout_id || "";
    }
    syncExerciseOptions();
  }

  function syncExerciseOptions() {
    const workoutId = workoutSelect.value;
    const assignment = assignmentsMap.get(workoutId);
    const exercises = assignment?.exercises || [];

    if (!workoutId) {
      exerciseSelect.innerHTML = '<option value="">Selecciona una rutina primero</option>';
      exerciseHint.textContent = "Elige la rutina para ver los ejercicios asignados.";
      return;
    }

    if (!exercises.length) {
      exerciseSelect.innerHTML = '<option value="">Rutina sin ejercicios</option>';
      exerciseHint.textContent = "Esta rutina aun no tiene ejercicios detallados.";
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

    exerciseHint.textContent = `${exercises.length} ejercicio(s) disponibles para esta rutina.`;
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="3">Aun no registras marcas.</td></tr>';
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
      const date = result.logged_at ? new Date(result.logged_at).toLocaleDateString("es-CL") : "Sin fecha";

      return `
        <tr>
          <td>
            ${escapeHtml(result.workout_title || "Sin rutina")}
            <small>${escapeHtml(result.exercise_name || "Sin ejercicio")}</small>
          </td>
          <td>${escapeHtml(mark)}</td>
          <td>${escapeHtml(date)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderMeasurements(measurements) {
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

  async function loadOverview() {
    setupMessage.textContent = "Cargando tu informacion...";

    try {
      const response = await fetch("/api/student/overview");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar tu panel.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Panel listo. Revisa tus rutinas y registra tus marcas.";
      renderAssignments(payload.assignments || []);
      renderResults(payload.results || []);
      renderMeasurements(payload.measurements || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderAssignments([]);
      renderResults([]);
      renderMeasurements([]);
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
      syncExerciseOptions();
      setStatus(resultStatus, payload.message, "ok");
      await loadOverview();
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  studentResultForm.addEventListener("submit", saveResult);
  workoutSelect.addEventListener("change", syncExerciseOptions);
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
