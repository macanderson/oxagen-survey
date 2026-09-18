// Shared helpers for the survey functions. Storage is Vercel Blob, private access:
//   responses/<iso-ts>-<id>.json   one per submission, duplicates included (flagged)
//   entries/<sha256(email)>.json   one per unique email: the raffle entry
//   draws/<iso-ts>.json            one per recorded drawing, so a winner is auditable
import { createHash, timingSafeEqual } from "node:crypto";
import { get, list } from "@vercel/blob";

export const SURVEY_ID = "agents-2026-09";

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function normalizeEmail(s) {
  return String(s || "").trim().toLowerCase();
}

export function emailHash(email) {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function isEmail(s) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(String(s || ""));
}

// Constant-time token check. A missing ADMIN_TOKEN refuses everything: no default secret.
export function authorized(req) {
  const expected = process.env.ADMIN_TOKEN || "";
  const url = new URL(req.url, "http://localhost");
  const given = req.headers["x-admin-token"] || url.searchParams.get("token") || "";
  if (!expected || !given) return false;
  const a = Buffer.from(expected), b = Buffer.from(String(given));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function readJson(pathname) {
  const r = await get(pathname, { access: "private", useCache: false });
  if (!r) return null;
  const text = await new Response(r.stream).text();
  return JSON.parse(text);
}

export async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function readAll(prefix, concurrency = 16) {
  const blobs = await listAll(prefix);
  const docs = new Array(blobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, blobs.length) }, async () => {
    while (i < blobs.length) { const k = i++; docs[k] = await readJson(blobs[k].pathname).catch(() => null); }
  }));
  return docs.filter(Boolean);
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (c) => { data += c; if (data.length > 64 * 1024) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

export function csvRow(cells) {
  return cells.map((c) => {
    const s = c == null ? "" : Array.isArray(c) ? c.join("; ") : String(c);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}
