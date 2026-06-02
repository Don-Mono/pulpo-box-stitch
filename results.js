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
  const resultFormTitle = document.querySelector("#resultFormTitle");
  const resultFormCopy = document.querySelector("#resultFormCopy");
  const resultEditorMode = document.querySelector("#resultEditorMode");
  const saveResultButton = document.querySelector("#saveResultButton");
  const cancelResultEditButton = document.querySelector("#cancelResultEditButton");
  const pageSizeSelect = document.querySelector("#page_size");
  const paginationStatus = document.querySelector("#paginationStatus");
  const previousPageButton = document.querySelector("#previousPageButton");
  const nextPageButton = document.querySelector("#nextPageButton");

  let setupRequired = false;
  let workoutExerciseMap = new Map();
  let currentResults = [];
  let resultById = new Map();
  let editingResultId = "";
  let currentPage = 1;
  let currentPageSize = Number(pageSizeSelect?.value || 25);
  let totalPages = 1;
  let totalResults = 0;

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
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("page_size", String(currentPageSize));
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL sync errors in constrained environments.
    }
  }

  function getInitialPage() {
    try {
      const page = Number(new URLSearchParams(window.location.search).get("page") || "1");
      return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    } catch {
      return 1;
    }
  }

  function getInitialPageSize() {
    try {
      const pageSize = Number(new URLSearchParams(window.location.search).get("page_size") || String(currentPageSize));
      if ([25, 50, 100].includes(pageSize)) return pageSize;
      return currentPageSize;
    } catch {
      return currentPageSize;
    }
  }

  function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status ${type}`.trim();
  }

  function setResultEditorMode(mode, result = null) {
    const isEditing = mode === "edit";
    editingResultId = isEditing ? result?.id || "" : "";
    resultEditorMode.classList.toggle("hidden", !isEditing);
    resultEditorMode.textContent = isEditing ? "Edicion" : "Creacion";
    resultFormTitle.textContent = isEditing ? "Editar resultado" : "Nuevo resultado";
    resultFormCopy.textContent = isEditing
      ? "Ajusta alumno, rutina, ejercicio y marca sin perder el historial operativo."
      : "Este registro luego lo usaremos para graficos, marcas personales y seguimiento por ejercicio.";
    saveResultButton.textContent = isEditing ? "Guardar cambios" : "Guardar resultado";
    cancelResultEditButton.classList.toggle("hidden", !isEditing);
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
    const previousExerciseId = exerciseSelect.value;

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

    if (exercises.some((exercise) => exercise.exercise_id === previousExerciseId)) {
      exerciseSelect.value = previousExerciseId;
    }

    exerciseHint.textContent = `${exercises.length} ejercicio(s) disponibles para esta rutina.`;
  }

  function renderEmpty(message) {
    currentResults = [];
    resultById = new Map();
    resultsBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
    paginationStatus.textContent = message;
    previousPageButton.disabled = true;
    nextPageButton.disabled = true;
  }

  function resetResultForm() {
    const preservedStudentId = studentSelect.value || getInitialStudentId();
    resultForm.reset();
    studentSelect.value = preservedStudentId;
    workoutSelect.value = "";
    syncExerciseOptions();
    setResultEditorMode("create");
  }

  function populateResultForm(resultId) {
    const result = resultById.get(resultId);
    if (!result) {
      setStatus(resultStatus, "No encontramos el resultado a editar.", "error");
      return;
    }

    setResultEditorMode("edit", result);
    studentSelect.value = result.student_id || "";
    workoutSelect.value = result.workout_id || "";
    syncExerciseOptions();
    exerciseSelect.value = result.exercise_id || "";
    resultForm.weight_kg.value = result.weight_kg ?? "";
    resultForm.reps.value = result.reps ?? "";
    resultForm.rounds.value = result.rounds ?? "";
    resultForm.time_seconds.value = result.time_seconds ?? "";
    resultForm.score_text.value = result.score_text || "";
    resultForm.student_notes.value = result.student_notes || "";
    resultForm.coach_notes.value = result.coach_notes || "";
    setStatus(resultStatus, `Editando resultado de ${result.student_name}.`, "ok");
    resultForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResults(results) {
    currentResults = results;
    resultById = new Map(results.map((result) => [result.id, result]));

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
          <td>
            <div class="detail-action-group">
              <button class="button ghost compact-button" data-result-edit="${escapeHtml(result.id)}" type="button">Editar</button>
              <button class="button ghost compact-button" data-result-delete="${escapeHtml(result.id)}" type="button">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderPagination(pagination) {
    totalPages = Math.max(Number(pagination?.totalPages || 1), 1);
    totalResults = Math.max(Number(pagination?.total || 0), 0);
    currentPage = Math.min(Math.max(Number(pagination?.page || 1), 1), totalPages);
    currentPageSize = Number(pagination?.pageSize || currentPageSize || 25);
    pageSizeSelect.value = String(currentPageSize);

    const start = totalResults ? ((currentPage - 1) * currentPageSize) + 1 : 0;
    const end = Math.min(currentPage * currentPageSize, totalResults);
    paginationStatus.textContent = totalResults
      ? `Mostrando ${start}-${end} de ${totalResults} resultado(s) · Pagina ${currentPage} de ${totalPages}`
      : "Sin resultados para este filtro.";
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  }

  async function loadResults(preferredStudentId = studentSelect.value || getInitialStudentId()) {
    renderEmpty("Cargando resultados...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (preferredStudentId) params.set("student_id", preferredStudentId);
      const url = `/api/admin/results?${params.toString()}`;
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
      renderPagination(payload.pagination || {});
      if (editingResultId && !resultById.has(editingResultId)) {
        resetResultForm();
      }
      syncUrl(studentSelect.value);
    } catch (error) {
      setupMessage.textContent = error.message;
      fillSelect(studentSelect, "Seleccionar alumno", [], "full_name");
      fillSelect(workoutSelect, "Sin rutina", [], "title");
      fillSelect(exerciseSelect, "Sin ejercicio", [], "name");
      workoutExerciseMap = new Map();
      currentResults = [];
      resultById = new Map();
      exerciseHint.textContent = error.message;
      totalPages = 1;
      totalResults = 0;
      renderEmpty(error.message);
    }
  }

  async function createResult(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(resultStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(resultStatus, editingResultId ? "Guardando cambios..." : "Guardando resultado...");
    const formData = new FormData(resultForm);
    const body = Object.fromEntries(formData.entries());
    if (editingResultId) {
      body.result_id = editingResultId;
    }

    try {
      const response = await fetch("/api/admin/results", {
        method: editingResultId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar el resultado.");
      const selectedStudentId = studentSelect.value;
      currentPage = 1;
      resetResultForm();
      studentSelect.value = selectedStudentId;
      setStatus(resultStatus, payload.message, "ok");
      await loadResults(selectedStudentId);
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  async function deleteResult(resultId) {
    if (!resultId) return;
    const result = resultById.get(resultId);
    if (!window.confirm(`Se eliminara el resultado de ${result?.student_name || "este alumno"} del ${result?.logged_at ? new Date(result.logged_at).toLocaleDateString("es-CL") : "registro seleccionado"}. Esta accion no se puede deshacer.`)) {
      return;
    }

    setStatus(resultStatus, "Eliminando resultado...");
    try {
      const response = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo eliminar el resultado.");
      const selectedStudentId = studentSelect.value;
      if (editingResultId === resultId) resetResultForm();
      if (currentPage > 1 && currentResults.length === 1) {
        currentPage -= 1;
      }
      setStatus(resultStatus, payload.message, "ok");
      await loadResults(selectedStudentId);
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  resultForm.addEventListener("submit", createResult);
  workoutSelect.addEventListener("change", syncExerciseOptions);
  studentSelect.addEventListener("change", () => {
    currentPage = 1;
    loadResults(studentSelect.value);
  });
  resultsBody.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-result-edit]");
    if (editButton) {
      populateResultForm(editButton.dataset.resultEdit);
      return;
    }

    const deleteButton = event.target.closest("[data-result-delete]");
    if (deleteButton) {
      deleteResult(deleteButton.dataset.resultDelete);
    }
  });
  cancelResultEditButton.addEventListener("click", () => {
    resetResultForm();
    setStatus(resultStatus, "Edicion cancelada.", "ok");
  });
  refreshButton.addEventListener("click", () => loadResults(studentSelect.value));
  pageSizeSelect.addEventListener("change", () => {
    currentPageSize = Number(pageSizeSelect.value || 25);
    currentPage = 1;
    loadResults(studentSelect.value);
  });
  previousPageButton.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    loadResults(studentSelect.value);
  });
  nextPageButton.addEventListener("click", () => {
    if (currentPage >= totalPages) return;
    currentPage += 1;
    loadResults(studentSelect.value);
  });
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    currentPage = getInitialPage();
    currentPageSize = getInitialPageSize();
    pageSizeSelect.value = String(currentPageSize);
    setResultEditorMode("create");
    await loadResults(getInitialStudentId());
  }

  boot();
})();
