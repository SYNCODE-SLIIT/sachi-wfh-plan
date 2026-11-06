// Shared helpers for the API routes. Files starting with "_" are not exposed as routes by Vercel.
const crypto = require("crypto");

const KEY = "wfh:entries";
const MAX_FAILS = 8;          // wrong passwords allowed per IP ...
const FAIL_WINDOW_SEC = 900;  // ... in this many seconds (15 min)

function env() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    password: process.env.EDIT_PASSWORD,
  };
}

async function call(path, body) {
  const { url, token } = env();
  if (!url || !token) throw new Error("Database is not configured (missing Upstash/KV env vars).");
  const r = await fetch(url + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j && j.error) || "Database error");
  return j;
}
const redis = async cmd => { const j = await call("", cmd); if (j.error) throw new Error(j.error); return j.result; };
const pipeline = cmds => call("/pipeline", cmds);

async function loadEntries() {
  const raw = await redis(["GET", KEY]);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
const saveEntries = list => redis(["SET", KEY, JSON.stringify(list)]);

const sha = s => crypto.createHash("sha256").update(String(s)).digest();
function passwordMatches(given) {
  const { password } = env();
  return !!password && crypto.timingSafeEqual(sha(given ?? ""), sha(password));
}

// Checks the password with a per-IP lockout. Returns true if allowed; otherwise it has already answered.
async function authorize(req, res, given) {
  if (!env().password) { res.status(500).json({ error: "EDIT_PASSWORD is not set on the server." }); return false; }
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const failKey = "wfh:fail:" + ip;
  const fails = Number(await redis(["GET", failKey])) || 0;
  if (fails >= MAX_FAILS) { res.status(429).json({ error: "Too many wrong attempts. Try again in a few minutes." }); return false; }
  if (!passwordMatches(given)) {
    await pipeline([["INCR", failKey], ["EXPIRE", failKey, FAIL_WINDOW_SEC]]);
    res.status(401).json({ error: "Wrong password." });
    return false;
  }
  if (fails) await redis(["DEL", failKey]);
  return true;
}

const isDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = s => s === "" || (typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s));

// Validates what the page sends and keeps only the fields we store.
function sanitize(list) {
  if (!Array.isArray(list) || list.length > 500) throw new Error("Invalid entries.");
  return list.map(e => {
    if (!e || !isDate(e.date) || !isTime(e.from ?? "") || !isTime(e.to ?? "")) throw new Error("Invalid entry.");
    return {
      id: typeof e.id === "string" && /^[\w-]{1,40}$/.test(e.id) ? e.id : crypto.randomUUID(),
      date: e.date,
      from: e.from ?? "",
      to: e.to ?? "",
      title: String(e.title ?? "").trim().slice(0, 120),
      desc: String(e.desc ?? "").trim().slice(0, 1000),
    };
  });
}

module.exports = { loadEntries, saveEntries, authorize, sanitize };
