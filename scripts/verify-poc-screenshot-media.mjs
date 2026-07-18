/**
 * Verifies poc_screenshot_media table + RLS exist (service role / PostgREST).
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-poc-screenshot-media.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

async function rest(pathname, key, init = {}) {
  const res = await fetch(`${url}/rest/v1${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { res, text };
}

const { res, text } = await rest(
  "/poc_screenshot_media?select=id&limit=1",
  serviceKey,
);

if (!res.ok) {
  console.error("FAIL: poc_screenshot_media not reachable via PostgREST");
  console.error(`${res.status}: ${text}`);
  console.error(
    "Apply supabase/migrations/20260717210000_create_poc_screenshot_media.sql in the SQL Editor, then re-run.",
  );
  process.exit(1);
}

// Under RLS, an anon SELECT is not blocked with 403 — PostgREST returns 200
// with an empty array because no rows match auth.uid(). That is the secure,
// expected result. A non-empty array would mean rows are leaking.
const anon = await rest("/poc_screenshot_media?select=id&limit=1", anonKey);
if (anon.res.ok) {
  let rows = [];
  try {
    rows = JSON.parse(anon.text);
  } catch {
    rows = [];
  }
  if (Array.isArray(rows) && rows.length === 0) {
    console.log("PASS: anon read returns no rows (RLS filtering as expected)");
  } else {
    console.error(
      `FAIL: anon read returned ${rows.length} row(s) — RLS is leaking data`,
    );
    process.exit(1);
  }
} else if (anon.res.status === 401 || anon.res.status === 403) {
  console.log("PASS: anon denied as expected for RLS table");
} else {
  console.log(`INFO: anon response ${anon.res.status}: ${anon.text.slice(0, 120)}`);
}

console.log("PASS: poc_screenshot_media table is exposed to PostgREST");
console.log("Manual UI checks still required on /poc/screenshots:");
console.log("  1) Sign in and upload 2+ images");
console.log("  2) Refresh — thumbnails persist");
console.log("  3) Delete one — other remains; Storage object + row gone");
