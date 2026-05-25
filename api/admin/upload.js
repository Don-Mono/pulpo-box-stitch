const path = require("node:path");
const { getSupabase, json, requireAdmin } = require("../_shared");

const DEFAULT_MAX_UPLOAD_MB = 3;
const MAX_UPLOAD_MB = Number(process.env.MAX_ADMIN_UPLOAD_MB || DEFAULT_MAX_UPLOAD_MB);
const MAX_UPLOAD_BYTES = Math.max(1, Math.min(MAX_UPLOAD_MB, 5)) * 1024 * 1024;

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const error = new Error(`La imagen supera ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`);
    error.statusCode = 400;
    throw error;
  }

  return { buffer, mimeType };
}

function safeFileName(name, mimeType) {
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const base = path
    .basename(String(name || "imagen"), path.extname(String(name || "")))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `${Date.now()}-${base || "imagen"}${ext}`;
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
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed) return json(res, 400, { error: "Formato de imagen invalido." });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "pulpo-box-assets";
    const supabase = getSupabase();
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => null);

    const filePath = `site/${safeFileName(body.fileName, parsed.mimeType)}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, parsed.buffer, {
      contentType: parsed.mimeType,
      upsert: true,
    });

    if (error) {
      error.statusCode = 500;
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return json(res, 200, { ok: true, url: data.publicUrl });
  } catch (error) {
    console.error("Admin upload failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "No se pudo subir la imagen." });
  }
};
