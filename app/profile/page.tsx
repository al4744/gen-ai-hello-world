import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  const isIncomplete = !profile?.first_name || !profile?.last_name;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-center text-4xl font-bold">Profile</h1>

        {isIncomplete && (
          <p className="mt-4 text-center text-gray-500">
            Please add your first and last name to complete your profile.
          </p>
        )}

        <div className="mt-8">
          <ProfileForm
            userId={user.id}
            initialFirstName={profile?.first_name ?? ""}
            initialLastName={profile?.last_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>
      </div>
    </main>
  );
}