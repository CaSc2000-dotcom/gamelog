# Screenshots POC (Tuesday Block 2)

**Status:** UI + migration authored. Apply the SQL migration before using the page.  
**Route:** `/poc/screenshots`  
**Bucket:** private `session-media` (Block 1)  
**Metadata table:** `public.poc_screenshot_media` (disposable; not the final ERD `media` table)

## Apply migration

Paste and run this file in the Supabase SQL Editor:

`supabase/migrations/20260717210000_create_poc_screenshot_media.sql`

Or, with DB credentials:

```bash
# after: npx supabase login
npx supabase db push --linked --yes

# or
# set SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local
node --env-file=.env.local scripts/apply-poc-screenshot-media.mjs
```

Verify the table is visible to PostgREST:

```bash
node --env-file=.env.local scripts/verify-poc-screenshot-media.mjs
```

## Manual UI verification

1. `npm run dev` → open http://localhost:3000/poc/screenshots
2. Sign in (link goes to Auth POC with `next=/poc/screenshots`)
3. Upload **two** PNG/JPEG/WebP/GIF images
4. Confirm paths look like `{user_id}/{poc_session_id}/{media_id}.{ext}`
5. Refresh — both thumbnails still load (signed URLs)
6. Delete **one** image — the other remains; deleted Storage object + metadata row are gone
7. Sign out / sign in — remaining image still present

## Deferred (later Tuesday blocks)

- Per-session 50 MB aggregate enforcement (Block 3)
- Production deploy smoke test (Block 4)
- Final `sessions` / `media` schema (Wednesday)
