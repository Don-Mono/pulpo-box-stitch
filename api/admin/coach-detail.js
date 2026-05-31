const { getSupabase, json, requireAdmin } = require("../_shared");

const COACH_LIMIT = 120;
const STUDENT_LIMIT = 250;
const WORKOUT_LIMIT = 40;
const RESULT_LIMIT = 20;

function clean(value, maxLength = 220) {
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

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

function setupPayload() {
  return {
    coaches: [],
    selectedCoachId: "",
    coach: null,
    students: [],
    workouts: [],
    results: [],
    summary: null,
    setupRequired: true,
    message: "La ficha de coach aun no esta activa en Supabase.",
  };
}

async function listCoachOptions(supabase) {
  const { data: coaches, error } = await supabase.from("pb_coaches").select("profile_id").limit(COACH_LIMIT);
  if (error) throw error;
  if (!coaches?.length) return [];

  const profileIds = coaches.map((coach) => coach.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, is_active")
    .in("id", profileIds)
    .eq("role", "coach");

  if (profilesError) throw profilesError;
  return (profiles || [])
    .map((profile) => ({
      id: profile.id,
      full_name: `${profile.full_name}${profile.is_active === false ? " (Inactivo)" : ""}`,
      is_active: profile.is_active ?? true,
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "es"));
}

async function loadCoachDetail(supabase, coachId) {
  const coaches = await listCoachOptions(supabase);
  const selectedCoachId = coachId || coaches[0]?.id || "";

  if (!selectedCoachId) {
    return {
      coaches,
      selectedCoachId: "",
      coach: null,
      students: [],
      workouts: [],
      results: [],
      summary: null,
    };
  }

  const [
    { data: profile, error: profileError },
    { data: coach, error: coachError },
    { data: students, error: studentsError },
    { data: workouts, error: workoutsError },
  ] = await Promise.all([
    supabase
      .from("pb_profiles")
      .select("id, full_name, email, phone, is_active, created_at, updated_at")
      .eq("id", selectedCoachId)
      .eq("role", "coach")
      .maybeSingle(),
    supabase
      .from("pb_coaches")
      .select("profile_id, specialty, bio, photo_url, created_at, updated_at")
      .eq("profile_id", selectedCoachId)
      .maybeSingle(),
    supabase
      .from("pb_students")
      .select("profile_id, location_id, goal, created_at")
      .eq("primary_coach_id", selectedCoachId)
      .order("created_at", { ascending: false })
      .limit(STUDENT_LIMIT),
    supabase
      .from("pb_workouts")
      .select("id, title, summary, workout_date, created_at")
      .eq("created_by", selectedCoachId)
      .order("created_at", { ascending: false })
      .limit(WORKOUT_LIMIT),
  ]);

  if (profileError) throw profileError;
  if (coachError) throw coachError;
  if (studentsError) throw studentsError;
  if (workoutsError) throw workoutsError;

  const studentIds = (students || []).map((student) => student.profile_id);
  const locationIds = [...new Set((students || []).map((student) => student.location_id).filter(Boolean))];
  const workoutIds = (workouts || []).map((workout) => workout.id);

  const [
    { data: studentProfiles, error: studentProfilesError },
    { data: locations, error: locationsError },
    { data: assignments, error: assignmentsError },
    { data: results, error: resultsError },
  ] = await Promise.all([
    studentIds.length
      ? supabase.from("pb_profiles").select("id, full_name, email, phone, is_active").in("id", studentIds).eq("role", "student")
      : Promise.resolve({ data: [], error: null }),
    locationIds.length
      ? supabase.from("pb_locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
    workoutIds.length
      ? supabase.from("pb_workout_assignments").select("id, workout_id, student_id, status").in("workout_id", workoutIds)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length
      ? supabase
        .from("pb_performance_logs")
        .select("id, student_id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes")
        .in("student_id", studentIds)
        .order("logged_at", { ascending: false })
        .limit(RESULT_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentProfilesError) throw studentProfilesError;
  if (locationsError) throw locationsError;
  if (assignmentsError) throw assignmentsError;
  if (resultsError) throw resultsError;

  const workoutIdsFromResults = [...new Set((results || []).map((result) => result.workout_id).filter(Boolean))];
  const exerciseIdsFromResults = [...new Set((results || []).map((result) => result.exercise_id).filter(Boolean))];

  const [
    { data: resultWorkouts, error: resultWorkoutsError },
    { data: resultExercises, error: resultExercisesError },
  ] = await Promise.all([
    workoutIdsFromResults.length
      ? supabase.from("pb_workouts").select("id, title").in("id", workoutIdsFromResults)
      : Promise.resolve({ data: [], error: null }),
    exerciseIdsFromResults.length
      ? supabase.from("pb_exercises").select("id, name").in("id", exerciseIdsFromResults)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (resultWorkoutsError) throw resultWorkoutsError;
  if (resultExercisesError) throw resultExercisesError;

  const studentProfileMap = new Map((studentProfiles || []).map((entry) => [entry.id, entry]));
  const locationMap = new Map((locations || []).map((entry) => [entry.id, entry]));
  const workoutTitleMap = new Map([...(workouts || []).map((entry) => [entry.id, entry]), ...(resultWorkouts || []).map((entry) => [entry.id, entry])]);
  const exerciseMap = new Map((resultExercises || []).map((entry) => [entry.id, entry]));

  const assignmentCounts = new Map();
  const activeAssignmentCounts = new Map();
  (assignments || []).forEach((assignment) => {
    assignmentCounts.set(assignment.workout_id, (assignmentCounts.get(assignment.workout_id) || 0) + 1);
    if (assignment.status === "assigned") {
      activeAssignmentCounts.set(assignment.workout_id, (activeAssignmentCounts.get(assignment.workout_id) || 0) + 1);
    }
  });

  const normalizedStudents = (students || []).map((student) => {
    const profileEntry = studentProfileMap.get(student.profile_id);
    return {
      id: student.profile_id,
      full_name: profileEntry?.full_name || "Alumno",
      email: profileEntry?.email || "",
      phone: profileEntry?.phone || "",
      is_active: profileEntry?.is_active ?? true,
      goal: student.goal || "",
      location_name: locationMap.get(student.location_id)?.name || "",
    };
  });

  const normalizedWorkouts = (workouts || []).map((workout) => ({
    ...workout,
    assignment_count: assignmentCounts.get(workout.id) || 0,
    active_assignment_count: activeAssignmentCounts.get(workout.id) || 0,
  }));

  const normalizedResults = (results || []).map((result) => ({
    ...result,
    student_name: studentProfileMap.get(result.student_id)?.full_name || "Alumno",
    workout_title: workoutTitleMap.get(result.workout_id)?.title || "",
    exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
  }));

  return {
    coaches,
    selectedCoachId,
    coach: profile && coach
      ? {
        id: profile.id,
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        is_active: profile.is_active ?? true,
        specialty: coach.specialty || "",
        bio: coach.bio || "",
        photo_url: coach.photo_url || "",
        created_at: coach.created_at || profile.created_at || null,
        updated_at: coach.updated_at || profile.updated_at || null,
      }
      : null,
    students: normalizedStudents,
    workouts: normalizedWorkouts,
    results: normalizedResults,
    summary: {
      student_count: normalizedStudents.length,
      active_student_count: normalizedStudents.filter((student) => student.is_active).length,
      workout_count: normalizedWorkouts.length,
      recent_result_count: normalizedResults.length,
    },
  };
}

async function updateCoachDetail(supabase, body) {
  const id = clean(body.id, 90);
  const fullName = clean(body.full_name, 120);
  const phone = clean(body.phone, 40);
  const specialty = clean(body.specialty, 120);
  const bio = clean(body.bio, 1000);
  const photoUrl = clean(body.photo_url, 500);
  const isActive = isChecked(body.is_active);
  const timestamp = new Date().toISOString();

  if (!id) {
    const error = new Error("Falta el coach a actualizar.");
    error.statusCode = 400;
    throw error;
  }

  if (!fullName) {
    const error = new Error("El nombre del coach es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const { error: profileError } = await supabase
    .from("pb_profiles")
    .update({
      full_name: fullName,
      phone,
      avatar_url: photoUrl,
      is_active: isActive,
      updated_at: timestamp,
    })
    .eq("id", id)
    .eq("role", "coach");

  if (profileError) throw profileError;

  const { error: coachError } = await supabase
    .from("pb_coaches")
    .update({
      specialty,
      bio,
      photo_url: photoUrl,
      updated_at: timestamp,
    })
    .eq("profile_id", id);

  if (coachError) throw coachError;

  return { id };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const query = getQuery(req);
      try {
        const payload = await loadCoachDetail(supabase, clean(query.coach_id, 90));
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateCoachDetail(supabase, body);
        return json(res, 200, {
          ok: true,
          message: "Coach actualizado correctamente.",
          coach: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin coach detail endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
