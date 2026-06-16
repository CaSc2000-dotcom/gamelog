import { NextResponse } from "next/server";
import { searchGames } from "@/lib/igdb/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Missing query parameter: q" },
      { status: 400 },
    );
  }

  if (q.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  try {
    const results = await searchGames(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("IGDB search error:", err);
    return NextResponse.json(
      { error: "Failed to search IGDB" },
      { status: 502 },
    );
  }
}
