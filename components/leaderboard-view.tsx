"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Battle = {
  id: number;
  imageUrl: string;
  userPrompt: string;
  createdAt: string;
  captionA: string | null;
  captionB: string | null;
  totalVotes: number;
  aVotes: number;
  bVotes: number;
  bothVotes: number;
  neitherVotes: number;
};

type View = "leaderboard" | "battles";

type RankedCaption = {
  battleId: number;
  label: "A" | "B";
  text: string;
  imageUrl: string;
  totalVotes: number;
  supportVotes: number;
  approval: number;
  adjustedScore: number;
};

const INITIAL_LEADERBOARD_COUNT = 10;
const INITIAL_BATTLE_COUNT = 10;
const BATTLE_INCREMENT = 10;

function percentage(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function rankCaptions(battles: Battle[]): RankedCaption[] {
  const entries: RankedCaption[] = [];

  for (const battle of battles) {
    if (battle.totalVotes <= 0) continue;

    for (const label of ["A", "B"] as const) {
      const text = label === "A" ? battle.captionA : battle.captionB;
      if (!text) continue;

      const directVotes = label === "A" ? battle.aVotes : battle.bVotes;
      const supportVotes = directVotes + battle.bothVotes;

      entries.push({
        battleId: battle.id,
        label,
        text,
        imageUrl: battle.imageUrl,
        totalVotes: battle.totalVotes,
        supportVotes,
        approval: percentage(supportVotes, battle.totalVotes),
        // Beta(2, 2) prior. This reduces one-vote ranking distortions
        // while preserving the actual approval rate shown to the user.
        adjustedScore: (supportVotes + 2) / (battle.totalVotes + 4),
      });
    }
  }

  return entries.sort(
    (a, b) =>
      b.adjustedScore - a.adjustedScore ||
      b.totalVotes - a.totalVotes ||
      b.supportVotes - a.supportVotes ||
      b.battleId - a.battleId ||
      a.label.localeCompare(b.label)
  );
}

function VoteStat({
  label,
  votes,
  total,
}: {
  label: string;
  votes: number;
  total: number;
}) {
  return (
    <div className="rounded-lg border px-3 py-3 text-center">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{percentage(votes, total)}%</p>
      <p className="mt-1 text-xs text-gray-500">
        {votes} {votes === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}

// Restore the original featured-card layout for ranks #1–#3.
function TopCaptionCard({
  entry,
  rank,
}: {
  entry: RankedCaption;
  rank: number;
}) {
  return (
    <article className="rounded-2xl border p-5">
      <img
        src={entry.imageUrl}
        alt={`Battle ${entry.battleId}`}
        className="h-44 w-full rounded-xl border object-contain"
        loading="lazy"
      />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">#{rank}</p>
          <h3 className="text-lg font-bold">
            Battle #{entry.battleId} · Caption {entry.label}
          </h3>
        </div>
        <div className="shrink-0 rounded-full border px-3 py-1 text-sm font-medium tabular-nums">
          {entry.approval}%
        </div>
      </div>

      <p className="mt-4 text-sm leading-6">{entry.text}</p>

      <div className="mt-4 text-xs text-gray-500">
        {entry.supportVotes} supportive {entry.supportVotes === 1 ? "vote" : "votes"}
        {" · "}{entry.totalVotes} total {entry.totalVotes === 1 ? "vote" : "votes"}
        {entry.totalVotes < 5 ? " · Early ranking" : ""}
      </div>
    </article>
  );
}

// Restore the original compact, full-width list for rank #4 and below.
function RankedCaptionRow({
  entry,
  rank,
}: {
  entry: RankedCaption;
  rank: number;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="w-16 shrink-0 text-xl font-bold">#{rank}</div>

      <img
        src={entry.imageUrl}
        alt={`Battle ${entry.battleId}`}
        className="h-20 w-20 shrink-0 rounded-lg border object-contain"
        loading="lazy"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-500">
          Battle #{entry.battleId} · Caption {entry.label}
        </p>
        <p className="mt-1 text-sm leading-6">{entry.text}</p>
        {entry.totalVotes < 5 && (
          <p className="mt-1 text-xs text-gray-500">Early ranking</p>
        )}
      </div>

      <div className="sm:text-right">
        <p className="text-2xl font-bold tabular-nums">{entry.approval}%</p>
        <p className="text-xs text-gray-500">
          {entry.supportVotes} supportive / {entry.totalVotes} total
        </p>
      </div>
    </div>
  );
}

function BattleCard({ battle }: { battle: Battle }) {
  return (
    <article className="rounded-2xl border p-4 sm:p-5">
      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <img
          src={battle.imageUrl}
          alt={`Battle ${battle.id}`}
          className="h-[220px] w-full rounded-xl border object-contain"
          loading="lazy"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Battle #{battle.id}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {battle.totalVotes} {battle.totalVotes === 1 ? "vote" : "votes"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Caption A</p>
              <p className="mt-1 text-sm leading-6">
                {battle.captionA ?? "Caption unavailable"}
              </p>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Caption B</p>
              <p className="mt-1 text-sm leading-6">
                {battle.captionB ?? "Caption unavailable"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <VoteStat label="A" votes={battle.aVotes} total={battle.totalVotes} />
            <VoteStat label="B" votes={battle.bVotes} total={battle.totalVotes} />
            <VoteStat label="Both" votes={battle.bothVotes} total={battle.totalVotes} />
            <VoteStat label="Neither" votes={battle.neitherVotes} total={battle.totalVotes} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LeaderboardView({ battles }: { battles: Battle[] }) {
  const [view, setView] = useState<View>("leaderboard");
  const [visibleLeaderboardCount, setVisibleLeaderboardCount] = useState(
    INITIAL_LEADERBOARD_COUNT
  );
  const [visibleBattleCount, setVisibleBattleCount] = useState(
    INITIAL_BATTLE_COUNT
  );

  const ranked = useMemo(() => rankCaptions(battles), [battles]);
  const rankedVisible = ranked.slice(0, visibleLeaderboardCount);
  const battlesVisible = battles.slice(0, visibleBattleCount);
  const moreRankings = visibleLeaderboardCount < ranked.length;
  const moreBattles = visibleBattleCount < battles.length;
  const nextRankingCount =
    visibleLeaderboardCount === INITIAL_LEADERBOARD_COUNT
      ? 100
      : visibleLeaderboardCount + 100;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
          Community Rankings
        </p>
        <h1 className="text-5xl font-bold tracking-tight">
          Results
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-500">
          The community&apos;s favorite AI-generated captions, ranked by approval score.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/battle"
            className="rounded-xl border px-5 py-2 font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/10"
          >
            Enter Arena
          </Link>
          <Link
            href="/generate"
            className="rounded-xl border px-5 py-2 font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/10"
          >
            Create Battle
          </Link>
        </div>
      </header>

      <div
        role="group"
        aria-label="Leaderboard page view"
        className="relative mx-auto mt-10 grid w-full max-w-md grid-cols-2 rounded-2xl border bg-gray-100 p-1 dark:bg-white/10"
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-neutral-800 ${
            view === "battles" ? "translate-x-full" : "translate-x-0"
          }`}
        />
        <button
          type="button"
          aria-pressed={view === "leaderboard"}
          onClick={() => setView("leaderboard")}
          className={`relative z-10 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            view === "leaderboard" ? "text-gray-950 dark:text-white" : "text-gray-500 dark:text-gray-300"
          }`}
        >
          Leaderboard
        </button>
        <button
          type="button"
          aria-pressed={view === "battles"}
          onClick={() => setView("battles")}
          className={`relative z-10 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            view === "battles" ? "text-gray-950 dark:text-white" : "text-gray-500 dark:text-gray-300"
          }`}
        >
          All Battles
        </button>
      </div>

      {view === "leaderboard" ? (
        <section className="mt-10" aria-label="Ranked captions">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Top Captions</h2>
              <p className="mt-1 text-sm text-gray-500">
                Approval includes direct votes and “Both” votes. Rankings account for sample size.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Showing {rankedVisible.length} of {ranked.length}
            </p>
          </div>

          {ranked.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center">
              <h3 className="text-lg font-semibold">No rankings yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Once people vote in the Arena, ranked captions will appear here.
              </p>
              <Link href="/battle" className="mt-5 inline-block font-semibold underline underline-offset-4">
                Vote in the Arena
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {rankedVisible.slice(0, 3).map((entry, index) => (
                  <TopCaptionCard
                    key={`${entry.battleId}-${entry.label}`}
                    entry={entry}
                    rank={index + 1}
                  />
                ))}
              </div>

              {rankedVisible.length > 3 && (
                <div className="mt-6 overflow-hidden rounded-2xl border">
                  <div className="divide-y">
                    {rankedVisible.slice(3).map((entry, index) => (
                      <RankedCaptionRow
                        key={`${entry.battleId}-${entry.label}`}
                        entry={entry}
                        rank={index + 4}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {moreRankings && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLeaderboardCount(nextRankingCount)}
                className="rounded-xl border px-7 py-3 font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-white/10"
              >
                Show more · Ranks {visibleLeaderboardCount + 1}–{Math.min(nextRankingCount, ranked.length)}
              </button>
            </div>
          )}
          {ranked.length > 0 && (
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-gray-500">
              Approval = (votes for this caption + Both votes) ÷ total battle votes.
              Rankings are adjusted for sample size so one-vote results do not automatically win.
              Entries with fewer than five votes are marked as early rankings.
            </p>
          )}
        </section>
      ) : (
        <section className="mt-10" aria-label="All battles">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">All Battles</h2>
              <p className="mt-1 text-sm text-gray-500">
                Explore every caption pair and its full community vote breakdown.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Showing {battlesVisible.length} of {battles.length}
            </p>
          </div>

          {battles.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center">
              <h3 className="text-lg font-semibold">No battles yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Create the first battle to start collecting votes.
              </p>
              <Link href="/generate" className="mt-5 inline-block font-semibold underline underline-offset-4">
                Create a Battle
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {battlesVisible.map((battle) => (
                <BattleCard key={battle.id} battle={battle} />
              ))}
            </div>
          )}

          {moreBattles && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleBattleCount((count) => count + BATTLE_INCREMENT)}
                className="rounded-xl border px-7 py-3 font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-white/10"
              >
                Show more battles · {visibleBattleCount + 1}–{Math.min(visibleBattleCount + BATTLE_INCREMENT, battles.length)}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
