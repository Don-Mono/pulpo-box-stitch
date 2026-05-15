const { createClient } = require("@supabase/supabase-js");

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"];

function getSupabase() {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const error = new Error(`Missing environment variables: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const lead = {
      full_name: clean(body.full_name),
      phone: clean(body.phone),
      email: clean(body.email),
      preferred_location: clean(body.preferred_location) || "manuel_plaza",
      source: "pulpo_box_landing",
      user_agent: req.headers["user-agent"] || null,
    };

    if (!lead.full_name || !lead.phone) {
      return res.status(400).json({ error: "Nombre y telefono son obligatorios." });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("leads").insert(lead);

    if (error) {
      console.error("Supabase insert failed", error);
      return res.status(500).json({ error: "No pudimos guardar el contacto." });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Lead endpoint failed", error);
    return res.status(error.statusCode || 500).json({ error: "Error interno." });
  }
};
