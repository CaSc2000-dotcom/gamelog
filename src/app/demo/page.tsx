"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  game: string;
  title: string;
  body: string;
};

const SEED_SESSIONS: Session[] = [
  {
    id: "seed-1",
    game: "Hollow Knight",
    title: "First Hornet attempt",
    body: "Beat Hornet on the third try. Started to actually feel the rhythm of the dash-and-strike pattern.",
  },
  {
    id: "seed-2",
    game: "Hollow Knight",
    title: "Found Mantis Village",
    body: "Got humbled by the Mantis Lords. Going to grind some geo and come back.",
  },
  {
    id: "seed-3",
    game: "Stardew Valley",
    title: "Year 2, Spring 14",
    body: "Finally finished the Community Center pantry bundle. Linus gave me a recipe.",
  },
];

export default function DemoPage() {
  const [sessions, setSessions] = useState<Session[]>(SEED_SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(SEED_SESSIONS[0]?.id ?? null);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  function createSession() {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}`;
    const next: Session = {
      id,
      game: "New game",
      title: "Untitled session",
      body: "",
    };
    setSessions((prev) => [...prev, next]);
    setSelectedId(id);
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((curr) => (curr === id ? null : curr));
  }

  function updateSelected(patch: Partial<Session>) {
    if (!selectedId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)),
    );
  }

  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = s.game.trim() || "Untitled game";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});
  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-72 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Sessions</h2>
          <Button size="sm" onClick={createSession}>
            <Plus />
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {sessions.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">
              No sessions yet. Click &quot;New&quot; to add one.
            </p>
          ) : (
            groups.map(([game, items]) => (
              <div key={game}>
                <h3 className="px-2 mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {game}
                </h3>
                <ul className="space-y-0.5">
                  {items.map((s) => {
                    const isActive = s.id === selectedId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className={cn(
                            "group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          <span className="truncate">
                            {s.title.trim() || "Untitled"}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Delete session"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(s.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteSession(s.id);
                              }
                            }}
                            className={cn(
                              "ml-2 inline-flex shrink-0 items-center rounded p-1 opacity-0 transition group-hover:opacity-100",
                              isActive
                                ? "hover:bg-primary-foreground/20"
                                : "hover:bg-destructive/20 hover:text-destructive",
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <p className="border-t border-border p-3 text-xs text-muted-foreground">
          Prototype only. Nothing is saved.
        </p>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="mx-auto w-full max-w-3xl space-y-4 p-8">
            <input
              type="text"
              value={selected.game}
              onChange={(e) => updateSelected({ game: e.target.value })}
              placeholder="Game"
              className="block w-full bg-transparent px-0 text-xs font-medium uppercase tracking-wide text-muted-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <input
              type="text"
              value={selected.title}
              onChange={(e) => updateSelected({ title: e.target.value })}
              placeholder="Session title"
              className="block w-full bg-transparent px-0 text-3xl font-bold outline-none placeholder:text-muted-foreground/60"
            />
            <textarea
              value={selected.body}
              onChange={(e) => updateSelected({ body: e.target.value })}
              placeholder="Write about this session..."
              className="block min-h-[60vh] w-full resize-none bg-transparent px-0 text-base leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a session or create a new one.
          </div>
        )}
      </main>
    </div>
  );
}
