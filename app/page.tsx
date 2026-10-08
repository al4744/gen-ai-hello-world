import GoogleSignIn from "@/components/google-sign-in";
import AppHeader from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative min-h-screen px-6 py-12">
      <AppHeader />
      <div className="mx-auto w-full max-w-5xl">
        <section className="py-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Human Preference for Generative AI
          </p>

          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Caption Arena
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-500">
            Generate competing AI captions, vote on the ones
            you prefer, and see what the community thinks.
          </p>

          <div className="mt-10">
            {!user && (
              <div>
                <GoogleSignIn />

                <p className="mt-4 text-sm text-gray-500">
                  Sign in to generate caption battles and vote.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border p-6">
            <p className="text-sm font-medium text-gray-500">
              01
            </p>

            <h2 className="mt-3 text-xl font-bold">
              Generate
            </h2>

            <p className="mt-3 leading-7 text-gray-500">
              Upload an image and optional context. AI creates
              two competing captions for the same image.
            </p>
          </article>

          <article className="rounded-2xl border p-6">
            <p className="text-sm font-medium text-gray-500">
              02
            </p>

            <h2 className="mt-3 text-xl font-bold">
              Vote
            </h2>

            <p className="mt-3 leading-7 text-gray-500">
              Compare Caption A and Caption B, then choose A,
              B, Both, or Neither.
            </p>
          </article>

          <article className="rounded-2xl border p-6">
            <p className="text-sm font-medium text-gray-500">
              03
            </p>

            <h2 className="mt-3 text-xl font-bold">
              Compare
            </h2>

            <p className="mt-3 leading-7 text-gray-500">
              Votes become human-preference data showing which
              AI outputs the community actually prefers.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}