const { getSupabase, json, requireRole } = require("../_shared");

const OPTION_LIMIT = 200;
const ASSIGNMENT_HISTORY_LIMIT = 20;
const DEFAULT_RESULT_PAGE_SIZE = 20;
const MAX_RESULT_PAGE_SIZE = 50;
const MEASUREMENT_HISTORY_LIMIT = 24;
const MEDICAL_HISTORY_LIMIT = 20;

function cleanPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

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

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

function applyCoachStudentResultFilters(query, studentId, filters = {}) {
  let nextQuery = query.eq("student_id", studentId);

  if (filters.workoutId) {
    nextQuery = nextQuery.eq("workout_id", filters.workoutId);
  }

  if (filters.exerciseId) {
    nextQuery = nextQuery.eq("exercise_id", filters.exerciseId);
  }

  return nextQuery;
}

function setupPayload() {
  return {
    students: [],
    student: null,
    assignments: [],
    measurements: [],
    results: [],
    resultsSummary: {
      total: 0,
      latestLoggedAt: null,
      bestWeightKg: null,
      bestReps: null,
    },
    pagination: {
      total: 0,
      page: 1,
      pageSize: DEFAULT_RESULT_PAGE_SIZE,
      totalPages: 1,
    },
    selectedWorkoutId: "",
    selectedExerciseId: "",
    summary: null,
    consent: null,
    medicalNotes: [],
    setupRequired: true,
    message: "La ficha del alumno para coach aun no esta activa en Supabase.",
  };
}

