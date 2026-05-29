const { getSupabase, json, requireRole } = require("../_shared");

const STUDENT_LIMIT = 120;
const RESULT_LIMIT = 80;

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
    results: [],
    setupRequired: true,
    message: "Tu panel de coach aun no esta activo en Supabase.",
  };
}

async function loadCoachOverview(supabase, coachId) {
  const [
    { data: coachProfile, error: coachProfileError },
    { data: students, error: studentsError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email").eq("id", coachId).maybeSingle(),
    supabase
      .from("pb_students")
      .select("profile_id, goal, height_cm, current_weight_kg, created_at")
      .eq("primary_coach_id", coachId)
      .limit(STUDENT_LIMIT),
  ]);

  if (coachProfileError) throw coachProfileError;
  if (studentsError) throw studentsError;

  if (!students?.length) {
    return {
      coachProfile,
      students: [],
      results: [],
    };
  }

  const studentIds = students.map((student) => student.profile_id);
  const [
    { data: studentProfiles, error: studentProfilesError },
    { data: results, error: resultsError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email, phone").in("id", studentIds),
    supabase
      .from("pb_performance_logs")
      .select("id, student_id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes")
      .in("student_id", studentIds)
      .order("logged_at", { ascending: false })
      .limit(RESULT_LIMIT),
  ]);

  if (studentProfilesError) throw studentProfilesError;
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

  const profileMap = new Map((studentProfiles || []).map((profile) => [profile.id, profile]));
  const workoutMap = new Map((workouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));

  return {
    coachProfile,
    students: students.map((student) => ({
      ...student,
      full_name: profileMap.get(student.profile_id)?.full_name || "Alumno",
      email: profileMap.get(student.profile_id)?.email || "",
      phone: profileMap.get(student.profile_id)?.phone || "",
    })),
    results: (results || []).map((result) => ({
      ...result,
      student_name: profileMap.get(result.student_id)?.full_name || "Alumno",
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
  };
}

module.exports = async function handler(req, res) {
  const session = requireRole(req, res, "coach");
  if (!session) return;

  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return json(res, 405, { error: "Method not allowed" });
    }

    if (!session.userId) {
      return json(res, 403, { error: "Sesion de coach sin identificador." });
    }

    const supabase = getSupabase();
    try {
      const payload = await loadCoachOverview(supabase, session.userId);
      return json(res, 200, { ...payload, setupRequired: false });
    } catch (error) {
      if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
      throw error;
    }
  } catch (error) {
    console.error("Coach overview endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
