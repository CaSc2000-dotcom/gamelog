"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_MIME_TYPES,
  SESSION_BYTE_LIMIT,
  SESSION_MEDIA_BUCKET,
  buildStoragePath,
  formatBytes,
  isAllowedMimeType,
  sumByteSizes,
  validateUploadBatch,
  type AllowedMimeType,
  type PocScreenshotItem,
} from "@/lib/poc/screenshots";

type Props = {
  userId: string;
  initialItems: PocScreenshotItem[];
};

type AttemptArtifact = {
  mediaId: string;
  storagePath: string;
  metadataInserted: boolean;
};

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `poc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ScreenshotManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Only create a session id on upload (client event). Never during render —
  // that caused SSR/client UUID mismatch hydration errors when the gallery was empty.
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);

  const pocSessionId =
    initialItems[0]?.poc_session_id ?? localSessionId;

  const usedBytes = sumByteSizes(initialItems);
  const remainingBytes = Math.max(0, SESSION_BYTE_LIMIT - usedBytes);
  const usagePercent = Math.min(
    100,
    Math.round((usedBytes / SESSION_BYTE_LIMIT) * 100),
  );

  async function rollbackAttempt(artifacts: AttemptArtifact[]) {
    if (artifacts.length === 0) return;

    const storagePaths = artifacts.map((a) => a.storagePath);
    const mediaIds = artifacts
      .filter((a) => a.metadataInserted)
      .map((a) => a.mediaId);

    await supabase.storage.from(SESSION_MEDIA_BUCKET).remove(storagePaths);

    if (mediaIds.length > 0) {
      await supabase.from("poc_screenshot_media").delete().in("id", mediaIds);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    const selected = Array.from(files);
    const attemptArtifacts: AttemptArtifact[] = [];

    try {
      const preflightError = validateUploadBatch(selected, usedBytes);
      if (preflightError) {
        throw new Error(preflightError);
      }

      const sessionId = pocSessionId ?? newUuid();
      if (!pocSessionId) {
        setLocalSessionId(sessionId);
      }

      let uploaded = 0;

      for (const file of selected) {
        // Preflight already validated MIME; narrow for TypeScript.
        if (!isAllowedMimeType(file.type)) {
          throw new Error(
            `Unsupported type "${file.type || "unknown"}" for "${file.name}".`,
          );
        }
        const mime: AllowedMimeType = file.type;

        const mediaId = newUuid();
        const storagePath = buildStoragePath(
          userId,
          sessionId,
          mediaId,
          mime,
        );
        const artifact: AttemptArtifact = {
          mediaId,
          storagePath,
          metadataInserted: false,
        };
        attemptArtifacts.push(artifact);

        const { error: uploadError } = await supabase.storage
          .from(SESSION_MEDIA_BUCKET)
          .upload(storagePath, file, {
            contentType: mime,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Upload failed for "${file.name}": ${uploadError.message}`,
          );
        }

        const { error: insertError } = await supabase
          .from("poc_screenshot_media")
          .insert({
            id: mediaId,
            user_id: userId,
            poc_session_id: sessionId,
            storage_path: storagePath,
            original_name: file.name,
            mime_type: mime,
            byte_size: file.size,
          });

        if (insertError) {
          throw new Error(
            `Saved file but failed to record metadata for "${file.name}": ${insertError.message}`,
          );
        }

        artifact.metadataInserted = true;
        uploaded += 1;
      }

      setStatus(
        `Uploaded ${uploaded} image${uploaded === 1 ? "" : "s"} ` +
          `(${formatBytes(sumByteSizes(selected.map((f) => ({ byte_size: f.size }))))}).`,
      );
      router.refresh();
    } catch (err) {
      if (attemptArtifacts.length > 0) {
        await rollbackAttempt(attemptArtifacts);
      }
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: PocScreenshotItem) {
    setDeletingId(item.id);
    setError(null);
    setStatus(null);

    try {
      const { error: storageError } = await supabase.storage
        .from(SESSION_MEDIA_BUCKET)
        .remove([item.storage_path]);

      if (storageError) {
        throw new Error(`Storage delete failed: ${storageError.message}`);
      }

      const { error: rowError } = await supabase
        .from("poc_screenshot_media")
        .delete()
        .eq("id", item.id);

      if (rowError) {
        throw new Error(`Metadata delete failed: ${rowError.message}`);
      }

      setStatus(`Deleted ${item.original_name}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <label className="block text-sm font-medium" htmlFor="screenshot-files">
          Upload screenshots
        </label>
        <p className="text-sm text-muted-foreground">
          Select one or more PNG, JPEG, WebP, or GIF files. The whole selection
          is checked before any upload starts. Objects go to the private{" "}
          <code>session-media</code> bucket under your user prefix.
        </p>

        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">POC session storage</span>
            <span className="text-muted-foreground">
              {formatBytes(usedBytes)} / {formatBytes(SESSION_BYTE_LIMIT)} used
              · {formatBytes(remainingBytes)} remaining
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usagePercent}
            aria-label="POC session storage usage"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Aggregate limit is {formatBytes(SESSION_BYTE_LIMIT)} per POC
            session. Rejected batches leave no orphan files.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <input
            id="screenshot-files"
            type="file"
            accept={ALLOWED_MIME_TYPES.join(",")}
            multiple
            disabled={busy || remainingBytes === 0}
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = "";
            }}
            className="block w-full max-w-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          />
          {busy && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Upload className="size-4 animate-pulse" />
              Uploading…
            </span>
          )}
          {!busy && remainingBytes === 0 && (
            <span className="text-sm text-destructive">
              Session limit reached. Delete an image to free space.
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {status && !error && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {status}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Gallery</h2>
          <p className="text-xs text-muted-foreground">
            {initialItems.length} image{initialItems.length === 1 ? "" : "s"}
            {pocSessionId
              ? ` · POC session ${pocSessionId.slice(0, 8)}…`
              : ""}
          </p>
        </div>

        {initialItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No screenshots yet. Upload a couple of images, then refresh or
            re-login to prove they persist.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {initialItems.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="aspect-video bg-muted">
                  {item.signedUrl ? (
                    // Signed URLs expire; plain img avoids Next Image remote config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.signedUrl}
                      alt={item.original_name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      Could not sign URL
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="truncate font-medium">{item.original_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.byte_size)} · {item.mime_type}
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {item.storage_path}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={deletingId === item.id || busy}
                    onClick={() => void handleDelete(item)}
                    aria-label={`Delete ${item.original_name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
