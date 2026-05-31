const { getSupabase, json, requireRole } = require("../_shared");

function clean(value, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

module.exports = async function handler(req, res) {
  const session = requireRole(req, res, ["coach", "student"]);
  if (!session) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    if (session.provider !== "supabase" || !session.userId) {
      return json(res, 403, { error: "Este tipo de acceso no permite cambio de clave desde aqui." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const newPassword = clean(body.new_password, 120);
    const confirmPassword = clean(body.confirm_password, 120);

    if (!newPassword || !confirmPassword) {
      return json(res, 400, { error: "Debes completar la nueva clave y su confirmacion." });
    }

    if (newPassword !== confirmPassword) {
      return json(res, 400, { error: "La confirmacion no coincide con la nueva clave." });
    }

    if (newPassword.length < 8) {
      return json(res, 400, { error: "La nueva clave debe tener al menos 8 caracteres." });
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.admin.updateUserById(session.userId, {
      password: newPassword,
    });

    if (error) throw error;

    return json(res, 200, {
      ok: true,
      message: "Clave actualizada correctamente. Usa esta nueva clave en tu proximo ingreso.",
    });
  } catch (error) {
    console.error("Change password failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
