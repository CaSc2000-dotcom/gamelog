/**
 * Applies the session-media Storage bucket + path-scoped policies.
 *
 * Preferred: `npx supabase login && npx supabase db push --linked --yes`
 * Fallback: this script
 *   1) creates/updates the bucket via the Storage Admin REST API (service role)
 *   2) runs the policy SQL via DATABASE_URL or SUPABASE_DB_PASSWORD + project ref
 *
 * Usage (from gamelog/):
 *   node --env-file=.env.local scripts/apply-session-media-storage.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  fs.readFileSync(path.join(root, "supabase/.temp/project-ref"), "utf8").trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "session-media";
const MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const FILE_SIZE = 52_428_800; // 50 MiB

const storageHeaders = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
  "Content-Type": "application/json",
};

async function storageJson(pathname, init = {}) {
  const res = await fetch(`${url}/storage/v1${pathname}`, {
    ...init,
    headers: { ...storageHeaders, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body
        ? body.message
        : text || res.statusText;
    throw new Error(`${init.method ?? "GET"} ${pathname} → ${res.status}: ${msg}`);
  }
  return body;
}

console.log(`Ensuring bucket "${BUCKET}" (private, 50 MiB, image MIME allowlist)…`);

const buckets = await storageJson("/bucket");
const found = (buckets ?? []).find((b) => b.name === BUCKET || b.id === BUCKET);

const bucketBody = {
  public: false,
  fileSizeLimit: FILE_SIZE,
  allowedMimeTypes: MIME,
};

if (!found) {
  await storageJson("/bucket", {
    method: "POST",
    body: JSON.stringify({ id: BUCKET, name: BUCKET, ...bucketBody }),
  });
  console.log("Created bucket.");
} else {
  await storageJson(`/bucket/${BUCKET}`, {
    method: "PUT",
    body: JSON.stringify(bucketBody),
  });
  console.log("Updated existing bucket.");
}

const migrationPath = path.join(
  root,
  "supabase/migrations/20260717200000_create_session_media_bucket.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

async function runSql(connectionString) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied migration SQL (bucket upsert + policies).");
  } finally {
    await client.end();
  }
}

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (databaseUrl) {
  await runSql(databaseUrl);
} else if (dbPassword) {
  const encoded = encodeURIComponent(dbPassword);
  const poolerHost = fs
    .readFileSync(path.join(root, "supabase/.temp/pooler-url"), "utf8")
    .trim()
    .replace(/^postgresql:\/\//, "http://");
  const hostname = new URL(poolerHost).hostname;
  const pooler = `postgresql://postgres.${projectRef}:${encoded}@${hostname}:6543/postgres`;
  const direct = `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
  try {
    await runSql(pooler);
  } catch (err) {
    console.warn("Pooler connection failed, trying direct db host…", err.message);
    await runSql(direct);
  }
} else {
  console.log(`
Bucket is ready via Storage Admin API.

Policies still require SQL. Apply them with one of:
  1) npx supabase login && npx supabase db push --linked --yes
  2) Paste supabase/migrations/20260717200000_create_session_media_bucket.sql
     into the Supabase SQL Editor and Run
  3) Re-run this script with DATABASE_URL or SUPABASE_DB_PASSWORD set
`);
  process.exitCode = 2;
}
