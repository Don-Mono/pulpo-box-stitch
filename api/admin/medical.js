const { getSupabase, json, requireAdmin } = require("../_shared");

const STUDENT_LIMIT = 250;
const NOTE_LIMIT = 100;

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
    notes: [],
    consent: null,
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
      notes: [],
      consent: null,
    };
  }

  const [
    { data: student, error: studentError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase.from("pb_students").select("profile_id, medical_consent_at").eq("profile_id", selectedStudentId).maybeSingle(),
    supabase
      .from("pb_medical_notes")
      .select("id, note_type, description, visible_to_coach, created_at")
      .eq("student_id", selectedStudentId)
      .order("created_at", { ascending: false })
      .limit(NOTE_LIMIT),
  ]);

  if (studentError) throw studentError;
  if (notesError) throw notesError;

  return {
    students,
    selectedStudentId,
    consent: student?.medical_consent_at || null,
    notes: notes || [],
  };
}

async function createMedicalNote(supabase, body) {
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

  const { data, error } = await supabase
    .from("pb_medical_notes")
    .insert({
      student_id: studentId,
      note_type: noteType,
      description,
      visible_to_coach: visibleToCoach,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
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

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createMedicalNote(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Dato sensible registrado con consentimiento confirmado.",
          note: created,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin medical endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
