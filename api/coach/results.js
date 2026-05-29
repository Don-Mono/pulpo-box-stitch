const { getSupabase, json, requireRole } = require("../_shared");

const STUDENT_LIMIT = 160;

function clean(value, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
    setupRequired: true,
    message: "Tu modulo de feedback aun no esta activo en Supabase.",
  };
}

async function loadAssignedStudentIds(supabase, coachId) {
  const { data, error } = await supabase
    .from("pb_students")
    .select("profile_id")
    .eq("primary_coach_id", coachId)
    .limit(STUDENT_LIMIT);

  if (error) throw error;
  return (data || []).map((student) => student.profile_id).filter(Boolean);
}

async function updateCoachFeedback(supabase, coachId, body) {
  const resultId = clean(body.result_id, 90);
  const coachNotes = clean(body.coach_notes, 500);

  if (!resultId) {
    const error = new Error("Debes seleccionar un resultado.");
    error.statusCode = 400;
    throw error;
  }

  const studentIds = await loadAssignedStudentIds(supabase, coachId);
  if (!studentIds.length) {
    const error = new Error("No tienes alumnos asignados para editar feedback.");
    error.statusCode = 403;
    throw error;
  }

  const { data: result, error: resultError } = await supabase
    .from("pb_performance_logs")
    .select("id, student_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError) throw resultError;
  if (!result?.id || !studentIds.includes(result.student_id)) {
    const error = new Error("No puedes editar feedback de un resultado fuera de tus alumnos asignados.");
    error.statusCode = 403;
    throw error;
  }

  const { data: updated, error: updateError } = await supabase
    .from("pb_performance_logs")
    .update({ coach_notes: coachNotes })
    .eq("id", resultId)
    .select("id, coach_notes")
    .single();

  if (updateError) throw updateError;
  return updated;
}

module.exports = async function handler(req, res) {
  const session = requireRole(req, res, "coach");
  if (!session) return;

  try {
    if (req.method !== "PATCH") {
      res.setHeader("Allow", "PATCH");
      return json(res, 405, { error: "Method not allowed" });
    }

    if (!session.userId) {
      return json(res, 403, { error: "Sesion de coach sin identificador." });
    }

    const supabase = getSupabase();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    try {
      const updated = await updateCoachFeedback(supabase, session.userId, body);
      return json(res, 200, {
        ok: true,
        message: "Feedback guardado correctamente.",
        result: updated,
      });
    } catch (error) {
      if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
      throw error;
    }
  } catch (error) {
    console.error("Coach results endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
