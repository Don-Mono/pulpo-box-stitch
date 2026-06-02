const crypto = require("node:crypto");
const { getSupabase, json, requireAdmin } = require("../_shared");

const DEFAULT_COACH_PAGE_SIZE = 20;
const MAX_COACH_PAGE_SIZE = 50;

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
    coaches: [],
    pagination: {
      total: 0,
      page: 1,
      pageSize: DEFAULT_COACH_PAGE_SIZE,
      totalPages: 1,
    },
    filters: {
      q: "",
      status: "",
    },
    setupRequired: true,
    message: "Para activar coaches debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listCoaches(supabase, options = {}) {
  const page = cleanPositiveInteger(options.page, 1);
  const requestedPageSize = cleanPositiveInteger(options.pageSize, DEFAULT_COACH_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_COACH_PAGE_SIZE);
  const search = clean(options.q, 120);
  const status = ["active", "inactive"].includes(clean(options.status, 24).toLowerCase())
    ? clean(options.status, 24).toLowerCase()
    : "";

  let matchingProfileIds = null;

  if (search || status) {
    const normalizedSearch = search.replaceAll(",", " ").trim();
    let profilesQuery = supabase
      .from("pb_profiles")
      .select("id")
      .eq("role", "coach");

    if (status === "active") profilesQuery = profilesQuery.eq("is_active", true);
    if (status === "inactive") profilesQuery = profilesQuery.eq("is_active", false);

    if (search) {
      profilesQuery = profilesQuery.or([
        `full_name.ilike.%${normalizedSearch}%`,
        `email.ilike.%${normalizedSearch}%`,
        `phone.ilike.%${normalizedSearch}%`,
      ].join(","));
    }

    const [profileResponse, coachSearchResponse] = await Promise.all([
      profilesQuery.limit(5000),
      search
        ? supabase
          .from("pb_coaches")
          .select("profile_id")
          .or([
            `specialty.ilike.%${normalizedSearch}%`,
            `bio.ilike.%${normalizedSearch}%`,
          ].join(","))
          .limit(5000)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const { data: profileMatches, error: profileMatchesError } = profileResponse;
    const { data: coachSearchMatches, error: coachSearchError } = coachSearchResponse;
    if (profileMatchesError) throw profileMatchesError;
    if (coachSearchError) throw coachSearchError;
    matchingProfileIds = [...new Set([
      ...(profileMatches || []).map((profile) => profile.id),
      ...(coachSearchMatches || []).map((coach) => coach.profile_id),
    ])];

    if (!matchingProfileIds.length && !search) {
      return {
        coaches: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        },
      };
    }
  }

  let coachesQuery = supabase
    .from("pb_coaches")
    .select("profile_id, specialty, bio, photo_url, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (matchingProfileIds) {
    coachesQuery = coachesQuery.in("profile_id", matchingProfileIds);
  }

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const { data: coaches, count: totalCoaches, error } = await coachesQuery.range(rangeFrom, rangeTo);

  if (error) throw error;
  if (!coaches?.length) {
    return {
      coaches: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      },
    };
  }

  const profileIds = coaches.map((coach) => coach.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("pb_profiles")
    .select("id, full_name, email, phone, is_active")
    .in("id", profileIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const filteredCoaches = coaches.map((coach) => ({
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

  const total = Math.max(Number(totalCoaches || 0), 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);

  return {
    coaches: filteredCoaches,
    pagination: {
      total,
      page: normalizedPage,
      pageSize,
      totalPages,
    },
  };
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
      const query = getQuery(req);
      try {
        const coachesPayload = await listCoaches(supabase, {
          page: query.page,
          pageSize: query.page_size,
          q: query.q,
          status: query.status,
        });
        return json(res, 200, {
          coaches: coachesPayload.coaches,
          pagination: coachesPayload.pagination,
          filters: {
            q: clean(query.q, 120),
            status: ["active", "inactive"].includes(clean(query.status, 24).toLowerCase())
              ? clean(query.status, 24).toLowerCase()
              : "",
          },
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
