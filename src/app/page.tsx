import { Button } from "@/components/ui/button";

const BUILD_TIMESTAMP = new Date().toISOString();

export default function Home() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">GameLog — hello world</h1>
      <Button>Click me</Button>
      <footer className="text-sm text-muted-foreground">
        {commit} · {BUILD_TIMESTAMP}
      </footer>
    </main>
  );
}
