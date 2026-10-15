import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import GoogleSignIn from "@/components/google-sign-in";
import VoteButtons from "@/components/vote-buttons";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";

type Generation = {
  id: number;
  candidate_index: number;
  content: string;
};

type VoteChoice = "a" | "b" | "both" | "neither";

type BattlePageProps = {
  searchParams: Promise<{
    battle?: string | string[];
    caught?: string | string[];
    empty?: string | string[];
    initialized?: string | string[];
    browse?: string | string[];
  }>;
};

type BattleNavigationProps = {
  battleId: number;
  previousId: number | null;
  nextId: number | null;
  showResume: boolean;
};

export const dynamic = "force-dynamic";

function BattleNavigation({
  battleId,
  previousId,
  nextId,
  showResume,
}: BattleNavigationProps) {
  return (
    <nav
      aria-label="Battle navigation"
      className="mx-auto mt-7 flex max-w-xl items-center justify-between gap-3"
    >
      {previousId !== null ? (
        <Link
          href={`/battle?battle=${previousId}&browse=1`}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          ← Previous
        </Link>
      ) : (
        <span className="rounded-xl border px-4 py-2 text-sm font-medium opacity-40">
          ← Previous
        </span>
      )}

      <div className="flex min-h-[76px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-2xl font-bold">Battle #{battleId}</p>
        {showResume && (
          <Link
            href="/battle"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Resume voting
          </Link>
        )}
      </div>

      {nextId !== null ? (
        <Link
          href={`/battle?battle=${nextId}&browse=1`}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          Next →
        </Link>
      ) : (
        <span className="rounded-xl border px-4 py-2 text-sm font-medium opacity-40">
          Next →
        </span>
      )}
    </nav>
  );
}

function EmptyArena({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <AppHeader />
      <div className="text-center">
        <h1 className="text-4xl font-bold">Caption Battle</h1>
        <p className="mt-4 text-gray-500">No caption battles exist yet.</p>
        {signedIn && (
          <Link
            href="/generate"
            className="mt-8 inline-block rounded-lg border px-4 py-2 font-medium"
          >
            Create the first battle
          </Link>
        )}
      </div>
    </main>
  );
}

