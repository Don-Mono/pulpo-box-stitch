const crypto = require("node:crypto");
const { getSupabase, json, requireAdmin } = require("../_shared");

function clean(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const id = clean(body.id, 90);
    const role = clean(body.role, 30);

    if (!id || !["student", "coach"].includes(role)) {
      return json(res, 400, { error: "Debes indicar un usuario valido para regenerar el acceso." });
    }

    const supabase = getSupabase();
    const { data: profile, error: profileError } = await supabase
      .from("pb_profiles")
      .select("id, full_name, email, role")
      .eq("id", id)
      .eq("role", role)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return json(res, 404, { error: "No encontramos un perfil compatible para regenerar la clave." });
    }

    const temporaryPassword = crypto.randomBytes(9).toString("base64url");
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name || profile.email || role,
      },
      app_metadata: {
        role,
      },
    });

    if (authError) throw authError;

    return json(res, 200, {
      ok: true,
      message: `Clave temporal regenerada para ${profile.full_name || profile.email || role}.`,
      temporaryPassword,
      user: {
        id: profile.id,
        role,
        email: profile.email || "",
        full_name: profile.full_name || "",
      },
    });
  } catch (error) {
    console.error("Admin access reset failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
