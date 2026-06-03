const { getSupabase, json, requireAdmin } = require("../_shared");

const STUDENT_LIMIT = 250;
const NOTE_LIMIT = 150;

function clean(value, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isChecked(value) {
  return value === true || value === "true" || value === "on";
}

function isMissingManagementSchema(error) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  return (
    error.code === "PGRST205"
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find")
    || message.includes('relation "pb_')
    || message.includes('relation "public.pb_')
  );
}

function setupPayload() {
  return {
    students: [],
    selectedStudentId: "",
    student: null,
    notes: [],
    noteTypes: [],
    coachVisibleNotes: [],
    consent: null,
    summary: null,
    setupRequired: true,
    message: "Para activar datos medicos debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

async function listStudents(supabase) {
  const { data: students, error } = await supabase.from("pb_students").select("profile_id").limit(STUDENT_LIMIT);
  if (error) throw error;
  if (!students?.length) return [];

  const profileIds = students.map((student) => student.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email, is_active")
    .in("id", profileIds)
    .eq("role", "student");

  if (profilesError) throw profilesError;
  return (profiles || [])
    .map((profile) => ({
      id: profile.id,
      full_name: `${profile.full_name}${profile.is_active === false ? " (Inactivo)" : ""}`,
      email: profile.email || "",
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "es"));
}

async function loadMedical(supabase, studentId) {
  const students = await listStudents(supabase);
  const selectedStudentId = studentId || students[0]?.id || "";

  if (!selectedStudentId) {
    return {
      students,
      selectedStudentId: "",
      student: null,
      notes: [],
      noteTypes: [],
      coachVisibleNotes: [],
      consent: null,
      summary: null,
    };
  }

  const [
    { data: profile, error: profileError },
    { data: student, error: studentError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase
      .from("pb_profiles")
      .select("id, full_name, email, phone, is_active")
      .eq("id", selectedStudentId)
      .eq("role", "student")
      .maybeSingle(),
    supabase
      .from("pb_students")
      .select("profile_id, goal, primary_coach_id, emergency_contact_name, emergency_contact_phone, medical_consent_at, updated_at")
      .eq("profile_id", selectedStudentId)
      .maybeSingle(),
    supabase
      .from("pb_medical_notes")
      .select("id, note_type, description, visible_to_coach, created_at")
      .eq("student_id", selectedStudentId)
      .order("created_at", { ascending: false })
      .limit(NOTE_LIMIT),
  ]);

  if (profileError) throw profileError;
  if (studentError) throw studentError;
  if (notesError) throw notesError;

  const coachId = student?.primary_coach_id || "";
  let coachProfile = null;
  if (coachId) {
    const { data, error } = await supabase
      .from("pb_profiles")
      .select("id, full_name, email")
      .eq("id", coachId)
      .eq("role", "coach")
      .maybeSingle();
    if (error) throw error;
    coachProfile = data || null;
  }

  const safeNotes = notes || [];
  const coachVisibleNotes = safeNotes.filter((note) => note.visible_to_coach);
  const noteTypes = [...new Set(safeNotes.map((note) => note.note_type).filter(Boolean))].sort((left, right) => left.localeCompare(right, "es"));

  return {
    students,
    selectedStudentId,
    student: profile && student
      ? {
        id: profile.id,
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        is_active: profile.is_active ?? true,
        goal: student.goal || "",
        primary_coach_name: coachProfile?.full_name || "",
        emergency_contact_name: student.emergency_contact_name || "",
        emergency_contact_phone: student.emergency_contact_phone || "",
        medical_consent_at: student.medical_consent_at || null,
        updated_at: student.updated_at || null,
      }
      : null,
    notes: safeNotes,
    noteTypes,
    coachVisibleNotes,
    consent: student?.medical_consent_at || null,
    summary: {
      total_notes: safeNotes.length,
      coach_visible_notes: coachVisibleNotes.length,
      admin_only_notes: safeNotes.length - coachVisibleNotes.length,
      latest_note_at: safeNotes[0]?.created_at || null,
      consent_status: student?.medical_consent_at ? "Registrado" : "Pendiente",
    },
  };
}

async function updateMedicalProfile(supabase, body) {
  const studentId = clean(body.student_id, 90);
  const emergencyContactName = clean(body.emergency_contact_name, 120);
  const emergencyContactPhone = clean(body.emergency_contact_phone, 40);
  const registerConsent = isChecked(body.register_consent);

  if (!studentId) {
    const error = new Error("Debes seleccionar un alumno.");
    error.statusCode = 400;
    throw error;
  }

  const { data: currentStudent, error: currentStudentError } = await supabase
    .from("pb_students")
    .select("profile_id, medical_consent_at")
    .eq("profile_id", studentId)
    .maybeSingle();

  if (currentStudentError) throw currentStudentError;
  if (!currentStudent) {
    const error = new Error("No encontramos al alumno solicitado.");
    error.statusCode = 404;
    throw error;
  }

  const timestamp = new Date().toISOString();
  const updates = {
    emergency_contact_name: emergencyContactName,
    emergency_contact_phone: emergencyContactPhone,
    updated_at: timestamp,
  };

  if (registerConsent && !currentStudent.medical_consent_at) {
    updates.medical_consent_at = timestamp;
  }

  const { error } = await supabase
    .from("pb_students")
    .update(updates)
    .eq("profile_id", studentId);

  if (error) throw error;

  return {
    id: studentId,
    consentRegistered: Boolean(updates.medical_consent_at),
  };
}

async function loadStudentForMedicalWrite(supabase, studentId) {
  const { data: student, error } = await supabase
    .from("pb_students")
    .select("profile_id, medical_consent_at")
    .eq("profile_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!student) {
    const missingStudentError = new Error("No encontramos al alumno solicitado.");
    missingStudentError.statusCode = 404;
    throw missingStudentError;
  }

  return student;
}

async function ensureMedicalConsent(supabase, studentId, consentConfirmed) {
  const student = await loadStudentForMedicalWrite(supabase, studentId);
  if (student.medical_consent_at) {
    return { consentRegisteredNow: false };
  }

  if (!consentConfirmed) {
    const error = new Error("Necesitas confirmar consentimiento antes de guardar datos sensibles.");
    error.statusCode = 400;
    throw error;
  }

  const consentAt = new Date().toISOString();
  const { error: consentError } = await supabase
    .from("pb_students")
    .update({ medical_consent_at: consentAt, updated_at: consentAt })
    .eq("profile_id", studentId)
    .is("medical_consent_at", null);

  if (consentError) throw consentError;
  return { consentRegisteredNow: true };
}

function normalizeMedicalNoteInput(body) {
  const studentId = clean(body.student_id, 90);
  const noteType = clean(body.note_type, 80);
  const description = clean(body.description, 1200);
  const visibleToCoach = isChecked(body.visible_to_coach);
  const consentConfirmed = isChecked(body.consent_confirmed);

  if (!studentId) {
    const error = new Error("Debes seleccionar un alumno.");
    error.statusCode = 400;
    throw error;
  }

  if (!noteType || !description) {
    const error = new Error("Tipo de nota y descripcion son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  return {
    studentId,
    noteType,
    description,
    visibleToCoach,
    consentConfirmed,
  };
}

async function createMedicalNote(supabase, body) {
  const noteInput = normalizeMedicalNoteInput(body);
  const consentResult = await ensureMedicalConsent(supabase, noteInput.studentId, noteInput.consentConfirmed);

  const { data, error } = await supabase
    .from("pb_medical_notes")
    .insert({
      student_id: noteInput.studentId,
      note_type: noteInput.noteType,
      description: noteInput.description,
      visible_to_coach: noteInput.visibleToCoach,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { ...data, consentRegisteredNow: consentResult.consentRegisteredNow };
}

async function updateMedicalNote(supabase, body) {
  const noteId = clean(body.note_id, 90);
  if (!noteId) {
    const error = new Error("Debes indicar la nota a editar.");
    error.statusCode = 400;
    throw error;
  }

  const noteInput = normalizeMedicalNoteInput(body);
  const { data: existingNote, error: existingError } = await supabase
    .from("pb_medical_notes")
    .select("id, student_id")
    .eq("id", noteId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingNote?.id) {
    const error = new Error("La nota indicada no existe.");
    error.statusCode = 404;
    throw error;
  }

  if (existingNote.student_id !== noteInput.studentId) {
    const error = new Error("La nota no pertenece al alumno seleccionado.");
    error.statusCode = 400;
    throw error;
  }

  const consentResult = await ensureMedicalConsent(supabase, noteInput.studentId, noteInput.consentConfirmed);

  const { error: updateError } = await supabase
    .from("pb_medical_notes")
    .update({
      note_type: noteInput.noteType,
      description: noteInput.description,
      visible_to_coach: noteInput.visibleToCoach,
    })
    .eq("id", noteId);

  if (updateError) throw updateError;
  return { id: noteId, consentRegisteredNow: consentResult.consentRegisteredNow };
}

async function deleteMedicalNote(supabase, body) {
  const noteId = clean(body.note_id, 90);
  if (!noteId) {
    const error = new Error("Debes indicar la nota a eliminar.");
    error.statusCode = 400;
    throw error;
  }

  const { data: existingNote, error: existingError } = await supabase
    .from("pb_medical_notes")
    .select("id")
    .eq("id", noteId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingNote?.id) {
    const error = new Error("La nota indicada no existe.");
    error.statusCode = 404;
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("pb_medical_notes")
    .delete()
    .eq("id", noteId);

  if (deleteError) throw deleteError;
  return { id: noteId };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const query = getQuery(req);
      try {
        const payload = await loadMedical(supabase, clean(query.student_id, 90));
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateMedicalProfile(supabase, body);
        return json(res, 200, {
          ok: true,
          message: updated.consentRegistered
            ? "Ficha segura actualizada y consentimiento registrado."
            : "Ficha segura actualizada correctamente.",
          profile: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createMedicalNote(supabase, body);
        return json(res, 201, {
          ok: true,
          message: created.consentRegisteredNow
            ? "Dato sensible registrado y consentimiento confirmado."
            : "Dato sensible registrado con consentimiento confirmado.",
          note: created,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateMedicalNote(supabase, body);
        return json(res, 200, {
          ok: true,
          message: updated.consentRegisteredNow
            ? "Nota sensible actualizada y consentimiento confirmado."
            : "Nota sensible actualizada correctamente.",
          note: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const deleted = await deleteMedicalNote(supabase, body);
        return json(res, 200, {
          ok: true,
          message: "Nota sensible eliminada correctamente.",
          note: deleted,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, PATCH, POST, PUT, DELETE");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin medical endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