export default async function BattlePage({ searchParams }: BattlePageProps) {
  const params = await searchParams;

  // A fresh Arena entry starts a NEW snapshot in a Route Handler, which is
  // allowed to set the browsing cookie. Individual battles keep clean URLs.
  if (!params.battle && params.caught !== "1" && params.empty !== "1") {
    redirect("/battle/start");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (params.empty === "1") {
    return <EmptyArena signedIn={Boolean(user)} />;
  }

  if (params.caught === "1") {
    const { data: newestBattle } = await supabase
      .from("generation_sets")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <AppHeader />
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-bold">You&apos;re caught up</h1>
          <p className="mt-4 text-gray-500">
            You&apos;ve voted on every caption battle currently available.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {newestBattle?.[0] && (
              <Link
                href={`/battle?battle=${newestBattle[0].id}`}
                className="rounded-lg border px-4 py-2 font-medium"
              >
                Review Battles
              </Link>
            )}
            <Link
              href="/generate"
              className="rounded-lg border px-4 py-2 font-medium"
            >
              Create another
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rawId = typeof params.battle === "string" ? params.battle : "";
  if (!/^[1-9]\d*$/.test(rawId)) {
    notFound();
  }
  const battleId = Number(rawId);
  if (!Number.isSafeInteger(battleId)) {
    notFound();
  }

  // One row, looked up by the existing generation_sets primary key.
  const { data: generationSet, error: battleError } = await supabase
    .from("generation_sets")
    .select("id, image_path, created_at")
    .eq("id", battleId)
    .maybeSingle();

  if (battleError) {
    console.error("Battle loading error:", battleError);
    return <EmptyArena signedIn={Boolean(user)} />;
  }
  if (!generationSet) {
    notFound();
  }

  const cookieStore = await cookies();
  const rawSnapshot = cookieStore.get("caption_arena_browse")?.value ?? "";
  const [owner = "", timestamp = "", , featuredIdRaw = ""] =
    rawSnapshot.split("|");
  const now = Date.now();
  const parsedTime = Date.parse(timestamp);
  const matchingSession =
    owner === (user?.id ?? "anon") &&
    Number.isFinite(parsedTime) &&
    parsedTime <= now + 5000 &&
    now - parsedTime <= 24 * 60 * 60 * 1000;

  // Explicit battle links work even without an active browsing cookie.
  // A newly generated battle may also be newer than the previous snapshot.
  const validSessionForBattle =
    matchingSession &&
    Date.parse(generationSet.created_at) <= parsedTime;

  // Direct links from Generate or a new tab also need a fixed snapshot.
  // The initialized marker avoids a redirect loop if cookies are blocked.
  if (!validSessionForBattle && params.initialized !== "1") {
    redirect(`/battle/start?battle=${battleId}`);
  }

  const snapshotAt = validSessionForBattle
    ? timestamp
    : new Date().toISOString();
  const featuredId = validSessionForBattle && /^[1-9]\d*$/.test(featuredIdRaw)
    ? Number(featuredIdRaw)
    : null;
  const validFeaturedId = featuredId !== null && Number.isSafeInteger(featuredId)
    ? featuredId
    : null;

  // Fetch only the current battle's vote, its two captions, and two neighbor
  // IDs. Do not download all battle records or the user's voting history.
  const votePromise = user
    ? supabase
        .from("votes")
        .select("choice")
        .eq("user_id", user.id)
        .eq("generation_set_id", battleId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const neighborsPromise = user
    ? validFeaturedId !== null
      ? supabase.rpc("get_arena_featured_neighbors", {
          p_battle_id: battleId,
          p_snapshot_at: snapshotAt,
          p_featured_id: validFeaturedId,
        })
      : supabase.rpc("get_arena_neighbors", {
          p_battle_id: battleId,
          p_snapshot_at: snapshotAt,
        })
    : Promise.resolve({ data: null, error: null });

  // Check the live earliest unvoted battle only when the user has manually
  // navigated. This is an indexed, one-row lookup, not a full battle download.
  // It handles votes cast since the snapshot and avoids stale cookie IDs.
  const resumePromise = user && params.browse === "1"
    ? supabase.rpc("start_arena_browse")
    : Promise.resolve({ data: null, error: null });

  const anonymousPreviousPromise = !user
    ? supabase
        .from("generation_sets")
        .select("id")
        .lt("id", battleId)
        .lte("created_at", snapshotAt)
        .order("id", { ascending: false })
        .limit(1)
    : Promise.resolve({ data: null, error: null });

  const anonymousNextPromise = !user
    ? supabase
        .from("generation_sets")
        .select("id")
        .gt("id", battleId)
        .lte("created_at", snapshotAt)
        .order("id", { ascending: true })
        .limit(1)
    : Promise.resolve({ data: null, error: null });

  const [
    { data: generations, error: captionsError },
    { data: existingVote, error: voteError },
    { data: neighborRows, error: neighborsError },
    { data: anonymousPrevious, error: anonPrevError },
    { data: anonymousNext, error: anonNextError },
    { data: resumeRows, error: resumeError },
  ] = await Promise.all([
    supabase
      .from("generations")
      .select("id, candidate_index, content")
      .eq("generation_set_id", battleId)
      .order("candidate_index", { ascending: true }),
    votePromise,
    neighborsPromise,
    anonymousPreviousPromise,
    anonymousNextPromise,
    resumePromise,
  ]);

  if (captionsError || voteError || neighborsError || anonPrevError || anonNextError) {
    console.error("Arena lookup error:", {
      captionsError,
      voteError,
      neighborsError,
      anonPrevError,
      anonNextError,
    });
    return (
      <main className="min-h-screen p-8">
        <AppHeader />
        <p className="mt-20 text-center">Could not load this battle. Please try again.</p>
      </main>
    );
  }

  if (resumeError) {
    // A failed optional Resume lookup must not break Arena voting/browsing.
    console.error("Arena resume lookup error:", resumeError);
  }

  const unvotedIdRaw = (resumeRows as
    | { first_unvoted_id: number | null }[]
    | null)?.[0]?.first_unvoted_id;
  const earliestUnvotedId = unvotedIdRaw == null
    ? null
    : Number(unvotedIdRaw);
  const showResume =
    Boolean(user) &&
    params.browse === "1" &&
    !resumeError &&
    earliestUnvotedId !== null &&
    Number.isSafeInteger(earliestUnvotedId) &&
    earliestUnvotedId > 0 &&
    earliestUnvotedId !== battleId;

  const captions = (generations ?? []) as Generation[];
  const choice = existingVote?.choice;
  const existingChoice: VoteChoice | null =
    choice === "a" || choice === "b" ||
    choice === "both" || choice === "neither"
      ? choice
      : null;

  const neighbor = (neighborRows as
    | { previous_battle_id: number | null; next_battle_id: number | null }[]
    | null)?.[0];
  const previousId = user
    ? neighbor?.previous_battle_id ?? null
    : anonymousPrevious?.[0]?.id ?? null;
  const nextId = user
    ? neighbor?.next_battle_id ?? null
    : anonymousNext?.[0]?.id ?? null;

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("generation-media")
    .getPublicUrl(generationSet.image_path);

  return (
    <main className="min-h-screen p-8">
      <AppHeader />
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Caption Arena</h1>
          <p className="mt-3 text-gray-500">Which caption wins?</p>
        </div>

        <BattleNavigation
          battleId={battleId}
          previousId={previousId}
          nextId={nextId}
          showResume={showResume}
        />

        <img
          src={publicUrl}
          alt="Caption battle"
          className="mx-auto mt-8 max-h-[500px] w-full rounded-xl border object-contain"
        />

        {captions.length === 2 ? (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {captions.map((generation) => (
                <article key={generation.id} className="rounded-xl border p-6">
                  <p className="mb-3 text-sm font-medium text-gray-500">
                    Caption {generation.candidate_index === 1 ? "A" : "B"}
                  </p>
                  <p className="text-xl">{generation.content}</p>
                </article>
              ))}
            </div>

            <div className="mt-6">
              {user ? (
                <VoteButtons
                  key={battleId}
                  userId={user.id}
                  generationSetId={battleId}
                  generations={captions}
                  initialChoice={existingChoice}
                />
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-gray-500">Sign in to vote.</p>
                  <GoogleSignIn />
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-8 text-center">
            This battle does not have two captions.
          </p>
        )}

        <div className="mt-3">
          <BattleNavigation
            battleId={battleId}
            previousId={previousId}
            nextId={nextId}
            showResume={showResume}
          />
        </div>
      </div>
    </main>
  );
}
