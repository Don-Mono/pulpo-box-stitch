(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentFilter = document.querySelector("#studentFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const measurementForm = document.querySelector("#measurementForm");
  const measurementStatus = document.querySelector("#measurementStatus");
  const measurementsList = document.querySelector("#measurementsList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

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

  function renderStudents(students, selectedStudentId) {
    const options = ['<option value="">Seleccionar alumno</option>'];
    students.forEach((student) => {
      const selected = student.id === selectedStudentId ? " selected" : "";
      options.push(`<option value="${escapeHtml(student.id)}"${selected}>${escapeHtml(student.full_name)}</option>`);
    });
    studentFilter.innerHTML = options.join("");
  }

  function renderSummary(summary) {
    const values = [
      ["Peso actual", summary?.latest_weight_kg ? `${summary.latest_weight_kg} kg` : "--"],
      ["Estatura", summary?.latest_height_cm ? `${summary.latest_height_cm} cm` : "--"],
      ["Cintura", summary?.latest_waist_cm ? `${summary.latest_waist_cm} cm` : "--"],
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
        <article class="mini-list-item">
          <strong>${escapeHtml(date)}</strong>
          <span>${escapeHtml(values)}</span>
          <small>${escapeHtml(measurement.notes || "")}</small>
        </article>
      `;
    }).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="3">Todavia no hay marcas para este alumno.</td></tr>';
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

  async function loadProgress(preferredStudentId = studentFilter.value) {
    setupMessage.textContent = "Revisando progreso...";
    resultsBody.innerHTML = '<tr><td colspan="3">Cargando marcas...</td></tr>';

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
      renderStudents(payload.students || [], payload.selectedStudentId || preferredStudentId);
      renderSummary(payload.summary);
      renderMeasurements(payload.measurements || []);
      renderResults(payload.results || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderSummary(null);
      renderMeasurements([]);
      resultsBody.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function createMeasurement(event) {
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

    try {
      const response = await fetch("/api/admin/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la medicion.");
      measurementForm.reset();
      setStatus(measurementStatus, payload.message, "ok");
      await loadProgress(studentId);
    } catch (error) {
      setStatus(measurementStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => loadProgress(studentFilter.value));
  measurementForm.addEventListener("submit", createMeasurement);
  refreshButton.addEventListener("click", () => loadProgress(studentFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadProgress("");
  }

  boot();
})();
