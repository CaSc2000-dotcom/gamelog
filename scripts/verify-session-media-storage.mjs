/**
 * Verifies session-media Storage RLS with two authenticated users + anon.
 *
 * Path contract: {user_id}/{session_id}/{media_id}.png
 *
 * Usage (from gamelog/):
 *   node --env-file=.env.local scripts/verify-session-media-storage.mjs
 *
 * Optional env:
 *   VERIFY_USER_A_EMAIL / VERIFY_USER_A_PASSWORD
 *   VERIFY_USER_B_EMAIL / VERIFY_USER_B_PASSWORD
 * If unset, creates ephemeral users via Admin API and deletes them after.
 */

import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "session-media";

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

function pngBytes() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

async function authJson(pathname, { key, method = "GET", body } = {}) {
  const res = await fetch(`${url}/auth/v1${pathname}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function storageUpload(token, objectPath, bytes, { upsert = false } = {}) {
  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
        "x-upsert": upsert ? "true" : "false",
      },
      body: bytes,
    },
  );
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function storageDownload(token, objectPath) {
  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return { ok: res.ok, status: res.status };
}

async function storageList(token, prefix) {
  const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 100 }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

async function storageRemove(token, paths) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  // Storage delete API expects { prefixes } or array depending on version;
  // also try body as path array if needed.
  if (!res.ok) {
    const res2 = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paths),
    });
    const text = await res2.text();
    return { ok: res2.ok, status: res2.status, text };
  }
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function adminUpload(objectPath, bytes) {
  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: bytes,
    },
  );
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function adminRemove(paths) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paths),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function ensureUser(label, email, password) {
  if (email && password) {
    const signIn = await authJson("/token?grant_type=password", {
      key: anonKey,
      method: "POST",
      body: { email, password },
    });
    if (!signIn.ok) {
      throw new Error(
        `${label} sign-in failed: ${signIn.data?.error_description || signIn.data?.msg || signIn.status}`,
      );
    }
    return {
      id: signIn.data.user.id,
      accessToken: signIn.data.access_token,
      ephemeral: false,
    };
  }

  const ephemeralEmail = `storage-verify-${label.toLowerCase()}-${randomUUID()}@example.com`;
  const ephemeralPassword = `Verify-${randomUUID()}!aA1`;
  const created = await authJson("/admin/users", {
    key: serviceKey,
    method: "POST",
    body: {
      email: ephemeralEmail,
      password: ephemeralPassword,
      email_confirm: true,
    },
  });
  if (!created.ok) {
    throw new Error(
      `${label} createUser failed: ${created.data?.msg || created.data?.message || created.status}`,
    );
  }

  const signIn = await authJson("/token?grant_type=password", {
    key: anonKey,
    method: "POST",
    body: { email: ephemeralEmail, password: ephemeralPassword },
  });
  if (!signIn.ok) {
    throw new Error(
      `${label} ephemeral sign-in failed: ${signIn.data?.error_description || signIn.status}`,
    );
  }

  return {
    id: created.data.id,
    accessToken: signIn.data.access_token,
    ephemeral: true,
  };
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const createdUsers = [];
try {
  const userA = await ensureUser(
    "A",
    process.env.VERIFY_USER_A_EMAIL,
    process.env.VERIFY_USER_A_PASSWORD,
  );
  const userB = await ensureUser(
    "B",
    process.env.VERIFY_USER_B_EMAIL,
    process.env.VERIFY_USER_B_PASSWORD,
  );
  createdUsers.push(userA, userB);

  const sessionId = randomUUID();
  const mediaId = randomUUID();
  const ownPath = `${userA.id}/${sessionId}/${mediaId}.png`;
  const foreignPath = `${userB.id}/${sessionId}/${mediaId}.png`;
  const file = pngBytes();

  {
    const r = await storageUpload(userA.accessToken, ownPath, file);
    check("A upload own path", r.ok, r.ok ? "" : `${r.status} ${r.text}`);
  }

  {
    const r = await storageList(userA.accessToken, `${userA.id}/${sessionId}`);
    const names = Array.isArray(r.data) ? r.data.map((o) => o.name) : [];
    check(
      "A list own folder",
      r.ok && names.includes(`${mediaId}.png`),
      r.ok ? `names=${names.join(",")}` : `${r.status} ${r.text}`,
    );
  }

  {
    const r = await storageUpload(userA.accessToken, foreignPath, file);
    check(
      "A denied upload to B prefix",
      !r.ok,
      r.ok ? "unexpected success" : `${r.status}`,
    );
  }

  {
    const seedPath = `${userB.id}/${sessionId}/seed-for-a.png`;
    const seed = await adminUpload(seedPath, file);
    if (!seed.ok) {
      check("seed B object (admin)", false, `${seed.status} ${seed.text}`);
    } else {
      const r = await storageDownload(userA.accessToken, seedPath);
      check(
        "A denied download of B object",
        !r.ok,
        r.ok ? "unexpected download success" : `${r.status}`,
      );
      await adminRemove([seedPath]);
    }
  }

  {
    const bPath = `${userB.id}/${sessionId}/b-own.png`;
    const r = await storageUpload(userB.accessToken, bPath, file);
    check("B upload own path", r.ok, r.ok ? "" : `${r.status} ${r.text}`);
    if (r.ok) await storageRemove(userB.accessToken, [bPath]);
  }

  {
    const r = await storageUpload(userA.accessToken, ownPath, file, {
      upsert: true,
    });
    check("A update/upsert own path", r.ok, r.ok ? "" : `${r.status} ${r.text}`);
  }

  {
    const r = await storageRemove(userA.accessToken, [ownPath]);
    check("A delete own path", r.ok, r.ok ? "" : `${r.status} ${r.text}`);
  }

  {
    const anonPath = `${userA.id}/${sessionId}/anon.png`;
    const r = await storageUpload(anonKey, anonPath, file);
    check(
      "Anon denied upload",
      !r.ok,
      r.ok ? "unexpected success" : `${r.status}`,
    );
  }

  {
    const pub = `${url}/storage/v1/object/public/${BUCKET}/${ownPath}`;
    const res = await fetch(pub);
    check(
      "Public URL denied for private bucket",
      !res.ok,
      `HTTP ${res.status}`,
    );
  }
} finally {
  for (const u of createdUsers) {
    if (u.ephemeral) {
      await authJson(`/admin/users/${u.id}`, {
        key: serviceKey,
        method: "DELETE",
      });
    }
  }
}

const failed = results.filter((r) => !r.ok);
console.log("\n---");
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error("Verification FAILED");
  process.exit(1);
}
console.log("Verification PASSED");
