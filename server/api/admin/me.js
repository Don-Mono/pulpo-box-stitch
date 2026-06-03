const { json, requireAdmin } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  return json(res, 200, { email: session.email, role: session.role || "admin" });
};
