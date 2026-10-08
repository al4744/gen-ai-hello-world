"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type GenerationFormProps = {
  userId: string;
};

type Generation = {
  id: number;
  candidate_index: number;
  content: string;
};

type GenerationResult = {
  generationSetId: number;
  imagePath: string;
  imageUrl: string;
  generations: Generation[];
};

export default function GenerationForm({
  userId,
}: GenerationFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setResult(null);
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl("");
      setMessage("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setPreviewUrl("");
      setMessage("Image must be 5 MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setMessage("Choose an image first.");
      return;
    }

    setGenerating(true);
    setMessage("");
    setResult(null);

    const supabase = createClient();

    const extension =
      file.name.split(".").pop()?.toLowerCase() ?? "jpg";

    const imagePath =
      `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("generation-media")
      .upload(imagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      setMessage("Failed to upload image.");
      setGenerating(false);
      return;
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imagePath,
        userPrompt: userPrompt.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to generate captions.");
      setGenerating(false);
      return;
    }

    setResult(data);
    setMessage("");
    setGenerating(false);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block font-medium">
            Image
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={generating}
            className="block w-full"
          />
        </div>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Upload preview"
            className="max-h-96 w-full rounded-lg border object-contain"
          />
        )}

        <div>
          <label
            htmlFor="context"
            className="mb-2 block font-medium"
          >
            Context
          </label>

          <textarea
            id="context"
            value={userPrompt}
            onChange={(event) =>
              setUserPrompt(event.target.value)
            }
            maxLength={500}
            rows={4}
            placeholder="Example: Butler Library at 2 AM during midterms"
            className="w-full rounded-lg border px-4 py-3"
          />

          <p className="mt-1 text-right text-sm text-gray-500">
            {userPrompt.length}/500
          </p>
        </div>

        <button
          type="submit"
          disabled={generating || !file}
          className="w-full rounded-lg border px-4 py-3 font-medium disabled:opacity-50"
        >
          {generating
            ? "Generating captions..."
            : "Generate caption battle"}
        </button>
      </form>

      {message && (
        <p className="text-center text-sm">
          {message}
        </p>
      )}

      {result && (
        <section className="space-y-6">
          <h2 className="text-center text-2xl font-bold">
            Your Caption Battle
          </h2>

          <img
            src={result.imageUrl}
            alt="Caption battle"
            className="max-h-96 w-full rounded-lg border object-contain"
          />

          <div className="grid gap-4 md:grid-cols-2">
            {result.generations.map((generation, index) => (
              <article
                key={generation.id}
                className="rounded-lg border p-5"
              >
                <p className="mb-2 text-sm font-medium text-gray-500">
                  Caption {index === 0 ? "A" : "B"}
                </p>

                <p className="text-lg">
                  {generation.content}
                </p>
              </article>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500">
            Saved successfully. This matchup is ready for community voting.
          </p>

          <div className="flex justify-center">
            <Link
              href="/"
              className="rounded-lg border px-4 py-2 font-medium"
            >
              Back home
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}