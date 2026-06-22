import { createClient } from "@/lib/supabase/server";
import { AuthButtons } from "@/app/poc/auth/auth-buttons";

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

  let profile: {
    email: string | null;
    display_name: string | null;
    created_at: string;
  } | null = null;
  let profileError: string | null = null;

  if (user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, display_name, created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      profileError = error.message;
    } else {
      profile = data;
    }
  }

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
      {user && profile && (
        <div className="rounded border p-4 text-sm space-y-1">
          <p className="font-medium">From database (RLS-protected):</p>
          <p>Display name: {profile.display_name ?? "—"}</p>
          <p>Email: {profile.email}</p>
          <p>Member since: {new Date(profile.created_at).toLocaleString()}</p>
        </div>
      )}
      {profileError && (
        <p className="text-sm text-destructive">DB error: {profileError}</p>
      )}
      </footer>
    </main>
  );
}
