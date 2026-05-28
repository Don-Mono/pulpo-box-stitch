(function () {
  const coachTitle = document.querySelector("#coachTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const userEmail = document.querySelector("#userEmail");
  const studentsList = document.querySelector("#studentsList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
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
    coachTitle.textContent = payload.user.name ? `Hola, ${payload.user.name}` : "Mis alumnos";
    return payload.user;
  }

  function renderStudents(students) {
    if (!students.length) {
      studentsList.innerHTML = '<p class="muted">Aun no tienes alumnos asignados.</p>';
      return;
    }

    studentsList.innerHTML = students.map((student) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(student.full_name)}</strong>
        <span>${escapeHtml(student.goal || "Objetivo pendiente")}</span>
        <small>${escapeHtml([student.email, student.phone].filter(Boolean).join(" / ") || "Sin contacto")}</small>
      </article>
    `).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">Aun no hay marcas registradas para tus alumnos.</td></tr>';
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
          <td><strong>${escapeHtml(result.student_name)}</strong></td>
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

  async function loadOverview() {
    setupMessage.textContent = "Cargando alumnos asignados...";

    try {
      const response = await fetch("/api/coach/overview");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar tu panel.");

      setupMessage.textContent = payload.setupRequired
        ? payload.message
        : "Panel conectado. Estos datos corresponden solo a tus alumnos asignados.";
      renderStudents(payload.students || []);
      renderResults(payload.results || []);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([]);
      renderResults([]);
    }
  }

  refreshButton.addEventListener("click", loadOverview);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireCoachSession();
    if (!user) return;
    await loadOverview();
  }

  boot();
})();
