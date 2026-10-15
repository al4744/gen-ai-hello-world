"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Generation = {
  id: number;
  candidate_index: number;
  content: string;
};

type VoteChoice = "a" | "b" | "both" | "neither";

type BattleResults = {
  totalVotes: number;
  aVotes: number;
  bVotes: number;
  bothVotes: number;
  neitherVotes: number;
};

type VoteButtonsProps = {
  userId: string;
  generationSetId: number;
  generations: Generation[];
  initialChoice: VoteChoice | null;
};

export default function VoteButtons({
  userId,
  generationSetId,
  generations,
  initialChoice,
}: VoteButtonsProps) {
  const router = useRouter();

  const [selectedChoice, setSelectedChoice] =
    useState<VoteChoice | null>(initialChoice);

  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] =
    useState<BattleResults | null>(null);

  const captionA = generations.find(
    (generation) => generation.candidate_index === 1
  );

  const captionB = generations.find(
    (generation) => generation.candidate_index === 2
  );

  async function loadResults() {
    setLoadingResults(true);

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "get_battle_results",
      {
        p_generation_set_id: generationSetId,
      }
    );

    if (error) {
      console.error("Results error:", error);
      setLoadingResults(false);
      return;
    }

    const row = data?.[0];

    if (row) {
      setResults({
        totalVotes: Number(row.total_votes ?? 0),
        aVotes: Number(row.a_votes ?? 0),
        bVotes: Number(row.b_votes ?? 0),
        bothVotes: Number(row.both_votes ?? 0),
        neitherVotes: Number(row.neither_votes ?? 0),
      });
    }

    setLoadingResults(false);
  }

  useEffect(() => {
    if (initialChoice !== null) {
      loadResults();
    }
    // We only want this check when the battle first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVote(choice: VoteChoice) {
    if (selectedChoice !== null || submitting) {
      return;
    }

    let chosenGenerationId: number | null = null;

    if (choice === "a") {
      chosenGenerationId = captionA?.id ?? null;
    }

    if (choice === "b") {
      chosenGenerationId = captionB?.id ?? null;
    }

    if (
      (choice === "a" || choice === "b") &&
      chosenGenerationId === null
    ) {
      setMessage("The selected caption could not be found.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("votes")
      .insert({
        user_id: userId,
        generation_set_id: generationSetId,
        chosen_generation_id: chosenGenerationId,
        choice,
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setMessage("You already voted on this battle.");
      } else {
        setMessage("Your vote could not be saved.");
      }

      setSubmitting(false);
      return;
    }

    setSelectedChoice(choice);
    setMessage("Vote saved.");
    setSubmitting(false);

    await loadResults();
  }

  function buttonText(
    choice: VoteChoice,
    defaultText: string
  ) {
    if (selectedChoice === choice) {
      return `✓ ${defaultText}`;
    }

    return defaultText;
  }

  function percentage(votes: number) {
    if (!results || results.totalVotes === 0) {
      return 0;
    }

    return Math.round(
      (votes / results.totalVotes) * 100
    );
  }

  function handleNextBattle() {
    setResults(null);
    setMessage("");
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => handleVote("a")}
          disabled={submitting || selectedChoice !== null}
          className="rounded-xl border px-5 py-4 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonText("a", "Vote for Caption A")}
        </button>

        <button
          type="button"
          onClick={() => handleVote("b")}
          disabled={submitting || selectedChoice !== null}
          className="rounded-xl border px-5 py-4 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonText("b", "Vote for Caption B")}
        </button>

        <button
          type="button"
          onClick={() => handleVote("both")}
          disabled={submitting || selectedChoice !== null}
          className="rounded-xl border px-5 py-4 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonText("both", "Vote for Both")}
        </button>

        <button
          type="button"
          onClick={() => handleVote("neither")}
          disabled={submitting || selectedChoice !== null}
          className="rounded-xl border px-5 py-4 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonText("neither", "Vote for Neither")}
        </button>
      </div>

      {message && (
        <p className="mt-4 text-center text-sm">
          {message}
        </p>
      )}

      {loadingResults && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Loading community results...
        </p>
      )}

      {results && (
        <section className="mt-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              Community Results
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {results.totalVotes}{" "}
              {results.totalVotes === 1 ? "vote" : "votes"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="flex justify-between gap-4">
                <span>Caption A</span>
                <span className="font-bold">
                  {percentage(results.aVotes)}%
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {results.aVotes} votes
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex justify-between gap-4">
                <span>Caption B</span>
                <span className="font-bold">
                  {percentage(results.bVotes)}%
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {results.bVotes} votes
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex justify-between gap-4">
                <span>Both</span>
                <span className="font-bold">
                  {percentage(results.bothVotes)}%
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {results.bothVotes} votes
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex justify-between gap-4">
                <span>Neither</span>
                <span className="font-bold">
                  {percentage(results.neitherVotes)}%
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {results.neitherVotes} votes
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleNextBattle}
              className="rounded-xl border px-6 py-3 font-medium"
            >
              Next Battle
            </button>
          </div>
        </section>
      )}
    </div>
  );
}