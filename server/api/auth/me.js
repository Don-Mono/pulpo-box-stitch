const { getSession, json } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const session = getSession(req);
    if (!session) return json(res, 401, { error: "No autorizado." });

    return json(res, 200, {
      user: {
        email: session.email,
        role: session.role || "admin",
        name: session.name || (session.role === "admin" ? "Administrador Pulpo Box" : session.email),
        userId: session.userId || null,
      },
    });
  } catch (error) {
    console.error("Session read failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
