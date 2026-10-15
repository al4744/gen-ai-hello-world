import AppHeader from "@/components/app-header";
import LeaderboardView, { type Battle } from "@/components/leaderboard-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GenerationSet = {
  id: number;
  image_path: string;
  user_prompt: string | null;
  created_at: string;
};

type Generation = {
  id: number;
  generation_set_id: number;
  candidate_index: number;
  content: string;
};

type BattleResult = {
  generation_set_id: number;
  total_votes: number | string;
  a_votes: number | string;
  b_votes: number | string;
  both_votes: number | string;
  neither_votes: number | string;
};

export default async function ResultsPage() {
  const supabase = await createClient();

  const [setsResponse, captionsResponse, resultsResponse] = await Promise.all([
    supabase
      .from("generation_sets")
      .select("id, image_path, user_prompt, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("generations")
      .select("id, generation_set_id, candidate_index, content"),
    supabase.rpc("get_all_battle_results"),
  ]);

  if (
    setsResponse.error ||
    captionsResponse.error ||
    resultsResponse.error
  ) {
    console.error("Leaderboard data error:", {
      sets: setsResponse.error,
      captions: captionsResponse.error,
      results: resultsResponse.error,
    });

    return (
      <main className="min-h-screen px-6 py-10">
        <AppHeader />
        <div className="mx-auto mt-24 max-w-xl text-center">
          <h1 className="text-3xl font-bold">Leaderboard unavailable</h1>
          <p className="mt-3 text-gray-500">
            We couldn&apos;t load the community rankings. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const sets = (setsResponse.data ?? []) as GenerationSet[];
  const generations = (captionsResponse.data ?? []) as Generation[];
  const results = (resultsResponse.data ?? []) as BattleResult[];

  const captionsByBattle = new Map<
    number,
    { a: string | null; b: string | null }
  >();

  for (const generation of generations) {
    const pair = captionsByBattle.get(generation.generation_set_id) ?? {
      a: null,
      b: null,
    };

    if (generation.candidate_index === 1) {
      pair.a = generation.content;
    } else if (generation.candidate_index === 2) {
      pair.b = generation.content;
    }

    captionsByBattle.set(generation.generation_set_id, pair);
  }

  const resultsByBattle = new Map(
    results.map((result) => [result.generation_set_id, result])
  );

  const battles: Battle[] = sets.map((set) => {
    const pair = captionsByBattle.get(set.id);
    const result = resultsByBattle.get(set.id);
    const {
      data: { publicUrl },
    } = supabase.storage.from("generation-media").getPublicUrl(set.image_path);

    return {
      id: set.id,
      imageUrl: publicUrl,
      userPrompt: set.user_prompt ?? "",
      createdAt: set.created_at,
      captionA: pair?.a ?? null,
      captionB: pair?.b ?? null,
      totalVotes: Number(result?.total_votes ?? 0),
      aVotes: Number(result?.a_votes ?? 0),
      bVotes: Number(result?.b_votes ?? 0),
      bothVotes: Number(result?.both_votes ?? 0),
      neitherVotes: Number(result?.neither_votes ?? 0),
    };
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <AppHeader />
      <LeaderboardView battles={battles} />
    </main>
  );
}
