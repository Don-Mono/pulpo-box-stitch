(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentFilter = document.querySelector("#studentFilter");
  const consentStatus = document.querySelector("#consentStatus");
  const medicalForm = document.querySelector("#medicalForm");
  const medicalStatus = document.querySelector("#medicalStatus");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;

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

  function renderConsent(consent) {
    if (!consent) {
      consentStatus.textContent = "Consentimiento pendiente.";
      consentStatus.className = "";
      return;
    }

    const date = new Date(consent).toLocaleDateString("es-CL");
    consentStatus.textContent = `Consentimiento registrado el ${date}.`;
    consentStatus.className = "is-ok";
  }

  function renderNotes(notes) {
    if (!notes.length) {
      medicalNotesList.innerHTML = '<p class="muted">Todavia no hay notas sensibles registradas.</p>';
      return;
    }

    medicalNotesList.innerHTML = notes.map((note) => {
      const date = note.created_at ? new Date(note.created_at).toLocaleDateString("es-CL") : "Sin fecha";
      return `
        <article class="mini-list-item">
          <strong>${escapeHtml(note.note_type)} - ${escapeHtml(date)}</strong>
          <span>${escapeHtml(note.description)}</span>
          <small>${note.visible_to_coach ? "Visible para coach autorizado en el futuro" : "Solo admin por ahora"}</small>
        </article>
      `;
    }).join("");
  }

  async function loadMedical(preferredStudentId = studentFilter.value) {
    setupMessage.textContent = "Revisando datos sensibles...";

    try {
      const url = preferredStudentId
        ? `/api/admin/medical?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/medical";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar datos medicos.");

      setupRequired = Boolean(payload.setupRequired);
      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Usa este espacio solo con consentimiento y datos necesarios.";
      const selectedStudentId = payload.selectedStudentId || preferredStudentId || "";
      renderStudents(payload.students || [], selectedStudentId);
      renderConsent(payload.consent);
      renderNotes(payload.notes || []);
      syncUrl(selectedStudentId);
    } catch (error) {
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderConsent(null);
      renderNotes([]);
    }
  }

  async function createMedicalNote(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(medicalStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const studentId = studentFilter.value;
    if (!studentId) {
      setStatus(medicalStatus, "Selecciona un alumno antes de guardar.", "error");
      return;
    }

    setStatus(medicalStatus, "Guardando nota sensible...");
    const formData = new FormData(medicalForm);
    const body = Object.fromEntries(formData.entries());
    body.student_id = studentId;
    body.visible_to_coach = formData.has("visible_to_coach");
    body.consent_confirmed = formData.has("consent_confirmed");

    try {
      const response = await fetch("/api/admin/medical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la nota.");
      medicalForm.reset();
      setStatus(medicalStatus, payload.message, "ok");
      await loadMedical(studentId);
    } catch (error) {
      setStatus(medicalStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => loadMedical(studentFilter.value));
  medicalForm.addEventListener("submit", createMedicalNote);
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadMedical(getInitialStudentId());
  }

  boot();
})();
