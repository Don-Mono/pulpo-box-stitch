const { createSessionCookie, getAdminConfig, getSupabase, json } = require("../_shared");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return require("node:crypto").timingSafeEqual(left, right);
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

function redirectForRole(role) {
  if (role === "student") return "/student.html";
  return "/dashboard.html";
}

async function trySupabaseLogin(email, password, req, res) {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.user?.id) {
    return json(res, 401, { error: "Correo o clave incorrectos." });
  }

  const { data: profile, error: profileError } = await supabase
    .from("pb_profiles")
    .select("id, role, full_name, email, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    if (isMissingManagementSchema(profileError)) {
      return json(res, 503, { error: "El acceso de coaches y alumnos aun no esta activo en Supabase." });
    }
    throw profileError;
  }

  if (!profile || !profile.is_active) {
    return json(res, 403, { error: "Usuario sin perfil activo. Contacta a administracion." });
  }

  const role = profile.role || "student";
  if (!["admin", "coach", "student"].includes(role)) {
    return json(res, 403, { error: "Rol no autorizado." });
  }

  res.setHeader("Set-Cookie", createSessionCookie(profile.email || email, req, role, {
    userId: profile.id,
    name: profile.full_name || profile.email || email,
    provider: "supabase",
  }));

  return json(res, 200, {
    ok: true,
    user: {
      email: profile.email || email,
      role,
      name: profile.full_name || profile.email || email,
    },
    redirectTo: redirectForRole(role),
  });
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

    if (safeEqual(email, config.email) && safeEqual(password, config.password)) {
      res.setHeader("Set-Cookie", createSessionCookie(config.email, req, "admin", {
        name: "Administrador Pulpo Box",
        provider: "admin",
      }));
      return json(res, 200, {
        ok: true,
        user: {
          email: config.email,
          role: "admin",
          name: "Administrador Pulpo Box",
        },
        redirectTo: "/dashboard.html",
      });
    }

    return trySupabaseLogin(email, password, req, res);
  } catch (error) {
    console.error("Role login failed", error);
    return json(res, error.statusCode || 500, { error: error.message || "Error interno." });
  }
};
