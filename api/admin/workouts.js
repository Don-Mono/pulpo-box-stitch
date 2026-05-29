const { getSupabase, json, requireAdmin } = require("../_shared");

const WORKOUT_LIMIT = 80;
const STUDENT_LIMIT = 200;

function clean(value, maxLength = 220) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanDate(value) {
  const date = clean(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function cleanNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setupPayload() {
  return {
    workouts: [],
    students: [],
    setupRequired: true,
    message: "Para activar rutinas debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listAssignableStudents(supabase) {
  const { data: students, error } = await supabase
    .from("pb_students")
    .select("profile_id")
    .limit(STUDENT_LIMIT);

  if (error) throw error;
  if (!students?.length) return [];

  const profileIds = students.map((student) => student.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email, is_active")
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

async function listWorkouts(supabase) {
  const { data: workouts, error } = await supabase
    .from("pb_workouts")
    .select("id, title, summary, workout_date, level, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(WORKOUT_LIMIT);

  if (error) throw error;
  if (!workouts?.length) {
    const students = await listAssignableStudents(supabase);
    return { workouts: [], students };
  }

  const workoutIds = workouts.map((workout) => workout.id);
  const { data: workoutExercises, error: workoutExercisesError } = await supabase
    .from("pb_workout_exercises")
    .select("id, workout_id, exercise_id, position, prescription, sets, reps, time_cap_seconds")
    .in("workout_id", workoutIds)
    .order("position", { ascending: true });

  if (workoutExercisesError) throw workoutExercisesError;

  const exerciseIds = [...new Set((workoutExercises || []).map((item) => item.exercise_id).filter(Boolean))];
  const assignmentStudentIds = [];

  const [{ data: exercises, error: exercisesError }, { data: assignments, error: assignmentsError }, students] = await Promise.all([
    exerciseIds.length
      ? supabase.from("pb_exercises").select("id, name, description, movement_type, video_url").in("id", exerciseIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("pb_workout_assignments").select("id, workout_id, student_id, status").in("workout_id", workoutIds),
    listAssignableStudents(supabase),
  ]);

  if (exercisesError) throw exercisesError;
  if (assignmentsError) throw assignmentsError;

  (assignments || []).forEach((assignment) => {
    if (assignment.student_id) assignmentStudentIds.push(assignment.student_id);
  });

  const assignedProfileIds = [...new Set(assignmentStudentIds)];
  const { data: assignedProfiles, error: assignedProfilesError } = assignedProfileIds.length
    ? await supabase.from("pb_profiles").select("id, full_name").in("id", assignedProfileIds)
    : { data: [], error: null };

  if (assignedProfilesError) throw assignedProfilesError;

  const exerciseMap = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const assignedProfileMap = new Map((assignedProfiles || []).map((profile) => [profile.id, profile]));

  const exercisesByWorkout = new Map();
  (workoutExercises || []).forEach((item) => {
    const list = exercisesByWorkout.get(item.workout_id) || [];
    const exercise = exerciseMap.get(item.exercise_id);
    list.push({
      id: item.id,
      name: exercise?.name || "Ejercicio sin nombre",
      description: exercise?.description || "",
      video_url: exercise?.video_url || "",
      movement_type: exercise?.movement_type || "",
      prescription: item.prescription || "",
      sets: item.sets,
      reps: item.reps || "",
      time_cap_seconds: item.time_cap_seconds,
    });
    exercisesByWorkout.set(item.workout_id, list);
  });

  const assignmentsByWorkout = new Map();
  (assignments || []).forEach((assignment) => {
    const list = assignmentsByWorkout.get(assignment.workout_id) || [];
    list.push({
      id: assignment.id,
      student_id: assignment.student_id,
      student_name: assignedProfileMap.get(assignment.student_id)?.full_name || "Alumno asignado",
      status: assignment.status,
    });
    assignmentsByWorkout.set(assignment.workout_id, list);
  });

  return {
    students,
    workouts: workouts.map((workout) => ({
      ...workout,
      exercises: exercisesByWorkout.get(workout.id) || [],
      assignments: assignmentsByWorkout.get(workout.id) || [],
    })),
  };
}

async function findOrCreateExercise(supabase, exerciseInput) {
  if (exerciseInput.exerciseId) return exerciseInput.exerciseId;
  if (!exerciseInput.name) return null;

  const { data: matches, error: findError } = await supabase
    .from("pb_exercises")
    .select("id")
    .eq("name", exerciseInput.name)
    .limit(1);

  if (findError) throw findError;
  if (matches?.[0]?.id) return matches[0].id;

  const { data: exercise, error: exerciseError } = await supabase
    .from("pb_exercises")
    .insert({
      name: exerciseInput.name,
      description: exerciseInput.description,
      movement_type: exerciseInput.movementType,
      video_url: exerciseInput.videoUrl,
    })
    .select("id")
    .single();

  if (exerciseError) throw exerciseError;
  return exercise?.id || null;
}

function normalizeExerciseInput(item) {
  const exerciseId = clean(item.exercise_id, 90);
  const name = clean(item.exercise_name || item.name, 140);
  const description = clean(item.exercise_description || item.description, 500);
  const movementType = clean(item.movement_type, 80);
  const videoUrl = clean(item.video_url, 500);
  const prescription = clean(item.prescription, 500);
  const sets = cleanNumber(item.sets);
  const reps = clean(item.reps, 80);
  const timeCapSeconds = cleanNumber(item.time_cap_seconds);

  if (!name && !isUuid(exerciseId)) return null;

  return {
    exerciseId: isUuid(exerciseId) ? exerciseId : "",
    name,
    description,
    movementType,
    videoUrl,
    prescription,
    sets,
    reps,
    timeCapSeconds,
  };
}

function buildWorkoutExercises(body) {
  const exercises = parseJsonArray(body.exercises_json)
    .map(normalizeExerciseInput)
    .filter(Boolean)
    .slice(0, 40);

  if (exercises.length) return exercises;

  const legacyExercise = normalizeExerciseInput({
    exercise_id: body.exercise_id,
    exercise_name: body.exercise_name,
    exercise_description: body.exercise_description,
    movement_type: body.movement_type,
    video_url: body.video_url,
    prescription: body.prescription,
    sets: body.sets,
    reps: body.reps,
    time_cap_seconds: body.time_cap_seconds,
  });

  return legacyExercise ? [legacyExercise] : [];
}

async function createWorkout(supabase, body) {
  const title = clean(body.title, 140);
  const summary = clean(body.summary, 500);
  const workoutDate = cleanDate(body.workout_date);
  const level = clean(body.level, 80);
  const notes = clean(body.notes, 800);
  const workoutExercises = buildWorkoutExercises(body);
  const studentId = clean(body.student_id, 90);

  if (!title) {
    const error = new Error("El titulo de la rutina es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const { data: workout, error: workoutError } = await supabase
    .from("pb_workouts")
    .insert({
      title,
      summary,
      workout_date: workoutDate,
      level,
      notes,
    })
    .select("id, title")
    .single();

  if (workoutError) throw workoutError;
  const workoutId = workout?.id;

  if (!workoutId) {
    const error = new Error("Supabase no devolvio la rutina creada.");
    error.statusCode = 500;
    throw error;
  }

  if (workoutExercises.length) {
    const rows = [];

    for (const [index, exercise] of workoutExercises.entries()) {
      const resolvedExerciseId = await findOrCreateExercise(supabase, exercise);
      rows.push({
        workout_id: workoutId,
        exercise_id: resolvedExerciseId,
        position: index + 1,
        prescription: exercise.prescription,
        sets: exercise.sets,
        reps: exercise.reps,
        time_cap_seconds: exercise.timeCapSeconds,
      });
    }

    const { error: workoutExerciseError } = await supabase.from("pb_workout_exercises").insert(rows);
    if (workoutExerciseError) throw workoutExerciseError;
  }

  if (studentId) {
    const { error: assignmentError } = await supabase.from("pb_workout_assignments").insert({
      workout_id: workoutId,
      student_id: studentId,
    });

    if (assignmentError) throw assignmentError;
  }

  return {
    id: workoutId,
    title: workout.title,
  };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const payload = await listWorkouts(supabase);
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createWorkout(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Rutina creada correctamente.",
          workout: created,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin workouts endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
