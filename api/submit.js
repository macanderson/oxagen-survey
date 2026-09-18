// POST /api/submit  {answers: {...}, email, contact_ok, website}
// Stores the response, and enters the email in the drawing once. A second submission from the
// same email is kept (flagged duplicate) but does not add an entry.
import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { SURVEY_ID, json, readBody, isEmail, normalizeEmail, emailHash, readJson } from "./_lib.js";

const MAX_FIELD = 2000;
const MAX_ANSWERS = 40;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "POST only" });
  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { ok: false, error: "Could not read the form." }); }

  // Honeypot: a field no person fills in. Pretend success so a bot learns nothing.
  if (body.website) return json(res, 200, { ok: true, entered: true });

  const email = normalizeEmail(body.email);
  if (!isEmail(email)) return json(res, 400, { ok: false, error: "Enter a valid email so we can reach you if you win." });

  const answers = {};
  const src = body.answers && typeof body.answers === "object" ? body.answers : {};
  for (const [k, v] of Object.entries(src).slice(0, MAX_ANSWERS)) {
    const key = String(k).slice(0, 40);
    answers[key] = Array.isArray(v) ? v.slice(0, 20).map((x) => String(x).slice(0, 200)) : String(v ?? "").slice(0, MAX_FIELD);
  }
  if (!Object.keys(answers).length) return json(res, 400, { ok: false, error: "Answer the questions first." });

  const ts = new Date().toISOString();
  const id = randomBytes(6).toString("hex");
  const hash = emailHash(email);
  const entryPath = `entries/${hash}.json`;

  let existing = null;
  try { existing = await readJson(entryPath); } catch { existing = null; }

  const response = {
    survey: SURVEY_ID, ts, id, email, email_hash: hash,
    contact_ok: !!body.contact_ok,
    duplicate: !!existing,
    ua: String(req.headers["user-agent"] || "").slice(0, 200),
    answers,
  };
  const opts = { access: "private", addRandomSuffix: false, contentType: "application/json" };
  try {
    await put(`responses/${ts.replace(/[:.]/g, "-")}-${id}.json`, JSON.stringify(response), opts);
    if (!existing) {
      await put(entryPath, JSON.stringify({ survey: SURVEY_ID, email, email_hash: hash, entered_at: ts, response_id: id, contact_ok: !!body.contact_ok }), { ...opts, allowOverwrite: false });
    }
  } catch (e) {
    console.error("save failed", e?.message || e);
    return json(res, 500, { ok: false, error: "We could not save your answers. Try again in a moment." });
  }
  return json(res, 200, { ok: true, entered: !existing });
}
