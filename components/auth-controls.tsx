"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthControlsProps = {
  email: string;
};

export default function AuthControls({ email }: AuthControlsProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.refresh();
  }

  return (
    <div className="mb-8 text-center">
      <p className="mb-4 text-sm text-gray-500">
        Signed in as {email}
      </p>

      <div className="flex justify-center gap-3">
        <Link
          href="/profile"
          className="rounded-lg border px-4 py-2 font-medium"
        >
          Profile
        </Link>

        <Link
          href="/members"
          className="rounded-lg border px-4 py-2 font-medium"
        >
          Members Only
        </Link>

        <button
          onClick={handleSignOut}
          className="rounded-lg border px-4 py-2 font-medium"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}