const routeHandlers = {
  overview: require("../../server/api/coach/overview"),
  results: require("../../server/api/coach/results"),
  "student-detail": require("../../server/api/coach/student-detail"),
  workouts: require("../../server/api/coach/workouts"),
};

function getRoute(req) {
  if (typeof req.query?.route === "string") return req.query.route;
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.replace(/^\/api\/coach\/?/, "").replace(/\/$/, "");
}

module.exports = async function handler(req, res) {
  const routeHandler = routeHandlers[getRoute(req)];
  if (!routeHandler) return res.status(404).json({ error: "Ruta API no encontrada." });
  return routeHandler(req, res);
};
