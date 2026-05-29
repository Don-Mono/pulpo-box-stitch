(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const exerciseForm = document.querySelector("#exerciseForm");
  const exerciseStatus = document.querySelector("#exerciseStatus");
  const customExercisesList = document.querySelector("#customExercisesList");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");
  const baseCount = document.querySelector("#baseCount");
  const customCount = document.querySelector("#customCount");

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

  function renderCustomExercises(exercises) {
    if (!exercises.length) {
      customExercisesList.innerHTML = '<p class="muted">Aun no hay ejercicios personalizados.</p>';
      return;
    }

    customExercisesList.innerHTML = exercises.map((exercise) => {
      const details = [exercise.movement_type, exercise.description, exercise.video_url ? "Con video" : ""]
        .filter(Boolean)
        .join(" / ") || "Sin detalles adicionales";

      return `
        <article class="mini-list-item action-list-item">
          <div>
            <span>${escapeHtml(exercise.name)}</span>
            <small>${escapeHtml(details)}</small>
          </div>
          <button class="button ghost compact-button" data-delete-exercise="${escapeHtml(exercise.id)}" type="button">Desactivar</button>
        </article>
      `;
    }).join("");
  }

  async function loadExercises() {
    setupMessage.textContent = "Cargando biblioteca...";
    customExercisesList.innerHTML = '<p class="muted">Cargando ejercicios...</p>';

    try {
      const response = await fetch("/api/admin/exercises");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar biblioteca.");

      setupRequired = Boolean(payload.setupRequired);
      const exercises = payload.exercises || [];
      const baseExercises = exercises.filter((exercise) => exercise.source !== "supabase");
      const customExercises = exercises.filter((exercise) => exercise.source === "supabase");

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Biblioteca conectada. Puedes agregar o desactivar ejercicios personalizados.";
      baseCount.textContent = String(baseExercises.length);
      customCount.textContent = String(customExercises.length);
      renderCustomExercises(customExercises);
    } catch (error) {
      setupMessage.textContent = error.message;
      baseCount.textContent = "0";
      customCount.textContent = "0";
      renderCustomExercises([]);
    }
  }

  async function createExercise(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(exerciseStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(exerciseStatus, "Guardando ejercicio...");
    const body = Object.fromEntries(new FormData(exerciseForm).entries());

    try {
      const response = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar.");

      exerciseForm.reset();
      setStatus(exerciseStatus, payload.message, "ok");
      await loadExercises();
    } catch (error) {
      setStatus(exerciseStatus, error.message, "error");
    }
  }

  async function deleteExercise(id) {
    if (setupRequired) {
      setStatus(exerciseStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    setStatus(exerciseStatus, "Desactivando ejercicio...");

    try {
      const response = await fetch(`/api/admin/exercises?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo desactivar.");

      setStatus(exerciseStatus, payload.message, "ok");
      await loadExercises();
    } catch (error) {
      setStatus(exerciseStatus, error.message, "error");
    }
  }

  exerciseForm.addEventListener("submit", createExercise);
  customExercisesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-exercise]");
    if (!button) return;
    deleteExercise(button.dataset.deleteExercise);
  });
  refreshButton.addEventListener("click", loadExercises);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadExercises();
  }

  boot();
})();
