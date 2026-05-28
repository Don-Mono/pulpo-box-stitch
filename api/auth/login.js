const { createSessionCookie, getAdminConfig, json } = require("../_shared");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return require("node:crypto").timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const config = getAdminConfig();
    const email = clean(body.email).toLowerCase();
    const password = clean(body.password);

    if (!safeEqual(email, config.email) || !safeEqual(password, config.password)) {
      return json(res, 401, { error: "Correo o clave incorrectos." });
    }

    res.setHeader("Set-Cookie", createSessionCookie(config.email, req, "admin"));
    return json(res, 200, {
      ok: true,
      user: {
        email: config.email,
        role: "admin",
        name: "Administrador Pulpo Box",
      },
      redirectTo: "/dashboard.html",
    });
  } catch (error) {
    console.error("Role login failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
