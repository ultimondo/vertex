-- ============================================================================
-- VERTEX — Supabase schema (multiplayer MVP)
-- Paste this whole file into the Supabase SQL Editor and press Run, once, after
-- creating your project. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
--
-- Models: accounts (profiles) · characters (owned by a user; many-to-many with
-- Stories) · Stories · memberships (a user in a Story, with a role + the
-- character they brought) · one-time invite codes (24h, revocable).
--
-- Security is enforced HERE, not just in the app: Row-Level Security decides who
-- can read/write each row, and the sensitive actions (create Story, invite, join)
-- run as SECURITY DEFINER functions so their rules can't be bypassed from the client.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---- Tables ----------------------------------------------------------------

-- One profile per user: a public display-name / alias. The email lives in
-- Supabase's auth.users and is never exposed here.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- A character sheet, owned by exactly one user. The whole sheet is the same JSON
-- the app already produces, stored in `data`. It is NOT bound to a Story here —
-- the character↔Story link lives in memberships, so one character can be in many.
create table if not exists public.characters (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists characters_owner_idx on public.characters(owner_id);

-- A Story (campaign). Exactly one host.
create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  host_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists stories_host_idx on public.stories(host_id);

-- Membership = a user in a Story, with a role and the character they brought.
-- One row per user per Story. Host rows have character_id NULL (host runs no PC).
create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  story_id     uuid not null references public.stories(id) on delete cascade,
  user_id      uuid not null references auth.users(id)     on delete cascade,
  character_id uuid references public.characters(id)       on delete set null,
  role         text not null check (role in ('host','player')),
  joined_at    timestamptz not null default now(),
  unique (story_id, user_id)
);
create index if not exists memberships_story_idx on public.memberships(story_id);
create index if not exists memberships_user_idx  on public.memberships(user_id);
create index if not exists memberships_char_idx  on public.memberships(character_id);

-- One-time invite codes: single use, expire in 24h, revocable by the host.
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.stories(id) on delete cascade,
  code       text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_by    uuid references auth.users(id),
  used_at    timestamptz,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists invites_code_idx on public.invites(code);

-- ---- Helper predicates (SECURITY DEFINER so RLS policies don't recurse) -----

create or replace function public.is_host_of(p_story uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from stories s where s.id = p_story and s.host_id = auth.uid());
$$;

create or replace function public.is_member_of(p_story uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.story_id = p_story and m.user_id = auth.uid());
$$;

create or replace function public.shares_story_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m1
    join memberships m2 on m1.story_id = m2.story_id
    where m1.user_id = auth.uid() and m2.user_id = p_user
  );
$$;

-- true if the current user hosts any Story this character has been brought into
create or replace function public.hosts_character(p_char uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m join stories s on s.id = m.story_id
    where m.character_id = p_char and s.host_id = auth.uid()
  );
$$;

-- ---- Row-Level Security ----------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.characters  enable row level security;
alter table public.stories     enable row level security;
alter table public.memberships enable row level security;
alter table public.invites     enable row level security;

-- profiles: read your own, plus anyone you share a Story with (for the roster).
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or shares_story_with(id));
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- characters: the owner may do anything; a Host may only READ a character that a
-- player brought into a Story that Host runs. (No host edit in v1.)
create policy characters_select on public.characters for select
  using (owner_id = auth.uid() or hosts_character(id));
create policy characters_insert on public.characters for insert with check (owner_id = auth.uid());
create policy characters_update on public.characters for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy characters_delete on public.characters for delete using (owner_id = auth.uid());

-- stories: host + members can read; only the host may create/edit/delete.
create policy stories_select on public.stories for select
  using (host_id = auth.uid() or is_member_of(id));
create policy stories_insert on public.stories for insert with check (host_id = auth.uid());
create policy stories_update on public.stories for update
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy stories_delete on public.stories for delete using (host_id = auth.uid());

-- memberships: everyone in a Story (and its host) can read the roster.
create policy memberships_select on public.memberships for select
  using (is_member_of(story_id) or is_host_of(story_id));
-- the host may remove a player (kick); a user may remove themselves (leave).
create policy memberships_delete on public.memberships for delete
  using (is_host_of(story_id) or user_id = auth.uid());
-- a player may swap which of their characters is active in a Story.
create policy memberships_update on public.memberships for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (there is no INSERT policy: joining happens only through redeem_invite() below.)

-- invites: only the host of the Story can see/revoke them. (Creation + redemption
-- go through the functions below; there is no INSERT policy.)
create policy invites_select on public.invites for select using (is_host_of(story_id));
create policy invites_update on public.invites for update
  using (is_host_of(story_id)) with check (is_host_of(story_id));

-- ---- Sensitive actions as SECURITY DEFINER functions -----------------------

-- Create a Story and the host's own membership together.
create or replace function public.create_story(p_name text)
returns public.stories language plpgsql security definer set search_path = public as $$
declare s public.stories;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into stories (name, host_id) values (p_name, auth.uid()) returning * into s;
  insert into memberships (story_id, user_id, role) values (s.id, auth.uid(), 'host');
  return s;
end; $$;

-- Host mints a fresh one-time invite (expires in 24h). Returns the invite row.
create or replace function public.create_invite(p_story uuid)
returns public.invites language plpgsql security definer set search_path = public as $$
declare inv public.invites; new_code text;
begin
  if not is_host_of(p_story) then raise exception 'only the host may invite'; end if;
  new_code := 'VTX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into invites (story_id, code, created_by, expires_at)
  values (p_story, new_code, auth.uid(), now() + interval '24 hours')
  returning * into inv;
  return inv;
end; $$;

-- Redeem an invite: the caller joins the Story as a player with one of THEIR
-- characters. Validates the code, then marks it used. One-time by construction.
create or replace function public.redeem_invite(p_code text, p_character uuid)
returns public.stories language plpgsql security definer set search_path = public as $$
declare inv public.invites; s public.stories;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into inv from invites where code = p_code for update;
  if inv.id is null       then raise exception 'that invite code is not valid'; end if;
  if inv.revoked          then raise exception 'that invite was revoked'; end if;
  if inv.used_by is not null then raise exception 'that invite has already been used'; end if;
  if inv.expires_at < now()  then raise exception 'that invite has expired'; end if;
  if is_host_of(inv.story_id) then raise exception 'a host cannot join their own Story'; end if;
  if p_character is not null and not exists (
       select 1 from characters c where c.id = p_character and c.owner_id = auth.uid())
    then raise exception 'that character is not yours'; end if;

  insert into memberships (story_id, user_id, character_id, role)
  values (inv.story_id, auth.uid(), p_character, 'player')
  on conflict (story_id, user_id) do update set character_id = excluded.character_id;

  update invites set used_by = auth.uid(), used_at = now() where id = inv.id;
  select * into s from stories where id = inv.story_id;
  return s;
end; $$;

revoke execute on function public.create_story(text)        from public, anon;
revoke execute on function public.create_invite(uuid)       from public, anon;
revoke execute on function public.redeem_invite(text, uuid) from public, anon;
grant  execute on function public.create_story(text)        to authenticated;
grant  execute on function public.create_invite(uuid)       to authenticated;
grant  execute on function public.redeem_invite(text, uuid) to authenticated;

-- ---- Triggers --------------------------------------------------------------

-- Give every new user a profile, defaulting the display name to their Google
-- name (if present) or the part of their email before the @.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep characters.updated_at fresh on every edit.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists characters_touch on public.characters;
create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();
