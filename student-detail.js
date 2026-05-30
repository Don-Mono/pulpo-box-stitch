(function () {
  const userEmail = document.querySelector("#userEmail");
  const studentTitle = document.querySelector("#studentTitle");
  const setupMessage = document.querySelector("#setupMessage");
  const studentMeta = document.querySelector("#studentMeta");
  const studentFilter = document.querySelector("#studentFilter");
  const summaryGrid = document.querySelector("#summaryGrid");
  const studentDetailForm = document.querySelector("#studentDetailForm");
  const studentDetailStatus = document.querySelector("#studentDetailStatus");
  const saveButton = document.querySelector("#saveButton");
  const coachSelect = document.querySelector("#primary_coach_id");
  const locationSelect = document.querySelector("#location_id");
  const studentProfileCard = document.querySelector("#studentProfileCard");
  const workoutsLink = document.querySelector("#workoutsLink");
  const progressLink = document.querySelector("#progressLink");
  const resultsLink = document.querySelector("#resultsLink");
  const medicalLink = document.querySelector("#medicalLink");
  const consentCard = document.querySelector("#consentCard");
  const measurementsList = document.querySelector("#measurementsList");
  const medicalNotesList = document.querySelector("#medicalNotesList");
  const resultsBody = document.querySelector("#resultsBody");
  const refreshButton = document.querySelector("#refreshButton");
  const logoutButton = document.querySelector("#logoutButton");

  let setupRequired = false;
  let currentStudentId = "";
  let currentStudent = null;
  let currentCoaches = [];
  let currentLocations = [];

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

  function formatMetric(value, unit) {
    return value == null || value === ""
      ? "--"
      : `${String(Number.isInteger(value) ? value : Number(value).toFixed(1))} ${unit}`.trim();
  }

  function getInitialStudentId() {
    try {
      const search = new URLSearchParams(window.location.search);
      return search.get("student_id") || search.get("id") || "";
    } catch {
      return "";
    }
  }

  function syncUrl(studentId) {
    try {
      const url = new URL(window.location.href);
      if (studentId) url.searchParams.set("student_id", studentId);
      else url.searchParams.delete("student_id");
      url.searchParams.delete("id");
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

  function fillSelect(select, placeholder, options, labelKey, selectedValue = "") {
    const html = [`<option value="">${escapeHtml(placeholder)}</option>`];
    options.forEach((option) => {
      const selected = option.id === selectedValue ? " selected" : "";
      html.push(`<option value="${escapeHtml(option.id)}"${selected}>${escapeHtml(option[labelKey] || "")}</option>`);
    });
    select.innerHTML = html.join("");
  }

  function renderStudents(students, selectedStudentId) {
    fillSelect(studentFilter, "Seleccionar alumno", students, "full_name", selectedStudentId);
  }

  function updateQuickLinks(studentId) {
    const links = [
      [workoutsLink, "/workouts.html"],
      [progressLink, "/progress.html"],
      [resultsLink, "/results.html"],
      [medicalLink, "/medical.html"],
    ];

    links.forEach(([link, path]) => {
      if (!studentId) {
        link.href = path;
        link.classList.add("is-disabled");
        link.setAttribute("aria-disabled", "true");
        return;
      }

      link.href = `${path}?student_id=${encodeURIComponent(studentId)}`;
      link.classList.remove("is-disabled");
      link.removeAttribute("aria-disabled");
    });
  }

  function renderSummary(summary) {
    const values = [
      ["Peso actual", formatMetric(summary?.latest_weight_kg, "kg")],
      ["Estatura", formatMetric(summary?.latest_height_cm, "cm")],
      ["Marcas", summary ? `${summary.result_count || 0}` : "--"],
      ["Mediciones", summary ? `${summary.measurement_count || 0}` : "--"],
    ];

    summaryGrid.innerHTML = values.map(([label, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderProfileCard(student) {
    if (!student) {
      studentTitle.textContent = "Ficha del alumno";
      studentMeta.textContent = "Elige un alumno para editar su ficha y entrar directo a sus modulos.";
      studentProfileCard.innerHTML = '<p class="muted">No hay ficha disponible para este alumno.</p>';
      return;
    }

    studentTitle.textContent = student.full_name || "Ficha del alumno";
    studentMeta.textContent = student.goal
      ? `Objetivo principal: ${student.goal}`
      : "Aun no hay objetivo principal registrado para este alumno.";

    studentProfileCard.innerHTML = `
      <article class="mini-list-item">
        <strong>${escapeHtml(student.full_name || "Alumno")}</strong>
        <span>${escapeHtml(student.location_name || "Sin sede asignada")}</span>
        <small>${escapeHtml(student.primary_coach_name || "Sin coach principal")}</small>
      </article>
      <article class="mini-list-item">
        <strong>Contacto y trazabilidad</strong>
        <span>${escapeHtml([student.email, student.phone].filter(Boolean).join(" / ") || "Sin contacto")}</span>
        <small>${escapeHtml(
          `Creado: ${formatDate(student.created_at)} · Ultima actualizacion: ${formatDate(student.updated_at)}`
        )}</small>
      </article>
    `;
  }

  function renderForm(student) {
    fillSelect(coachSelect, "Sin coach asignado", currentCoaches, "full_name", student?.primary_coach_id || "");
    fillSelect(locationSelect, "Sin sede asignada", currentLocations, "name", student?.location_id || "");

    studentDetailForm.full_name.value = student?.full_name || "";
    studentDetailForm.email.value = student?.email || "";
    studentDetailForm.phone.value = student?.phone || "";
    studentDetailForm.height_cm.value = student?.height_cm ?? "";
    studentDetailForm.current_weight_kg.value = student?.current_weight_kg ?? "";
    studentDetailForm.goal.value = student?.goal || "";
    studentDetailForm.emergency_contact_name.value = student?.emergency_contact_name || "";
    studentDetailForm.emergency_contact_phone.value = student?.emergency_contact_phone || "";
    studentDetailForm.is_active.checked = Boolean(student?.is_active);
    saveButton.disabled = !student;
  }

  function renderConsent(student, summary) {
    if (!student) {
      consentCard.innerHTML = `
        <strong>Sin consentimiento cargado</strong>
        <p>Selecciona un alumno para revisar el estado de consentimiento medico.</p>
        <span>Pendiente</span>
      `;
      return;
    }

    if (student.medical_consent_at) {
      consentCard.innerHTML = `
        <strong>Consentimiento registrado</strong>
        <p>Estado actual: ${escapeHtml(summary?.consent_status || "Registrado")}.</p>
        <span class="is-ok">Confirmado el ${escapeHtml(formatDate(student.medical_consent_at))}</span>
      `;
      return;
    }

    consentCard.innerHTML = `
      <strong>Consentimiento pendiente</strong>
      <p>Todavia no hay confirmacion registrada para tratamiento de datos sensibles.</p>
      <span>Pendiente</span>
    `;
  }

  function renderMeasurements(measurements) {
    if (!measurements.length) {
      measurementsList.innerHTML = '<p class="muted">Todavia no hay mediciones registradas para este alumno.</p>';
      return;
    }

    measurementsList.innerHTML = measurements.map((measurement) => {
      const values = [
        measurement.body_weight_kg ? `${measurement.body_weight_kg} kg` : "",
        measurement.height_cm ? `${measurement.height_cm} cm` : "",
        measurement.waist_cm ? `cintura ${measurement.waist_cm} cm` : "",
      ].filter(Boolean).join(" / ") || "Sin medidas";

      return `
        <article class="mini-list-item">
          <strong>${escapeHtml(formatDate(measurement.measured_at))}</strong>
          <span>${escapeHtml(values)}</span>
          <small>${escapeHtml(measurement.notes || "")}</small>
        </article>
      `;
    }).join("");
  }

  function renderMedicalNotes(notes) {
    if (!notes.length) {
      medicalNotesList.innerHTML = '<p class="muted">Todavia no hay notas medicas registradas.</p>';
      return;
    }

    medicalNotesList.innerHTML = notes.map((note) => `
      <article class="mini-list-item">
        <strong>${escapeHtml(note.note_type || "Nota medica")}</strong>
        <span>${escapeHtml(note.description || "")}</span>
        <small>${escapeHtml(
          `${formatDate(note.created_at)}${note.visible_to_coach ? " · visible para coach" : " · solo admin"}`
        )}</small>
      </article>
    `).join("");
  }

  function renderResults(results) {
    if (!results.length) {
      resultsBody.innerHTML = '<tr><td colspan="4">Todavia no hay resultados registrados para este alumno.</td></tr>';
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

      return `
        <tr>
          <td>
            ${escapeHtml(result.workout_title || "Sin rutina")}
            <small>${escapeHtml(result.exercise_name || "Sin ejercicio")}</small>
          </td>
          <td>${escapeHtml(mark)}</td>
          <td>${escapeHtml(notes)}</td>
          <td>${escapeHtml(formatDate(result.logged_at))}</td>
        </tr>
      `;
    }).join("");
  }

  async function loadStudentDetail(preferredStudentId = studentFilter.value || getInitialStudentId()) {
    setupMessage.textContent = "Cargando ficha del alumno...";
    resultsBody.innerHTML = '<tr><td colspan="4">Cargando resultados...</td></tr>';

    try {
      const url = preferredStudentId
        ? `/api/admin/student-detail?student_id=${encodeURIComponent(preferredStudentId)}`
        : "/api/admin/student-detail";
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo cargar la ficha.");

      setupRequired = Boolean(payload.setupRequired);
      currentStudentId = payload.selectedStudentId || preferredStudentId || "";
      currentStudent = payload.student || null;
      currentCoaches = payload.coaches || [];
      currentLocations = payload.locations || [];

      setupMessage.textContent = setupRequired
        ? payload.message
        : "Ficha conectada. Ya puedes editar el alumno y abrir sus modulos con contexto.";
      renderStudents(payload.students || [], currentStudentId);
      renderSummary(payload.summary || null);
      renderProfileCard(currentStudent);
      renderForm(currentStudent);
      renderConsent(currentStudent, payload.summary || null);
      renderMeasurements(payload.measurements || []);
      renderMedicalNotes(payload.medicalNotes || []);
      renderResults(payload.results || []);
      updateQuickLinks(currentStudentId);
      syncUrl(currentStudentId);
      setStatus(studentDetailStatus, "");
    } catch (error) {
      currentStudentId = "";
      currentStudent = null;
      currentCoaches = [];
      currentLocations = [];
      setupMessage.textContent = error.message;
      renderStudents([], "");
      renderSummary(null);
      renderProfileCard(null);
      renderForm(null);
      renderConsent(null, null);
      renderMeasurements([]);
      renderMedicalNotes([]);
      updateQuickLinks("");
      resultsBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
      setStatus(studentDetailStatus, error.message, "error");
    }
  }

  async function saveStudentDetail(event) {
    event.preventDefault();
    if (setupRequired) {
      setStatus(studentDetailStatus, "Primero debemos ejecutar el SQL de gestion en Supabase.", "error");
      return;
    }

    if (!currentStudentId) {
      setStatus(studentDetailStatus, "Selecciona un alumno antes de guardar.", "error");
      return;
    }

    setStatus(studentDetailStatus, "Guardando cambios...");
    const formData = new FormData(studentDetailForm);
    const body = Object.fromEntries(formData.entries());
    body.id = currentStudentId;
    body.is_active = studentDetailForm.is_active.checked;

    try {
      const response = await fetch("/api/admin/student-detail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || "No se pudo guardar la ficha.");
      setStatus(studentDetailStatus, payload.message || "Alumno actualizado correctamente.", "ok");
      await loadStudentDetail(currentStudentId);
    } catch (error) {
      setStatus(studentDetailStatus, error.message, "error");
    }
  }

  studentFilter.addEventListener("change", () => loadStudentDetail(studentFilter.value));
  studentDetailForm.addEventListener("submit", saveStudentDetail);
  refreshButton.addEventListener("click", () => loadStudentDetail(currentStudentId || studentFilter.value));
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  async function boot() {
    const user = await requireAdminSession();
    if (!user) return;
    await loadStudentDetail();
  }

  boot();
})();
