import { supabase } from "@/lib/supabase";

type Post = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

export default async function Home() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, body, created_at")
    .order("id", { ascending: true });

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Failed to load posts.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-4xl font-bold">
          Posts from Supabase
        </h1>

        <div className="space-y-4">
          {posts?.map((post: Post) => (
            <article key={post.id} className="rounded-lg border p-5">
              <h2 className="text-xl font-bold">{post.title}</h2>
              <p className="mt-2">{post.body}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}