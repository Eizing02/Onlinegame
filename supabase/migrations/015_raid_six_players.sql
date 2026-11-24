-- Expand Boss Raid team capacity from 5 to 6 players per team (staggered 3x2 arena formation).
-- Run after 014_raid_team_boss_catalog.sql. Legacy rules_version=1 rooms stay capped at 5 unique heroes.
begin;

alter table public.boss_raid_team_states drop constraint if exists boss_raid_team_states_locked_member_count_check;
alter table public.boss_raid_team_states add constraint boss_raid_team_states_locked_member_count_check check(locked_member_count between 0 and 6);

create or replace function public.create_boss_raid_room(p_teacher text,p_set uuid,p_activity text,p_teams integer,p_members integer,p_duration integer,p_visibility boolean,p_boss_catalog_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare sid uuid:=gen_random_uuid(); code text; bank public.question_sets%rowtype; tid uuid; i integer; tries integer; count_q integer; available boolean:=false;
begin
 if p_boss_catalog_version is null or p_boss_catalog_version not in (1,2) then return jsonb_build_object('ok',false,'code','INVALID_SETTINGS'); end if;
 if not exists(select 1 from public.accounts where user_code=p_teacher and role='teacher') then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 perform pg_advisory_xact_lock(hashtextextended('teacher:'||p_teacher,0));
 if exists(select 1 from public.game_sessions where teacher_code=p_teacher and status<>'ended') then return jsonb_build_object('ok',false,'code','ACTIVE_ROOM'); end if;
 if p_teams not between 1 and 12 or p_members not between 1 and 6 or p_duration not between 60 and 3600 then return jsonb_build_object('ok',false,'code','INVALID_SETTINGS'); end if;
 select * into bank from public.question_sets where id=p_set and teacher_code=p_teacher;
 select count(*) into count_q from public.questions where question_set_id=p_set;
 if bank.id is null or count_q=0 then return jsonb_build_object('ok',false,'code','INVALID_QUESTION_SET'); end if;
 for tries in 1..100 loop
  code:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%10000)::text,4,'0');
  perform pg_advisory_xact_lock(hashtextextended('room-code:'||code,0));
  available:=not exists(select 1 from public.game_sessions where room_code=code and status<>'ended'); exit when available;
 end loop;
 if not available then return jsonb_build_object('ok',false,'code','ROOM_CODE_UNAVAILABLE'); end if;
 insert into public.game_sessions(id,room_code,teacher_code,question_set_id,question_set_title,question_count,activity_name,team_count,max_members_per_team,game_mode)
 values(sid,code,p_teacher,p_set,bank.title,count_q,nullif(p_activity,''),p_teams,p_members,'boss_raid');
 insert into public.boss_raid_sessions(session_id,duration_seconds,visibility_penalty_enabled,rules_version,boss_catalog_version) values(sid,p_duration,p_visibility,2,p_boss_catalog_version);
 for i in 1..p_teams loop
  tid:=gen_random_uuid(); insert into public.teams(id,session_id,team_number,team_name) values(tid,sid,i,'ทีม '||i);
  insert into public.boss_raid_team_states(team_id,session_id,boss_type,boss_assigned_at) values(tid,sid,case when p_boss_catalog_version=2 then (array['shadow_dragon','stone_titan','crystal_scorpion'])[1+floor(random()*3)::integer] else 'shadow_dragon' end,clock_timestamp());
 end loop;
 return jsonb_build_object('ok',true,'roomCode',code,'sessionId',sid);
end $$;

