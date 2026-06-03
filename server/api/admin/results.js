const { getSupabase, json, requireAdmin } = require("../_shared");

const OPTION_LIMIT = 250;
const DEFAULT_RESULT_LIMIT = 25;
const MAX_RESULT_LIMIT = 100;

function clean(value, maxLength = 220) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

function cleanPositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

async function loadWorkoutExercises(supabase, workoutIds) {
  if (!workoutIds.length) return [];

  const { data: workoutExercises, error: workoutExercisesError } = await supabase
    .from("pb_workout_exercises")
    .select("workout_id, exercise_id, prescription, sets, reps, position")
    .in("workout_id", workoutIds)
    .order("position", { ascending: true });

  if (workoutExercisesError) throw workoutExercisesError;

  const exerciseIds = [...new Set((workoutExercises || []).map((exercise) => exercise.exercise_id).filter(Boolean))];
  const { data: exercises, error: exercisesError } = exerciseIds.length
    ? await supabase.from("pb_exercises").select("id, name").in("id", exerciseIds)
    : { data: [], error: null };

  if (exercisesError) throw exercisesError;

  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  return (workoutExercises || []).map((exercise) => ({
    ...exercise,
    exercise_name: exerciseMap.get(exercise.exercise_id)?.name || "",
  }));
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
    workoutExercises: [],
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
    .select("id, full_name, email, is_active")
    .in("id", profileIds)
    .eq("role", "student");

  if (profilesError) throw profilesError;
  return (profiles || [])
    .map((profile) => ({
      id: profile.id,
      full_name: `${profile.full_name}${profile.is_active === false ? " (Inactivo)" : ""}`,
      email: profile.email || "",
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "es"));
}

async function listSimpleOptions(supabase) {
  const { data: workouts, error: workoutsError } = await supabase
    .from("pb_workouts")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(OPTION_LIMIT);
  if (workoutsError) throw workoutsError;
  const workoutExercises = await loadWorkoutExercises(supabase, (workouts || []).map((workout) => workout.id));

  return {
    workouts: workouts || [],
    workoutExercises,
  };
}

async function listResults(supabase, studentId, page = 1, pageSize = DEFAULT_RESULT_LIMIT) {
  const students = await listStudents(supabase);
  const selectedStudentId = studentId || students[0]?.id || "";
  const safePageSize = Math.min(cleanPositiveInteger(pageSize, DEFAULT_RESULT_LIMIT), MAX_RESULT_LIMIT);
  const safePage = cleanPositiveInteger(page, 1);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const resultQuery = supabase
    .from("pb_performance_logs")
    .select("id, student_id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes", { count: "exact" })
    .order("logged_at", { ascending: false })
    .range(from, to);

  if (selectedStudentId) resultQuery.eq("student_id", selectedStudentId);

  const [options, resultsResponse] = await Promise.all([
    listSimpleOptions(supabase),
    resultQuery,
  ]);

  const { data: results, error: resultsError, count } = resultsResponse;

  if (resultsError) throw resultsError;
  const total = Number(count || 0);
  const totalPages = Math.max(Math.ceil(total / safePageSize), 1);
  if (!results?.length) {
    return {
      students,
      selectedStudentId,
      ...options,
      results: [],
      pagination: {
        total,
        page: Math.min(safePage, totalPages),
        pageSize: safePageSize,
        totalPages,
      },
    };
  }

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
    selectedStudentId,
    ...options,
    results: results.map((result) => ({
      ...result,
      student_name: studentMap.get(result.student_id)?.full_name || "Alumno",
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
    pagination: {
      total,
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      totalPages,
    },
  };
}

function normalizeResultInput(body) {
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

  if (exerciseId && !workoutId) {
    const error = new Error("Si seleccionas un ejercicio, primero debes elegir la rutina.");
    error.statusCode = 400;
    throw error;
  }

  return {
    studentId,
    workoutId,
    exerciseId,
    weightKg,
    reps,
    rounds,
    timeSeconds,
    scoreText,
    studentNotes,
    coachNotes,
  };
}

async function validateResultLinks(supabase, resultInput) {
  if (!resultInput.studentId) {
    const error = new Error("Debes seleccionar un alumno.");
    error.statusCode = 400;
    throw error;
  }

  if (resultInput.workoutId) {
    const { data: assignment, error: assignmentError } = await supabase
      .from("pb_workout_assignments")
      .select("id")
      .eq("student_id", resultInput.studentId)
      .eq("workout_id", resultInput.workoutId)
      .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment?.id) {
      const error = new Error("La rutina seleccionada no esta asignada al alumno.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (resultInput.workoutId && resultInput.exerciseId) {
    const { data: workoutExercise, error: workoutExerciseError } = await supabase
      .from("pb_workout_exercises")
      .select("id")
      .eq("workout_id", resultInput.workoutId)
      .eq("exercise_id", resultInput.exerciseId)
      .limit(1)
      .maybeSingle();

    if (workoutExerciseError) throw workoutExerciseError;
    if (!workoutExercise?.id) {
      const error = new Error("El ejercicio no pertenece a la rutina seleccionada.");
      error.statusCode = 400;
      throw error;
    }
  }
}

async function createResult(supabase, body) {
  const resultInput = normalizeResultInput(body);
  await validateResultLinks(supabase, resultInput);

  const { data, error } = await supabase
    .from("pb_performance_logs")
    .insert({
      student_id: resultInput.studentId,
      workout_id: resultInput.workoutId,
      exercise_id: resultInput.exerciseId,
      weight_kg: resultInput.weightKg,
      reps: resultInput.reps,
      rounds: resultInput.rounds,
      time_seconds: resultInput.timeSeconds,
      score_text: resultInput.scoreText,
      student_notes: resultInput.studentNotes,
      coach_notes: resultInput.coachNotes,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function updateResult(supabase, body) {
  const resultId = clean(body.result_id, 90);
  if (!resultId) {
    const error = new Error("Debes indicar el resultado a editar.");
    error.statusCode = 400;
    throw error;
  }

  const { data: existingResult, error: existingError } = await supabase
    .from("pb_performance_logs")
    .select("id")
    .eq("id", resultId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingResult?.id) {
    const error = new Error("El resultado indicado no existe.");
    error.statusCode = 404;
    throw error;
  }

  const resultInput = normalizeResultInput(body);
  await validateResultLinks(supabase, resultInput);

  const { error: updateError } = await supabase
    .from("pb_performance_logs")
    .update({
      student_id: resultInput.studentId,
      workout_id: resultInput.workoutId,
      exercise_id: resultInput.exerciseId,
      weight_kg: resultInput.weightKg,
      reps: resultInput.reps,
      rounds: resultInput.rounds,
      time_seconds: resultInput.timeSeconds,
      score_text: resultInput.scoreText,
      student_notes: resultInput.studentNotes,
      coach_notes: resultInput.coachNotes,
    })
    .eq("id", resultId);

  if (updateError) throw updateError;
  return { id: resultId };
}

async function deleteResult(supabase, body) {
  const resultId = clean(body.result_id, 90);
  if (!resultId) {
    const error = new Error("Debes indicar el resultado a eliminar.");
    error.statusCode = 400;
    throw error;
  }

  const { data: existingResult, error: existingError } = await supabase
    .from("pb_performance_logs")
    .select("id")
    .eq("id", resultId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingResult?.id) {
    const error = new Error("El resultado indicado no existe.");
    error.statusCode = 404;
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("pb_performance_logs")
    .delete()
    .eq("id", resultId);

  if (deleteError) throw deleteError;
  return { id: resultId };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const query = getQuery(req);
        const payload = await listResults(
          supabase,
          clean(query.student_id, 90),
          cleanPositiveInteger(query.page, 1),
          cleanPositiveInteger(query.page_size, DEFAULT_RESULT_LIMIT),
        );
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

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateResult(supabase, body);
        return json(res, 200, {
          ok: true,
          message: "Resultado actualizado correctamente.",
          result: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const deleted = await deleteResult(supabase, body);
        return json(res, 200, {
          ok: true,
          message: "Resultado eliminado correctamente.",
          result: deleted,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin results endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
