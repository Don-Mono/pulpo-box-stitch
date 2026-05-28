(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const workoutForm = document.querySelector("#workoutForm");
  const workoutStatus = document.querySelector("#workoutStatus");
  const workoutsList = document.querySelector("#workoutsList");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const studentSelect = document.querySelector("#student_id");
  const librarySectionSelect = document.querySelector("#library_section");
  const libraryExerciseSelect = document.querySelector("#library_exercise");
  const libraryHint = document.querySelector("#libraryHint");
  const exerciseIdInput = document.querySelector("#exercise_id");
  const exerciseNameInput = document.querySelector("#exercise_name");
  const exerciseDescriptionInput = document.querySelector("#exercise_description");
  const movementTypeInput = document.querySelector("#movement_type");
  const videoUrlInput = document.querySelector("#video_url");

  let setupRequired = false;
  let exerciseLibrary = [];
  let exerciseByKey = new Map();

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

  function exerciseKey(exercise) {
    return `${exercise.source || "glosario"}:${exercise.id}`;
  }

  function renderExerciseSections(sections) {
    const options = ['<option value="">Todas las secciones</option>'];
    sections.forEach((section) => {
      options.push(`<option value="${escapeHtml(section.name)}">${escapeHtml(section.name)} (${section.total})</option>`);
    });
    librarySectionSelect.innerHTML = options.join("");
  }

  function renderExerciseOptions(sectionName = "") {
    const exercises = sectionName
      ? exerciseLibrary.filter((exercise) => exercise.section === sectionName)
      : exerciseLibrary;
    const options = ['<option value="">Selecciona un ejercicio del glosario</option>'];

    exercises.forEach((exercise) => {
      const key = exerciseKey(exercise);
      const meta = [exercise.category, exercise.subcategory, exercise.difficulty].filter(Boolean).join(" / ");
      options.push(`<option value="${escapeHtml(key)}">${escapeHtml(exercise.name)}${meta ? ` - ${escapeHtml(meta)}` : ""}</option>`);
    });

    libraryExerciseSelect.innerHTML = options.join("");
    libraryHint.textContent = exercises.length
      ? `${exercises.length} ejercicios disponibles en esta vista.`
      : "No hay ejercicios para esta seccion.";
  }

  function applyExerciseSelection() {
    const exercise = exerciseByKey.get(libraryExerciseSelect.value);
    if (!exercise) return;

    exerciseIdInput.value = exercise.source === "supabase" ? exercise.id : "";
    exerciseNameInput.value = exercise.name || "";
    exerciseDescriptionInput.value = exercise.description || "";
    movementTypeInput.value = exercise.movement_type || "";
    videoUrlInput.value = exercise.video_url || "";

    const meta = [exercise.section, exercise.category, exercise.subcategory, exercise.movement_type, exercise.difficulty]
      .filter(Boolean)
      .join(" / ");
    libraryHint.textContent = meta || "Ejercicio seleccionado desde la biblioteca.";
  }

  function clearSelectedExerciseId() {
    exerciseIdInput.value = "";
    exerciseDescriptionInput.value = "";
    movementTypeInput.value = "";
  }

  async function loadExerciseLibrary() {
    try {
      const response = await fetch("/api/admin/exercises");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar la biblioteca.");

      exerciseLibrary = payload.exercises || [];
      exerciseByKey = new Map(exerciseLibrary.map((exercise) => [exerciseKey(exercise), exercise]));
      renderExerciseSections(payload.sections || []);
      renderExerciseOptions(librarySectionSelect.value);

      if (payload.setupRequired) {
        libraryHint.textContent = payload.message || "Biblioteca base disponible; falta activar Supabase para guardar ejercicios propios.";
      }
    } catch (error) {
      exerciseLibrary = [];
      exerciseByKey = new Map();
      librarySectionSelect.innerHTML = '<option value="">Biblioteca no disponible</option>';
      libraryExerciseSelect.innerHTML = '<option value="">Escribe el ejercicio manualmente</option>';
      libraryHint.textContent = error.message;
    }
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
      await loadExerciseLibrary();
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
      clearSelectedExerciseId();
      renderExerciseOptions(librarySectionSelect.value);
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  workoutForm.addEventListener("submit", createWorkout);
  librarySectionSelect.addEventListener("change", () => renderExerciseOptions(librarySectionSelect.value));
  libraryExerciseSelect.addEventListener("change", applyExerciseSelection);
  exerciseNameInput.addEventListener("input", clearSelectedExerciseId);
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
