const routeHandlers = {
  leads: require("../server/api/leads"),
  site: require("../server/api/site"),
};

function getRoute(req) {
  if (typeof req.query?.route === "string") return req.query.route;
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
}

module.exports = async function handler(req, res) {
  const routeHandler = routeHandlers[getRoute(req)];
  if (!routeHandler) return res.status(404).json({ error: "Ruta API no encontrada." });
  return routeHandler(req, res);
};
