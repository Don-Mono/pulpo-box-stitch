(function () {
  const userEmail = document.querySelector("#userEmail");
  const setupMessage = document.querySelector("#setupMessage");
  const studentFilter = document.querySelector("#studentFilter");
  const consentStatus = document.querySelector("#consentStatus");
  const medicalSummaryGrid = document.querySelector("#medicalSummaryGrid");
  const studentProfileCard = document.querySelector("#studentProfileCard");
  const studentDetailLink = document.querySelector("#studentDetailLink");
  const safetyForm = document.querySelector("#safetyForm");
  const safetyStatus = document.querySelector("#safetyStatus");
  const medicalForm = document.querySelector("#medicalForm");
  const medicalStatus = document.querySelector("#medicalStatus");
  const noteTypeFilter = document.querySelector("#noteTypeFilter");
  const visibilityFilter = document.querySelector("#visibilityFilter");
  const notesFilterHint = document.querySelector("#notesFilterHint");
  const coachPreviewList = document.querySelector("#coachPreviewList");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentStudentId = "";
  let currentStudent = null;
  let currentNotes = [];
  let currentNoteTypes = [];

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

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString("es-CL") : "Sin fecha";
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

    consentStatus.textContent = `Consentimiento registrado el ${formatDate(consent)}.`;
    consentStatus.className = "is-ok";
  }

  function renderSummary(summary) {
    const values = [
      ["Notas", summary ? String(summary.total_notes || 0) : "--"],
      ["Coach visible", summary ? String(summary.coach_visible_notes || 0) : "--"],
      ["Solo admin", summary ? String(summary.admin_only_notes || 0) : "--"],
      ["Ultima nota", summary?.latest_note_at ? formatDate(summary.latest_note_at) : "--"],
    ];

    medicalSummaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderProfile(student) {
    if (!student) {
      studentProfileCard.innerHTML = '<p class="muted">Selecciona un alumno para revisar su contexto medico.</p>';
      studentDetailLink.href = "/student-detail.html";
      studentDetailLink.classList.add("is-disabled");
      studentDetailLink.setAttribute("aria-disabled", "true");
      return;
    }

    studentProfileCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(student.full_name || "Alumno")}</strong>
        <span>${escapeHtml(student.goal || "Objetivo pendiente")}</span>
        <small>${escapeHtml([student.email, student.phone].filter(Boolean).join(" / ") || "Sin contacto principal")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Coach y emergencia</strong>
        <span>${escapeHtml(student.primary_coach_name || "Sin coach principal")}</span>
        <small>${escapeHtml(
          [student.emergency_contact_name, student.emergency_contact_phone].filter(Boolean).join(" / ")
          || "Sin contacto de emergencia"
        )}</small>
      </article>
    `;

    studentDetailLink.href = `/student-detail.html?student_id=${encodeURIComponent(student.id)}`;
    studentDetailLink.classList.remove("is-disabled");
    studentDetailLink.removeAttribute("aria-disabled");
  }

  function renderSafetyForm(student) {
    safetyForm.emergency_contact_name.value = student?.emergency_contact_name || "";
    safetyForm.emergency_contact_phone.value = student?.emergency_contact_phone || "";
    safetyForm.register_consent.checked = false;
    safetyForm.register_consent.disabled = Boolean(student?.medical_consent_at);
  }

  function renderNoteTypeFilter(noteTypes) {
    const currentValue = noteTypeFilter.value;
    noteTypeFilter.innerHTML = [
      '<option value="">Todos</option>',
      ...noteTypes.map((noteType) => `<option value="${escapeHtml(noteType)}">${escapeHtml(noteType)}</option>`),
    ].join("");

    if (noteTypes.includes(currentValue)) {
      noteTypeFilter.value = currentValue;
    }
  }

  function getFilteredNotes() {
    const selectedType = noteTypeFilter.value;
    const selectedVisibility = visibilityFilter.value;

    return currentNotes.filter((note) => {
      if (selectedType && note.note_type !== selectedType) return false;
      if (selectedVisibility === "coach" && !note.visible_to_coach) return false;
      if (selectedVisibility === "admin" && note.visible_to_coach) return false;
      return true;
    });
  }

  function renderCoachPreview(notes) {
    const coachVisibleNotes = notes.filter((note) => note.visible_to_coach);
    if (!coachVisibleNotes.length) {
      coachPreviewList.innerHTML = '<p class="muted">No hay notas compartidas con coach para este alumno.</p>';
      return;
    }

    coachPreviewList.innerHTML = coachVisibleNotes.map((note) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(note.note_type || "Nota visible")}</strong>
        <span>${escapeHtml(note.description || "")}</span>
        <small>${escapeHtml(formatDate(note.created_at))}</small>
      </article>
    `).join("");
  }

  function renderNotes(notes) {
    if (!notes.length) {
      medicalNotesList.innerHTML = '<p class="muted">No hay notas para este filtro.</p>';
      return;
    }

    medicalNotesList.innerHTML = notes.map((note) => {
      const visibilityLabel = note.visible_to_coach ? "Visible para coach" : "Solo admin";
      return `
        <article class="mini-list-item">
          <strong>${escapeHtml(note.note_type || "Nota medica")}</strong>
          <span>${escapeHtml(note.description || "")}</span>
          <small>${escapeHtml(`${formatDate(note.created_at)} · ${visibilityLabel}`)}</small>
        </article>
      `;
    }).join("");
  }

  function refreshNotesView() {
    const filteredNotes = getFilteredNotes();
    const typeLabel = noteTypeFilter.options[noteTypeFilter.selectedIndex]?.text || "Todos";
    const visibilityLabel = visibilityFilter.options[visibilityFilter.selectedIndex]?.text || "Todas";

    notesFilterHint.textContent = noteTypeFilter.value || visibilityFilter.value
      ? `${filteredNotes.length} nota(s) para ${typeLabel} / ${visibilityLabel}.`
      : "Filtra por tipo o visibilidad para revisar el historial con mas rapidez.";

    renderNotes(filteredNotes);
  }

  async function loadMedical(preferredStudentId = studentFilter.value || getInitialStudentId()) {
    setupMessage.textContent = "Revisando datos sensibles...";

    try {
      const url = preferredStudentId
        ? `/api/admin/medical?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/medical";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar datos medicos.");

      setupRequired = Boolean(payload.setupRequired);
      currentStudentId = payload.selectedStudentId || preferredStudentId || "";
      currentStudent = payload.student || null;
      currentNotes = payload.notes || [];
      currentNoteTypes = payload.noteTypes || [];

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Modulo conectado. Usa este espacio solo con consentimiento y datos necesarios.";
      renderStudents(payload.students || [], currentStudentId);
      renderConsent(payload.consent);
      renderSummary(payload.summary || null);
      renderProfile(currentStudent);
      renderSafetyForm(currentStudent);
      renderNoteTypeFilter(currentNoteTypes);
      visibilityFilter.value = visibilityFilter.value || "";
      renderCoachPreview(payload.coachVisibleNotes || []);
      refreshNotesView();
      syncUrl(currentStudentId);
      setStatus(medicalStatus, "");
      setStatus(safetyStatus, "");
    } catch (error) {
      currentStudentId = "";
      currentStudent = null;
      currentNotes = [];
      currentNoteTypes = [];
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderConsent(null);
      renderSummary(null);
      renderProfile(null);
      renderSafetyForm(null);
      renderNoteTypeFilter([]);
      renderCoachPreview([]);
      renderNotes([]);
      notesFilterHint.textContent = error.message;
    }
  }

  async function saveSafetyProfile(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(safetyStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    const studentId = studentFilter.value;
    if (!studentId) {
      setStatus(safetyStatus, "Selecciona un alumno antes de guardar.", "error");
      return;
    }

    setStatus(safetyStatus, "Actualizando ficha segura...");
    const formData = new FormData(safetyForm);
    const body = Object.fromEntries(formData.entries());
    body.student_id = studentId;
    body.register_consent = formData.has("register_consent");

    try {
      const response = await fetch("/api/admin/medical", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo actualizar la ficha segura.");
      setStatus(safetyStatus, payload.message, "ok");
      await loadMedical(studentId);
    } catch (error) {
      setStatus(safetyStatus, error.message, "error");
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

  studentFilter.addEventListener("change", () => {
    noteTypeFilter.value = "";
    visibilityFilter.value = "";
    loadMedical(studentFilter.value);
  });
  noteTypeFilter.addEventListener("change", refreshNotesView);
  visibilityFilter.addEventListener("change", refreshNotesView);
  safetyForm.addEventListener("submit", saveSafetyProfile);
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
