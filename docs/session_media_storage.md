# session-media Storage contract (Tuesday Block 1)

**Status:** Complete — bucket live, policies applied via SQL Editor, verification PASSED (9/9).  
**Aligned with:** [erd.md](./erd.md) Storage section + MH-6.

### Verification record

Command: `node --env-file=.env.local scripts/verify-session-media-storage.mjs`  
Date: 2026-07-17

| Check | Result |
| --- | --- |
| A upload own path | PASS |
| A list own folder | PASS |
| A denied upload to B prefix | PASS |
| A denied download of B object | PASS |
| B upload own path | PASS |
| A update/upsert own path | PASS |
| A delete own path | PASS |
| Anon denied upload | PASS |
| Public URL denied for private bucket | PASS |

## Bucket

| Item | Value |
| --- | --- |
| Name / id | `session-media` |
| Public | `false` (private) |
| Per-object size limit | `52428800` bytes (50 MiB) |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp`, `image/gif` |

The Final Requirements Spec **50 MB per-session aggregate** is **not** enforced by the bucket alone. Enforce it in the app by summing `media.byte_size` for the session before accepting another upload.

## Object key contract

```text
{user_id}/{session_id}/{media_id}.{ext}
```

Examples:

```text
a1b2c3d4-.../e5f6.../9a8b....png
```

- First path segment **must** equal `auth.uid()` (enforced by Storage RLS).
- Prefer authenticated download or **signed URLs**; do not make the bucket public.

## Policies (migration)

File: `supabase/migrations/20260717200000_create_session_media_bucket.sql`

| Policy | Command | Rule |
| --- | --- | --- |
| `session_media_select_own` | SELECT | `bucket_id = 'session-media'` and folder[1] = `auth.uid()` |
| `session_media_insert_own` | INSERT | same |
| `session_media_update_own` | UPDATE | USING + WITH CHECK (blocks moves into another user’s folder) |
| `session_media_delete_own` | DELETE | same |

Role: `authenticated` only. Anonymous has no policies → denied.

## Apply

```bash
# Preferred (CLI)
npx supabase login
npx supabase db push --linked --yes

# Or run the migration SQL in the Supabase SQL Editor

# Or (bucket via Admin API + SQL if DB password available)
node --env-file=.env.local scripts/apply-session-media-storage.mjs
# with DATABASE_URL or SUPABASE_DB_PASSWORD set for the policy SQL step
```

## Verify

```bash
node --env-file=.env.local scripts/verify-session-media-storage.mjs
```

Expected PASS checks:

1. User A upload/list/update/delete under `A_UID/...`
2. User A denied write/read under `B_UID/...`
3. User B upload under `B_UID/...`
4. Anon upload denied
5. Public URL denied for private bucket

## Out of scope for Block 1

- `/poc/screenshots` UI → see [screenshot_poc.md](./screenshot_poc.md) (Tuesday Block 2)
- Final ERD `media` table migration (Wednesday schema work)
- Per-session 50 MB aggregate enforcement in app
