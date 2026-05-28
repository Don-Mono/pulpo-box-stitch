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

  function fillSelect(select, placeholder, options, labelKey) {
    const html = [`<option value="">${escapeHtml(placeholder)}</option>`];
    options.forEach((option) => {
      html.push(`<option value="${escapeHtml(option.id)}">${escapeHtml(option[labelKey])}</option>`);
    });
    select.innerHTML = html.join("");
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

  async function loadResults() {
    renderEmpty("Cargando resultados...");
    setupMessage.textContent = "Revisando tablas de gestion...";

    try {
      const response = await fetch("/api/admin/results");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar resultados.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Ya puedes registrar resultados cuando lo necesites.";
      fillSelect(studentSelect, "Seleccionar alumno", payload.students || [], "full_name");
      fillSelect(workoutSelect, "Sin rutina", payload.workouts || [], "title");
      fillSelect(exerciseSelect, "Sin ejercicio", payload.exercises || [], "name");
      renderResults(payload.results || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      fillSelect(studentSelect, "Seleccionar alumno", [], "full_name");
      fillSelect(workoutSelect, "Sin rutina", [], "title");
      fillSelect(exerciseSelect, "Sin ejercicio", [], "name");
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
      setStatus(resultStatus, payload.message, "ok");
      await loadResults();
    } catch (error) {
      setStatus(resultStatus, error.message, "error");
    }
  }

  resultForm.addEventListener("submit", createResult);
  refreshButton.addEventListener("click", loadResults);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadResults();
  }

  boot();
})();