create or replace function public.start_boss_raid(p_room text,p_teacher text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare g public.game_sessions%rowtype; r public.boss_raid_sessions%rowtype; p record; t record; q record;
 now_at timestamptz; n integer; sum_points bigint; count_q integer; chosen text; heroes text[]:=array['warrior','mage','wizard','witch','fairy'];
 ids uuid[]; shuffled uuid[]; options uuid[]; j integer; attempts integer; same boolean;
begin
 select * into g from public.game_sessions where room_code=p_room and teacher_code=p_teacher and game_mode='boss_raid' order by created_at desc limit 1 for update;
 if g.id is null then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 select * into r from public.boss_raid_sessions where session_id=g.id;
 if r.hero_catalog_version>=2 and r.rules_version>=2 then heroes:=array['warrior','mage','wizard','witch','fairy','ranger','ninja','monk','engineer','bard']; end if;
 if r.raid_status='running' then return jsonb_build_object('ok',true); end if;
 if r.raid_status<>'lobby' then return jsonb_build_object('ok',false,'code','RAID_ENDED'); end if;
 if not exists(select 1 from public.boss_raid_participants rp join public.participants pp on pp.id=rp.participant_id where rp.session_id=g.id and rp.eligible and pp.connection_status<>'left') then return jsonb_build_object('ok',false,'code','NO_PLAYERS'); end if;
 perform team_id from public.boss_raid_team_states where session_id=g.id order by team_id for update;
 perform participant_id from public.boss_raid_participants where session_id=g.id order by participant_id for update;
 update public.boss_raid_participants rp set eligible=false from public.participants pp where pp.id=rp.participant_id and rp.session_id=g.id and pp.connection_status='left';
 insert into public.boss_raid_questions(session_id,question_id,question_text,question_type,image_url,image_path,points,correct_answer,options)
 select g.id,q.id,q.question_text,q.question_type,q.image_url,q.image_path,q.points,q.correct_answer,
 coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'optionText',o.option_text,'isCorrect',o.is_correct) order by o.order_index) from public.question_options o where o.question_id=q.id),'[]')
 from public.questions q where q.question_set_id=g.question_set_id;
 select count(*),sum(points),array_agg(question_id order by question_id) into count_q,sum_points,ids from public.boss_raid_questions where session_id=g.id;
 if count_q not between 1 and 1000 or sum_points not between 1 and 1000000 or exists(select 1 from public.boss_raid_questions where session_id=g.id and (btrim(correct_answer)='' or (question_type<>'short_text' and ((select count(*) from jsonb_array_elements(options) o where (o->>'isCorrect')::boolean)<>1 or jsonb_array_length(options)<>case when question_type='true_false' then 2 else 4 end)))) then
  raise exception 'RAID_INVALID_QUESTION_SET';
 end if;
 for t in select * from public.boss_raid_team_states where session_id=g.id order by team_id loop
  select count(*) into n from public.boss_raid_participants where team_id=t.team_id and eligible;
  if n=0 then continue; end if;
  if n>g.max_members_per_team or n>6 or (r.rules_version=1 and n>5) then raise exception 'RAID_TEAM_CAPACITY'; end if;
  update public.boss_raid_team_states set locked_member_count=n,boss_max_hp=ceil(0.75*n*10*sum_points),boss_hp=ceil(0.75*n*10*sum_points) where team_id=t.team_id;
  for p in select * from public.boss_raid_participants where team_id=t.team_id and eligible order by participant_id loop
   if p.hero_type is null then
    if r.rules_version=1 then
    select hero into chosen from unnest(heroes) with ordinality h(hero,ord) where not exists(select 1 from public.boss_raid_participants where team_id=t.team_id and hero_type=h.hero and eligible) order by ord limit 1;
    else
    select hero into chosen from unnest(heroes) with ordinality h(hero,ord) order by (select count(*) from public.boss_raid_participants where team_id=t.team_id and hero_type=h.hero and eligible),ord limit 1;
    end if;
    update public.boss_raid_participants set hero_type=chosen where participant_id=p.participant_id;
   end if;
   for attempts in 1..8 loop
    shuffled:=public.raid_shuffle(ids);
    select exists(select 1 from public.boss_raid_participants rp where rp.team_id=t.team_id and rp.participant_id<>p.participant_id and (select array_agg(qo.question_id order by qo.display_index) from public.boss_raid_question_order qo where qo.participant_id=rp.participant_id)=shuffled) into same;
    exit when not same;
   end loop;
   for j in 1..count_q loop
    select * into q from public.boss_raid_questions where session_id=g.id and question_id=shuffled[j];
    select coalesce(array_agg((o->>'id')::uuid order by ord),'{}'::uuid[]) into options from jsonb_array_elements(q.options) with ordinality arr(o,ord);
    insert into public.boss_raid_question_order(participant_id,session_id,display_index,question_id,option_order) values(p.participant_id,g.id,j-1,q.question_id,options);
   end loop;
  end loop;
 end loop;
 now_at:=clock_timestamp();
 update public.boss_raid_sessions set raid_status='running',started_at=now_at,overall_ends_at=now_at+make_interval(secs=>duration_seconds),question_snapshot=(select jsonb_agg(to_jsonb(q)) from public.boss_raid_questions q where session_id=g.id) where session_id=g.id;
 update public.game_sessions set status='playing',started_at=now_at,question_count=count_q,updated_at=now_at where id=g.id;
 update public.teams t set locked_member_count=rp.locked_member_count from public.boss_raid_team_states rp where rp.team_id=t.id and rp.session_id=g.id;
 return jsonb_build_object('ok',true);
end $$;

revoke all on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean,integer) from public,anon,authenticated;
grant execute on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean,integer) to service_role;
revoke all on function public.start_boss_raid(text,text) from public,anon,authenticated;
grant execute on function public.start_boss_raid(text,text) to service_role;

commit;
