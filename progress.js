(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentFilter = document.querySelector("#studentFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const measurementForm = document.querySelector("#measurementForm");
  const measurementStatus = document.querySelector("#measurementStatus");
  const measurementEditorMode = document.querySelector("#measurementEditorMode");
  const measurementFormTitle = document.querySelector("#measurementFormTitle");
  const measurementFormCopy = document.querySelector("#measurementFormCopy");
  const saveMeasurementButton = document.querySelector("#saveMeasurementButton");
  const cancelMeasurementEditButton = document.querySelector("#cancelMeasurementEditButton");
  const measurementsList = document.querySelector("#measurementsList");
  const weightTrendChart = document.querySelector("#weightTrendChart");
  const waistTrendChart = document.querySelector("#waistTrendChart");
  const weightTrendMeta = document.querySelector("#weightTrendMeta");
  const waistTrendMeta = document.querySelector("#waistTrendMeta");
  const workoutFilter = document.querySelector("#workoutFilter");
  const exerciseFilter = document.querySelector("#exerciseFilter");
  const resultsFilterHint = document.querySelector("#resultsFilterHint");
  const resultsSummaryGrid = document.querySelector("#resultsSummaryGrid");
  const performanceTrendHint = document.querySelector("#performanceTrendHint");
  const performanceTrendGrid = document.querySelector("#performanceTrendGrid");
  const personalBestsList = document.querySelector("#personalBestsList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentMeasurements = [];
  let currentResults = [];
  let currentSummary = null;
  let measurementById = new Map();
  let editingMeasurementId = "";

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

  function setMeasurementEditorMode(mode, measurement = null) {
    const isEditing = mode === "edit";
    editingMeasurementId = isEditing ? measurement?.id || "" : "";
    measurementEditorMode.classList.toggle("hidden", !isEditing);
    measurementEditorMode.textContent = isEditing ? "Edicion" : "Creacion";
    measurementFormTitle.textContent = isEditing ? "Editar medicion" : "Nueva medicion";
    measurementFormCopy.textContent = isEditing
      ? "Corrige medidas o contexto de una medicion ya registrada sin perder el historial."
      : "Registra medidas simples para empezar a construir el historial fisico.";
    saveMeasurementButton.textContent = isEditing ? "Guardar cambios" : "Guardar medicion";
    cancelMeasurementEditButton.classList.toggle("hidden", !isEditing);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value).toFixed(1));
  }

  function formatMetric(value, unit) {
    return value == null ? "--" : `${formatNumber(value)} ${unit}`.trim();
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
  }

  function getTrendDeltaLabel(delta, unit) {
    if (!Number.isFinite(delta)) return "--";
    const prefix = delta > 0 ? "+" : "";
    return `${prefix}${formatNumber(delta)} ${unit}`.trim();
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

  function renderStudents(students, selectedStudentId) {
    const options = ['<option value="">Seleccionar alumno</option>'];
    students.forEach((student) => {
      const selected = student.id === selectedStudentId ? " selected" : "";
      options.push(`<option value="${escapeHtml(student.id)}"${selected}>${escapeHtml(student.full_name)}</option>`);
    });
    studentFilter.innerHTML = options.join("");
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
      ["Mejor carga", formatMetric(summary?.best_weight_kg, "kg")],
      ["Registros", summary ? `${summary.result_count || 0} marcas` : "--"],
    ];

    summaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderMeasurements(measurements) {
    measurementById = new Map(measurements.map((measurement) => [measurement.id, measurement]));

    if (!measurements.length) {
      measurementsList.innerHTML = '<p class="muted">Todavia no hay mediciones.</p>';
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
        <article class="mini-list-item action-list-item">
          <div>
            <strong>${escapeHtml(date)}</strong>
            <span>${escapeHtml(values)}</span>
            <small>${escapeHtml(measurement.notes || "")}</small>
          </div>
          <div class="detail-action-group">
            <button class="button ghost compact-button" data-measurement-edit="${escapeHtml(measurement.id)}" type="button">Editar</button>
            <button class="button ghost compact-button" data-measurement-delete="${escapeHtml(measurement.id)}" type="button">Eliminar</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderMeasurementTrend(container, metaElement, measurements, config) {
    const entries = [...measurements]
      .filter((measurement) => measurement[config.key] != null)
      .reverse();

    if (entries.length < 2) {
      metaElement.textContent = "Se necesitan al menos 2 mediciones.";
      container.innerHTML = '<p class="muted">Todavia no hay suficientes datos para graficar esta tendencia.</p>';
      return;
    }

    const width = 640;
    const height = 220;
    const paddingX = 24;
    const paddingTop = 22;
    const paddingBottom = 34;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingTop - paddingBottom;
    const values = entries.map((entry) => Number(entry[config.key]));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = maxValue - minValue || 1;
    const minRange = minValue - spread * 0.15;
    const maxRange = maxValue + spread * 0.15;

    const points = entries.map((entry, index) => {
      const x = paddingX + (usableWidth * index) / Math.max(entries.length - 1, 1);
      const normalized = (Number(entry[config.key]) - minRange) / Math.max(maxRange - minRange, 1);
      const y = height - paddingBottom - normalized * usableHeight;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        value: Number(entry[config.key]),
        date: formatDate(entry.measured_at),
      };
    });

    const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints = [
      `${points[0].x},${height - paddingBottom}`,
      ...points.map((point) => `${point.x},${point.y}`),
      `${points[points.length - 1].x},${height - paddingBottom}`,
    ].join(" ");
    const baselineY = height - paddingBottom;
    const startLabel = points[0];
    const endLabel = points[points.length - 1];
    const delta = endLabel.value - startLabel.value;
    const deltaPrefix = delta > 0 ? "+" : "";

    metaElement.textContent = `${entries.length} mediciones | ${deltaPrefix}${formatNumber(delta)} ${config.unit}`;
    container.innerHTML = `
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(config.label)}">
        <line class="trend-axis" x1="${paddingX}" y1="${baselineY}" x2="${width - paddingX}" y2="${baselineY}"></line>
        <polygon class="trend-area" points="${areaPoints}" fill="${config.areaColor}"></polygon>
        <polyline class="trend-line" points="${polylinePoints}" stroke="${config.color}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${config.color}"></circle>`).join("")}
        <text class="trend-label trend-label-start" x="${paddingX}" y="${height - 8}">${escapeHtml(startLabel.date)}</text>
        <text class="trend-label trend-label-end" x="${width - paddingX}" y="${height - 8}" text-anchor="end">${escapeHtml(endLabel.date)}</text>
        <text class="trend-value" x="${points[0].x}" y="${Math.max(points[0].y - 12, 14)}">${escapeHtml(`${formatNumber(startLabel.value)} ${config.unit}`)}</text>
        <text class="trend-value" x="${points[points.length - 1].x}" y="${Math.max(points[points.length - 1].y - 12, 14)}" text-anchor="end">${escapeHtml(`${formatNumber(endLabel.value)} ${config.unit}`)}</text>
      </svg>
    `;
  }

  function renderMeasurementCharts(measurements) {
    renderMeasurementTrend(weightTrendChart, weightTrendMeta, measurements, {
      key: "body_weight_kg",
      label: "Grafico de peso corporal",
      unit: "kg",
      color: "#19d0d8",
      areaColor: "rgba(25, 208, 216, 0.18)",
    });
    renderMeasurementTrend(waistTrendChart, waistTrendMeta, measurements, {
      key: "waist_cm",
      label: "Grafico de cintura",
      unit: "cm",
      color: "#d7ff18",
      areaColor: "rgba(215, 255, 24, 0.18)",
    });
  }

  function resetMeasurementForm() {
    measurementForm.reset();
    setMeasurementEditorMode("create");
  }

  function populateMeasurementForm(measurementId) {
    const measurement = measurementById.get(measurementId);
    if (!measurement) {
      setStatus(measurementStatus, "No encontramos la medicion a editar.", "error");
      return;
    }

    setMeasurementEditorMode("edit", measurement);
    measurementForm.body_weight_kg.value = measurement.body_weight_kg ?? "";
    measurementForm.height_cm.value = measurement.height_cm ?? "";
    measurementForm.waist_cm.value = measurement.waist_cm ?? "";
    measurementForm.chest_cm.value = measurement.chest_cm ?? "";
    measurementForm.hip_cm.value = measurement.hip_cm ?? "";
    measurementForm.notes.value = measurement.notes || "";
    setStatus(measurementStatus, `Editando medicion del ${formatDate(measurement.measured_at)}.`, "ok");
    measurementForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function collectWorkoutOptions() {
    const workoutMap = new Map();

    currentResults.forEach((result) => {
      if (result.workout_id && !workoutMap.has(result.workout_id)) {
        workoutMap.set(result.workout_id, result.workout_title || "Rutina");
      }
    });

    return [...workoutMap.entries()].map(([id, title]) => ({ id, title }));
  }

  function collectExerciseOptions(selectedWorkoutId) {
    const exerciseMap = new Map();

    currentResults.forEach((result) => {
      if (selectedWorkoutId && result.workout_id !== selectedWorkoutId) return;
      if (result.exercise_id && !exerciseMap.has(result.exercise_id)) {
        exerciseMap.set(result.exercise_id, result.exercise_name || "Ejercicio");
      }
    });

    return [...exerciseMap.entries()].map(([id, name]) => ({ id, name }));
  }

  function getFilteredResults() {
    const selectedWorkoutId = workoutFilter.value;
    const selectedExerciseId = exerciseFilter.value;

    return currentResults.filter((result) => {
      if (selectedWorkoutId && result.workout_id !== selectedWorkoutId) return false;
      if (selectedExerciseId && result.exercise_id !== selectedExerciseId) return false;
      return true;
    });
  }

  function renderResultsSummary(filteredResults) {
    const latestResult = filteredResults[0] || null;
    const bestWeight = filteredResults
      .map((result) => result.weight_kg)
      .filter((value) => value != null)
      .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);
    const bestReps = filteredResults
      .map((result) => result.reps)
      .filter((value) => value != null)
      .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);

    const values = [
      ["Registros", String(filteredResults.length)],
      ["Ultimo registro", latestResult ? formatDate(latestResult.logged_at) : "--"],
      ["Mejor carga", Number.isFinite(bestWeight) ? `${formatNumber(bestWeight)} kg` : "--"],
      ["Mayor reps", Number.isFinite(bestReps) ? String(bestReps) : "--"],
    ];

    resultsSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderPersonalBests(filteredResults) {
    if (!filteredResults.length) {
      personalBestsList.innerHTML = '<p class="muted">No hay mejores marcas para este filtro.</p>';
      return;
    }

    const bestByExercise = new Map();
    filteredResults.forEach((result) => {
      const key = result.exercise_id || `${result.workout_id || "sin-rutina"}:${result.exercise_name || "sin-ejercicio"}`;
      const current = bestByExercise.get(key);
      const candidateWeight = result.weight_kg ?? Number.NEGATIVE_INFINITY;
      const currentWeight = current?.weight_kg ?? Number.NEGATIVE_INFINITY;
      const candidateReps = result.reps ?? Number.NEGATIVE_INFINITY;
      const currentReps = current?.reps ?? Number.NEGATIVE_INFINITY;
      const shouldReplace = !current
        || candidateWeight > currentWeight
        || (candidateWeight === currentWeight && candidateReps > currentReps)
        || (candidateWeight === currentWeight && candidateReps === currentReps && (result.logged_at || "") > (current.logged_at || ""));

      if (shouldReplace) bestByExercise.set(key, result);
    });

    const entries = [...bestByExercise.values()]
      .sort((left, right) => (right.weight_kg || 0) - (left.weight_kg || 0) || (right.reps || 0) - (left.reps || 0))
      .slice(0, 8);

    personalBestsList.innerHTML = entries.map((result) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(result.exercise_name || "Ejercicio")}</strong>
        <span>${escapeHtml(formatMark(result))}</span>
        <small>${escapeHtml(`${result.workout_title || "Sin rutina"} | ${formatDate(result.logged_at)}`)}</small>
      </article>
    `).join("");
  }

  function buildResultTrendCard(filteredResults, config) {
    const entries = [...filteredResults]
      .filter((result) => result[config.key] != null)
      .reverse()
      .map((result) => ({
        value: Number(result[config.key]),
        date: formatDate(result.logged_at),
      }))
      .filter((entry) => Number.isFinite(entry.value));

    if (entries.length < 2) return "";

    const width = 640;
    const height = 220;
    const paddingX = 24;
    const paddingTop = 22;
    const paddingBottom = 34;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingTop - paddingBottom;
    const values = entries.map((entry) => entry.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = maxValue - minValue || 1;
    const minRange = minValue - spread * 0.15;
    const maxRange = maxValue + spread * 0.15;

    const points = entries.map((entry, index) => {
      const x = paddingX + (usableWidth * index) / Math.max(entries.length - 1, 1);
      const normalized = (entry.value - minRange) / Math.max(maxRange - minRange, 1);
      const y = height - paddingBottom - normalized * usableHeight;
      return {
        ...entry,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });

    const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints = [
      `${points[0].x},${height - paddingBottom}`,
      ...points.map((point) => `${point.x},${point.y}`),
      `${points[points.length - 1].x},${height - paddingBottom}`,
    ].join(" ");
    const baselineY = height - paddingBottom;
    const startLabel = points[0];
    const endLabel = points[points.length - 1];
    const delta = endLabel.value - startLabel.value;

    return `
      <article class="trend-card">
        <div class="trend-header">
          <strong>${escapeHtml(config.title)}</strong>
          <small>${escapeHtml(`${entries.length} registros | ${getTrendDeltaLabel(delta, config.unit)}`)}</small>
        </div>
        <div class="trend-chart">
          <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(config.label)}">
            <line class="trend-axis" x1="${paddingX}" y1="${baselineY}" x2="${width - paddingX}" y2="${baselineY}"></line>
            <polygon class="trend-area" points="${areaPoints}" fill="${config.areaColor}"></polygon>
            <polyline class="trend-line" points="${polylinePoints}" stroke="${config.color}"></polyline>
            ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${config.color}"></circle>`).join("")}
            <text class="trend-label trend-label-start" x="${paddingX}" y="${height - 8}">${escapeHtml(startLabel.date)}</text>
            <text class="trend-label trend-label-end" x="${width - paddingX}" y="${height - 8}" text-anchor="end">${escapeHtml(endLabel.date)}</text>
            <text class="trend-value" x="${points[0].x}" y="${Math.max(points[0].y - 12, 14)}">${escapeHtml(`${formatNumber(startLabel.value)} ${config.unit}`)}</text>
            <text class="trend-value" x="${points[points.length - 1].x}" y="${Math.max(points[points.length - 1].y - 12, 14)}" text-anchor="end">${escapeHtml(`${formatNumber(endLabel.value)} ${config.unit}`)}</text>
          </svg>
        </div>
      </article>
    `;
  }

  function renderPerformanceTrendCharts(filteredResults) {
    if (!filteredResults.length) {
      performanceTrendHint.textContent = "Filtra por rutina o ejercicio para leer la evolucion de las marcas.";
      performanceTrendGrid.innerHTML = `
        <article class="trend-card trend-card-empty">
          <div class="trend-chart">
            <p class="muted">Todavia no hay registros suficientes para mostrar una curva de rendimiento.</p>
          </div>
        </article>
      `;
      return;
    }

    const distinctExercises = [...new Set(filteredResults.map((result) => result.exercise_name || "Ejercicio"))];
    const chartConfigs = [
      {
        key: "weight_kg",
        title: "Carga utilizada",
        label: "Grafico de evolucion de carga",
        unit: "kg",
        color: "#19d0d8",
        areaColor: "rgba(25, 208, 216, 0.18)",
      },
      {
        key: "reps",
        title: "Repeticiones",
        label: "Grafico de evolucion de repeticiones",
        unit: "reps",
        color: "#d7ff18",
        areaColor: "rgba(215, 255, 24, 0.18)",
      },
      {
        key: "time_seconds",
        title: "Tiempo",
        label: "Grafico de evolucion de tiempo",
        unit: "seg",
        color: "#7cddff",
        areaColor: "rgba(124, 221, 255, 0.2)",
      },
    ];

    const cards = chartConfigs
      .map((config) => buildResultTrendCard(filteredResults, config))
      .filter(Boolean);

    if (!cards.length) {
      performanceTrendHint.textContent = "Se necesitan al menos 2 marcas comparables del mismo tipo para dibujar una curva.";
      performanceTrendGrid.innerHTML = `
        <article class="trend-card trend-card-empty">
          <div class="trend-chart">
            <p class="muted">Las marcas visibles aun no tienen suficientes datos comparables para graficar carga, repeticiones o tiempo.</p>
          </div>
        </article>
      `;
      return;
    }

    if (exerciseFilter.value || distinctExercises.length === 1) {
      performanceTrendHint.textContent = `Lectura enfocada en ${distinctExercises[0] || "el ejercicio seleccionado"}.`;
    } else {
      performanceTrendHint.textContent = `${filteredResults.length} registros visibles | mezcla ${distinctExercises.length} ejercicios. Si quieres una curva mas precisa, filtra por un ejercicio.`;
    }

    performanceTrendGrid.innerHTML = cards.join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">Todavia no hay marcas para este alumno.</td></tr>';
      return;
    }

    resultsBody.innerHTML = results.map((result) => {
      const notes = [result.student_notes, result.coach_notes].filter(Boolean).join(" | ") || "Sin notas";

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

  function refreshResultsView() {
    const filteredResults = getFilteredResults();
    const selectedWorkoutLabel = workoutFilter.options[workoutFilter.selectedIndex]?.text || "Todas las rutinas";
    const selectedExerciseLabel = exerciseFilter.options[exerciseFilter.selectedIndex]?.text || "Todos los ejercicios";

    resultsFilterHint.textContent = workoutFilter.value || exerciseFilter.value
      ? `${filteredResults.length} registro(s) para ${selectedWorkoutLabel} / ${selectedExerciseLabel}.`
      : "Filtra por rutina o ejercicio para revisar una tendencia puntual.";

    renderResultsSummary(filteredResults);
    renderPerformanceTrendCharts(filteredResults);
    renderPersonalBests(filteredResults);
    renderResults(filteredResults);
  }

  function syncResultFilters() {
    const previousWorkoutId = workoutFilter.value;
    const workoutOptions = collectWorkoutOptions();

    workoutFilter.innerHTML = [
      '<option value="">Todas las rutinas</option>',
      ...workoutOptions.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(workout.title)}</option>`),
    ].join("");

    if (workoutOptions.some((workout) => workout.id === previousWorkoutId)) {
      workoutFilter.value = previousWorkoutId;
    }

    const previousExerciseId = exerciseFilter.value;
    const exerciseOptions = collectExerciseOptions(workoutFilter.value);

    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");

    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseFilter.value = previousExerciseId;
    }

    refreshResultsView();
  }

  async function loadProgress(preferredStudentId = studentFilter.value) {
    setupMessage.textContent = "Revisando progreso...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
      const url = preferredStudentId
        ? `/api/admin/progress?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/progress";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar progreso.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Puedes registrar mediciones y revisar el historial.";
      const selectedStudentId = payload.selectedStudentId || preferredStudentId || "";
      currentMeasurements = payload.measurements || [];
      currentResults = payload.results || [];
      currentSummary = payload.summary || null;
      renderStudents(payload.students || [], selectedStudentId);
      renderSummary(currentSummary, currentMeasurements);
      renderMeasurements(currentMeasurements);
      renderMeasurementCharts(currentMeasurements);
      if (editingMeasurementId && !measurementById.has(editingMeasurementId)) {
        resetMeasurementForm();
      }
      syncResultFilters();
      syncUrl(selectedStudentId);
    } catch (error) {
      setupMessage.textContent = error.message;
      currentMeasurements = [];
      currentResults = [];
      currentSummary = null;
      measurementById = new Map();
      renderStudents([], "");
      renderSummary(null, []);
      renderMeasurements([]);
      renderMeasurementCharts([]);
      workoutFilter.innerHTML = '<option value="">Todas las rutinas</option>';
      exerciseFilter.innerHTML = '<option value="">Todos los ejercicios</option>';
      resultsFilterHint.textContent = "Filtra por rutina o ejercicio para revisar una tendencia puntual.";
      renderResultsSummary([]);
      renderPerformanceTrendCharts([]);
      renderPersonalBests([]);
      resultsBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function saveMeasurement(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(measurementStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const studentId = studentFilter.value;
    if (!studentId) {
      setStatus(measurementStatus, "Selecciona un alumno antes de guardar.", "error");
      return;
    }

    setStatus(measurementStatus, "Guardando medicion...");
    const formData = new FormData(measurementForm);
    const body = Object.fromEntries(formData.entries());
    body.student_id = studentId;
    if (editingMeasurementId) {
      body.measurement_id = editingMeasurementId;
    }

    try {
      const response = await fetch("/api/admin/progress", {
        method: editingMeasurementId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la medicion.");
      resetMeasurementForm();
      setStatus(measurementStatus, payload.message, "ok");
      await loadProgress(studentId);
    } catch (error) {
      setStatus(measurementStatus, error.message, "error");
    }
  }

  async function deleteMeasurement(measurementId) {
    if (!measurementId) return;
    const measurement = measurementById.get(measurementId);
    const confirmationLabel = measurement?.measured_at
      ? `la medicion del ${formatDate(measurement.measured_at)}`
      : "esta medicion";
    if (!window.confirm(`Se eliminara ${confirmationLabel}. Esta accion no se puede deshacer.`)) {
      return;
    }

    setStatus(measurementStatus, "Eliminando medicion...");
    try {
      const response = await fetch("/api/admin/progress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measurement_id: measurementId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo eliminar la medicion.");
      const selectedStudentId = studentFilter.value;
      if (editingMeasurementId === measurementId) resetMeasurementForm();
      setStatus(measurementStatus, payload.message, "ok");
      await loadProgress(selectedStudentId);
    } catch (error) {
      setStatus(measurementStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => {
    workoutFilter.value = "";
    exerciseFilter.value = "";
    loadProgress(studentFilter.value);
  });
  workoutFilter.addEventListener("change", () => {
    const previousExerciseId = exerciseFilter.value;
    const exerciseOptions = collectExerciseOptions(workoutFilter.value);
    exerciseFilter.innerHTML = [
      '<option value="">Todos los ejercicios</option>',
      ...exerciseOptions.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`),
    ].join("");
    if (exerciseOptions.some((exercise) => exercise.id === previousExerciseId)) {
      exerciseFilter.value = previousExerciseId;
    }
    refreshResultsView();
  });
  exerciseFilter.addEventListener("change", refreshResultsView);
  measurementForm.addEventListener("submit", saveMeasurement);
  measurementsList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-measurement-edit]");
    if (editButton) {
      populateMeasurementForm(editButton.dataset.measurementEdit);
      return;
    }

    const deleteButton = event.target.closest("[data-measurement-delete]");
    if (deleteButton) {
      deleteMeasurement(deleteButton.dataset.measurementDelete);
    }
  });
  cancelMeasurementEditButton.addEventListener("click", () => {
    resetMeasurementForm();
    setStatus(measurementStatus, "Edicion cancelada.", "ok");
  });
  refreshButton.addEventListener("click", () => loadProgress(studentFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    setMeasurementEditorMode("create");
    await loadProgress(getInitialStudentId());
  }

  boot();
})();
