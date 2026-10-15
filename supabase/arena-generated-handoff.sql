-- Caption Arena: a newly generated battle can be the first unvoted stop.
-- ADDITIVE: run after supabase/arena-navigation.sql. No data is changed.
-- Browsing order: completed at snapshot -> featured -> other unvoted.
-- The completed/unvoted categories remain frozen when new votes are cast.

create or replace function public.get_arena_featured_neighbors(
  p_battle_id bigint,
  p_snapshot_at timestamptz,
  p_featured_id bigint
)
returns table(previous_battle_id bigint, next_battle_id bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_featured_valid boolean := false;
  v_current_voted boolean := false;
begin
  previous_battle_id := null;
  next_battle_id := null;

  if v_user_id is null or p_battle_id is null
     or p_snapshot_at is null or p_featured_id is null then
    return next;
    return;
  end if;

  -- Ensure the featured battle is owned by this user, exists at snapshot,
  -- and was not already voted when the session began.
  select exists (
    select 1 from public.generation_sets gs
    where gs.id = p_featured_id
      and gs.creator_id = v_user_id
      and gs.created_at <= p_snapshot_at
      and not exists (
        select 1 from public.votes v
        where v.user_id = v_user_id
          and v.generation_set_id = gs.id
          and v.created_at <= p_snapshot_at
      )
  ) into v_featured_valid;

  if not v_featured_valid then
    select n.previous_battle_id, n.next_battle_id
      into previous_battle_id, next_battle_id
    from public.get_arena_neighbors(p_battle_id, p_snapshot_at) n;
    return next;
    return;
  end if;

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
  ) into v_current_voted;

  if p_battle_id = p_featured_id then
    select gs.id into previous_battle_id
    from public.votes v
    join public.generation_sets gs on gs.id = v.generation_set_id
    where v.user_id = v_user_id
      and v.created_at <= p_snapshot_at
      and gs.created_at <= p_snapshot_at
    order by v.generation_set_id desc
    limit 1;

    select gs.id into next_battle_id
    from public.generation_sets gs
    where gs.id <> p_featured_id
      and gs.created_at <= p_snapshot_at
      and not exists (
        select 1 from public.votes v
        where v.user_id = v_user_id
          and v.generation_set_id = gs.id
          and v.created_at <= p_snapshot_at
      )
    order by gs.id asc
    limit 1;

  elsif v_current_voted then
    select gs.id into previous_battle_id
    from public.votes v
    join public.generation_sets gs on gs.id = v.generation_set_id
    where v.user_id = v_user_id
      and v.created_at <= p_snapshot_at
      and gs.created_at <= p_snapshot_at
      and gs.id < p_battle_id
    order by v.generation_set_id desc
    limit 1;

    select gs.id into next_battle_id
    from public.votes v
    join public.generation_sets gs on gs.id = v.generation_set_id
    where v.user_id = v_user_id
      and v.created_at <= p_snapshot_at
      and gs.created_at <= p_snapshot_at
      and gs.id > p_battle_id
    order by v.generation_set_id asc
    limit 1;

    if next_battle_id is null then
      next_battle_id := p_featured_id;
    end if;

  else
    select gs.id into previous_battle_id
    from public.generation_sets gs
    where gs.id <> p_featured_id
      and gs.id < p_battle_id
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
      previous_battle_id := p_featured_id;
    end if;

    select gs.id into next_battle_id
    from public.generation_sets gs
    where gs.id <> p_featured_id
      and gs.id > p_battle_id
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

revoke all on function public.get_arena_featured_neighbors(bigint, timestamptz, bigint)
  from public, anon;
grant execute on function public.get_arena_featured_neighbors(bigint, timestamptz, bigint)
  to authenticated;

-- Make the new function visible to PostgREST immediately when supported.
notify pgrst, 'reload schema';
