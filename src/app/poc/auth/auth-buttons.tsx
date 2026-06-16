"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email?: string | null;
};

export function AuthButtons({ email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/poc/auth`,
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
