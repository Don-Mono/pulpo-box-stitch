const routeHandlers = {
  "leads": require("../server/api/leads"),
  "site": require("../server/api/site"),
  "admin/access-reset": require("../server/api/admin/access-reset"),
  "admin/coach-detail": require("../server/api/admin/coach-detail"),
  "admin/coaches": require("../server/api/admin/coaches"),
  "admin/exercises": require("../server/api/admin/exercises"),
  "admin/locations": require("../server/api/admin/locations"),
  "admin/login": require("../server/api/admin/login"),
  "admin/logout": require("../server/api/admin/logout"),
  "admin/me": require("../server/api/admin/me"),
  "admin/medical": require("../server/api/admin/medical"),
  "admin/progress": require("../server/api/admin/progress"),
  "admin/results": require("../server/api/admin/results"),
  "admin/site": require("../server/api/admin/site"),
  "admin/student-detail": require("../server/api/admin/student-detail"),
  "admin/students": require("../server/api/admin/students"),
  "admin/upload": require("../server/api/admin/upload"),
  "admin/workouts": require("../server/api/admin/workouts"),
  "auth/change-password": require("../server/api/auth/change-password"),
  "auth/login": require("../server/api/auth/login"),
  "auth/logout": require("../server/api/auth/logout"),
  "auth/me": require("../server/api/auth/me"),
  "coach/overview": require("../server/api/coach/overview"),
  "coach/results": require("../server/api/coach/results"),
  "coach/student-detail": require("../server/api/coach/student-detail"),
  "coach/workouts": require("../server/api/coach/workouts"),
  "student/overview": require("../server/api/student/overview"),
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
  const routeHandler = routeHandlers[routePath];

  if (!routeHandler) {
    return res.status(404).json({ error: "Ruta API no encontrada." });
  }

  return routeHandler(req, res);
};
