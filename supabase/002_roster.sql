-- ============================================================================
-- VERTEX — migration 002: the party roster
-- Run this in the Supabase SQL Editor after schema.sql (safe to re-run).
--
-- Players may see a LIGHT roster of co-members (name, character name,
-- designation, portrait) without being able to read each other's full sheets.
-- Row-Level Security correctly blocks reading another player's character row, so
-- this SECURITY DEFINER function returns only those few fields, and only to
-- someone who is a member (or the host) of the Story.
-- ============================================================================

create or replace function public.get_roster(p_story uuid)
returns table (
  user_id          uuid,
  display_name     text,
  role             text,
  character_id     uuid,
  char_name        text,
  char_designation text,
  char_portrait    text
)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         p.display_name,
         m.role,
         m.character_id,
         c.data->>'name'                as char_name,
         c.data#>>'{designation,name}'  as char_designation,
         c.data->>'portrait'            as char_portrait
  from memberships m
  left join profiles   p on p.id = m.user_id
  left join characters c on c.id = m.character_id
  where m.story_id = p_story
    and (is_member_of(p_story) or is_host_of(p_story))   -- caller must belong to the Story
  order by (m.role = 'host') desc, m.joined_at asc;       -- host first, then join order
$$;

revoke execute on function public.get_roster(uuid) from public, anon;
grant  execute on function public.get_roster(uuid) to authenticated;
