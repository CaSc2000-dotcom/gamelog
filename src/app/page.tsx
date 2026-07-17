import Link from "next/link";
import { Button } from "@/components/ui/button";

const BUILD_TIMESTAMP = new Date().toISOString();

const POC_LINKS = [
  { href: "/poc/auth", label: "Auth POC", blurb: "Google OAuth + profile" },
  { href: "/poc/igdb", label: "IGDB POC", blurb: "Live game search" },
  { href: "/demo", label: "Demo journal", blurb: "Session UI shell" },
] as const;

export default function Home() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 p-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">GameLog</h1>
        <p className="text-muted-foreground">
          Proof-of-concept pages for auth, IGDB search, and the session journal
          shell. Use the nav above or the links below.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {POC_LINKS.map(({ href, label, blurb }) => (
          <li key={href}>
            <Button asChild variant="outline" className="h-auto w-full flex-col items-start gap-1 px-4 py-3">
              <Link href={href}>
                <span className="font-medium">{label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {blurb}
                </span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <footer className="text-sm text-muted-foreground">
        {commit} · {BUILD_TIMESTAMP}
      </footer>
    </main>
  );
}
