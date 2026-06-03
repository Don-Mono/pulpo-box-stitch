const routeHandlers = {
  "leads": "../server/api/leads",
  "site": "../server/api/site",
  "admin/access-reset": "../server/api/admin/access-reset",
  "admin/coach-detail": "../server/api/admin/coach-detail",
  "admin/coaches": "../server/api/admin/coaches",
  "admin/exercises": "../server/api/admin/exercises",
  "admin/locations": "../server/api/admin/locations",
  "admin/login": "../server/api/admin/login",
  "admin/logout": "../server/api/admin/logout",
  "admin/me": "../server/api/admin/me",
  "admin/medical": "../server/api/admin/medical",
  "admin/progress": "../server/api/admin/progress",
  "admin/results": "../server/api/admin/results",
  "admin/site": "../server/api/admin/site",
  "admin/student-detail": "../server/api/admin/student-detail",
  "admin/students": "../server/api/admin/students",
  "admin/upload": "../server/api/admin/upload",
  "admin/workouts": "../server/api/admin/workouts",
  "auth/change-password": "../server/api/auth/change-password",
  "auth/login": "../server/api/auth/login",
  "auth/logout": "../server/api/auth/logout",
  "auth/me": "../server/api/auth/me",
  "coach/overview": "../server/api/coach/overview",
  "coach/results": "../server/api/coach/results",
  "coach/student-detail": "../server/api/coach/student-detail",
  "coach/workouts": "../server/api/coach/workouts",
  "student/overview": "../server/api/student/overview",
};

function getRoutePath(req) {
  const value = req.query?.path;
  if (Array.isArray(value)) return value.join("/");
  if (typeof value === "string") return value;

  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
}

module.exports = async function handler(req, res) {
  const routePath = getRoutePath(req);
  const handlerPath = routeHandlers[routePath];

  if (!handlerPath) {
    return res.status(404).json({ error: "Ruta API no encontrada." });
  }

  return require(handlerPath)(req, res);
};
