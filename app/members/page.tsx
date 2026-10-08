import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeButton from "@/components/home-button";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <HomeButton />
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold">Members Only</h1>

        <p className="mt-4 text-gray-500">
          This page is only available to signed-in users.
        </p>

        <p className="mt-2 text-sm">
          Signed in as {user.email}
        </p>
      </div>
    </main>
  );
}