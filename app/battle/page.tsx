import Link from "next/link";
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

export const dynamic = "force-dynamic";

export default async function BattlePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: generationSets } = await supabase
    .from("generation_sets")
    .select("id, image_path, user_prompt, created_at")
    .order("created_at", { ascending: false });

  if (!generationSets || generationSets.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <AppHeader />
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            Caption Battle
          </h1>

          <p className="mt-4 text-gray-500">
            No caption battles exist yet.
          </p>

          {user && (
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

  let generationSet = generationSets[0];
  let existingChoice: VoteChoice | null = null;

  if (user) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("generation_set_id, choice")
      .eq("user_id", user.id);

    const votedSetIds = new Set(
      (userVotes ?? []).map((vote) => vote.generation_set_id)
    );

    const unvotedSet = generationSets.find(
      (set) => !votedSetIds.has(set.id)
    );

    if (!unvotedSet) {
      return (
        <main className="flex min-h-screen items-center justify-center p-8">
          <AppHeader />
          <div className="w-full max-w-md text-center">
            <h1 className="text-4xl font-bold">
              You&apos;re caught up
            </h1>

            <p className="mt-4 text-gray-500">
              You&apos;ve voted on every caption battle currently available.
            </p>

            <div className="mt-8 flex justify-center gap-3">
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

    generationSet = unvotedSet;

    const existingVote = (userVotes ?? []).find(
      (vote) => vote.generation_set_id === generationSet.id
    );

    if (
      existingVote?.choice === "a" ||
      existingVote?.choice === "b" ||
      existingVote?.choice === "both" ||
      existingVote?.choice === "neither"
    ) {
      existingChoice = existingVote.choice;
    }
  }

  const { data: generations } = await supabase
    .from("generations")
    .select("id, candidate_index, content")
    .eq("generation_set_id", generationSet.id)
    .order("candidate_index", { ascending: true });

  const captions = (generations ?? []) as Generation[];

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
          <h1 className="text-4xl font-bold">
            Caption Arena
          </h1>

          <p className="mt-3 text-gray-500">
            Which caption wins?
          </p>
        </div>

        <img
          src={publicUrl}
          alt="Caption battle"
          className="mx-auto mt-8 max-h-[500px] w-full rounded-xl border object-contain"
        />

        {generationSet.user_prompt && (
          <p className="mt-4 text-center text-sm text-gray-500">
            Context: {generationSet.user_prompt}
          </p>
        )}

        {captions.length === 2 ? (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {captions.map((generation) => (
                <article
                  key={generation.id}
                  className="rounded-xl border p-6"
                >
                  <p className="mb-3 text-sm font-medium text-gray-500">
                    Caption{" "}
                    {generation.candidate_index === 1
                      ? "A"
                      : "B"}
                  </p>

                  <p className="text-xl">
                    {generation.content}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6">
              {user ? (
                <VoteButtons
                  userId={user.id}
                  generationSetId={generationSet.id}
                  generations={captions}
                  initialChoice={existingChoice}
                />
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-gray-500">
                    Sign in to vote.
                  </p>

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

        <div className="mt-10 flex justify-center gap-3">
          {user && (
            <Link
              href="/generate"
              className="rounded-lg border px-4 py-2 font-medium"
            >
              Create another
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}