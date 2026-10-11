-- Additive migration. Keep the existing classroom account keys and game history.
begin;
alter table public.accounts alter column password drop not null;

create table if not exists public.account_identities (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  user_code text not null unique references public.accounts(user_code) on delete restrict,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.teacher_access (
  user_code text primary key references public.accounts(user_code) on delete restrict,
  google_email text not null check (google_email = lower(btrim(google_email))),
  access_level text not null check (access_level in ('super_admin','teacher')),
  status text not null default 'active' check (status in ('pending','active','suspended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists teacher_access_email_unique on public.teacher_access(lower(google_email));
create sequence if not exists public.teacher_account_code_seq;
create table if not exists public.account_link_audit (
  id bigint generated always as identity primary key,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  old_user_code text,
  new_user_code text,
  action text not null check (action in ('initial_claim','switch','teacher_linked','bootstrap','teacher_added','teacher_updated','recovery_unlink')),
  created_at timestamptz not null default now()
);
create index if not exists account_link_audit_actor_time on public.account_link_audit(actor_auth_user_id,created_at desc);
create table if not exists public.auth_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null
);
create index if not exists auth_rate_limits_expiry on public.auth_rate_limits(expires_at);

alter table public.account_identities enable row level security;
alter table public.teacher_access enable row level security;
alter table public.account_link_audit enable row level security;
alter table public.auth_rate_limits enable row level security;
revoke all on public.account_identities,public.teacher_access,public.account_link_audit,public.auth_rate_limits from public,anon,authenticated;
revoke all on sequence public.teacher_account_code_seq,public.account_link_audit_id_seq from public,anon,authenticated;
grant all on public.account_identities,public.teacher_access,public.account_link_audit,public.auth_rate_limits to service_role;
grant usage,select on sequence public.teacher_account_code_seq,public.account_link_audit_id_seq to service_role;

-- Auth records are read from Supabase, never supplied browser metadata.
create or replace function public.verified_google_email(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id=p_user and u.email_confirmed_at is not null
    and u.raw_app_meta_data->>'provider'='google'
    and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'
      and lower(i.identity_data->>'email')=lower(u.email)
      and i.identity_data->>'email_verified'='true')
$$;

create or replace function public.validate_teacher_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.accounts where user_code=new.user_code and role='teacher') then
    raise exception 'TEACHER_ROLE_REQUIRED';
  end if;
  return new;
end $$;
drop trigger if exists teacher_account_role on public.teacher_access;
create trigger teacher_account_role before insert or update on public.teacher_access
  for each row execute function public.validate_teacher_account();
create or replace function public.protect_linked_account_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and
    (exists(select 1 from public.teacher_access where user_code=old.user_code)
     or exists(select 1 from public.account_identities where user_code=old.user_code)) then
    raise exception 'LINKED_ACCOUNT_ROLE_IMMUTABLE';
  end if;
  return new;
end $$;
drop trigger if exists protect_linked_account_role on public.accounts;
create trigger protect_linked_account_role before update of role on public.accounts
  for each row execute function public.protect_linked_account_role();

-- Fixed windows are shared across all web instances. Failed attempts also count.
create or replace function public.consume_auth_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer; t timestamptz:=clock_timestamp();
begin
  delete from public.auth_rate_limits where rate_key in
    (select rate_key from public.auth_rate_limits where expires_at<t and rate_key<>p_key
      order by rate_key limit 100 for update skip locked);
  insert into public.auth_rate_limits(rate_key,window_started_at,attempts,expires_at)
    values(p_key,t,1,t+make_interval(secs=>p_seconds))
  on conflict(rate_key) do update set
    attempts=case when auth_rate_limits.expires_at<=t then 1 else auth_rate_limits.attempts+1 end,
    window_started_at=case when auth_rate_limits.expires_at<=t then t else auth_rate_limits.window_started_at end,
    expires_at=case when auth_rate_limits.expires_at<=t then t+make_interval(secs=>p_seconds) else auth_rate_limits.expires_at end
  returning attempts into n;
  return n<=p_limit;
end $$;

create or replace function public.resolve_google_account(p_auth_user_id uuid,p_bootstrap_email text,p_touch boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare email text; code text; identity_code text; access public.teacher_access%rowtype; account public.accounts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('identity:'||p_auth_user_id::text,0));
  email:=public.verified_google_email(p_auth_user_id);
  if email is null then return jsonb_build_object('state','denied','code','GOOGLE_IDENTITY_REQUIRED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('email:'||email,0));
  select user_code into identity_code from public.account_identities where auth_user_id=p_auth_user_id;
  select * into access from public.teacher_access where google_email=email;
  if access.user_code is null and email=lower(btrim(p_bootstrap_email)) then
    -- Preserve the canonical case of a legacy ADMIN key and every foreign key.
    if (select count(*) from public.accounts where lower(user_code)='admin')<>1 then
      return jsonb_build_object('state','denied','code','ADMIN_ACCOUNT_CONFIGURATION');
    end if;
    select * into account from public.accounts where lower(user_code)='admin' for update;
    if account.role<>'teacher' or exists(select 1 from public.teacher_access where user_code=account.user_code)
      or exists(select 1 from public.account_identities where user_code=account.user_code and auth_user_id<>p_auth_user_id)
      or (identity_code is not null and identity_code<>account.user_code) then
      return jsonb_build_object('state','denied','code','IDENTITY_CONFLICT');
    end if;
    insert into public.teacher_access(user_code,google_email,access_level,status,created_by)
      values(account.user_code,email,'super_admin','active',p_auth_user_id) returning * into access;
    insert into public.account_link_audit(actor_auth_user_id,new_user_code,action)
      values(p_auth_user_id,account.user_code,'bootstrap');
  end if;
  if access.user_code is not null then
    if access.status<>'active' then return jsonb_build_object('state','denied','code','TEACHER_'||upper(access.status)); end if;
    if (identity_code is not null and identity_code<>access.user_code)
      or exists(select 1 from public.account_identities where user_code=access.user_code and auth_user_id<>p_auth_user_id) then
      return jsonb_build_object('state','denied','code','IDENTITY_CONFLICT');
    end if;
    if identity_code is null then
      insert into public.account_identities(auth_user_id,user_code) values(p_auth_user_id,access.user_code);
      insert into public.account_link_audit(actor_auth_user_id,new_user_code,action) values(p_auth_user_id,access.user_code,'teacher_linked');
    end if;
    identity_code:=access.user_code;
    if p_touch then update public.teacher_access set last_login_at=clock_timestamp() where user_code=identity_code; end if;
  end if;
  if identity_code is null then return jsonb_build_object('state','unlinked'); end if;
  select * into account from public.accounts where user_code=identity_code;
  if account.role='teacher' and (access.user_code is null or access.user_code<>identity_code) then
    return jsonb_build_object('state','denied','code','TEACHER_NOT_ALLOWED');
  end if;
  return jsonb_build_object('state','linked','userCode',account.user_code,'displayName',account.display_name,
    'grade',coalesce(account.grade,''),'role',account.role,'accessLevel',access.access_level);
end $$;

create or replace function public.student_account_operation(p_auth_user_id uuid,p_action text,p_student_code text,p_client_key text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare email text; old_code text; account public.accounts%rowtype; maximum integer; seconds integer; codes text[];
begin
  if p_action not in ('lookup','claim','switch') then return jsonb_build_object('ok',false,'code','INVALID_ACTION'); end if;
  perform pg_advisory_xact_lock(hashtextextended('identity:'||p_auth_user_id::text,0));
  email:=public.verified_google_email(p_auth_user_id);
  if email is null then return jsonb_build_object('ok',false,'code','GOOGLE_IDENTITY_REQUIRED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('email:'||email,0));
  if exists(select 1 from public.teacher_access where google_email=email) then
    return jsonb_build_object('ok',false,'code','STUDENT_ONLY');
  end if;
  select user_code into old_code from public.account_identities where auth_user_id=p_auth_user_id;
  if old_code is not null and not exists(select 1 from public.accounts where user_code=old_code and role='student') then
    return jsonb_build_object('ok',false,'code','STUDENT_ONLY');
  end if;
  maximum:=case p_action when 'lookup' then 10 when 'claim' then 5 else 2 end;
  seconds:=case p_action when 'switch' then 86400 else 600 end;
  if not public.consume_auth_limit('user:'||p_auth_user_id::text||':'||p_action,maximum,seconds) then
    return jsonb_build_object('ok',false,'code','RATE_LIMITED');
  end if;
  if p_client_key is not null and p_action='lookup' and
    not public.consume_auth_limit('network:'||p_client_key,250,600) then
    return jsonb_build_object('ok',false,'code','RATE_LIMITED');
  end if;
  if p_student_code !~ '^[0-9]{5}$' then return jsonb_build_object('ok',false,'code','INVALID_STUDENT_CODE'); end if;
  if (p_action='claim' and old_code is not null) or (p_action='switch' and old_code is null) then
    return jsonb_build_object('ok',false,'code','LINK_STATE_CHANGED');
  end if;
  codes:=array[p_student_code,old_code];
  -- Shared with Google-mode join: a concurrent join cannot race a code switch.
  perform user_code from public.accounts where user_code=any(codes) order by user_code for update;
  select * into account from public.accounts where user_code=p_student_code and role='student';
  if account.user_code is null then return jsonb_build_object('ok',false,'code','STUDENT_NOT_FOUND'); end if;
  if p_student_code=old_code then return jsonb_build_object('ok',false,'code','SAME_STUDENT_CODE'); end if;
  if exists(select 1 from public.account_identities where user_code=p_student_code and auth_user_id<>p_auth_user_id) then
    return jsonb_build_object('ok',false,'code','STUDENT_ALREADY_LINKED');
  end if;
  if exists(select 1 from public.participants p join public.game_sessions g on g.id=p.session_id
    where p.student_code=any(codes) and g.status<>'ended') then
    return jsonb_build_object('ok',false,'code','ACTIVE_GAME');
  end if;
  if p_action='lookup' then
    return jsonb_build_object('ok',true,'student',jsonb_build_object('userCode',account.user_code,'displayName',account.display_name,'grade',coalesce(account.grade,'')));
  end if;
  begin
    if p_action='claim' then
      insert into public.account_identities(auth_user_id,user_code) values(p_auth_user_id,p_student_code);
    else
      update public.account_identities set user_code=p_student_code,updated_at=clock_timestamp() where auth_user_id=p_auth_user_id;
    end if;
    insert into public.account_link_audit(actor_auth_user_id,old_user_code,new_user_code,action)
      values(p_auth_user_id,old_code,p_student_code,case p_action when 'claim' then 'initial_claim' else 'switch' end);
  exception when unique_violation then return jsonb_build_object('ok',false,'code','STUDENT_ALREADY_LINKED');
  end;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.manage_teacher_access(p_actor uuid,p_action text,p_target_code text default null,
  p_email text default null,p_display_name text default null,p_status text default 'active',p_search text default '',p_page integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_code text; target public.teacher_access%rowtype; code text; v_email text; result jsonb; total integer; sequence_value bigint;
begin
  select i.user_code into actor_code from public.account_identities i join public.teacher_access t using(user_code)
    where i.auth_user_id=p_actor and t.status='active' and t.access_level='super_admin'
      and t.google_email=public.verified_google_email(p_actor);
  if actor_code is null then return jsonb_build_object('ok',false,'code','ADMIN_REQUIRED'); end if;
  if p_action='list' then
    select count(*) into total from public.teacher_access t join public.accounts a using(user_code)
      where p_search='' or position(lower(p_search) in lower(t.google_email||' '||a.display_name||' '||t.user_code))>0;
    select coalesce(jsonb_agg(row_data),'[]'::jsonb) into result from (
      select jsonb_build_object('userCode',t.user_code,'email',t.google_email,'displayName',a.display_name,
        'accessLevel',t.access_level,'status',t.status,'createdAt',t.created_at,'lastLoginAt',t.last_login_at,
        'questionSets',(select count(*) from public.question_sets q where q.teacher_code=t.user_code),
        'activeRooms',(select count(*) from public.game_sessions g where g.teacher_code=t.user_code and g.status<>'ended')) row_data
      from public.teacher_access t join public.accounts a using(user_code)
      where p_search='' or position(lower(p_search) in lower(t.google_email||' '||a.display_name||' '||t.user_code))>0
      order by t.created_at,t.user_code limit 50 offset (greatest(1,least(p_page,10000))-1)*50
    ) rows;
    return jsonb_build_object('ok',true,'teachers',result,'total',total);
  end if;
  if p_action not in ('add','update') or p_status not in ('pending','active','suspended') or
    p_display_name is null or length(btrim(p_display_name)) not between 1 and 160 then
    return jsonb_build_object('ok',false,'code','INVALID_TEACHER');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('teacher-administration',0));
  -- Recheck after waiting for another admin transaction.
  if not exists(select 1 from public.teacher_access where user_code=actor_code and status='active' and access_level='super_admin') then
    return jsonb_build_object('ok',false,'code','ADMIN_REQUIRED');
  end if;
  if p_action='add' then
    v_email:=lower(btrim(p_email));
    if v_email is null or length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      return jsonb_build_object('ok',false,'code','INVALID_EMAIL');
    end if;
    perform pg_advisory_xact_lock(hashtextextended('email:'||v_email,0));
    if exists(select 1 from public.teacher_access where google_email=v_email) then
      return jsonb_build_object('ok',false,'code','TEACHER_EMAIL_EXISTS');
    end if;
    if exists(select 1 from public.account_identities i join auth.users u on u.id=i.auth_user_id where lower(u.email)=v_email) then
      return jsonb_build_object('ok',false,'code','IDENTITY_CONFLICT');
    end if;
    loop
      sequence_value:=nextval('public.teacher_account_code_seq');
      code:='T'||lpad(sequence_value::text,greatest(6,length(sequence_value::text)),'0');
      exit when not exists(select 1 from public.accounts where lower(user_code)=lower(code));
    end loop;
    insert into public.accounts(user_code,display_name,password,role) values(code,btrim(p_display_name),null,'teacher');
    insert into public.teacher_access(user_code,google_email,access_level,status,created_by)
      values(code,v_email,'teacher',p_status,p_actor);
  else
    select * into target from public.teacher_access where user_code=p_target_code for update;
    if target.user_code is null then return jsonb_build_object('ok',false,'code','TEACHER_NOT_FOUND'); end if;
    if target.access_level='super_admin' and p_status<>'active' then
      if target.user_code=actor_code or (select count(*) from public.teacher_access where access_level='super_admin' and status='active')<=1 then
        return jsonb_build_object('ok',false,'code','LAST_ADMIN');
      end if;
    end if;
    code:=target.user_code;
    update public.accounts set display_name=btrim(p_display_name) where user_code=code;
    update public.teacher_access set status=p_status,updated_at=clock_timestamp() where user_code=code;
  end if;
  insert into public.account_link_audit(actor_auth_user_id,new_user_code,action)
    values(p_actor,code,case p_action when 'add' then 'teacher_added' else 'teacher_updated' end);
  return jsonb_build_object('ok',true,'userCode',code);
end $$;

-- Auth-specific join wrapper keeps the old game rules and serializes identity changes.
create or replace function public.join_google_classroom(p_actor uuid,p_student_code text,p_room_code text,p_team_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; p public.participants%rowtype; t public.teams%rowtype;
  name text; started boolean; members integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('identity:'||p_actor::text,0));
  if public.verified_google_email(p_actor) is null or not exists(select 1 from public.account_identities where auth_user_id=p_actor and user_code=p_student_code) then
    return jsonb_build_object('ok',false,'code','ACCOUNT_CHANGED');
  end if;
  select display_name into name from public.accounts where user_code=p_student_code and role='student' for update;
  if name is null then return jsonb_build_object('ok',false,'code','STUDENT_ONLY'); end if;
  select * into s from public.game_sessions where room_code=p_room_code for update;
  if s.id is null or s.status='ended' then return jsonb_build_object('ok',false,'code','ROOM_NOT_FOUND'); end if;
  started:=s.started_at is not null or s.status<>'lobby';
  select * into p from public.participants where session_id=s.id and student_code=p_student_code;
  if p.id is not null and started and p.team_id is not null then
    select * into t from public.teams where id=p.team_id and session_id=s.id;
    update public.participants set display_name=name,connection_status='online',last_seen_at=clock_timestamp() where id=p.id;
  else
    if p_team_id is null then
      select x.* into t from public.teams x where x.session_id=s.id and
        (select count(*) from public.participants m where m.team_id=x.id and m.connection_status<>'left')<s.max_members_per_team
        order by (select count(*) from public.participants m where m.team_id=x.id and m.connection_status<>'left'),random() limit 1;
    else
      select * into t from public.teams where id=p_team_id and session_id=s.id;
    end if;
    if t.id is null then return jsonb_build_object('ok',false,'code','TEAM_UNAVAILABLE'); end if;
    select count(*) into members from public.participants where team_id=t.id and connection_status<>'left';
    if members>=s.max_members_per_team and p.team_id is distinct from t.id then return jsonb_build_object('ok',false,'code','TEAM_FULL'); end if;
    insert into public.participants(session_id,team_id,student_code,display_name,connection_status,joined_after_start,is_score_eligible,last_seen_at)
      values(s.id,t.id,p_student_code,name,'online',started,not started,clock_timestamp())
      on conflict(session_id,student_code) do update set team_id=excluded.team_id,display_name=excluded.display_name,
        connection_status='online',joined_after_start=excluded.joined_after_start,is_score_eligible=excluded.is_score_eligible,last_seen_at=excluded.last_seen_at;
    insert into public.game_events(session_id,event_type,payload) values(s.id,'join_room',jsonb_build_object('studentCode',p_student_code,'teamId',t.id));
  end if;
  return jsonb_build_object('ok',true,'teamId',t.id);
end $$;

revoke all on function public.verified_google_email(uuid),public.validate_teacher_account(),public.protect_linked_account_role(),
  public.consume_auth_limit(text,integer,integer),public.resolve_google_account(uuid,text,boolean),
  public.student_account_operation(uuid,text,text,text),public.manage_teacher_access(uuid,text,text,text,text,text,text,integer),
  public.join_google_classroom(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.resolve_google_account(uuid,text,boolean),public.student_account_operation(uuid,text,text,text),
  public.manage_teacher_access(uuid,text,text,text,text,text,text,integer),public.join_google_classroom(uuid,text,text,uuid) to service_role;
commit;
