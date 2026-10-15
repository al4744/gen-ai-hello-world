"use client";

import { useCallback, useEffect, useState } from "react";
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

const VOTE_OPTIONS: { choice: VoteChoice; label: string }[] = [
  { choice: "a", label: "Caption A" },
  { choice: "b", label: "Caption B" },
  { choice: "both", label: "Both" },
  { choice: "neither", label: "Neither" },
];

export default function VoteButtons({
  userId,
  generationSetId,
  generations,
  initialChoice,
}: VoteButtonsProps) {
  const [selectedChoice, setSelectedChoice] =
    useState<VoteChoice | null>(initialChoice);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState<BattleResults | null>(null);
  const [message, setMessage] = useState("");
  const [resultsError, setResultsError] = useState("");

  const captionA = generations.find(
    (generation) => generation.candidate_index === 1
  );
  const captionB = generations.find(
    (generation) => generation.candidate_index === 2
  );

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    setResults(null);
    setResultsError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_battle_results",
        { p_generation_set_id: generationSetId }
      );

      if (error) {
        console.error("Results error:", error);
        setResultsError("Could not load vote results.");
        return;
      }

      const row = data?.[0];
      if (!row) {
        setResultsError("Vote results are temporarily unavailable.");
        return;
      }

      setResults({
        totalVotes: Number(row.total_votes ?? 0),
        aVotes: Number(row.a_votes ?? 0),
        bVotes: Number(row.b_votes ?? 0),
        bothVotes: Number(row.both_votes ?? 0),
        neitherVotes: Number(row.neither_votes ?? 0),
      });
    } catch (error) {
      console.error("Results request failed:", error);
      setResultsError("Could not load vote results.");
    } finally {
      setLoadingResults(false);
    }
  }, [generationSetId]);

  // A previously-voted battle shows results in the same four option cards.
  // BattlePage gives this component a key={generationSet.id}, so browsing
  // to another battle mounts a fresh instance with the correct saved vote.
  useEffect(() => {
    if (initialChoice !== null) {
      void loadResults();
    }
  }, [initialChoice, loadResults]);

  async function handleVote(choice: VoteChoice) {
    if (selectedChoice !== null || submitting) {
      return;
    }

    let chosenGenerationId: number | null = null;
    if (choice === "a") {
      chosenGenerationId = captionA?.id ?? null;
    } else if (choice === "b") {
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

    try {
      const supabase = createClient();
      const { error } = await supabase.from("votes").insert({
        user_id: userId,
        generation_set_id: generationSetId,
        chosen_generation_id: chosenGenerationId,
        choice,
      });

      if (error) {
        console.error("Vote error:", error);
        setMessage(
          error.code === "23505"
            ? "You already voted on this battle. Refresh to see the saved vote."
            : "Your vote could not be saved. Please try again."
        );
        return;
      }

      setSelectedChoice(choice);
      // A successful vote is indicated by the checkmark in the chosen card.
      // Keep the spoken confirmation without adding another results section.
      setMessage("");
      await loadResults();
    } catch (error) {
      console.error("Vote request failed:", error);
      setMessage("Your vote could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function voteCount(choice: VoteChoice) {
    if (!results) return 0;
    switch (choice) {
      case "a":
        return results.aVotes;
      case "b":
        return results.bVotes;
      case "both":
        return results.bothVotes;
      case "neither":
        return results.neitherVotes;
    }
  }

  function percentage(votes: number) {
    if (!results || results.totalVotes === 0) return 0;
    return Math.round((votes / results.totalVotes) * 100);
  }

  const hasVoted = selectedChoice !== null;

  return (
    <div>
      <style>{`
        @keyframes caption-vote-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .caption-vote-fill { animation: none !important; }
        }
      `}</style>

      <div className="grid gap-4 md:grid-cols-2">
        {VOTE_OPTIONS.map(({ choice, label }) => {
          const votes = voteCount(choice);
          const percent = percentage(votes);
          const isSelected = selectedChoice === choice;

          return (
            <button
              key={choice}
              type="button"
              onClick={() => void handleVote(choice)}
              disabled={submitting || hasVoted}
              aria-pressed={isSelected}
              className={
                "w-full rounded-xl border px-5 py-4 font-medium transition-all duration-300 " +
                (hasVoted
                  ? "min-h-[100px] cursor-default text-left disabled:opacity-100 "
                  : "text-center hover:bg-white/5 disabled:cursor-wait ") +
                (isSelected ? "ring-1 ring-current" : "")
              }
            >
              {!hasVoted ? (
                <span>
                  {choice === "a"
                    ? "Vote for Caption A"
                    : choice === "b"
                      ? "Vote for Caption B"
                      : choice === "both"
                        ? "Vote for Both"
                        : "Vote for Neither"}
                </span>
              ) : (
                <span className="block w-full">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-medium">
                      {isSelected ? "✓ " : ""}
                      {label}
                    </span>
                    <span className="text-xl font-semibold tabular-nums">
                      {results ? `${percent}%` : "—"}
                    </span>
                  </span>

                  <span className="mt-1 block text-sm font-normal text-gray-500">
                    {results
                      ? `${votes} ${votes === 1 ? "vote" : "votes"}`
                      : resultsError
                        ? "Results unavailable"
                        : "Loading results…"}
                  </span>

                  <span
                    className="mt-4 block h-[3px] w-full overflow-hidden rounded-full bg-white/20"
                    aria-hidden="true"
                  >
                    {results && (
                      <span
                        className="caption-vote-fill block h-full rounded-full bg-white"
                        style={{
                          width: `${percent}%`,
                          transformOrigin: "left",
                          animation:
                            "caption-vote-fill 800ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        }}
                      />
                    )}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {message && (
        <p role="alert" className="mt-4 text-center text-sm">
          {message}
        </p>
      )}

      {hasVoted && resultsError && !loadingResults && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span role="alert" className="text-gray-500">
            {resultsError}
          </span>
          <button
            type="button"
            onClick={() => void loadResults()}
            className="rounded-lg border px-3 py-1.5 font-medium"
          >
            Retry results
          </button>
        </div>
      )}

      {hasVoted && results && (
        <p className="sr-only" role="status">
          Your vote is saved. Community vote totals are displayed inside each option.
        </p>
      )}
    </div>
  );
}
