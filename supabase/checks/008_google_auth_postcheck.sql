-- Run in Supabase SQL Editor AFTER migration 008, as the database administrator.
-- Checks installed structure/permissions; does not prove real OAuth or race behavior.
begin transaction isolation level repeatable read read only;

do $$
declare missing text; item record;
begin
  select string_agg(name, ', ' order by name) into missing
  from unnest(array['public.account_identities','public.teacher_access','public.account_link_audit','public.auth_rate_limits']) names(name)
  where to_regclass(name) is null;
  if missing is not null then raise exception 'GOOGLE_AUTH_POSTCHECK_MISSING_TABLES: %. Run migration 008.', missing; end if;

  select string_agg(signature, ', ' order by signature) into missing from unnest(array[
    'public.verified_google_email(uuid)',
    'public.validate_teacher_account()',
    'public.protect_linked_account_role()',
    'public.consume_auth_limit(text,integer,integer)',
    'public.resolve_google_account(uuid,text,boolean)',
    'public.student_account_operation(uuid,text,text,text)',
    'public.manage_teacher_access(uuid,text,text,text,text,text,text,integer)',
    'public.join_google_classroom(uuid,text,text,uuid)'
  ]) required(signature) where to_regprocedure(signature) is null;
  if missing is not null then raise exception 'GOOGLE_AUTH_POSTCHECK_MISSING_FUNCTIONS: %', missing; end if;

  if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='accounts' and column_name='password' and is_nullable='YES') then
    raise exception 'GOOGLE_AUTH_POSTCHECK_PASSWORD_NULLABILITY';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.account_identities'::regclass
    and contype='p' and pg_get_constraintdef(oid)='PRIMARY KEY (auth_user_id)') or
     not exists(select 1 from pg_constraint where conrelid='public.account_identities'::regclass
    and contype='u' and pg_get_constraintdef(oid)='UNIQUE (user_code)') then
    raise exception 'GOOGLE_AUTH_POSTCHECK_IDENTITY_UNIQUENESS';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.account_identities'::regclass and contype='f'
    and confrelid='auth.users'::regclass and convalidated) or
     not exists(select 1 from pg_constraint where conrelid='public.account_identities'::regclass and contype='f'
    and confrelid='public.accounts'::regclass and convalidated) then
    raise exception 'GOOGLE_AUTH_POSTCHECK_IDENTITY_FOREIGN_KEYS';
  end if;
  if not exists(select 1 from pg_index where indexrelid=to_regclass('public.teacher_access_email_unique')
    and indisunique and indisvalid and position('lower(google_email)' in pg_get_indexdef(indexrelid))>0) then
    raise exception 'GOOGLE_AUTH_POSTCHECK_TEACHER_EMAIL_UNIQUENESS';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.teacher_access'::regclass
    and tgname='teacher_account_role' and tgenabled in ('O','A')) or
     not exists(select 1 from pg_trigger where tgrelid='public.accounts'::regclass
    and tgname='protect_linked_account_role' and tgenabled in ('O','A')) then
    raise exception 'GOOGLE_AUTH_POSTCHECK_ROLE_TRIGGERS';
  end if;

  for item in select c.oid,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('account_identities','teacher_access','account_link_audit','auth_rate_limits') loop
    if not item.relrowsecurity then raise exception 'GOOGLE_AUTH_POSTCHECK_RLS: %',item.relname; end if;
    if exists(select 1 from pg_policy where polrelid=item.oid) then
      raise exception 'GOOGLE_AUTH_POSTCHECK_UNEXPECTED_POLICY: %. Review custom policies; migration 008 creates none.',item.relname;
    end if;
    if has_table_privilege('anon',item.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
       has_table_privilege('authenticated',item.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
      raise exception 'GOOGLE_AUTH_POSTCHECK_PRIVATE_GRANTS: %',item.relname;
    end if;
    if not has_table_privilege('service_role',item.oid,'SELECT') or
       not has_table_privilege('service_role',item.oid,'INSERT') or
       not has_table_privilege('service_role',item.oid,'UPDATE') or
       not has_table_privilege('service_role',item.oid,'DELETE') then
      raise exception 'GOOGLE_AUTH_POSTCHECK_SERVICE_GRANTS: %',item.relname;
    end if;
  end loop;

  for item in select p.oid,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.oid in (
      'public.verified_google_email(uuid)'::regprocedure,'public.validate_teacher_account()'::regprocedure,
      'public.protect_linked_account_role()'::regprocedure,'public.consume_auth_limit(text,integer,integer)'::regprocedure,
      'public.resolve_google_account(uuid,text,boolean)'::regprocedure,'public.student_account_operation(uuid,text,text,text)'::regprocedure,
      'public.manage_teacher_access(uuid,text,text,text,text,text,text,integer)'::regprocedure,'public.join_google_classroom(uuid,text,text,uuid)'::regprocedure
    ) loop
    if not item.prosecdef or not exists(select 1 from unnest(item.proconfig) setting where setting in ('search_path=','search_path=""')) then
      raise exception 'GOOGLE_AUTH_POSTCHECK_FUNCTION_SECURITY: %',item.proname;
    end if;
    if has_function_privilege('anon',item.oid,'EXECUTE') or has_function_privilege('authenticated',item.oid,'EXECUTE') then
      raise exception 'GOOGLE_AUTH_POSTCHECK_PRIVATE_RPC: %',item.proname;
    end if;
    if item.proname in ('resolve_google_account','student_account_operation','manage_teacher_access','join_google_classroom')
      and not has_function_privilege('service_role',item.oid,'EXECUTE') then
      raise exception 'GOOGLE_AUTH_POSTCHECK_SERVICE_RPC: %',item.proname;
    end if;
  end loop;
end $$;
commit;

-- Keep the report SELECT last so SQL clients display its rows.
select 'PASS' status,
  'Migration 008 structure/permissions checked. Configure Google Provider and environment, then verify real login in staging.' message,
  case when exists(select 1 from public.account_identities i join public.teacher_access t using(user_code)
    where lower(i.user_code)='admin' and t.access_level='super_admin' and t.status='active'
      and t.google_email=public.verified_google_email(i.auth_user_id))
    then 'VERIFIED_SUPER_ADMIN_LINK_PRESENT' else 'FIRST_GOOGLE_LOGIN_OR_ADMIN_REVIEW_NEEDED' end bootstrap_state,
  jsonb_build_object(
    'accounts',(select count(*) from public.accounts),
    'question_sets',(select count(*) from public.question_sets),
    'questions',(select count(*) from public.questions),
    'game_sessions',(select count(*) from public.game_sessions),
    'participants',(select count(*) from public.participants),
    'answers',(select count(*) from public.answers)
  ) data_counts;
