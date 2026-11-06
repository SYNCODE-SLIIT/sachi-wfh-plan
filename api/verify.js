// POST /api/verify  { password }  -> { ok: true } when the edit password is right
const { authorize } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  try {
    if (!(await authorize(req, res, (req.body || {}).password))) return;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error. Check the database settings." });
  }
};
