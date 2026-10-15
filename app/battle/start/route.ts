import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE = "caption_arena_browse";

// A full /battle visit creates a new snapshot. During browsing the small
// cookie preserves it, but URLs never contain the complete list of battle IDs.
export async function GET(request: Request) {
  const supabase = await createClient();
  // Anonymous visitors are allowed to browse; getUser() can report an
  // AuthSessionMissingError for them, which is not a server failure.
  const { data: { user } } = await supabase.auth.getUser();

  let snapshotAt = new Date().toISOString();
  let firstBattleId: number | null = null;

  if (user) {
    const { data, error } = await supabase.rpc("start_arena_browse");
    if (error) {
      console.error("Arena session start error:", error);
      return new Response("Could not start Arena browsing.", { status: 500 });
    }

    const row = data?.[0] as
      | { snapshot_at: string; first_unvoted_id: number | null }
      | undefined;

    if (!row?.snapshot_at) {
      return new Response("Arena browsing session was unavailable.", {
        status: 500,
      });
    }

    snapshotAt = row.snapshot_at;
    firstBattleId = row.first_unvoted_id;
  } else {
    // Public Arena visitors can browse, but not vote.
    const { data, error } = await supabase
      .from("generation_sets")
      .select("id")
      .order("id", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Arena first battle error:", error);
      return new Response("Could not load Arena.", { status: 500 });
    }
    firstBattleId = data?.[0]?.id ?? null;
  }

  // An explicit deep link (for example, after Generate) should initialize
  // a session without overriding the battle the user wanted to open.
  const requested = new URL(request.url).searchParams.get("battle");
  const requestedId = requested && /^[1-9]\d*$/.test(requested)
    ? Number(requested)
    : null;
  let explicitlyRequestedId: number | null = null;
  let requestedCreatorId: string | null = null;
  if (requestedId !== null && Number.isSafeInteger(requestedId)) {
    const { data, error } = await supabase
      .from("generation_sets")
      .select("id, creator_id")
      .eq("id", requestedId)
      .maybeSingle();
    if (error) {
      console.error("Arena direct-link error:", error);
      return new Response("Could not open battle.", { status: 500 });
    }
    explicitlyRequestedId = data?.id ?? null;
    requestedCreatorId = data?.creator_id ?? null;
  }

  // Only the creator's explicit Generate handoff may create a featured queue.
  // Regular deep links and the navbar keep the existing behavior.
  const fromGenerate =
    new URL(request.url).searchParams.get("from") === "generate";
  const featuredId =
    fromGenerate && user && explicitlyRequestedId !== null &&
    requestedCreatorId === user.id &&
    firstBattleId !== null
      ? explicitlyRequestedId
      : null;

  let destination: string;
  if (explicitlyRequestedId !== null) {
    destination = `/battle?battle=${explicitlyRequestedId}&initialized=1`;
  } else if (firstBattleId !== null) {
    destination = `/battle?battle=${firstBattleId}`;
  } else {
    const { data, error } = await supabase
      .from("generation_sets")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Arena availability error:", error);
      return new Response("Could not load Arena.", { status: 500 });
    }

    destination = data?.length ? "/battle?caught=1" : "/battle?empty=1";
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  // Four small fields: user | snapshot timestamp | default entry | featured ID.
  // No lists of battle IDs are stored in the URL or cookie.
  response.cookies.set(
    SESSION_COOKIE,
    `${user?.id ?? "anon"}|${snapshotAt}|${firstBattleId ?? ""}|${featuredId ?? ""}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/battle",
      maxAge: 60 * 60 * 24,
    }
  );
  return response;
}
