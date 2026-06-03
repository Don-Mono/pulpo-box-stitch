const { getSupabase, json, requireAdmin } = require("../_shared");

const LOCATION_LIMIT = 100;

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

function setupPayload() {
  return {
    locations: [],
    setupRequired: true,
    message: "Para activar sedes debes ejecutar primero supabase_management_schema.sql en Supabase.",
  };
}

async function listLocations(supabase) {
  const [{ data: locations, error: locationsError }, { data: students, error: studentsError }] = await Promise.all([
    supabase
      .from("pb_locations")
      .select("id, name, address, phone, whatsapp_number, is_active, created_at, updated_at")
      .order("name", { ascending: true })
      .limit(LOCATION_LIMIT),
    supabase.from("pb_students").select("profile_id, location_id").limit(1000),
  ]);

  if (locationsError) throw locationsError;
  if (studentsError) throw studentsError;

  const studentCountMap = new Map();
  (students || []).forEach((student) => {
    if (!student.location_id) return;
    studentCountMap.set(student.location_id, (studentCountMap.get(student.location_id) || 0) + 1);
  });

  return (locations || []).map((location) => ({
    ...location,
    student_count: studentCountMap.get(location.id) || 0,
  }));
}

async function createLocation(supabase, body) {
  const name = clean(body.name, 120);
  const address = clean(body.address, 220) || null;
  const phone = clean(body.phone, 40) || null;
  const whatsappNumber = clean(body.whatsapp_number, 40) || null;
  const isActive = !Object.prototype.hasOwnProperty.call(body, "is_active") || isChecked(body.is_active);

  if (!name) {
    const error = new Error("El nombre de la sede es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("pb_locations")
    .insert({
      name,
      address,
      phone,
      whatsapp_number: whatsappNumber,
      is_active: isActive,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateLocation(supabase, body) {
  const id = clean(body.id, 90);

  if (!id) {
    const error = new Error("Falta la sede a actualizar.");
    error.statusCode = 400;
    throw error;
  }

  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = clean(body.name, 120);
    if (!name) {
      const error = new Error("El nombre de la sede es obligatorio.");
      error.statusCode = 400;
      throw error;
    }
    patch.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "address")) {
    patch.address = clean(body.address, 220) || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    patch.phone = clean(body.phone, 40) || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "whatsapp_number")) {
    patch.whatsapp_number = clean(body.whatsapp_number, 40) || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    patch.is_active = isChecked(body.is_active);
  }

  const { data, error } = await supabase
    .from("pb_locations")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const locations = await listLocations(supabase);
        return json(res, 200, { locations, setupRequired: false });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 200, setupPayload());
        throw error;
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const created = await createLocation(supabase, body);
        return json(res, 201, { ok: true, id: created?.id || "", message: "Sede creada correctamente." });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      try {
        const updated = await updateLocation(supabase, body);
        return json(res, 200, { ok: true, id: updated?.id || "", message: "Sede actualizada correctamente." });
      } catch (error) {
        if (isMissingManagementSchema(error)) return json(res, 503, setupPayload());
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin locations endpoint failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
