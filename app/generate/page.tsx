import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GenerationForm from "@/components/generation-form";

export default async function GeneratePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-center text-4xl font-bold">
          Create a Caption Battle
        </h1>

        <p className="mt-4 text-center text-gray-500">
          Upload an image and add some context. AI will generate two competing
          captions for the community to compare.
        </p>

        <div className="mt-8">
          <GenerationForm userId={user.id} />
        </div>
      </div>
    </main>
  );
}