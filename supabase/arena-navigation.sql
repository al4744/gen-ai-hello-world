-- Caption Arena: indexed, snapshot-stable battle navigation.
-- Run once in the Supabase SQL Editor BEFORE installing the Next.js files.
-- Does not alter or delete any existing battles, votes, or policies.
-- Assumes generation_sets.id is a bigint primary key and votes has the
-- existing UNIQUE(user_id, generation_set_id) index.

-- Capture the start of the browsing session and find the earliest battle
-- that this user had NOT voted on at that moment. No full lists are returned.
create or replace function public.start_arena_browse()
returns table(snapshot_at timestamptz, first_unvoted_id bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  snapshot_at := statement_timestamp();

  select gs.id
    into first_unvoted_id
  from public.generation_sets gs
  where gs.created_at <= snapshot_at
    and not exists (
      select 1
      from public.votes v
      where v.user_id = auth.uid()
        and v.generation_set_id = gs.id
        and v.created_at <= snapshot_at
    )
  order by gs.id asc
  limit 1;

  return next;
end;
$$;

-- Find immediate neighbors without downloading or sorting every battle.
-- Ordering within the session is:
--   (1) battles already voted at snapshot, in ascending battle ID
--   (2) battles not yet voted at snapshot, in ascending battle ID.
-- Votes submitted *after* the snapshot never change this classification.
create or replace function public.get_arena_neighbors(
  p_battle_id bigint,
  p_snapshot_at timestamptz
)
returns table(previous_battle_id bigint, next_battle_id bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_was_voted boolean;
begin
  previous_battle_id := null;
  next_battle_id := null;

  if v_user_id is null or p_battle_id is null or p_snapshot_at is null then
    return next;
    return;
  end if;

  -- A direct link to a battle created after the session started does not
  -- change that session's older, frozen browsing sequence.
  if not exists (
    select 1 from public.generation_sets gs
    where gs.id = p_battle_id and gs.created_at <= p_snapshot_at
  ) then
    return next;
    return;
  end if;

  select exists (
    select 1 from public.votes v
    where v.user_id = v_user_id
      and v.generation_set_id = p_battle_id
      and v.created_at <= p_snapshot_at
  ) into v_was_voted;

  if v_was_voted then
    -- Within the original completed group, navigate using the indexed
    -- (user_id, generation_set_id) vote key instead of scanning all posts.
    select gs.id into previous_battle_id
    from public.votes v
    join public.generation_sets gs on gs.id = v.generation_set_id
    where v.user_id = v_user_id
      and v.created_at <= p_snapshot_at
      and gs.created_at <= p_snapshot_at
      and gs.id < p_battle_id
      and v.generation_set_id < p_battle_id
    order by v.generation_set_id desc
    limit 1;

    select gs.id into next_battle_id
    from public.votes v
    join public.generation_sets gs on gs.id = v.generation_set_id
    where v.user_id = v_user_id
      and v.created_at <= p_snapshot_at
      and gs.created_at <= p_snapshot_at
      and gs.id > p_battle_id
      and v.generation_set_id > p_battle_id
    order by v.generation_set_id asc
    limit 1;

    -- At the end of completed battles, the next battle is the earliest
    -- originally-unvoted battle.
    if next_battle_id is null then
      select gs.id into next_battle_id
      from public.generation_sets gs
      where gs.created_at <= p_snapshot_at
        and not exists (
          select 1 from public.votes v
          where v.user_id = v_user_id
            and v.generation_set_id = gs.id
            and v.created_at <= p_snapshot_at
        )
      order by gs.id asc
      limit 1;
    end if;
  else
    -- In the originally-unvoted group, votes cast this session are still
    -- treated as unvoted FOR NAVIGATION ONLY.
    select gs.id into previous_battle_id
    from public.generation_sets gs
    where gs.id < p_battle_id
      and gs.created_at <= p_snapshot_at
      and not exists (
        select 1 from public.votes v
        where v.user_id = v_user_id
          and v.generation_set_id = gs.id
          and v.created_at <= p_snapshot_at
      )
    order by gs.id desc
    limit 1;

    if previous_battle_id is null then
      select gs.id into previous_battle_id
      from public.votes v
      join public.generation_sets gs on gs.id = v.generation_set_id
      where v.user_id = v_user_id
        and v.created_at <= p_snapshot_at
        and gs.created_at <= p_snapshot_at
      order by v.generation_set_id desc
      limit 1;
    end if;

    select gs.id into next_battle_id
    from public.generation_sets gs
    where gs.id > p_battle_id
      and gs.created_at <= p_snapshot_at
      and not exists (
        select 1 from public.votes v
        where v.user_id = v_user_id
          and v.generation_set_id = gs.id
          and v.created_at <= p_snapshot_at
      )
    order by gs.id asc
    limit 1;
  end if;

  return next;
end;
$$;

-- Do not expose navigation RPCs to anonymous clients; logged-out browsing
-- uses public indexed queries without referencing the private votes table.
revoke all on function public.start_arena_browse() from public, anon;
revoke all on function public.get_arena_neighbors(bigint, timestamptz) from public, anon;
grant execute on function public.start_arena_browse() to authenticated;
grant execute on function public.get_arena_neighbors(bigint, timestamptz) to authenticated;

-- Existing schema already has a primary-key index on generation_sets(id)
-- and a uniqueness index on votes(user_id, generation_set_id).
-- Those indexes are the seek keys used by these functions.
