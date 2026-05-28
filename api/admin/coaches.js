const crypto = require("node:crypto");
const { getSupabase, json, requireAdmin } = require("../_shared");

const COACH_LIMIT = 100;

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
    coaches: [],
    setupRequired: true,
    message: "Para activar coaches debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listCoaches(supabase) {
  const { data: coaches, error } = await supabase
    .from("pb_coaches")
    .select("profile_id, specialty, bio, photo_url, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(COACH_LIMIT);

  if (error) throw error;
  if (!coaches?.length) return [];

  const profileIds = coaches.map((coach) => coach.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email, phone, is_active")
    .in("id", profileIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return coaches.map((coach) => ({
    id: coach.profile_id,
    full_name: profileMap.get(coach.profile_id)?.full_name || "Coach sin nombre",
    email: profileMap.get(coach.profile_id)?.email || "",
    phone: profileMap.get(coach.profile_id)?.phone || "",
    is_active: profileMap.get(coach.profile_id)?.is_active ?? true,
    specialty: coach.specialty || "",
    bio: coach.bio || "",
    photo_url: coach.photo_url || "",
    created_at: coach.created_at,
  }));
}

async function createCoach(supabase, body) {
  const fullName = clean(body.full_name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const specialty = clean(body.specialty, 120);
  const bio = clean(body.bio, 500);
  const photoUrl = clean(body.photo_url, 500);

  if (!fullName) {
    const error = new Error("El nombre del coach es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Necesitas un email valido para crear acceso de coach.");
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
      role: "coach",
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
      role: "coach",
      full_name: fullName,
      email,
      phone,
      avatar_url: photoUrl,
    });

    if (profileError) throw profileError;

    const { error: coachError } = await supabase.from("pb_coaches").insert({
      profile_id: userId,
      specialty,
      bio,
      photo_url: photoUrl,
    });

    if (coachError) throw coachError;
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId).catch((cleanupError) => {
      console.error("Could not cleanup coach auth user", cleanupError);
    });
    throw error;
  }

  return {
    id: userId,
    temporaryPassword,
  };
}

async function updateCoachStatus(supabase, body) {
  const id = clean(body.id, 80);
  const isActive = body.is_active === true || body.is_active === "true";

  if (!id) {
    const error = new Error("Falta el coach a actualizar.");
    error.statusCode = 400;
    throw error;
  }

  const { error } = await supabase
    .from("pb_profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "coach");

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
        const coaches = await listCoaches(supabase);
        return json(res, 200, { coaches, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createCoach(supabase, body);
        return json(res, 201, {
          ok: true,
          message: "Coach creado. Guarda la clave temporal y entregala de forma privada.",
          temporaryPassword: created.temporaryPassword,
          coachId: created.id,
        });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateCoachStatus(supabase, body);
        return json(res, 200, { ok: true, coach: updated });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin coaches endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
