const { getSupabase, json, requireAdmin } = require("../_shared");
const { exerciseLibrary, exerciseSections } = require("../../data/exercise-library");

const EXERCISE_LIMIT = 500;

function clean(value, maxLength = 220) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
    exercises: exerciseLibrary,
    sections: exerciseSections,
    setupRequired: true,
    message: "Biblioteca base cargada. Para guardar ejercicios propios debes ejecutar supabase_management_schema.sql.",
  };
}

function normalizeDbExercise(exercise) {
  return {
    id: exercise.id,
    section: "Cargados",
    category: exercise.movement_type || "Biblioteca",
    subcategory: "",
    name: exercise.name || "Ejercicio sin nombre",
    movement_type: exercise.movement_type || "",
    difficulty: "",
    description: exercise.description || "",
    video_url: exercise.video_url || "",
    source: "supabase",
  };
}

async function listSavedExercises(supabase) {
  const { data, error } = await supabase
    .from("pb_exercises")
    .select("id, name, description, movement_type, video_url, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(EXERCISE_LIMIT);

  if (error) throw error;
  return (data || []).map(normalizeDbExercise);
}

function buildSections(savedExercises) {
  const savedSection = savedExercises.length
    ? [{ name: "Cargados", total: savedExercises.length }]
    : [];

  return [...exerciseSections, ...savedSection];
}

async function createExercise(supabase, body, session) {
  const name = clean(body.name, 140);
  const description = clean(body.description, 500);
  const movementType = clean(body.movement_type, 80);
  const videoUrl = clean(body.video_url, 500);

  if (!name) {
    const error = new Error("El nombre del ejercicio es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("pb_exercises")
    .insert({
      name,
      description,
      movement_type: movementType,
      video_url: videoUrl,
      created_by: isUuid(session.userId || "") ? session.userId : null,
    })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

async function deactivateExercise(supabase, req) {
  const url = new URL(req.url || "", "http://localhost");
  const id = clean(url.searchParams.get("id"), 90);

  if (!isUuid(id)) {
    const error = new Error("Ejercicio invalido.");
    error.statusCode = 400;
    throw error;
  }

  const { error } = await supabase
    .from("pb_exercises")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return { id };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const savedExercises = await listSavedExercises(supabase);
        return json(res, 200, {
          exercises: [...exerciseLibrary, ...savedExercises],
          sections: buildSections(savedExercises),
          setupRequired: false,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const exercise = await createExercise(supabase, body, session);
        return json(res, 201, {
          ok: true,
          message: "Ejercicio agregado a la biblioteca.",
          exercise,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "DELETE") {
      try {
        const exercise = await deactivateExercise(supabase, req);
        return json(res, 200, {
          ok: true,
          message: "Ejercicio desactivado de la biblioteca.",
          exercise,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }
  } catch (error) {
    console.error("Admin exercises endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
