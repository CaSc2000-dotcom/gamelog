const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";

type IgdbRawGame = {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: { image_id?: string };
};

export type IgdbGameResult = {
  id: number;
  name: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getCredentials();
  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

function escapeIgdbSearch(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function coverUrl(imageId?: string): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function releaseYear(timestamp?: number): number | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).getUTCFullYear();
}

export async function searchGames(query: string): Promise<IgdbGameResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { clientId } = getCredentials();
  const token = await getAccessToken();

  const body = [
    `search "${escapeIgdbSearch(trimmed)}";`,
    "fields id,name,cover.image_id,first_release_date;",
    "limit 10;",
  ].join(" ");

  const res = await fetch(IGDB_GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IGDB search failed: ${res.status} ${text}`);
  }

  const games = (await res.json()) as IgdbRawGame[];

  return games.map((g) => ({
    id: g.id,
    name: g.name,
    releaseYear: releaseYear(g.first_release_date),
    coverUrl: coverUrl(g.cover?.image_id),
  }));
}
