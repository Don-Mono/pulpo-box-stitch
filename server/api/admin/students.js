const crypto = require("node:crypto");
const { getSupabase, json, requireAdmin } = require("../_shared");

const DEFAULT_STUDENT_PAGE_SIZE = 20;
const MAX_STUDENT_PAGE_SIZE = 50;

function clean(value, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
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
    coaches: [],
    locations: [],
    pagination: {
      total: 0,
      page: 1,
      pageSize: DEFAULT_STUDENT_PAGE_SIZE,
      totalPages: 1,
    },
    filters: {
      q: "",
      coachId: "",
      locationId: "",
      status: "",
    },
    setupRequired: true,
    message: "Para activar alumnos debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listStudents(supabase, options = {}) {
  const page = cleanPositiveInteger(options.page, 1);
  const requestedPageSize = cleanPositiveInteger(options.pageSize, DEFAULT_STUDENT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_STUDENT_PAGE_SIZE);
  const search = clean(options.q, 120);
  const coachId = clean(options.coachId, 90);
  const locationId = clean(options.locationId, 90);
  const status = ["active", "inactive"].includes(clean(options.status, 24).toLowerCase())
    ? clean(options.status, 24).toLowerCase()
    : "";

  let matchingProfileIds = null;

  if (search || status) {
    let profilesQuery = supabase
      .from("pb_profiles")
      .select("id")
      .eq("role", "student");

    if (status === "active") profilesQuery = profilesQuery.eq("is_active", true);
    if (status === "inactive") profilesQuery = profilesQuery.eq("is_active", false);

    if (search) {
      const escapedSearch = search.replaceAll(",", " ").trim();
      profilesQuery = profilesQuery.or([
        `full_name.ilike.%${escapedSearch}%`,
        `email.ilike.%${escapedSearch}%`,
        `phone.ilike.%${escapedSearch}%`,
      ].join(","));
    }

    const { data: profileMatches, error: profileMatchesError } = await profilesQuery.limit(5000);
    if (profileMatchesError) throw profileMatchesError;
    matchingProfileIds = (profileMatches || []).map((profile) => profile.id);

    if (!matchingProfileIds.length) {
      return {
        students: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        },
      };
    }
  }

  let studentsQuery = supabase
    .from("pb_students")
    .select("profile_id, location_id, primary_coach_id, goal, height_cm, current_weight_kg, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (coachId) studentsQuery = studentsQuery.eq("primary_coach_id", coachId);
  if (locationId) studentsQuery = studentsQuery.eq("location_id", locationId);
  if (matchingProfileIds) studentsQuery = studentsQuery.in("profile_id", matchingProfileIds);

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const { data: students, count: totalStudents, error } = await studentsQuery.range(rangeFrom, rangeTo);

  if (error) throw error;
  if (!students?.length) {
    return {
      students: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      },
    };
  }

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

  const total = Math.max(Number(totalStudents || 0), 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);

  return {
    students: students.map((student) => ({
      id: student.profile_id,
      primary_coach_id: student.primary_coach_id || "",
      location_id: student.location_id || "",
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
    })),
    pagination: {
      total,
      page: normalizedPage,
      pageSize,
      totalPages,
    },
  };
}

async function listCoaches(supabase) {
  const { data: coaches, error } = await supabase.from("pb_coaches").select("profile_id").limit(100);
  if (error) throw error;
  if (!coaches?.length) return [];

  const profileIds = coaches.map((coach) => coach.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email")
    .in("id", profileIds)
    .eq("role", "coach")
    .eq("is_active", true);

  if (profilesError) throw profilesError;
  return profiles || [];
}

async function listLocations(supabase) {
  const { data: locations, error } = await supabase
    .from("pb_locations")
    .select("id, name, is_active")
    .order("name", { ascending: true })
    .limit(100);

  if (error) throw error;
  return locations || [];
}

async function createStudent(supabase, body) {
  const fullName = clean(body.full_name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const goal = clean(body.goal, 280);
  const primaryCoachId = clean(body.primary_coach_id, 90) || null;
  const locationId = clean(body.location_id, 90) || null;
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
      location_id: locationId,
      primary_coach_id: primaryCoachId,
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
      const query = getQuery(req);
      try {
        const [studentsPayload, coaches, locations] = await Promise.all([
          listStudents(supabase, {
            page: query.page,
            pageSize: query.page_size,
            q: query.q,
            coachId: query.coach_id,
            locationId: query.location_id,
            status: query.status,
          }),
          listCoaches(supabase),
          listLocations(supabase),
        ]);
        return json(res, 200, {
          students: studentsPayload.students,
          pagination: studentsPayload.pagination,
          filters: {
            q: clean(query.q, 120),
            coachId: clean(query.coach_id, 90),
            locationId: clean(query.location_id, 90),
            status: ["active", "inactive"].includes(clean(query.status, 24).toLowerCase())
              ? clean(query.status, 24).toLowerCase()
              : "",
          },
          coaches,
          locations,
          setupRequired: false,
        });
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
