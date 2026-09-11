alter table public.questions
add column if not exists question_type text not null default 'short_text';

alter table public.questions
add column if not exists image_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_question_type_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
    add constraint questions_question_type_check
    check (question_type in ('short_text', 'true_false', 'multiple_choice'));
  end if;
end;
$$;

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (question_id, order_index)
);

create index if not exists question_options_question_id_idx
on public.question_options (question_id);

create unique index if not exists question_options_one_correct_idx
on public.question_options (question_id)
where is_correct;

alter table public.question_options enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'question_options'
      and policyname = 'question options are visible'
  ) then
    create policy "question options are visible"
    on public.question_options for select
    to anon, authenticated
    using (true);
  end if;
end;
$$;

alter table public.answers
add column if not exists selected_option_id uuid references public.question_options(id) on delete set null;

create index if not exists answers_selected_option_id_idx
on public.answers (selected_option_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'question-images',
  'question-images',
  true,
  null,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
