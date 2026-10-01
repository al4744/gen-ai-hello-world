"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl: string;
};

export default function ProfileForm({
  userId,
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage("Failed to update profile.");
      setSaving(false);
      return;
    }

    setSaving(false);

    // After completing/updating the profile, return to the home page.
    router.replace("/");
  }

  async function handleAvatarUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile photo must be 5 MB or smaller.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    setUploading(true);
    setMessage("");

    const supabase = createClient();

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setMessage("Failed to upload profile photo.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      setMessage("Photo uploaded, but the profile could not be updated.");
      setUploading(false);
      return;
    }

    setAvatarUrl(publicUrl);
    setMessage("Profile photo updated.");
    setUploading(false);

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="mx-auto h-32 w-32 rounded-full border object-cover"
          />
        ) : (
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border text-sm text-gray-500">
            No photo
          </div>
        )}

        <label className="mt-4 inline-block cursor-pointer rounded-lg border px-4 py-2 font-medium">
          {uploading ? "Uploading..." : "Upload photo"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block font-medium"
          >
            First name
          </label>

          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-lg border px-4 py-2"
            required
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block font-medium"
          >
            Last name
          </label>

          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-lg border px-4 py-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg border px-4 py-2 font-medium"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      {message && (
        <p className="text-center text-sm">
          {message}
        </p>
      )}
    </div>
  );
}