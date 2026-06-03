const { json, readSiteContent, requireAdmin, saveSiteContent } = require("../_shared");

module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === "GET") {
      const content = await readSiteContent();
      return json(res, 200, { content });
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (!body.content || typeof body.content !== "object") {
        return json(res, 400, { error: "Contenido invalido." });
      }
      await saveSiteContent(body.content);
      return json(res, 200, { ok: true, content: body.content });
    }

    res.setHeader("Allow", "GET, PUT");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Admin site endpoint failed", error);
    return json(res, error.statusCode || 500, {
      error: error.message || "Error interno.",
      hint: "Verifica que exista public.site_content o public.site_settings en Supabase.",
    });
  }
};
