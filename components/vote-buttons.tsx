"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Generation = {
  id: number;
  candidate_index: number;
  content: string;
};

type VoteChoice = "a" | "b" | "both" | "neither";

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
  const [selectedChoice, setSelectedChoice] =
    useState<VoteChoice | null>(initialChoice);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const captionA = generations.find(
    (generation) => generation.candidate_index === 1
  );

  const captionB = generations.find(
    (generation) => generation.candidate_index === 2
  );

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

    const { error } = await supabase.from("votes").insert({
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

      {selectedChoice !== null && !message && (
        <p className="mt-4 text-center text-sm text-gray-500">
          You already voted on this battle.
        </p>
      )}
    </div>
  );
}