const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const COOKIE_NAME = "pb_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
let localEnvCache;

function json(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function readLocalEnvCache() {
  if (localEnvCache !== undefined) return localEnvCache;

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    localEnvCache = {};
    return localEnvCache;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    localEnvCache = {};
    return localEnvCache;
  }

  const content = fs.readFileSync(envPath, "utf8");
  localEnvCache = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!key) return accumulator;
      accumulator[key] = value;
      return accumulator;
    }, {});

  return localEnvCache;
}

function env(name) {
  const directValue = process.env[name];
  if (directValue !== undefined && directValue !== "") return directValue;

  const localValue = readLocalEnvCache()[name];
  return localValue !== undefined && localValue !== "" ? localValue : "";
}

function getSupabase() {
  const missing = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter((name) => !env(name));
  if (missing.length > 0) {
    const error = new Error(`Missing environment variables: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}

function getAdminConfig() {
  const missing = ["ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET"].filter((name) => !env(name));
  if (missing.length > 0) {
    const error = new Error(`Missing environment variables: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  if (String(env("SESSION_SECRET")).length < 32) {
    const error = new Error("SESSION_SECRET must be at least 32 characters.");
    error.statusCode = 500;
    throw error;
  }

  return {
    email: String(env("ADMIN_EMAIL")).toLowerCase(),
    password: String(env("ADMIN_PASSWORD")),
    secret: String(env("SESSION_SECRET")),
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const index = entry.indexOf("=");
        if (index === -1) return [entry, ""];
        return [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
      }),
  );
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionCookie(email, req, role = "admin", extra = {}) {
  const { secret } = getAdminConfig();
  const payload = Buffer.from(
    JSON.stringify({
      ...extra,
      email,
      role,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function getSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const secret = String(env("SESSION_SECRET") || "");
  const adminEmail = String(env("ADMIN_EMAIL") || "").toLowerCase();
  if (secret.length < 32) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload, secret) !== signature) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.exp < Date.now()) return null;
    const role = session.role || "admin";
    const provider = session.provider || "admin";
    const allowedRoles = ["admin", "coach", "student"];
    if (!allowedRoles.includes(role)) return null;
    if (provider === "admin" && String(session.email).toLowerCase() !== adminEmail) return null;
    if (provider === "supabase" && (!session.userId || !session.email)) return null;
    session.role = session.role || "admin";
    return session;
  } catch {
    return null;
  }
}

function requireAdmin(req, res) {
  try {
    const session = getSession(req);
    if (!session || session.role !== "admin") {
      json(res, 401, { error: "No autorizado." });
      return null;
    }
    return session;
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.message || "Error interno." });
    return null;
  }
}

function requireRole(req, res, roles) {
  try {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const session = getSession(req);
    if (!session || !allowedRoles.includes(session.role)) {
      json(res, 401, { error: "No autorizado." });
      return null;
    }
    return session;
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.message || "Error interno." });
    return null;
  }
}

async function readSiteContent() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("site_content").select("content").eq("id", "main").maybeSingle();

  if (error) {
    if (error.code !== "PGRST205") {
      error.statusCode = 500;
      throw error;
    }

    const fallback = await supabase.from("site_settings").select("json").eq("id", 1).maybeSingle();
    if (fallback.error) {
      fallback.error.statusCode = 500;
      throw fallback.error;
    }

    return fallback.data?.json || null;
  }

  return data?.content || null;
}

async function saveSiteContent(content) {
  const supabase = getSupabase();
  const { error } = await supabase.from("site_content").upsert({
    id: "main",
    content,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code !== "PGRST205") {
      error.statusCode = 500;
      throw error;
    }

    const fallback = await supabase.from("site_settings").upsert({
      id: 1,
      json: content,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (fallback.error) {
      fallback.error.statusCode = 500;
      throw fallback.error;
    }
  }
}

module.exports = {
  clearSessionCookie,
  createSessionCookie,
  getAdminConfig,
  env,
  getSession,
  getSupabase,
  json,
  readSiteContent,
  requireAdmin,
  requireRole,
  saveSiteContent,
};
