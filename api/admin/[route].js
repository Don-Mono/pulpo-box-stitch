const routeHandlers = {
  "access-reset": require("../../server/api/admin/access-reset"),
  "coach-detail": require("../../server/api/admin/coach-detail"),
  coaches: require("../../server/api/admin/coaches"),
  exercises: require("../../server/api/admin/exercises"),
  locations: require("../../server/api/admin/locations"),
  login: require("../../server/api/admin/login"),
  logout: require("../../server/api/admin/logout"),
  me: require("../../server/api/admin/me"),
  medical: require("../../server/api/admin/medical"),
  progress: require("../../server/api/admin/progress"),
  results: require("../../server/api/admin/results"),
  site: require("../../server/api/admin/site"),
  "student-detail": require("../../server/api/admin/student-detail"),
  students: require("../../server/api/admin/students"),
  upload: require("../../server/api/admin/upload"),
  workouts: require("../../server/api/admin/workouts"),
};

function getRoute(req) {
  if (typeof req.query?.route === "string") return req.query.route;
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");
}

module.exports = async function handler(req, res) {
  const routeHandler = routeHandlers[getRoute(req)];
  if (!routeHandler) return res.status(404).json({ error: "Ruta API no encontrada." });
  return routeHandler(req, res);
};
