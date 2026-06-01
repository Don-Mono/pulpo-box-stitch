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
  const workoutFormTitle = document.querySelector("#workoutFormTitle");
  const workoutFormCopy = document.querySelector("#workoutFormCopy");
  const workoutEditorMode = document.querySelector("#workoutEditorMode");
  const saveWorkoutButton = document.querySelector("#saveWorkoutButton");
  const cancelWorkoutEditButton = document.querySelector("#cancelWorkoutEditButton");

  let setupRequired = false;
  let exerciseLibrary = [];
  let exerciseByKey = new Map();
  let selectedExercises = [];
  let currentStudents = [];
  let preferredStudentId = "";
  let currentWorkouts = [];
  let workoutById = new Map();
  let editingWorkoutId = "";

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

  function setWorkoutEditorMode(mode, workout = null) {
    const isEditing = mode === "edit";
    editingWorkoutId = isEditing ? workout?.id || "" : "";
    workoutEditorMode.classList.toggle("hidden", !isEditing);
    workoutEditorMode.textContent = isEditing ? "Edicion" : "Creacion";
    workoutFormTitle.textContent = isEditing ? "Editar rutina" : "Nueva rutina";
    workoutFormCopy.textContent = isEditing
      ? "Actualiza titulo, foco, fecha, notas y el bloque completo de ejercicios. Las asignaciones se siguen gestionando abajo."
      : "Arma una rutina completa agregando uno o varios ejercicios desde el glosario.";
    saveWorkoutButton.textContent = isEditing ? "Guardar cambios" : "Crear rutina";
    cancelWorkoutEditButton.classList.toggle("hidden", !isEditing);
  }

  function resetWorkoutForm() {
    workoutForm.reset();
    selectedExercises = [];
    clearSelectedExerciseId();
    renderSelectedExercises();
    renderExerciseOptions(librarySectionSelect.value);
    if (preferredStudentId && currentStudents.some((student) => student.id === preferredStudentId)) {
      studentSelect.value = preferredStudentId;
    }
    setWorkoutEditorMode("create");
  }

  function buildSelectedExercisesFromWorkout(workout) {
    return (workout.exercises || []).map((exercise) => ({
      exercise_id: exercise.exercise_id || "",
      exercise_name: exercise.name || "",
      exercise_description: exercise.description || "",
      movement_type: exercise.movement_type || "",
      video_url: exercise.video_url || "",
      prescription: exercise.prescription || "",
      sets: exercise.sets ?? "",
      reps: exercise.reps || "",
      time_cap_seconds: exercise.time_cap_seconds ?? "",
    }));
  }

  function startWorkoutEdit(workoutId) {
    const workout = workoutById.get(workoutId);
    if (!workout) {
      setStatus(workoutStatus, "No encontramos la rutina a editar.", "error");
      return;
    }

    setWorkoutEditorMode("edit", workout);
    workoutForm.title.value = workout.title || "";
    workoutForm.workout_date.value = workout.workout_date || "";
    workoutForm.level.value = workout.level || "";
    workoutForm.summary.value = workout.summary || "";
    workoutForm.notes.value = workout.notes || "";
    studentSelect.value = "";
    selectedExercises = buildSelectedExercisesFromWorkout(workout);
    renderSelectedExercises();
    setStatus(workoutStatus, `Editando ${workout.title}.`, "ok");
    workoutForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function getAssignmentStatusMeta(status) {
    switch (String(status || "assigned").toLowerCase()) {
      case "completed":
        return { label: "Completada", className: "is-completed" };
      case "skipped":
        return { label: "Omitida", className: "is-skipped" };
      default:
        return { label: "Pendiente", className: "is-assigned" };
    }
  }

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
    currentStudents = students;
    const options = ['<option value="">Sin asignar por ahora</option>'];
    students.forEach((student) => {
      options.push(`<option value="${escapeHtml(student.id)}">${escapeHtml(student.full_name)}${student.email ? ` - ${escapeHtml(student.email)}` : ""}</option>`);
    });
    studentSelect.innerHTML = options.join("");
    if (preferredStudentId && students.some((student) => student.id === preferredStudentId)) {
      studentSelect.value = preferredStudentId;
    }
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
    currentWorkouts = workouts;
    workoutById = new Map(workouts.map((workout) => [workout.id, workout]));

    if (!workouts.length) {
      renderEmpty("Todavia no hay rutinas registradas.");
      return;
    }

    workoutsList.innerHTML = workouts.map((workout) => {
      const exercises = workout.exercises || [];
      const assignments = workout.assignments || [];
      const unassignedStudents = currentStudents.filter((student) => !assignments.some((assignment) => assignment.student_id === student.id));
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
      const assignmentOptions = unassignedStudents.length
        ? unassignedStudents.map((student) => {
          const selected = preferredStudentId && preferredStudentId === student.id ? " selected" : "";
          return `<option value="${escapeHtml(student.id)}"${selected}>${escapeHtml(student.full_name)}</option>`;
        }).join("")
        : '<option value="">Todos los alumnos activos ya estan asignados</option>';
      const assignmentRows = assignments.length
        ? assignments.map((assignment) => {
          const assignmentMeta = getAssignmentStatusMeta(assignment.status);
          const assignmentDate = assignment.completed_at && assignmentMeta.label === "Completada"
            ? ` / ${formatDate(assignment.completed_at)}`
            : "";
          return `
          <article class="mini-list-item action-list-item">
            <div>
              <strong>${escapeHtml(assignment.student_name)}</strong>
              <small>${escapeHtml(`${assignmentMeta.label}${assignmentDate}`)}</small>
            </div>
            <button class="button ghost compact-button" data-workout-unassign="${escapeHtml(assignment.id)}" type="button">Quitar</button>
          </article>
        `;
        }).join("")
        : '<p class="muted">Sin alumnos asignados todavia.</p>';

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
          ${workout.notes ? `<p class="muted"><strong>Notas:</strong> ${escapeHtml(workout.notes)}</p>` : ""}
          <div class="detail-action-group">
            <button class="button ghost compact-button" data-workout-edit="${escapeHtml(workout.id)}" type="button">Editar rutina</button>
            <button class="button ghost compact-button" data-workout-delete="${escapeHtml(workout.id)}" type="button">Eliminar rutina</button>
          </div>
          <p class="muted"><strong>Asignado a:</strong> ${assignedSummary}</p>
          <div class="assignment-manager">
            <div class="field">
              <label for="assign-${escapeHtml(workout.id)}">Asignar a mas alumnos</label>
              <select id="assign-${escapeHtml(workout.id)}" class="assignment-select" data-assignment-select="${escapeHtml(workout.id)}" multiple size="4">
                ${assignmentOptions}
              </select>
            </div>
            <button class="button ghost full-button" data-workout-assign="${escapeHtml(workout.id)}" type="button">Asignar seleccionados</button>
            <div class="mini-list assignment-list">${assignmentRows}</div>
          </div>
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
      if (editingWorkoutId && !workoutById.has(editingWorkoutId)) {
        resetWorkoutForm();
      }
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([]);
      renderEmpty(error.message);
    }
  }

  async function submitWorkout(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(workoutStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(workoutStatus, editingWorkoutId ? "Guardando cambios..." : "Creando rutina...");
    const formData = new FormData(workoutForm);
    const body = Object.fromEntries(formData.entries());
    if (editingWorkoutId) {
      body.workout_id = editingWorkoutId;
      body.student_id = "";
    }

    try {
      const response = await fetch("/api/admin/workouts", {
        method: editingWorkoutId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la rutina.");
      resetWorkoutForm();
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  function getSelectedAssignmentStudentIds(workoutId) {
    const select = workoutsList.querySelector(`[data-assignment-select="${workoutId}"]`);
    if (!select) return [];
    return [...select.selectedOptions].map((option) => option.value).filter(Boolean);
  }

  async function assignStudentsToWorkout(workoutId) {
    if (setupRequired) {
      setStatus(workoutStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const studentIds = getSelectedAssignmentStudentIds(workoutId);
    if (!studentIds.length) {
      setStatus(workoutStatus, "Selecciona al menos un alumno para asignar la rutina.", "error");
      return;
    }

    setStatus(workoutStatus, "Actualizando asignaciones...");
    try {
      const response = await fetch("/api/admin/workouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: workoutId, student_ids: studentIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar la asignacion.");
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  async function removeWorkoutAssignment(assignmentId) {
    if (!assignmentId) return;
    setStatus(workoutStatus, "Quitando asignacion...");
    try {
      const response = await fetch("/api/admin/workouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo quitar la asignacion.");
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  async function deleteWorkout(workoutId) {
    if (!workoutId) return;
    const workout = workoutById.get(workoutId);
    if (!window.confirm(`Se eliminara la rutina ${workout?.title || "seleccionada"} junto con sus ejercicios y asignaciones. Esta accion no se puede deshacer.`)) {
      return;
    }

    setStatus(workoutStatus, "Eliminando rutina...");
    try {
      const response = await fetch("/api/admin/workouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-workout", workout_id: workoutId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo eliminar la rutina.");
      if (editingWorkoutId === workoutId) resetWorkoutForm();
      setStatus(workoutStatus, payload.message, "ok");
      await loadWorkouts();
    } catch (error) {
      setStatus(workoutStatus, error.message, "error");
    }
  }

  workoutForm.addEventListener("submit", submitWorkout);
  addExerciseButton.addEventListener("click", addExerciseToRoutine);
  workoutsList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-workout-edit]");
    if (editButton) {
      startWorkoutEdit(editButton.dataset.workoutEdit);
      return;
    }

    const deleteButton = event.target.closest("[data-workout-delete]");
    if (deleteButton) {
      deleteWorkout(deleteButton.dataset.workoutDelete);
      return;
    }

    const assignButton = event.target.closest("[data-workout-assign]");
    if (assignButton) {
      assignStudentsToWorkout(assignButton.dataset.workoutAssign);
      return;
    }

    const unassignButton = event.target.closest("[data-workout-unassign]");
    if (unassignButton) {
      removeWorkoutAssignment(unassignButton.dataset.workoutUnassign);
    }
  });
  selectedExercisesList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-exercise]");
    if (!removeButton) return;
    removeExerciseFromRoutine(Number(removeButton.dataset.removeExercise));
  });
  librarySectionSelect.addEventListener("change", () => renderExerciseOptions(librarySectionSelect.value));
  libraryExerciseSelect.addEventListener("change", applyExerciseSelection);
  exerciseNameInput.addEventListener("input", clearSelectedExerciseId);
  cancelWorkoutEditButton.addEventListener("click", () => {
    resetWorkoutForm();
    setStatus(workoutStatus, "Edicion cancelada.", "ok");
  });
  studentSelect.addEventListener("change", () => {
    preferredStudentId = studentSelect.value;
    syncUrl(preferredStudentId);
  });
  refreshButton.addEventListener("click", loadWorkouts);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    preferredStudentId = getInitialStudentId();
    setWorkoutEditorMode("create");
    await loadWorkouts();
  }

  boot();
})();
