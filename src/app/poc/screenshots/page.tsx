import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  SESSION_BYTE_LIMIT,
  SESSION_MEDIA_BUCKET,
  formatBytes,
  type PocScreenshotItem,
  type PocScreenshotRow,
} from "@/lib/poc/screenshots";
import { ScreenshotManager } from "@/app/poc/screenshots/screenshot-manager";

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

export default async function ScreenshotsPocPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-bold">Screenshots POC</h1>
        <p className="text-muted-foreground">
          Sign in to upload images to the private <code>session-media</code>{" "}
          bucket and prove they persist after refresh and re-login. Session
          aggregate limit: {formatBytes(SESSION_BYTE_LIMIT)}.
        </p>
        <Button asChild>
          <Link href="/poc/auth?next=/poc/screenshots">Sign in with Google</Link>
        </Button>
      </main>
    );
  }

  const { data: rows, error } = await supabase
    .from("poc_screenshot_media")
    .select(
      "id, user_id, poc_session_id, storage_path, original_name, mime_type, byte_size, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let items: PocScreenshotItem[] = [];
  const listError: string | null = error?.message ?? null;

  if (!error && rows) {
    items = await Promise.all(
      (rows as PocScreenshotRow[]).map(async (row) => {
        const normalized: PocScreenshotRow = {
          ...row,
          // Postgres bigint may arrive as string over PostgREST.
          byte_size: Number(row.byte_size),
        };

        const { data: signed, error: signError } = await supabase.storage
          .from(SESSION_MEDIA_BUCKET)
          .createSignedUrl(normalized.storage_path, SIGNED_URL_SECONDS);

        if (signError) {
          return { ...normalized, signedUrl: null };
        }

        return { ...normalized, signedUrl: signed.signedUrl };
      }),
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Screenshots POC</h1>
        <p className="text-muted-foreground">
          Tuesday Block 3 — multi-file upload with preflight validation,{" "}
          {formatBytes(SESSION_BYTE_LIMIT)} per-session aggregate limit, signed
          thumbnails, single-image delete, and batch rollback on failure. Test:
          upload → refresh → sign out/in → confirm gallery still loads. Signed
          in as <strong>{user.email}</strong>.
        </p>
      </header>

      {listError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load gallery: {listError}
        </p>
      )}

      <ScreenshotManager userId={user.id} initialItems={items} />
    </main>
  );
}
