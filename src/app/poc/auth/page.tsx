import { createClient } from "@/lib/supabase/server";
import { AuthButtons } from "./auth-buttons";

export default async function AuthPocPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Auth POC</h1>
      <p className="text-muted-foreground">
        Google OAuth via Supabase — proves login works.
      </p>

      {error && (
        <p className="text-sm text-destructive">
          Sign-in failed. Check Supabase redirect URLs and Google credentials.
        </p>
      )}

      <AuthButtons email={user?.email} />

      <footer className="text-sm text-muted-foreground">
        {user ? `User ID: ${user.id}` : "Not authenticated"}
      </footer>
    </main>
  );
}
