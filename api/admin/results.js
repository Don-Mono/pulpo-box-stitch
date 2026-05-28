const { getSupabase, json, requireAdmin } = require("../_shared");

const OPTION_LIMIT = 250;
const RESULT_LIMIT = 120;

function clean(value, maxLength = 220) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
    results: [],
    students: [],
    workouts: [],
    exercises: [],
    setupRequired: true,
    message: "Para activar resultados debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listStudents(supabase) {
  const { data: students, error } = await supabase.from("pb_students").select("profile_id").limit(OPTION_LIMIT);
  if (error) throw error;
  if (!students?.length) return [];

  const profileIds = students.map((student) => student.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email")
    .in("id", profileIds)
    .eq("role", "student")
    .eq("is_active", true);

  if (profilesError) throw profilesError;
  return (profiles || []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email || "",
  }));
}

async function listSimpleOptions(supabase) {
  const [{ data: workouts, error: workoutsError }, { data: exercises, error: exercisesError }] = await Promise.all([
    supabase.from("pb_workouts").select("id, title").order("created_at", { ascending: false }).limit(OPTION_LIMIT),
    supabase.from("pb_exercises").select("id, name").order("created_at", { ascending: false }).limit(OPTION_LIMIT),
  ]);

  if (workoutsError) throw workoutsError;
  if (exercisesError) throw exercisesError;

  return {
    workouts: workouts || [],
    exercises: exercises || [],
  };
}

async function listResults(supabase) {
  const [students, options, { data: results, error: resultsError }] = await Promise.all([
    listStudents(supabase),
    listSimpleOptions(supabase),
    supabase
      .from("pb_performance_logs")
      .select("id, student_id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes")
      .order("logged_at", { ascending: false })
      .limit(RESULT_LIMIT),
  ]);

  if (resultsError) throw resultsError;
  if (!results?.length) return { students, ...options, results: [] };

  const studentIds = [...new Set(results.map((result) => result.student_id).filter(Boolean))];
  const workoutIds = [...new Set(results.map((result) => result.workout_id).filter(Boolean))];
  const exerciseIds = [...new Set(results.map((result) => result.exercise_id).filter(Boolean))];

  const [
    { data: studentProfiles, error: studentProfilesError },
    { data: resultWorkouts, error: resultWorkoutsError },
    { data: resultExercises, error: resultExercisesError },
  ] = await Promise.all([
    studentIds.length ? supabase.from("pb_profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [], error: null }),
    workoutIds.length ? supabase.from("pb_workouts").select("id, title").in("id", workoutIds) : Promise.resolve({ data: [], error: null }),
    exerciseIds.length ? supabase.from("pb_exercises").select("id, name").in("id", exerciseIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentProfilesError) throw studentProfilesError;
  if (resultWorkoutsError) throw resultWorkoutsError;
  if (resultExercisesError) throw resultExercisesError;

  const studentMap = new Map((studentProfiles || []).map((student) => [student.id, student]));
  const workoutMap = new Map((resultWorkouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map((resultExercises || []).map((exercise) => [exercise.id, exercise]));

  return {
    students,
    ...options,
    results: results.map((result) => ({
      ...result,
      student_name: studentMap.get(result.student_id)?.full_name || "Alumno",
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
  };
}

async function createResult(supabase, body) {
  const studentId = clean(body.student_id, 90);
  const workoutId = clean(body.workout_id, 90) || null;
  const exerciseId = clean(body.exercise_id, 90) || null;
  const weightKg = cleanNumber(body.weight_kg);
  const reps = cleanNumber(body.reps);
  const rounds = cleanNumber(body.rounds);
  const timeSeconds = cleanNumber(body.time_seconds);
  const scoreText = clean(body.score_text, 160);
  const studentNotes = clean(body.student_notes, 500);
  const coachNotes = clean(body.coach_notes, 500);

  if (!studentId) {
    const error = new Error("Debes seleccionar un alumno.");
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("pb_performance_logs")
    .insert({
      student_id: studentId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      weight_kg: weightKg,
      reps,
      rounds,
      time_seconds: timeSeconds,
      score_text: scoreText,
      student_notes: studentNotes,
      coach_notes: coachNotes,
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
      try {
        const payload = await listResults(supabase);
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createResult(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Resultado registrado correctamente.",
          result: created,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin results endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
