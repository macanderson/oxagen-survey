// GET  /api/draw?token=ADMIN_TOKEN            preview: entry count, no winner recorded
// POST /api/draw?token=ADMIN_TOKEN&confirm=1  draws one winner with crypto randomness and records it
// GET  /api/draw?token=ADMIN_TOKEN&history=1  every recorded drawing
import { randomInt, randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { json, authorized, readAll } from "./_lib.js";

export default async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: "unauthorized" });
  const url = new URL(req.url, "http://localhost");
  if (url.searchParams.get("history")) return json(res, 200, { draws: (await readAll("draws/")).sort((a, b) => a.ts.localeCompare(b.ts)) });

  const entries = (await readAll("entries/")).sort((a, b) => a.entered_at.localeCompare(b.entered_at));
  const previous = await readAll("draws/");
  const alreadyWon = new Set(previous.map((d) => d.winner?.email_hash));
  const eligible = entries.filter((e) => !alreadyWon.has(e.email_hash));

  if (req.method !== "POST" || url.searchParams.get("confirm") !== "1") {
    return json(res, 200, { ok: true, recorded: false, entries: entries.length, eligible: eligible.length, previous_draws: previous.length, how: "POST with &confirm=1 to draw and record a winner." });
  }
  if (!eligible.length) return json(res, 400, { ok: false, error: "No eligible entries." });

  const index = randomInt(eligible.length);
  const winner = eligible[index];
  const ts = new Date().toISOString();
  const record = { ts, entries: entries.length, eligible: eligible.length, index, nonce: randomBytes(16).toString("hex"), winner: { email: winner.email, email_hash: winner.email_hash, entered_at: winner.entered_at } };
  await put(`draws/${ts.replace(/[:.]/g, "-")}.json`, JSON.stringify(record), { access: "private", addRandomSuffix: false, contentType: "application/json" });
  return json(res, 200, { ok: true, recorded: true, ...record });
}
