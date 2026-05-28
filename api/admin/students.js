const crypto = require("node:crypto");
const { getSupabase, json, requireAdmin } = require("../_shared");

const STUDENT_LIMIT = 100;

function clean(value, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
    setupRequired: true,
    message: "Para activar alumnos debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listStudents(supabase) {
  const { data: students, error } = await supabase
    .from("pb_students")
    .select("profile_id, location_id, primary_coach_id, goal, height_cm, current_weight_kg, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(STUDENT_LIMIT);

  if (error) throw error;
  if (!students?.length) return [];

  const profileIds = students.map((student) => student.profile_id);
  const locationIds = [...new Set(students.map((student) => student.location_id).filter(Boolean))];
  const coachIds = [...new Set(students.map((student) => student.primary_coach_id).filter(Boolean))];

  const [{ data: profiles, error: profilesError }, { data: locations, error: locationsError }, { data: coachProfiles, error: coachProfilesError }] = await Promise.all([
    supabase.from("pb_profiles").select("id, full_name, email, phone, is_active").in("id", profileIds),
    locationIds.length
      ? supabase.from("pb_locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
    coachIds.length
      ? supabase.from("pb_profiles").select("id, full_name").in("id", coachIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesError) throw profilesError;
  if (locationsError) throw locationsError;
  if (coachProfilesError) throw coachProfilesError;

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const locationMap = new Map((locations || []).map((location) => [location.id, location]));
  const coachMap = new Map((coachProfiles || []).map((coach) => [coach.id, coach]));

  return students.map((student) => ({
    id: student.profile_id,
    full_name: profileMap.get(student.profile_id)?.full_name || "Alumno sin nombre",
    email: profileMap.get(student.profile_id)?.email || "",
    phone: profileMap.get(student.profile_id)?.phone || "",
    is_active: profileMap.get(student.profile_id)?.is_active ?? true,
    location_name: locationMap.get(student.location_id)?.name || "",
    coach_name: coachMap.get(student.primary_coach_id)?.full_name || "",
    goal: student.goal || "",
    height_cm: student.height_cm,
    current_weight_kg: student.current_weight_kg,
    created_at: student.created_at,
  }));
}

async function createStudent(supabase, body) {
  const fullName = clean(body.full_name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const goal = clean(body.goal, 280);
  const heightCm = body.height_cm === "" || body.height_cm == null ? null : Number(body.height_cm);
  const currentWeightKg = body.current_weight_kg === "" || body.current_weight_kg == null ? null : Number(body.current_weight_kg);

  if (!fullName) {
    const error = new Error("El nombre del alumno es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Necesitas un email valido para crear acceso de alumno.");
    error.statusCode = 400;
    throw error;
  }

  if ((heightCm !== null && !Number.isFinite(heightCm)) || (currentWeightKg !== null && !Number.isFinite(currentWeightKg))) {
    const error = new Error("Estatura y peso deben ser numeros validos.");
    error.statusCode = 400;
    throw error;
  }

  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role: "student",
    },
  });

  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) {
    const error = new Error("Supabase no devolvio el usuario creado.");
    error.statusCode = 500;
    throw error;
  }

  try {
    const { error: profileError } = await supabase.from("pb_profiles").insert({
      id: userId,
      role: "student",
      full_name: fullName,
      email,
      phone,
    });

    if (profileError) throw profileError;

    const { error: studentError } = await supabase.from("pb_students").insert({
      profile_id: userId,
      goal,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
    });

    if (studentError) throw studentError;
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId).catch((cleanupError) => {
      console.error("Could not cleanup student auth user", cleanupError);
    });
    throw error;
  }

  return {
    id: userId,
    temporaryPassword,
  };
}

async function updateStudentStatus(supabase, body) {
  const id = clean(body.id, 80);
  const isActive = body.is_active === true || body.is_active === "true";
  if (!id) {
    const error = new Error("Falta el alumno a actualizar.");
    error.statusCode = 400;
    throw error;
  }

  const { error } = await supabase
    .from("pb_profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "student");

  if (error) throw error;
  return { id, is_active: isActive };
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const students = await listStudents(supabase);
        return json(res, 200, { students, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createStudent(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Alumno creado. Guarda la clave temporal y entregala de forma privada.",
          temporaryPassword: created.temporaryPassword,
          studentId: created.id,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateStudentStatus(supabase, body);
        return json(res, 200, { ok: true, student: updated });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin students endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
