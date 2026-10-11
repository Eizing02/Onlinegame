-- Run in Supabase SQL Editor BEFORE migration 008, as the database administrator.
-- Read-only: no seed, account linking, credential output or game-data changes.
begin transaction isolation level repeatable read read only;

do $$
declare missing text; item record; administrator_count integer;
begin
  select string_agg(name, ', ' order by name) into missing
  from unnest(array[
    'auth.users','auth.identities','public.accounts','public.question_sets',
    'public.questions','public.question_options','public.game_sessions',
    'public.teams','public.participants','public.answers','public.game_events',
    'public.game_session_updates'
  ]) names(name) where to_regclass(name) is null;
  if missing is not null then
    raise exception 'GOOGLE_AUTH_PRECHECK_MISSING_TABLES: %. Apply missing migrations 001-007 first.', missing;
  end if;

  select string_agg(table_name||'.'||column_name, ', ' order by table_name,column_name) into missing
  from (values
    ('accounts','user_code'),('accounts','password'),('accounts','role'),('accounts','display_name'),('accounts','grade'),
    ('game_sessions','rules_version'),('game_sessions','question_snapshot'),('game_sessions','current_question_ends_at'),
    ('teams','locked_member_count'),('teams','raw_score'),('teams','boost_question_index'),
    ('participants','joined_after_start'),('participants','is_score_eligible'),('participants','connection_status'),
    ('answers','selected_option_id'),('answers','base_score_awarded'),('answers','power_bonus_awarded')
  ) required(table_name,column_name)
  where not exists(select 1 from information_schema.columns c
    where c.table_schema='public' and c.table_name=required.table_name and c.column_name=required.column_name);
  if missing is not null then
    raise exception 'GOOGLE_AUTH_PRECHECK_MISSING_COLUMNS: %. Check migrations 003,005,007.', missing;
  end if;

  if not exists(select 1 from pg_roles where rolname='service_role') or
     not exists(select 1 from pg_roles where rolname='anon') or
     not exists(select 1 from pg_roles where rolname='authenticated') then
    raise exception 'GOOGLE_AUTH_PRECHECK_SUPABASE_ROLES_REQUIRED';
  end if;

  for item in select signature from unnest(array[
    'public.close_game_session(text,text)',
    'public.delete_question_set_safely(uuid,text)',
    'public.activate_classroom_power(uuid,text,uuid)',
    'public.submit_classroom_answer(uuid,text,uuid,text,uuid,boolean)'
  ]) required(signature) loop
    if to_regprocedure(item.signature) is null then
      raise exception 'GOOGLE_AUTH_PRECHECK_MISSING_RPC: %. Check migrations 004 and 007.',item.signature;
    end if;
    if has_function_privilege('anon',item.signature,'EXECUTE') or
       has_function_privilege('authenticated',item.signature,'EXECUTE') then
      raise exception 'GOOGLE_AUTH_PRECHECK_PRIVATE_RPC: %. Review custom grants.',item.signature;
    end if;
    if not has_function_privilege('service_role',item.signature,'EXECUTE') then
      raise exception 'GOOGLE_AUTH_PRECHECK_SERVICE_RPC: %',item.signature;
    end if;
  end loop;

  for item in select t.name,r.name role_name from
    unnest(array['accounts','question_sets','questions','question_options','game_sessions','teams','participants','answers','game_events']) t(name)
    cross join unnest(array['anon','authenticated']) r(name) loop
    if has_table_privilege(item.role_name,'public.'||item.name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
      raise exception 'GOOGLE_AUTH_PRECHECK_PRIVATE_GRANTS: % (%). Check migration 006 and custom grants.', item.name,item.role_name;
    end if;
  end loop;

  select count(*) into administrator_count from public.accounts where lower(user_code)='admin';
  if administrator_count<>1 then
    raise exception 'GOOGLE_AUTH_PRECHECK_ADMIN_COUNT: %. Exactly one existing admin/ADMIN account is required; do not rename keys or create a shared password.', administrator_count;
  end if;
  if not exists(select 1 from public.accounts where lower(user_code)='admin' and role='teacher') then
    raise exception 'GOOGLE_AUTH_PRECHECK_ADMIN_ROLE: The canonical admin account must already be a teacher.';
  end if;
end $$;
commit;

-- Keep the report SELECT last so SQL clients display its rows.
select 'PASS' status,
  'Prerequisites and canonical admin checked. Back up first, then run migration 008 if it has not been applied.' message,
  case when to_regclass('public.account_identities') is null then 'NOT_INSTALLED'
       else 'AUTH_TABLE_PRESENT_RUN_POSTCHECK' end auth_schema_state,
  (select count(*) from public.game_sessions where status<>'ended') active_rooms,
  jsonb_build_object(
    'accounts',(select count(*) from public.accounts),
    'question_sets',(select count(*) from public.question_sets),
    'questions',(select count(*) from public.questions),
    'game_sessions',(select count(*) from public.game_sessions),
    'participants',(select count(*) from public.participants),
    'answers',(select count(*) from public.answers)
  ) data_counts;
