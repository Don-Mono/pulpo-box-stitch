const routeHandlers = {
  "change-password": require("../../server/api/auth/change-password"),
  login: require("../../server/api/auth/login"),
  logout: require("../../server/api/auth/logout"),
  me: require("../../server/api/auth/me"),
};

function getRoute(req) {
  if (typeof req.query?.route === "string") return req.query.route;
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.replace(/^\/api\/auth\/?/, "").replace(/\/$/, "");
}

module.exports = async function handler(req, res) {
  const routeHandler = routeHandlers[getRoute(req)];
  if (!routeHandler) return res.status(404).json({ error: "Ruta API no encontrada." });
  return routeHandler(req, res);
};
