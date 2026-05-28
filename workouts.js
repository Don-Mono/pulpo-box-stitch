(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const workoutForm = document.querySelector("#workoutForm");
  const workoutStatus = document.querySelector("#workoutStatus");
  const workoutsList = document.querySelector("#workoutsList");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const studentSelect = document.querySelector("#student_id");

  let setupRequired = false;

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

  function renderStudents(students) {
    const options = ['<option value="">Sin asignar por ahora</option>'];
    students.forEach((student) => {
      options.push(`<option value="${escapeHtml(student.id)}">${escapeHtml(student.full_name)}${student.email ? ` - ${escapeHtml(student.email)}` : ""}</option>`);
    });
    studentSelect.innerHTML = options.join("");
  }

  function renderEmpty(message) {
    workoutsList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  }

  function renderWorkouts(workouts) {
    if (!workouts.length) {
      renderEmpty("Todavia no hay rutinas registradas.");
      return;
    }

    workoutsList.innerHTML = workouts.map((workout) => {
      const exercises = workout.exercises || [];
      const assignments = workout.assignments || [];
      const exerciseSummary = exercises.length
        ? exercises.map((exercise) => `<li><strong>${escapeHtml(exercise.name)}</strong>${exercise.prescription ? `: ${escapeHtml(exercise.prescription)}` : ""}</li>`).join("")
        : "<li>Sin ejercicios cargados.</li>";
      const assignedSummary = assignments.length
        ? assignments.map((assignment) => escapeHtml(assignment.student_name)).join(", ")
        : "Sin alumnos asignados";

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill">${escapeHtml(workout.level || "Rutina")}</span>
            <h3>${escapeHtml(workout.title)}</h3>
            <p>${escapeHtml(workout.summary || "Sin resumen.")}</p>
          </div>
          <div class="workout-meta">
            <span>${escapeHtml(workout.workout_date || "Sin fecha")}</span>
            <span>${assignments.length} asignacion(es)</span>
          </div>
          <ul class="check-list">${exerciseSummary}</ul>
          <p class="muted"><strong>Asignado a:</strong> ${assignedSummary}</p>
        </article>
      `;
    }).join("");
  }

  async function loadWorkouts() {
    renderEmpty("Cargando rutinas...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const response = await fetch("/api/admin/workouts");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar rutinas.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar rutinas cuando lo necesites.";
      renderStudents(payload.students || []);
      renderWorkouts(payload.workouts || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([]);
      renderEmpty(error.message);
    }
  }

  async function createWorkout(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(workoutStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(workoutStatus, "Creando rutina...");
    const formData = new FormData(workoutForm);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/admin/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo crear la rutina.");
      workoutForm.reset();
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  workoutForm.addEventListener("submit", createWorkout);
  refreshButton.addEventListener("click", loadWorkouts);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadWorkouts();
  }

  boot();
})();
