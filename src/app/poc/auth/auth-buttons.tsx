"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email?: string | null;
  /** Safe relative path to return to after OAuth (defaults to /poc/auth). */
  nextPath?: string;
};

function sanitizeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/poc/auth";
  }
  return path;
}

export function AuthButtons({ email, nextPath }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const next = sanitizeNext(nextPath);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  if (email) {
    return (
      <div className="space-y-4">
        <p className="text-lg">
          Signed in as <strong>{email}</strong>
        </p>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={signInWithGoogle}>Sign in with Google</Button>
  );
}
