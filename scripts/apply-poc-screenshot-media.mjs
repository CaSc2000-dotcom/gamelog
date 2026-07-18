/**
 * Applies poc_screenshot_media table + RLS.
 *
 * Preferred: `npx supabase login && npx supabase db push --linked --yes`
 *
 * Fallback:
 *   node --env-file=.env.local scripts/apply-poc-screenshot-media.mjs
 * with DATABASE_URL / SUPABASE_DB_URL or SUPABASE_DB_PASSWORD set.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260717210000_create_poc_screenshot_media.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  fs.readFileSync(path.join(root, "supabase/.temp/project-ref"), "utf8").trim();

async function runSql(connectionString) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied poc_screenshot_media migration.");
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
  const poolerRaw = fs
    .readFileSync(path.join(root, "supabase/.temp/pooler-url"), "utf8")
    .trim();
  const hostname = new URL(
    poolerRaw.replace(/^postgresql:\/\//, "http://"),
  ).hostname;
  const pooler = `postgresql://postgres.${projectRef}:${encoded}@${hostname}:6543/postgres`;
  const direct = `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
  try {
    await runSql(pooler);
  } catch (err) {
    console.warn("Pooler failed, trying direct…", err.message);
    await runSql(direct);
  }
} else {
  console.error(`
Missing DATABASE_URL / SUPABASE_DB_PASSWORD.

Apply SQL manually:
  1) Supabase Dashboard → SQL Editor → paste
     supabase/migrations/20260717210000_create_poc_screenshot_media.sql
  2) Or: npx supabase login && npx supabase db push --linked --yes
`);
  process.exit(2);
}
