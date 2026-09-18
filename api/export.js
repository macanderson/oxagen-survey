// GET /api/export?token=ADMIN_TOKEN[&format=json]  every response as CSV (default) or JSON.
import { json, authorized, readAll, csvRow } from "./_lib.js";

export default async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: "unauthorized" });
  const url = new URL(req.url, "http://localhost");
  const docs = (await readAll("responses/")).sort((a, b) => a.ts.localeCompare(b.ts));
  if (url.searchParams.get("format") === "json") return json(res, 200, { count: docs.length, responses: docs });

  const keys = [...new Set(docs.flatMap((d) => Object.keys(d.answers || {})))].sort();
  const head = ["ts", "id", "email", "contact_ok", "duplicate", ...keys];
  const rows = docs.map((d) => csvRow([d.ts, d.id, d.email, d.contact_ok, d.duplicate, ...keys.map((k) => d.answers?.[k])]));
  res.statusCode = 200;
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="survey-responses-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader("cache-control", "no-store");
  res.end("﻿" + [csvRow(head), ...rows].join("\r\n") + "\r\n");
}
