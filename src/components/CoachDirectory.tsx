"use client";

import { useMemo, useState } from "react";
import type { CoachProfile, User } from "@prisma/client";
import { CoachCard } from "@/components/CoachCard";

type Coach = CoachProfile & { user: User };

export function CoachDirectory({ coaches }: { coaches: Coach[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter((c) =>
      [c.user.name, c.location ?? "", c.headline ?? "", c.bio ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [coaches, query]);

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, city or specialty"
          className="input sm:max-w-sm"
          aria-label="Search coaches"
        />
        <p className="stat text-xs uppercase tracking-wide text-slate-500">
          {visible.length} of {coaches.length}{" "}
          {coaches.length === 1 ? "coach" : "coaches"}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="card mt-8 text-center text-slate-500">
          No coaches match “{query}”. Clear the search to see everyone.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((profile) => (
            <CoachCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
