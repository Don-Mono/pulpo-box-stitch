const { json, readSiteContent } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const content = await readSiteContent();
    return json(res, 200, { content });
  } catch (error) {
    console.error("Public site content read failed", error);
    return json(res, 200, { content: null, warning: "Site content storage is not configured yet." });
  }
};
