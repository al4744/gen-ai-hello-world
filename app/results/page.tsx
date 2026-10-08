import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomeButton from "@/components/home-button";

export const dynamic = "force-dynamic";

type GenerationSet = {
  id: number;
  image_path: string;
  user_prompt: string;
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
  total_votes: number;
  a_votes: number;
  b_votes: number;
  both_votes: number;
  neither_votes: number;
};

export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: generationSets, error: setsError } =
    await supabase
      .from("generation_sets")
      .select(
        "id, image_path, user_prompt, created_at"
      )
      .order("created_at", { ascending: false });

  if (setsError) {
    console.error(setsError);

    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <HomeButton />
        <p>Failed to load battles.</p>
      </main>
    );
  }

  const { data: generations, error: generationsError } =
    await supabase
      .from("generations")
      .select(
        "id, generation_set_id, candidate_index, content"
      )
      .order("candidate_index", { ascending: true });

  if (generationsError) {
    console.error(generationsError);

    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <HomeButton />
        <p>Failed to load captions.</p>
      </main>
    );
  }

  const { data: resultRows, error: resultsError } =
    await supabase.rpc("get_all_battle_results");

  if (resultsError) {
    console.error(resultsError);

    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <HomeButton />
        <p>Failed to load results.</p>
      </main>
    );
  }

  const sets =
    (generationSets ?? []) as GenerationSet[];

  const allGenerations =
    (generations ?? []) as Generation[];

  const allResults =
    (resultRows ?? []) as BattleResult[];

  const resultsBySet = new Map(
    allResults.map((result) => [
      result.generation_set_id,
      result,
    ])
  );

  function percentage(
    votes: number,
    totalVotes: number
  ) {
    if (totalVotes === 0) {
      return 0;
    }

    return Math.round((votes / totalVotes) * 100);
  }

  if (sets.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <HomeButton />
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            Results
          </h1>

          <p className="mt-4 text-gray-500">
            No caption battles exist yet.
          </p>

          <Link
            href="/generate"
            className="mt-8 inline-block rounded-xl border px-5 py-3 font-medium"
          >
            Create a Battle
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <HomeButton />
      <div className="mx-auto w-full max-w-5xl">
        <header className="text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Human Preference Data
          </p>

          <h1 className="text-5xl font-bold tracking-tight">
            Results
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-500">
            See how the community rated every AI caption
            battle.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/battle"
              className="rounded-xl border px-5 py-2 font-medium"
            >
              Enter Arena
            </Link>
          </div>
        </header>

        <section className="mt-10 space-y-5">
          {sets.map((set) => {
            const captions = allGenerations.filter(
              (generation) =>
                generation.generation_set_id === set.id
            );

            const captionA = captions.find(
              (generation) =>
                generation.candidate_index === 1
            );

            const captionB = captions.find(
              (generation) =>
                generation.candidate_index === 2
            );

            const result =
              resultsBySet.get(set.id);

            const totalVotes =
              Number(result?.total_votes ?? 0);

            const aVotes =
              Number(result?.a_votes ?? 0);

            const bVotes =
              Number(result?.b_votes ?? 0);

            const bothVotes =
              Number(result?.both_votes ?? 0);

            const neitherVotes =
              Number(result?.neither_votes ?? 0);

            const {
              data: { publicUrl },
            } = supabase.storage
              .from("generation-media")
              .getPublicUrl(set.image_path);

            return (
              <article
                key={set.id}
                className="rounded-2xl border p-5"
              >
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div>
                    <img
                      src={publicUrl}
                      alt="Caption battle"
                      className="h-[220px] w-full rounded-xl border object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">
                          Battle #{set.id}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {totalVotes}{" "}
                          {totalVotes === 1
                            ? "vote"
                            : "votes"}
                        </p>
                      </div>
                    </div>

                    {set.user_prompt && (
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        <span className="font-medium">
                          Context:
                        </span>{" "}
                        {set.user_prompt}
                      </p>
                    )}

                    <div className="mt-4 space-y-2">
                      <div className="rounded-lg border px-4 py-3">
                        <p className="text-xs font-medium text-gray-500">
                          Caption A
                        </p>

                        <p className="mt-1 text-sm leading-6">
                          {captionA?.content ??
                            "Caption unavailable"}
                        </p>
                      </div>

                      <div className="rounded-lg border px-4 py-3">
                        <p className="text-xs font-medium text-gray-500">
                          Caption B
                        </p>

                        <p className="mt-1 text-sm leading-6">
                          {captionB?.content ??
                            "Caption unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ResultStat
                        label="A"
                        votes={aVotes}
                        percentage={percentage(
                          aVotes,
                          totalVotes
                        )}
                      />

                      <ResultStat
                        label="B"
                        votes={bVotes}
                        percentage={percentage(
                          bVotes,
                          totalVotes
                        )}
                      />

                      <ResultStat
                        label="Both"
                        votes={bothVotes}
                        percentage={percentage(
                          bothVotes,
                          totalVotes
                        )}
                      />

                      <ResultStat
                        label="Neither"
                        votes={neitherVotes}
                        percentage={percentage(
                          neitherVotes,
                          totalVotes
                        )}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function ResultStat({
  label,
  votes,
  percentage,
}: {
  label: string;
  votes: number;
  percentage: number;
}) {
  return (
    <div className="rounded-lg border px-3 py-3 text-center">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {percentage}%
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {votes} {votes === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}