create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.accounts (
  user_code text primary key,
  display_name text not null,
  password text not null,
  grade text,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_code text not null references public.accounts(user_code) on delete restrict,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  question_text text not null,
  correct_answer text not null,
  points integer not null default 10 check (points >= 0),
  time_limit_seconds integer not null default 60 check (time_limit_seconds >= 5),
  order_index integer not null default 0 check (order_index >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  unique (question_set_id, order_index)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null check (room_code ~ '^[0-9]{4}$'),
  teacher_code text not null references public.accounts(user_code) on delete restrict,
  question_set_id uuid not null references public.question_sets(id) on delete restrict,
  question_set_title text not null,
  question_count integer not null check (question_count > 0),
  activity_name text,
  status text not null default 'lobby' check (
    status in (
      'lobby',
      'playing',
      'question_active',
      'answer_locked',
      'showing_answer',
      'ended'
    )
  ),
  team_count integer not null check (team_count > 0),
  max_members_per_team integer not null check (max_members_per_team > 0),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  current_question_started_at timestamptz,
  current_question_ends_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_number integer not null check (team_number > 0),
  team_name text not null,
  score numeric(10, 2) not null default 0 check (score >= 0),
  raw_score integer not null default 0 check (raw_score >= 0),
  average_score numeric(10, 2) not null default 0 check (average_score >= 0),
  locked_member_count integer check (locked_member_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, team_number)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  student_code text not null references public.accounts(user_code) on delete restrict,
  display_name text not null,
  connection_status text not null default 'online' check (
    connection_status in ('online', 'offline', 'left')
  ),
  joined_after_start boolean not null default false,
  is_score_eligible boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, student_code)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  question_index integer not null check (question_index >= 0),
  team_id uuid not null references public.teams(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  student_code text not null references public.accounts(user_code) on delete restrict,
  answer_text text not null,
  is_correct boolean not null default false,
  score_awarded integer not null default 0 check (score_awarded >= 0),
  submitted_at timestamptz not null default now(),
  unique (session_id, question_index, student_code)
);

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'join_room',
      'start_game',
      'start_question',
      'lock_answers',
      'submit_answer',
      'rename_team',
      'leave_team',
      'reveal_answer',
      'next_question',
      'end_game'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger question_sets_set_updated_at
before update on public.question_sets
for each row execute function public.set_updated_at();

create trigger game_sessions_set_updated_at
before update on public.game_sessions
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create index accounts_role_idx on public.accounts (role);
create index question_sets_teacher_code_idx on public.question_sets (teacher_code);
create index questions_question_set_id_idx on public.questions (question_set_id);
create index game_sessions_teacher_code_idx on public.game_sessions (teacher_code);
create index game_sessions_question_set_id_idx on public.game_sessions (question_set_id);
create index game_sessions_room_code_idx on public.game_sessions (room_code);
create unique index game_sessions_active_room_code_unique
on public.game_sessions (room_code)
where status <> 'ended';
create unique index game_sessions_active_teacher_unique
on public.game_sessions (teacher_code)
where status <> 'ended';
create index teams_session_id_idx on public.teams (session_id);
create index participants_session_id_idx on public.participants (session_id);
create index participants_team_id_idx on public.participants (team_id);
create index participants_student_code_idx on public.participants (student_code);
create index participants_session_student_idx on public.participants (session_id, student_code);
create index answers_session_id_idx on public.answers (session_id);
create index answers_question_id_idx on public.answers (question_id);
create index answers_team_id_idx on public.answers (team_id);
create index answers_participant_id_idx on public.answers (participant_id);
create index answers_student_code_idx on public.answers (student_code);
create index answers_session_question_idx on public.answers (session_id, question_index);
create index game_events_session_id_idx on public.game_events (session_id);

alter table public.accounts enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;
alter table public.game_events enable row level security;

create policy "active sessions are visible"
on public.game_sessions for select
to anon, authenticated
using (true);

create policy "active teams are visible"
on public.teams for select
to anon, authenticated
using (true);

create policy "active participants are visible"
on public.participants for select
to anon, authenticated
using (true);

create policy "active answers are visible"
on public.answers for select
to anon, authenticated
using (true);

create policy "active events are visible"
on public.game_events for select
to anon, authenticated
using (true);

alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.answers;
alter publication supabase_realtime add table public.game_events;
