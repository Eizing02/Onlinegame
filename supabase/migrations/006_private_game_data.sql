-- Custom classroom sessions are validated by Next, not Supabase Auth JWTs.
-- Clients receive only an invalidation signal; Next returns authorized snapshots.
begin;
drop policy if exists "active sessions are visible" on public.game_sessions;
drop policy if exists "active teams are visible" on public.teams;
drop policy if exists "active participants are visible" on public.participants;
drop policy if exists "active answers are visible" on public.answers;
drop policy if exists "active events are visible" on public.game_events;
drop policy if exists "question options are visible" on public.question_options;
revoke all on public.accounts, public.question_sets, public.questions,
  public.question_options, public.game_sessions, public.teams,
  public.participants, public.answers, public.game_events from anon, authenticated;

create table if not exists public.game_session_updates (
  session_id uuid primary key references public.game_sessions(id) on delete cascade,
  changed_at timestamptz not null default now()
);
alter table public.game_session_updates enable row level security;
drop policy if exists "room invalidations are visible" on public.game_session_updates;
create policy "room invalidations are visible" on public.game_session_updates
  for select to anon, authenticated using (true);
grant select on public.game_session_updates to anon, authenticated;
grant all on public.game_session_updates to service_role;

create or replace function public.notify_classroom_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_session uuid;
begin
  if TG_TABLE_NAME = 'game_sessions' then
    if TG_OP = 'DELETE' then return OLD; end if;
    target_session := NEW.id;
  elsif TG_OP = 'DELETE' then target_session := OLD.session_id;
  else target_session := NEW.session_id;
  end if;
  if exists (select 1 from public.game_sessions where id = target_session) then
    insert into public.game_session_updates(session_id, changed_at)
      values (target_session, clock_timestamp())
      on conflict (session_id) do update set changed_at = excluded.changed_at;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function public.notify_classroom_change() from public, anon, authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array['game_sessions','teams','participants','answers','game_events'] loop
    execute format('drop trigger if exists classroom_change on public.%I', table_name);
    execute format('create trigger classroom_change after insert or update or delete on public.%I for each row execute function public.notify_classroom_change()', table_name);
  end loop;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_session_updates') then
    alter publication supabase_realtime add table public.game_session_updates;
  end if;
end;
$$;
commit;
