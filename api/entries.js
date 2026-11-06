// GET  /api/entries            -> public, returns the saved work entries
// PUT  /api/entries            -> owner only: { password, entries } replaces the whole list
const { loadEntries, saveEntries, authorize, sanitize } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      return res.status(200).json({ entries: await loadEntries() });
    }
    if (req.method === "PUT") {
      const body = req.body || {};
      if (!(await authorize(req, res, body.password))) return;
      let clean;
      try { clean = sanitize(body.entries); } catch (e) { return res.status(400).json({ error: e.message }); }
      await saveEntries(clean);
      return res.status(200).json({ entries: clean });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error. Check the database settings." });
  }
};
