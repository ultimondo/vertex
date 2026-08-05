-- ============================================================================
-- VERTEX — migration 004: keepalive staleness check (additive; safe to re-run)
-- Run this in the Supabase SQL Editor after 003_keepalive.sql.
--
-- 003 gave the project a heartbeat. This adds the missing half: a way to ask
-- "when was the last heartbeat?" WITHOUT leaving one. The keepalive Action asks
-- this before it pings, so it can tell apart two things that look identical from
-- outside:
--   · the heartbeat is healthy          → last ping a few hours ago
--   · the schedule quietly stopped firing → last ping days ago
--
-- The second is the failure mode that actually got this project paused once, and
-- the one the old workflow could not see: when a scheduled run never happens,
-- nothing errors, no run fails, and no warning email is sent. The pings simply
-- stop, in silence, until Supabase notices before you do.
--
-- Read-only (`stable`) and single-row, so it exposes nothing and changes nothing.
-- ============================================================================

create or replace function public.keepalive_status()
returns table (last_ping timestamptz, pings bigint, age_hours numeric)
language sql security definer set search_path = public stable as $$
  select k.last_ping,
         k.pings,
         round(extract(epoch from (now() - k.last_ping)) / 3600.0, 2)
    from keepalive k
   where k.id = true;
$$;

grant execute on function public.keepalive_status() to anon, authenticated;
