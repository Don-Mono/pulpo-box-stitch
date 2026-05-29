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
  const exercisesJsonInput = document.querySelector("#exercises_json");
  const addExerciseButton = document.querySelector("#addExerciseButton");
  const selectedExercisesList = document.querySelector("#selectedExercisesList");
  const setsInput = document.querySelector("#sets");
  const repsInput = document.querySelector("#reps");
  const prescriptionInput = document.querySelector("#prescription");

  let setupRequired = false;
  let exerciseLibrary = [];
  let exerciseByKey = new Map();
  let selectedExercises = [];

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

  function exerciseKey(exercise) {
    return `${exercise.source || "glosario"}:${exercise.id}`;
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

  function getExerciseDraft() {
    return {
      exercise_id: exerciseIdInput.value,
      exercise_name: exerciseNameInput.value.trim(),
      exercise_description: exerciseDescriptionInput.value,
      movement_type: movementTypeInput.value,
      video_url: videoUrlInput.value.trim(),
      prescription: prescriptionInput.value.trim(),
      sets: setsInput.value.trim(),
      reps: repsInput.value.trim(),
    };
  }

  function resetExerciseDraft() {
    exerciseIdInput.value = "";
    exerciseNameInput.value = "";
    exerciseDescriptionInput.value = "";
    movementTypeInput.value = "";
    videoUrlInput.value = "";
    setsInput.value = "";
    repsInput.value = "";
    prescriptionInput.value = "";
    libraryExerciseSelect.value = "";
  }

  function syncExercisesJson() {
    exercisesJsonInput.value = selectedExercises.length ? JSON.stringify(selectedExercises) : "";
  }

  function renderSelectedExercises() {
    syncExercisesJson();

    if (!selectedExercises.length) {
      selectedExercisesList.innerHTML = '<p class="muted">Aun no agregas ejercicios. Si escribes uno y creas la rutina, se guardara como ejercicio unico.</p>';
      return;
    }

    selectedExercisesList.innerHTML = selectedExercises.map((exercise, index) => {
      const details = [
        exercise.sets ? `${exercise.sets} series` : "",
        exercise.reps || "",
        exercise.prescription || "",
      ].filter(Boolean).join(" / ") || "Sin indicacion detallada";

      return `
        <article class="routine-builder-item">
          <span class="routine-builder-index">${index + 1}</span>
          <div>
            <strong>${escapeHtml(exercise.exercise_name)}</strong>
            <small>${escapeHtml(details)}</small>
          </div>
          <button class="button ghost compact-button" data-remove-exercise="${index}" type="button">Eliminar</button>
        </article>
      `;
    }).join("");
  }

  function addExerciseToRoutine() {
    const draft = getExerciseDraft();
    if (!draft.exercise_name && !draft.exercise_id) {
      setStatus(workoutStatus, "Selecciona o escribe un ejercicio antes de agregarlo.", "error");
      return;
    }

    selectedExercises.push(draft);
    resetExerciseDraft();
    renderSelectedExercises();
    setStatus(workoutStatus, "Ejercicio agregado a la rutina.", "ok");
  }

  function removeExerciseFromRoutine(index) {
    selectedExercises = selectedExercises.filter((_, itemIndex) => itemIndex !== index);
    renderSelectedExercises();
  }

  function loadExerciseLibrary(payload) {
    exerciseLibrary = payload.exerciseLibrary || [];
    exerciseByKey = new Map(exerciseLibrary.map((exercise) => [exerciseKey(exercise), exercise]));
    renderExerciseSections(payload.sections || []);
    renderExerciseOptions(librarySectionSelect.value);
  }

  function renderWorkouts(workouts) {
    if (!workouts.length) {
      renderEmpty("Todavia no hay rutinas relacionadas con tus alumnos.");
      return;
    }

    workoutsList.innerHTML = workouts.map((workout) => {
      const exercises = workout.exercises || [];
      const assignments = workout.assignments || [];
      const exerciseSummary = exercises.length
        ? exercises.map((exercise) => {
          const details = [
            exercise.sets ? `${exercise.sets} series` : "",
            exercise.reps || "",
            exercise.prescription || "",
          ].filter(Boolean).join(" / ");
          return `<li><strong>${escapeHtml(exercise.name)}</strong>${details ? `: ${escapeHtml(details)}` : ""}</li>`;
        }).join("")
        : "<li>Sin ejercicios cargados.</li>";
      const assignedSummary = assignments.length
        ? assignments.map((assignment) => escapeHtml(assignment.student_name)).join(", ")
        : "Sin alumnos asignados";
      const badge = workout.created_by_me ? "Creada por ti" : "Asignada a tus alumnos";

      return `
        <article class="workout-card">
          <div>
            <span class="status-pill">${escapeHtml(badge)}</span>
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
    setupMessage.textContent = "Revisando tablas de gestion para tu sesion de coach...";

    try {
      const response = await fetch("/api/coach/workouts");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar rutinas.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes crear y asignar rutinas a tus alumnos.";
      renderStudents(payload.students || []);
      loadExerciseLibrary(payload);
      renderWorkouts(payload.workouts || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([]);
      exerciseLibrary = [];
      exerciseByKey = new Map();
      librarySectionSelect.innerHTML = '<option value="">Biblioteca no disponible</option>';
      libraryExerciseSelect.innerHTML = '<option value="">Selecciona una seccion</option>';
      libraryHint.textContent = error.message;
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
      const response = await fetch("/api/coach/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo crear la rutina.");
      workoutForm.reset();
      selectedExercises = [];
      clearSelectedExerciseId();
      renderExerciseOptions(librarySectionSelect.value);
      renderSelectedExercises();
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  workoutForm.addEventListener("submit", createWorkout);
  addExerciseButton.addEventListener("click", addExerciseToRoutine);
  selectedExercisesList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-exercise]");
    if (!removeButton) return;
    removeExerciseFromRoutine(Number(removeButton.dataset.removeExercise));
  });
  librarySectionSelect.addEventListener("change", () => renderExerciseOptions(librarySectionSelect.value));
  libraryExerciseSelect.addEventListener("change", applyExerciseSelection);
  exerciseNameInput.addEventListener("input", clearSelectedExerciseId);
  refreshButton.addEventListener("click", loadWorkouts);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    await loadWorkouts();
  }

  boot();
})();
