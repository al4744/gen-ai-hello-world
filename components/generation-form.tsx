"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";
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
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] =
    useState<GenerationResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function acceptFile(selectedFile: File | null) {
    setResult(null);
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl("");
      setMessage(
        "Please choose a JPEG, PNG, or WebP image."
      );
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

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    acceptFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const droppedFile =
      event.dataTransfer.files?.[0] ?? null;

    acceptFile(droppedFile);
  }

  function handlePaste(
    event: ClipboardEvent<HTMLDivElement>
  ) {
    const items = Array.from(event.clipboardData.items);

    const imageItem = items.find((item) =>
      item.type.startsWith("image/")
    );

    if (!imageItem) {
      return;
    }

    event.preventDefault();

    const pastedFile = imageItem.getAsFile();

    if (pastedFile) {
      acceptFile(pastedFile);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file) {
      setMessage("Choose an image first.");
      return;
    }

    setGenerating(true);
    setMessage("");
    setResult(null);

    const supabase = createClient();

    let extension =
      file.name.split(".").pop()?.toLowerCase();

    if (
      !extension ||
      !["jpg", "jpeg", "png", "webp"].includes(extension)
    ) {
      extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
    }

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
        userPrompt: "",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.error ?? "Failed to generate captions."
      );
      setGenerating(false);
      return;
    }

    setResult(data);
    setMessage("");
    setGenerating(false);
  }

  function handleCreateAnother() {
    setFile(null);
    setPreviewUrl("");
    setMessage("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="mb-2 font-medium">
            Image
          </p>

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
            className="rounded-xl border-2 border-dashed p-8 text-center"
          >
            <p className="font-medium">
              Drop an image here
            </p>

            <p className="mt-2 text-sm text-gray-500">
              or paste an image with ⌘V
            </p>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={generating}
              className="mt-4 rounded-lg border px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {file
                ? "Choose a different image"
                : "Choose image"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={generating}
              className="hidden"
            />

            {file && (
              <p className="mt-3 text-sm text-gray-500">
                {file.name || "Pasted image"}
              </p>
            )}
          </div>
        </div>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Upload preview"
            className="max-h-96 w-full rounded-lg border object-contain"
          />
        )}

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
            {result.generations.map(
              (generation, index) => (
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
              )
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Saved successfully. This matchup is ready
            for community voting.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/battle"
              className="rounded-lg border px-5 py-2 font-medium"
            >
              Open in Arena
            </Link>

            <button
              type="button"
              onClick={handleCreateAnother}
              className="rounded-lg border px-5 py-2 font-medium"
            >
              Create another
            </button>

            <Link
              href="/"
              className="rounded-lg border px-5 py-2 font-medium"
            >
              Home
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}