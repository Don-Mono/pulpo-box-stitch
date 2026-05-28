const { getSupabase, json, requireRole } = require("../_shared");

const HISTORY_LIMIT = 20;

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
    assignments: [],
    results: [],
    measurements: [],
    setupRequired: true,
    message: "Tu panel de alumno aun no esta activo en Supabase.",
  };
}

async function loadStudentOverview(supabase, studentId) {
  const [
    { data: profile, error: profileError },
    { data: assignments, error: assignmentsError },
    { data: results, error: resultsError },
    { data: measurements, error: measurementsError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email").eq("id", studentId).maybeSingle(),
    supabase
      .from("pb_workout_assignments")
      .select("id, workout_id, status, assigned_at")
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("pb_performance_logs")
      .select("id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes")
      .eq("student_id", studentId)
      .order("logged_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("pb_body_measurements")
      .select("id, measured_at, body_weight_kg, height_cm, waist_cm")
      .eq("student_id", studentId)
      .order("measured_at", { ascending: false })
      .limit(6),
  ]);

  if (profileError) throw profileError;
  if (assignmentsError) throw assignmentsError;
  if (resultsError) throw resultsError;
  if (measurementsError) throw measurementsError;

  const workoutIds = [...new Set([
    ...(assignments || []).map((assignment) => assignment.workout_id),
    ...(results || []).map((result) => result.workout_id),
  ].filter(Boolean))];
  const exerciseIds = [...new Set((results || []).map((result) => result.exercise_id).filter(Boolean))];

  const [
    { data: workouts, error: workoutsError },
    { data: exercises, error: exercisesError },
    { data: workoutExercises, error: workoutExercisesError },
  ] = await Promise.all([
    workoutIds.length ? supabase.from("pb_workouts").select("id, title, summary, workout_date, level").in("id", workoutIds) : Promise.resolve({ data: [], error: null }),
    exerciseIds.length ? supabase.from("pb_exercises").select("id, name").in("id", exerciseIds) : Promise.resolve({ data: [], error: null }),
    workoutIds.length
      ? supabase.from("pb_workout_exercises").select("workout_id, prescription, sets, reps, exercise_id").in("workout_id", workoutIds).order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (workoutsError) throw workoutsError;
  if (exercisesError) throw exercisesError;
  if (workoutExercisesError) throw workoutExercisesError;

  const workoutMap = new Map((workouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const workoutExerciseMap = new Map();

  (workoutExercises || []).forEach((item) => {
    const list = workoutExerciseMap.get(item.workout_id) || [];
    list.push(item);
    workoutExerciseMap.set(item.workout_id, list);
  });

  return {
    profile,
    assignments: (assignments || []).map((assignment) => ({
      ...assignment,
      workout: workoutMap.get(assignment.workout_id) || null,
      exercises: workoutExerciseMap.get(assignment.workout_id) || [],
    })),
    results: (results || []).map((result) => ({
      ...result,
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
    measurements: measurements || [],
  };
}

async function createStudentResult(supabase, studentId, body) {
  const workoutId = clean(body.workout_id, 90) || null;
  const exerciseId = clean(body.exercise_id, 90) || null;
  const weightKg = cleanNumber(body.weight_kg);
  const reps = cleanNumber(body.reps);
  const rounds = cleanNumber(body.rounds);
  const timeSeconds = cleanNumber(body.time_seconds);
  const scoreText = clean(body.score_text, 160);
  const studentNotes = clean(body.student_notes, 500);

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
      created_by: studentId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

module.exports = async function handler(req, res) {
  const session = requireRole(req, res, "student");
  if (!session) return;

  try {
    const supabase = getSupabase();
    const studentId = session.userId;

    if (!studentId) {
      return json(res, 403, { error: "Sesion de alumno sin identificador." });
    }

    if (req.method === "GET") {
      try {
        const payload = await loadStudentOverview(supabase, studentId);
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createStudentResult(supabase, studentId, body);
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
    console.error("Student overview endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
