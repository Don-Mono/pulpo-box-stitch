const { getSupabase, json, requireAdmin } = require("../_shared");
const { exerciseLibrary, exerciseSections } = require("../../data/exercise-library");

const EXERCISE_LIMIT = 500;

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

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabase = getSupabase();
    try {
      const savedExercises = await listSavedExercises(supabase);
      return json(res, 200, {
        exercises: [...exerciseLibrary, ...savedExercises],
        sections: buildSections(savedExercises),
        setupRequired: false,
      });
    } catch (error) {
      if (!isMissingManagementSchema(error)) throw error;
      return json(res, 200, {
        exercises: exerciseLibrary,
        sections: exerciseSections,
        setupRequired: true,
        message: "Biblioteca base cargada. Para guardar ejercicios propios debes ejecutar supabase_management_schema.sql.",
      });
    }
  } catch (error) {
    console.error("Admin exercises endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
