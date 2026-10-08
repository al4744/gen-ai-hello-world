import Link from "next/link";
import AccountMenu from "@/components/account-menu";
import HeaderLinks from "@/components/header-links";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let lastName: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    firstName = profile?.first_name ?? null;
    lastName = profile?.last_name ?? null;

    if (profile?.avatar_url) {
      if (
        profile.avatar_url.startsWith("http://") ||
        profile.avatar_url.startsWith("https://")
      ) {
        avatarUrl = profile.avatar_url;
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url);

        avatarUrl = publicUrl;
      }
    }
  }

  return (
    <header className="app-header fixed inset-x-0 top-0 z-50 h-18 border-b border-white/10 bg-black text-gray-100">
      <div className="flex h-full items-center gap-2 px-3 sm:gap-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 w-14 shrink-0 items-center rounded-md text-xs font-semibold leading-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto sm:text-base sm:leading-normal"
        >
          Caption Arena
        </Link>

        <HeaderLinks />

        {user && (
          <AccountMenu
            email={user.email ?? "Signed-in user"}
            firstName={firstName}
            lastName={lastName}
            avatarUrl={avatarUrl}
          />
        )}
      </div>
    </header>
  );
}
