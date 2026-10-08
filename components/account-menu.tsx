"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccountMenuProps = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

export default function AccountMenu({
  email,
  firstName,
  lastName,
  avatarUrl,
}: AccountMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const fullName = [firstName, lastName]
    .filter(Boolean)
    .join(" ");

  const displayName = fullName || email;

  const initial =
    firstName?.trim().charAt(0).toUpperCase() ||
    email.trim().charAt(0).toUpperCase() ||
    "?";

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    setMenuOpen(false);
    router.refresh();
  }

  return (
    <div
      className="fixed right-8 top-6 z-50"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          aria-label="Open account menu"
          aria-expanded={menuOpen}
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${displayName} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-0 top-full w-52 pt-2">
          <div className="overflow-hidden rounded-xl border bg-black shadow-xl">
            <div className="border-b px-4 py-3">
              <p className="truncate text-sm font-medium">
                {displayName}
              </p>

              <p className="mt-1 truncate text-xs text-gray-500">
                {email}
              </p>
            </div>

            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-left text-sm hover:bg-white/10"
            >
              Settings
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full px-4 py-3 text-left text-sm hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
