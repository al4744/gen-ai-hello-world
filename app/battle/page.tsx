import Link from "next/link";
import GoogleSignIn from "@/components/google-sign-in";
import VoteButtons from "@/components/vote-buttons";
import { createClient } from "@/lib/supabase/server";

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

  const { data: generationSet } = await supabase
    .from("generation_sets")
    .select("id, image_path, user_prompt, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!generationSet) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
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

  let existingChoice: VoteChoice | null = null;

  if (user) {
    const { data: vote } = await supabase
      .from("votes")
      .select("choice")
      .eq("user_id", user.id)
      .eq("generation_set_id", generationSet.id)
      .maybeSingle();

    if (
      vote?.choice === "a" ||
      vote?.choice === "b" ||
      vote?.choice === "both" ||
      vote?.choice === "neither"
    ) {
      existingChoice = vote.choice;
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            Caption Battle
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
          <Link
            href="/"
            className="rounded-lg border px-4 py-2 font-medium"
          >
            Home
          </Link>

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