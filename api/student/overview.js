const { getSupabase, json, requireRole } = require("../_shared");

const ASSIGNMENT_HISTORY_LIMIT = 20;
const RESULT_HISTORY_LIMIT = 60;
const MEASUREMENT_HISTORY_LIMIT = 24;

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

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body || {};
}

function setupPayload() {
  return {
    studentProfile: null,
    profile: null,
    studentDetails: null,
    assignments: [],
    results: [],
    measurements: [],
    summary: null,
    setupRequired: true,
    message: "Tu panel de alumno aun no esta activo en Supabase.",
  };
}

async function loadStudentOverview(supabase, studentId) {
  const [
    { data: profile, error: profileError },
    { data: studentDetails, error: studentDetailsError },
    { data: assignments, error: assignmentsError },
    { data: results, error: resultsError },
    { data: measurements, error: measurementsError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email, phone").eq("id", studentId).maybeSingle(),
    supabase
      .from("pb_students")
      .select("goal, height_cm, current_weight_kg, emergency_contact_name, emergency_contact_phone, location_id, primary_coach_id")
      .eq("profile_id", studentId)
      .maybeSingle(),
    supabase
      .from("pb_workout_assignments")
      .select("id, workout_id, status, assigned_at")
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false })
      .limit(ASSIGNMENT_HISTORY_LIMIT),
    supabase
      .from("pb_performance_logs")
      .select("id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes")
      .eq("student_id", studentId)
      .order("logged_at", { ascending: false })
      .limit(RESULT_HISTORY_LIMIT),
    supabase
      .from("pb_body_measurements")
      .select("id, measured_at, body_weight_kg, height_cm, waist_cm")
      .eq("student_id", studentId)
      .order("measured_at", { ascending: false })
      .limit(MEASUREMENT_HISTORY_LIMIT),
  ]);

  if (profileError) throw profileError;
  if (studentDetailsError) throw studentDetailsError;
  if (assignmentsError) throw assignmentsError;
  if (resultsError) throw resultsError;
  if (measurementsError) throw measurementsError;

  const workoutIds = [...new Set([
    ...(assignments || []).map((assignment) => assignment.workout_id),
    ...(results || []).map((result) => result.workout_id),
  ].filter(Boolean))];
  const coachId = studentDetails?.primary_coach_id || "";
  const locationId = studentDetails?.location_id || "";

  const [
    { data: coachProfile, error: coachError },
    { data: location, error: locationError },
    { data: workouts, error: workoutsError },
    { data: workoutExercises, error: workoutExercisesError },
  ] = await Promise.all([
    coachId
      ? supabase.from("pb_profiles").select("id, full_name").eq("id", coachId).eq("role", "coach").maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    locationId
      ? supabase.from("pb_locations").select("id, name").eq("id", locationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    workoutIds.length
      ? supabase.from("pb_workouts").select("id, title, summary, workout_date, level").in("id", workoutIds)
      : Promise.resolve({ data: [], error: null }),
    workoutIds.length
      ? supabase
        .from("pb_workout_exercises")
        .select("workout_id, prescription, sets, reps, exercise_id, position, time_cap_seconds")
        .in("workout_id", workoutIds)
        .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (coachError) throw coachError;
  if (locationError) throw locationError;
  if (workoutsError) throw workoutsError;
  if (workoutExercisesError) throw workoutExercisesError;

  const exerciseIds = [...new Set([
    ...(results || []).map((result) => result.exercise_id),
    ...(workoutExercises || []).map((exercise) => exercise.exercise_id),
  ].filter(Boolean))];
  const { data: exercises, error: exercisesError } = exerciseIds.length
    ? await supabase.from("pb_exercises").select("id, name, description, movement_type, video_url").in("id", exerciseIds)
    : { data: [], error: null };

  if (exercisesError) throw exercisesError;

  const workoutMap = new Map((workouts || []).map((workout) => [workout.id, workout]));
  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const workoutExerciseMap = new Map();
  const latestMeasurement = measurements?.[0] || null;

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

  const studentProfile = profile
    ? {
      id: profile.id,
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      goal: studentDetails?.goal || "",
      emergency_contact_name: studentDetails?.emergency_contact_name || "",
      emergency_contact_phone: studentDetails?.emergency_contact_phone || "",
      primary_coach_name: coachProfile?.full_name || "",
      location_name: location?.name || "",
    }
    : null;

  return {
    studentProfile,
    profile,
    studentDetails: studentDetails || null,
    assignments: (assignments || []).map((assignment) => ({
      ...assignment,
      workout: workoutMap.get(assignment.workout_id) || null,
      exercises: workoutExerciseMap.get(assignment.workout_id) || [],
    })),
    results: (results || []).map((result) => ({
      ...result,
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
      exercise_description: exerciseMap.get(result.exercise_id)?.description || "",
      movement_type: exerciseMap.get(result.exercise_id)?.movement_type || "",
      video_url: exerciseMap.get(result.exercise_id)?.video_url || "",
    })),
    measurements: measurements || [],
    summary: {
      latest_weight_kg: latestMeasurement?.body_weight_kg || studentDetails?.current_weight_kg || null,
      latest_height_cm: latestMeasurement?.height_cm || studentDetails?.height_cm || null,
      latest_waist_cm: latestMeasurement?.waist_cm || null,
      result_count: results?.length || 0,
      measurement_count: measurements?.length || 0,
    },
  };
}

async function updateStudentProfile(supabase, studentId, body) {
  const phone = clean(body.phone, 40);
  const emergencyContactName = clean(body.emergency_contact_name, 120);
  const emergencyContactPhone = clean(body.emergency_contact_phone, 40);
  const timestamp = new Date().toISOString();

  const { data: currentStudent, error: currentStudentError } = await supabase
    .from("pb_students")
    .select("profile_id")
    .eq("profile_id", studentId)
    .maybeSingle();

  if (currentStudentError) throw currentStudentError;
  if (!currentStudent) {
    const error = new Error("No encontramos tu ficha de alumno para actualizar.");
    error.statusCode = 404;
    throw error;
  }

  const { error: profileError } = await supabase
    .from("pb_profiles")
    .update({
      phone,
      updated_at: timestamp,
    })
    .eq("id", studentId)
    .eq("role", "student");

  if (profileError) throw profileError;

  const { error: studentError } = await supabase
    .from("pb_students")
    .update({
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      updated_at: timestamp,
    })
    .eq("profile_id", studentId);

  if (studentError) throw studentError;

  return { id: studentId };
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

  if (!workoutId) {
    const error = new Error("Debes seleccionar una rutina.");
    error.statusCode = 400;
    throw error;
  }

  if (!exerciseId) {
    const error = new Error("Debes seleccionar un ejercicio.");
    error.statusCode = 400;
    throw error;
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("pb_workout_assignments")
    .select("id")
    .eq("student_id", studentId)
    .eq("workout_id", workoutId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment?.id) {
    const error = new Error("La rutina seleccionada no esta asignada a tu perfil.");
    error.statusCode = 403;
    throw error;
  }

  const { data: workoutExercise, error: workoutExerciseError } = await supabase
    .from("pb_workout_exercises")
    .select("id")
    .eq("workout_id", workoutId)
    .eq("exercise_id", exerciseId)
    .limit(1)
    .maybeSingle();

  if (workoutExerciseError) throw workoutExerciseError;
  if (!workoutExercise?.id) {
    const error = new Error("El ejercicio seleccionado no pertenece a la rutina.");
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

    if (req.method === "PATCH") {
      const body = parseBody(req);
      try {
        const updated = await updateStudentProfile(supabase, studentId, body);
        return json(res, 200, {
          ok: true,
          message: "Tus datos de contacto fueron actualizados correctamente.",
          profile: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = parseBody(req);
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

    res.setHeader("Allow", "GET, PATCH, POST");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Student overview endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
