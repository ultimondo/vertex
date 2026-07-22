-- ============================================================================
-- VERTEX — migration 003: keepalive (stops the free-tier project being paused)
-- Run this in the Supabase SQL Editor after 002_roster.sql (safe to re-run).
--
-- Supabase pauses a free project after 7 days with no activity. This gives the
-- project a heartbeat: one tiny row and one function, `ping()`, that anyone may
-- call. Real database activity — not just a request that bounces off the edge —
-- so it always counts. Two things call it (see docs/SUPABASE-SETUP.md §7):
--   · the GitHub Action .github/workflows/supabase-keepalive.yml, every 2 days
--   · the app itself, once a day per browser (src/supa.js)
--
-- The table is single-row BY CONSTRUCTION (primary key `id` is boolean and must
-- be true), so a public write endpoint can never grow the database, and the
-- function ignores pings less than a minute apart, so it can't be hammered into
-- churn. Nothing readable is exposed: RLS is on with no policies, so the table
-- is unreachable from the client; only this SECURITY DEFINER function sees it.
-- ============================================================================

create table if not exists public.keepalive (
  id        boolean primary key default true check (id),   -- exactly one row, forever
  last_ping timestamptz not null default now(),
  pings     bigint      not null default 0
);
insert into public.keepalive (id) values (true) on conflict (id) do nothing;

alter table public.keepalive enable row level security;   -- no policies: client-invisible

-- Touch the heartbeat and return when it was last touched. Writes at most once a
-- minute no matter how often it's called; returns the stored time either way.
create or replace function public.ping()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  update keepalive set last_ping = now(), pings = pings + 1
   where id = true and last_ping < now() - interval '1 minute';
  select last_ping into t from keepalive where id = true;
  return t;
end; $$;

grant execute on function public.ping() to anon, authenticated;
