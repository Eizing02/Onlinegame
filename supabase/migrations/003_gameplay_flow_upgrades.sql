alter table public.game_sessions
add column if not exists current_question_started_at timestamptz;

alter table public.game_sessions
add column if not exists current_question_ends_at timestamptz;

alter table public.game_events
drop constraint if exists game_events_event_type_check;

alter table public.game_events
add constraint game_events_event_type_check
check (
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
);

alter policy "active sessions are visible"
on public.game_sessions
using (true);

alter policy "active teams are visible"
on public.teams
using (true);

alter policy "active participants are visible"
on public.participants
using (true);

alter policy "active answers are visible"
on public.answers
using (true);

alter policy "active events are visible"
on public.game_events
using (true);
