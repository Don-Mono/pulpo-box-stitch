const { getSupabase, json, requireAdmin } = require("../_shared");

const OPTION_LIMIT = 250;
const HISTORY_LIMIT = 12;

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
    students: [],
    measurements: [],
    results: [],
    summary: null,
    setupRequired: true,
    message: "Para activar progreso debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
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

async function loadProgress(supabase, studentId) {
  const students = await listStudents(supabase);
  const selectedStudentId = studentId || students[0]?.id || "";

  if (!selectedStudentId) {
    return {
      students,
      measurements: [],
      results: [],
      summary: null,
    };
  }

  const [
    { data: measurements, error: measurementsError },
    { data: results, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("pb_body_measurements")
      .select("id, measured_at, body_weight_kg, height_cm, waist_cm, chest_cm, hip_cm, notes")
      .eq("student_id", selectedStudentId)
      .order("measured_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("pb_performance_logs")
      .select("id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text")
      .eq("student_id", selectedStudentId)
      .order("logged_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);

  if (measurementsError) throw measurementsError;
  if (resultsError) throw resultsError;

  const workoutIds = [...new Set((results || []).map((result) => result.workout_id).filter(Boolean))];
  const exerciseIds = [...new Set((results || []).map((result) => result.exercise_id).filter(Boolean))];

  const [
    { data: workouts, error: workoutsError },
    { data: exercises, error: exercisesError },
  ] = await Promise.all([
    workoutIds.length ? supabase.from("pb_workouts").select("id, title").in("id", workoutIds) : Promise.resolve({ data: [], error: null }),
    exerciseIds.length ? supabase.from("pb_exercises").select("id, name").in("id", exerciseIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (workoutsError) throw workoutsError;
  if (exercisesError) throw exercisesError;

  const workoutMap = new Map((workouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const latestMeasurement = measurements?.[0] || null;

  return {
    students,
    selectedStudentId,
    measurements: measurements || [],
    results: (results || []).map((result) => ({
      ...result,
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
    summary: {
      latest_weight_kg: latestMeasurement?.body_weight_kg || null,
      latest_height_cm: latestMeasurement?.height_cm || null,
      latest_waist_cm: latestMeasurement?.waist_cm || null,
      result_count: results?.length || 0,
      measurement_count: measurements?.length || 0,
    },
  };
}

async function createMeasurement(supabase, body) {
  const studentId = clean(body.student_id, 90);
  const bodyWeightKg = cleanNumber(body.body_weight_kg);
  const heightCm = cleanNumber(body.height_cm);
  const waistCm = cleanNumber(body.waist_cm);
  const chestCm = cleanNumber(body.chest_cm);
  const hipCm = cleanNumber(body.hip_cm);
  const notes = clean(body.notes, 500);

  if (!studentId) {
    const error = new Error("Debes seleccionar un alumno.");
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("pb_body_measurements")
    .insert({
      student_id: studentId,
      body_weight_kg: bodyWeightKg,
      height_cm: heightCm,
      waist_cm: waistCm,
      chest_cm: chestCm,
      hip_cm: hipCm,
      notes,
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
        const payload = await loadProgress(supabase, clean(query.student_id, 90));
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createMeasurement(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Medicion registrada correctamente.",
          measurement: created,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin progress endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
