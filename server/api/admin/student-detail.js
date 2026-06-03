const { getSupabase, json, requireAdmin } = require("../_shared");

const OPTION_LIMIT = 250;
const RESULT_LIMIT = 12;
const MEASUREMENT_LIMIT = 12;
const MEDICAL_NOTE_LIMIT = 8;

function clean(value, maxLength = 220) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
    students: [],
    coaches: [],
    locations: [],
    selectedStudentId: "",
    student: null,
    measurements: [],
    results: [],
    medicalNotes: [],
    summary: null,
    setupRequired: true,
    message: "La ficha de alumno para administracion aun no esta activa en Supabase.",
  };
}

async function listStudentOptions(supabase) {
  const { data: students, error } = await supabase
    .from("pb_students")
    .select("profile_id")
    .limit(OPTION_LIMIT);

  if (error) throw error;
  if (!students?.length) return [];

  const profileIds = students.map((student) => student.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, is_active")
    .in("id", profileIds)
    .eq("role", "student");

  if (profilesError) throw profilesError;
  return (profiles || [])
    .map((profile) => ({
      id: profile.id,
      full_name: `${profile.full_name}${profile.is_active === false ? " (Inactivo)" : ""}`,
      is_active: profile.is_active ?? true,
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "es"));
}

async function listCoachOptions(supabase) {
  const { data: coaches, error } = await supabase.from("pb_coaches").select("profile_id").limit(OPTION_LIMIT);
  if (error) throw error;
  if (!coaches?.length) return [];

  const profileIds = coaches.map((coach) => coach.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email")
    .in("id", profileIds)
    .eq("role", "coach");

  if (profilesError) throw profilesError;
  return profiles || [];
}

async function listLocationOptions(supabase) {
  const { data: locations, error } = await supabase
    .from("pb_locations")
    .select("id, name, is_active")
    .order("name", { ascending: true })
    .limit(OPTION_LIMIT);

  if (error) throw error;
  return locations || [];
}

async function loadStudentDetail(supabase, studentId) {
  const [students, coaches, locations] = await Promise.all([
    listStudentOptions(supabase),
    listCoachOptions(supabase),
    listLocationOptions(supabase),
  ]);

  const selectedStudentId = studentId || students[0]?.id || "";

  if (!selectedStudentId) {
    return {
      students,
      coaches,
      locations,
      selectedStudentId: "",
      student: null,
      measurements: [],
      results: [],
      medicalNotes: [],
      summary: null,
    };
  }

  const [
    { data: profile, error: profileError },
    { data: student, error: studentError },
    { data: measurements, error: measurementsError },
    { data: results, error: resultsError },
    { data: medicalNotes, error: medicalNotesError },
  ] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email, phone, is_active").eq("id", selectedStudentId).eq("role", "student").maybeSingle(),
    supabase
      .from("pb_students")
      .select("profile_id, location_id, primary_coach_id, goal, height_cm, current_weight_kg, emergency_contact_name, emergency_contact_phone, medical_consent_at, created_at, updated_at")
      .eq("profile_id", selectedStudentId)
      .maybeSingle(),
    supabase
      .from("pb_body_measurements")
      .select("id, measured_at, body_weight_kg, height_cm, waist_cm, chest_cm, hip_cm, notes")
      .eq("student_id", selectedStudentId)
      .order("measured_at", { ascending: false })
      .limit(MEASUREMENT_LIMIT),
    supabase
      .from("pb_performance_logs")
      .select("id, workout_id, exercise_id, logged_at, weight_kg, reps, rounds, time_seconds, score_text, student_notes, coach_notes")
      .eq("student_id", selectedStudentId)
      .order("logged_at", { ascending: false })
      .limit(RESULT_LIMIT),
    supabase
      .from("pb_medical_notes")
      .select("id, note_type, description, visible_to_coach, created_at")
      .eq("student_id", selectedStudentId)
      .order("created_at", { ascending: false })
      .limit(MEDICAL_NOTE_LIMIT),
  ]);

  if (profileError) throw profileError;
  if (studentError) throw studentError;
  if (measurementsError) throw measurementsError;
  if (resultsError) throw resultsError;
  if (medicalNotesError) throw medicalNotesError;

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
  const coachMap = new Map((coaches || []).map((coach) => [coach.id, coach]));
  const locationMap = new Map((locations || []).map((location) => [location.id, location]));
  const latestMeasurement = measurements?.[0] || null;

  return {
    students,
    coaches,
    locations,
    selectedStudentId,
    student: profile && student
      ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email || "",
        phone: profile.phone || "",
        is_active: profile.is_active ?? true,
        goal: student.goal || "",
        height_cm: student.height_cm,
        current_weight_kg: student.current_weight_kg,
        primary_coach_id: student.primary_coach_id || "",
        primary_coach_name: coachMap.get(student.primary_coach_id)?.full_name || "",
        location_id: student.location_id || "",
        location_name: locationMap.get(student.location_id)?.name || "",
        emergency_contact_name: student.emergency_contact_name || "",
        emergency_contact_phone: student.emergency_contact_phone || "",
        medical_consent_at: student.medical_consent_at || null,
        created_at: student.created_at || null,
        updated_at: student.updated_at || null,
      }
      : null,
    measurements: measurements || [],
    results: (results || []).map((result) => ({
      ...result,
      workout_title: workoutMap.get(result.workout_id)?.title || "",
      exercise_name: exerciseMap.get(result.exercise_id)?.name || "",
    })),
    medicalNotes: medicalNotes || [],
    summary: {
      latest_weight_kg: latestMeasurement?.body_weight_kg || student?.current_weight_kg || null,
      latest_height_cm: latestMeasurement?.height_cm || student?.height_cm || null,
      latest_waist_cm: latestMeasurement?.waist_cm || null,
      result_count: results?.length || 0,
      measurement_count: measurements?.length || 0,
      consent_status: student?.medical_consent_at ? "Registrado" : "Pendiente",
    },
  };
}

async function updateStudentDetail(supabase, body) {
  const id = clean(body.id, 90);
  const fullName = clean(body.full_name, 120);
  const phone = clean(body.phone, 40);
  const goal = clean(body.goal, 280);
  const primaryCoachId = clean(body.primary_coach_id, 90) || null;
  const locationId = clean(body.location_id, 90) || null;
  const emergencyContactName = clean(body.emergency_contact_name, 120);
  const emergencyContactPhone = clean(body.emergency_contact_phone, 40);
  const heightCm = cleanNumber(body.height_cm);
  const currentWeightKg = cleanNumber(body.current_weight_kg);
  const isActive = isChecked(body.is_active);
  const timestamp = new Date().toISOString();

  if (!id) {
    const error = new Error("Falta el alumno a actualizar.");
    error.statusCode = 400;
    throw error;
  }

  if (!fullName) {
    const error = new Error("El nombre del alumno es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const { error: profileError } = await supabase
    .from("pb_profiles")
    .update({
      full_name: fullName,
      phone,
      is_active: isActive,
      updated_at: timestamp,
    })
    .eq("id", id)
    .eq("role", "student");

  if (profileError) throw profileError;

  const { error: studentError } = await supabase
    .from("pb_students")
    .update({
      primary_coach_id: primaryCoachId,
      location_id: locationId,
      goal,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      updated_at: timestamp,
    })
    .eq("profile_id", id);

  if (studentError) throw studentError;

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
        const payload = await loadStudentDetail(supabase, clean(query.student_id, 90));
        return json(res, 200, { ...payload, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateStudentDetail(supabase, body);
        return json(res, 200, {
          ok: true,
          message: "Alumno actualizado correctamente.",
          student: updated,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin student detail endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