async function listCoachStudents(supabase, coachId) {
  const { data: students, error } = await supabase
    .from("pb_students")
    .select("profile_id")
    .eq("primary_coach_id", coachId)
    .limit(OPTION_LIMIT);

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

async function loadStudentDetail(supabase, coachId, studentId, options = {}) {
  const students = await listCoachStudents(supabase, coachId);
  const selectedStudentId = studentId || students[0]?.id || "";
  const resultPage = cleanPositiveInteger(options.page, 1);
  const requestedPageSize = cleanPositiveInteger(options.pageSize, DEFAULT_RESULT_PAGE_SIZE);
  const resultPageSize = Math.min(requestedPageSize, MAX_RESULT_PAGE_SIZE);
  const selectedWorkoutId = clean(options.workoutId, 90);
  const selectedExerciseId = clean(options.exerciseId, 90);
  const resultRangeFrom = (resultPage - 1) * resultPageSize;
  const resultRangeTo = resultRangeFrom + resultPageSize - 1;

  if (!selectedStudentId) {
    return {
      students,
      selectedStudentId: "",
      student: null,
      assignments: [],
      measurements: [],
      results: [],
      resultsSummary: {
        total: 0,
        latestLoggedAt: null,
        bestWeightKg: null,
        bestReps: null,
      },
      pagination: {
        total: 0,
        page: 1,
        pageSize: resultPageSize,
        totalPages: 1,
      },
      selectedWorkoutId,
      selectedExerciseId,
      summary: null,
      consent: null,
      medicalNotes: [],
    };
  }

  if (!students.some((student) => student.id === selectedStudentId)) {
    const error = new Error("Solo puedes revisar alumnos que esten asignados a tu perfil.");
    error.statusCode = 403;
    throw error;
  }

  const [
    { data: studentProfile, error: studentProfileError },
    { data: studentDetails, error: studentDetailsError },
    { data: assignments, error: assignmentsError },
    { data: measurements, error: measurementsError },
    { data: results, count: resultCount, error: resultsError },
    { data: latestResult, error: latestResultError },
    { data: bestWeightResult, error: bestWeightResultError },
    { data: bestRepsResult, error: bestRepsResultError },
    { data: medicalNotes, error: medicalNotesError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email, phone").eq("id", selectedStudentId).maybeSingle(),
    supabase
      .from("pb_students")
      .select("profile_id, goal, height_cm, current_weight_kg, emergency_contact_name, emergency_contact_phone, location_id, medical_consent_at")
      .eq("profile_id", selectedStudentId)
      .maybeSingle(),
    supabase
      .from("pb_workout_assignments")
      .select("id, workout_id, status, assigned_at, completed_at")
      .eq("student_id", selectedStudentId)
      .order("assigned_at", { ascending: false })
      .limit(ASSIGNMENT_HISTORY_LIMIT),
    supabase
      .from("pb_body_measurements")
      .select("id, measured_at, body_weight_kg, height_cm, waist_cm, chest_cm, hip_cm, notes")
      .eq("student_id", selectedStudentId)
      .order("measured_at", { ascending: false })
      .limit(MEASUREMENT_HISTORY_LIMIT),
    applyCoachStudentResultFilters(
      supabase
        .from("pb_performance_logs")
        .select("id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes", { count: "exact" })
        .order("logged_at", { ascending: false })
        .range(resultRangeFrom, resultRangeTo),
      selectedStudentId,
      {
        workoutId: selectedWorkoutId,
        exerciseId: selectedExerciseId,
      },
    ),
    applyCoachStudentResultFilters(
      supabase
        .from("pb_performance_logs")
        .select("id, logged_at")
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      selectedStudentId,
      {
        workoutId: selectedWorkoutId,
        exerciseId: selectedExerciseId,
      },
    ),
    applyCoachStudentResultFilters(
      supabase
        .from("pb_performance_logs")
        .select("id, weight_kg")
        .not("weight_kg", "is", null)
        .order("weight_kg", { ascending: false })
        .limit(1)
        .maybeSingle(),
      selectedStudentId,
      {
        workoutId: selectedWorkoutId,
        exerciseId: selectedExerciseId,
      },
    ),
    applyCoachStudentResultFilters(
      supabase
        .from("pb_performance_logs")
        .select("id, reps")
        .not("reps", "is", null)
        .order("reps", { ascending: false })
        .limit(1)
        .maybeSingle(),
      selectedStudentId,
      {
        workoutId: selectedWorkoutId,
        exerciseId: selectedExerciseId,
      },
    ),
    supabase
      .from("pb_medical_notes")
      .select("id, note_type, description, created_at")
      .eq("student_id", selectedStudentId)
      .eq("visible_to_coach", true)
      .order("created_at", { ascending: false })
      .limit(MEDICAL_HISTORY_LIMIT),
  ]);

  if (studentProfileError) throw studentProfileError;
  if (studentDetailsError) throw studentDetailsError;
  if (assignmentsError) throw assignmentsError;
  if (measurementsError) throw measurementsError;
  if (resultsError) throw resultsError;
  if (latestResultError) throw latestResultError;
  if (bestWeightResultError) throw bestWeightResultError;
  if (bestRepsResultError) throw bestRepsResultError;
  if (medicalNotesError) throw medicalNotesError;

  const workoutIds = [...new Set([
    ...(assignments || []).map((assignment) => assignment.workout_id),
    ...(results || []).map((result) => result.workout_id),
  ].filter(Boolean))];

  const exerciseIds = [...new Set((results || []).map((result) => result.exercise_id).filter(Boolean))];
  const locationId = studentDetails?.location_id || "";

  const [
    { data: workouts, error: workoutsError },
    { data: exercises, error: exercisesError },
    { data: workoutExercises, error: workoutExercisesError },
    { data: location, error: locationError },
  ] = await Promise.all([
    workoutIds.length
      ? supabase.from("pb_workouts").select("id, title, summary, workout_date, level").in("id", workoutIds)
      : Promise.resolve({ data: [], error: null }),
    exerciseIds.length
      ? supabase.from("pb_exercises").select("id, name, description, movement_type, video_url").in("id", exerciseIds)
      : Promise.resolve({ data: [], error: null }),
    workoutIds.length
      ? supabase.from("pb_workout_exercises").select("workout_id, exercise_id, prescription, sets, reps, position, time_cap_seconds").in("workout_id", workoutIds).order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    locationId
      ? supabase.from("pb_locations").select("id, name").eq("id", locationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (workoutsError) throw workoutsError;
  if (exercisesError) throw exercisesError;
  if (workoutExercisesError) throw workoutExercisesError;
  if (locationError) throw locationError;

  const workoutExerciseIds = [...new Set((workoutExercises || []).map((exercise) => exercise.exercise_id).filter(Boolean))];
  const extraExerciseIds = workoutExerciseIds.filter((id) => !exerciseIds.includes(id));
  const { data: extraExercises, error: extraExercisesError } = extraExerciseIds.length
    ? await supabase.from("pb_exercises").select("id, name, description, movement_type, video_url").in("id", extraExerciseIds)
    : { data: [], error: null };

  if (extraExercisesError) throw extraExercisesError;

  const workoutMap = new Map((workouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map([...(exercises || []), ...(extraExercises || [])].map((exercise) => [exercise.id, exercise]));
  const workoutExerciseMap = new Map();

  (workoutExercises || []).forEach((item) => {
    const list = workoutExerciseMap.get(item.workout_id) || [];
    const exercise = exerciseMap.get(item.exercise_id);
    list.push({
      ...item,
      exercise_name: exercise?.name || "",
      exercise_description: exercise?.description || "",
      movement_type: exercise?.movement_type || "",
      video_url: exercise?.video_url || "",
    });
    workoutExerciseMap.set(item.workout_id, list);
  });

  const latestMeasurement = measurements?.[0] || null;
  const totalResults = Math.max(Number(resultCount || 0), 0);
  const totalPages = Math.max(Math.ceil(totalResults / resultPageSize), 1);
  const normalizedPage = Math.min(Math.max(resultPage, 1), totalPages);

  return {
    students,
    selectedStudentId,
    student: studentProfile
      ? {
        ...studentProfile,
        goal: studentDetails?.goal || "",
        location_name: location?.name || "",
        emergency_contact_name: studentDetails?.emergency_contact_name || "",
        emergency_contact_phone: studentDetails?.emergency_contact_phone || "",
      }
      : null,
    assignments: (assignments || []).map((assignment) => ({
      ...assignment,
      workout: workoutMap.get(assignment.workout_id) || null,
      exercises: workoutExerciseMap.get(assignment.workout_id) || [],
      })),
    measurements: measurements || [],
    results: (results || []).map((result) => ({
      ...result,
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
      exercise_description: exerciseMap.get(result.exercise_id)?.description || "",
      movement_type: exerciseMap.get(result.exercise_id)?.movement_type || "",
      video_url: exerciseMap.get(result.exercise_id)?.video_url || "",
    })),
    resultsSummary: {
      total: totalResults,
      latestLoggedAt: latestResult?.logged_at || null,
      bestWeightKg: bestWeightResult?.weight_kg ?? null,
      bestReps: bestRepsResult?.reps ?? null,
    },
    pagination: {
      total: totalResults,
      page: normalizedPage,
      pageSize: resultPageSize,
      totalPages,
    },
    selectedWorkoutId,
    selectedExerciseId,
    summary: {
      latest_weight_kg: latestMeasurement?.body_weight_kg || studentDetails?.current_weight_kg || null,
      latest_height_cm: latestMeasurement?.height_cm || studentDetails?.height_cm || null,
      latest_waist_cm: latestMeasurement?.waist_cm || null,
      result_count: totalResults,
      measurement_count: measurements?.length || 0,
    },
    consent: studentDetails?.medical_consent_at || null,
    medicalNotes: medicalNotes || [],
  };
}

async function createMeasurement(supabase, coachId, body) {
  const students = await listCoachStudents(supabase, coachId);
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

  if (!students.some((student) => student.id === studentId)) {
    const error = new Error("Solo puedes registrar mediciones para tus alumnos asignados.");
    error.statusCode = 403;
    throw error;
  }

  if ([bodyWeightKg, heightCm, waistCm, chestCm, hipCm].every((value) => value == null) && !notes) {
    const error = new Error("Debes ingresar al menos una medida o una nota antes de guardar.");
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
      created_by: coachId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

module.exports = async function handler(req, res) {
  const session = requireRole(req, res, "coach");
  if (!session) return;

  try {
    const coachId = session.userId;
    if (!coachId) {
      return json(res, 403, { error: "Sesion de coach sin identificador." });
    }

    const supabase = getSupabase();

    if (req.method === "GET") {
      const query = getQuery(req);
      try {
        const payload = await loadStudentDetail(supabase, coachId, clean(query.student_id, 90), {
          page: query.results_page,
          pageSize: query.results_page_size,
          workoutId: query.workout_id,
          exerciseId: query.exercise_id,
        });
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createMeasurement(supabase, coachId, body);
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
    console.error("Coach student detail endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
