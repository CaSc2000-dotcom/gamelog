"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type IgdbGameResult = {
  id: number;
  name: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

export default function IgdbPocPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgdbGameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(
        `/api/poc/igdb/search?q=${encodeURIComponent(query)}`,
      );

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.ok
            ? "Unexpected response from server"
            : `Search failed (${res.status})`,
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">IGDB POC</h1>
        <p className="text-muted-foreground">
          Search games via a server-side proxy to IGDB.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "Hollow Knight"'
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-3">
        {results.map((game) => (
          <li
            key={game.id}
            className="flex items-center gap-4 rounded-md border p-3"
          >
            {game.coverUrl ? (
              <Image
                src={game.coverUrl}
                alt=""
                width={48}
                height={64}
                className="rounded object-cover"
              />
            ) : (
              <div className="flex h-16 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                N/A
              </div>
            )}
            <div>
              <p className="font-medium">{game.name}</p>
              <p className="text-sm text-muted-foreground">
                IGDB ID: {game.id}
                {game.releaseYear ? ` · ${game.releaseYear}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {!loading && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          Search for a game to see IGDB results.
        </p>
      )}
    </main>
  );
}