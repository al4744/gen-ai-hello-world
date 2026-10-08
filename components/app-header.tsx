import AccountMenu from "@/components/account-menu";
import HomeButton from "@/components/home-button";
import { createClient } from "@/lib/supabase/server";

type AppHeaderProps = {
  showHome?: boolean;
};

export default async function AppHeader({
  showHome = true,
}: AppHeaderProps) {
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
    <>
      {showHome && <HomeButton />}
      {user && (
        <AccountMenu
          email={user.email ?? "Signed-in user"}
          firstName={firstName}
          lastName={lastName}
          avatarUrl={avatarUrl}
        />
      )}
    </>
  );
}
