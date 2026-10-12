-- Boss Raid v2 pacing and duplicate heroes. Review and run separately; no production writes from the app.
-- Existing sessions retain v1. Only newly created rooms adopt v2; scoring, deadlines and Auth are unchanged.
begin;
alter table public.boss_raid_sessions drop constraint boss_raid_sessions_rules_version_check;
alter table public.boss_raid_sessions add constraint boss_raid_sessions_rules_version_check check(rules_version in (1,2));
alter table public.boss_raid_participants add column next_question_available_at timestamptz;
drop index public.boss_raid_hero_unique;
-- V1 uniqueness remains enforced under the existing team/room locks by reserve/start.

create or replace function public.create_boss_raid_room(p_teacher text,p_set uuid,p_activity text,p_teams integer,p_members integer,p_duration integer,p_visibility boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare sid uuid:=gen_random_uuid(); code text; bank public.question_sets%rowtype; tid uuid; i integer; tries integer; count_q integer; available boolean:=false;
begin
 if not exists(select 1 from public.accounts where user_code=p_teacher and role='teacher') then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 perform pg_advisory_xact_lock(hashtextextended('teacher:'||p_teacher,0));
 if exists(select 1 from public.game_sessions where teacher_code=p_teacher and status<>'ended') then return jsonb_build_object('ok',false,'code','ACTIVE_ROOM'); end if;
 if p_teams not between 1 and 12 or p_members not between 1 and 5 or p_duration not between 60 and 3600 then return jsonb_build_object('ok',false,'code','INVALID_SETTINGS'); end if;
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
 insert into public.boss_raid_sessions(session_id,duration_seconds,visibility_penalty_enabled,rules_version) values(sid,p_duration,p_visibility,2);
 for i in 1..p_teams loop
  tid:=gen_random_uuid(); insert into public.teams(id,session_id,team_number,team_name) values(tid,sid,i,'ทีม '||i);
  insert into public.boss_raid_team_states(team_id,session_id) values(tid,sid);
 end loop;
 return jsonb_build_object('ok',true,'roomCode',code,'sessionId',sid);
end $$;

create or replace function public.reserve_raid_hero(p_room text,p_student text,p_hero text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare g public.game_sessions%rowtype; pid uuid; tid uuid;
begin
 select * into g from public.game_sessions where room_code=p_room and game_mode='boss_raid' order by created_at desc limit 1 for update;
 if g.id is null or g.status<>'lobby' then return jsonb_build_object('ok',false,'code','LOBBY_CLOSED'); end if;
 select id,team_id into pid,tid from public.participants where session_id=g.id and student_code=p_student and connection_status<>'left';
 if pid is null or p_hero not in ('warrior','mage','wizard','witch','fairy') then return jsonb_build_object('ok',false,'code','INVALID_HERO'); end if;
 perform team_id from public.boss_raid_team_states where team_id=tid for update;
 perform participant_id from public.boss_raid_participants where team_id=tid order by participant_id for update;
 if (select rules_version from public.boss_raid_sessions where session_id=g.id)=1 and exists(select 1 from public.boss_raid_participants where team_id=tid and hero_type=p_hero and participant_id<>pid and eligible) then return jsonb_build_object('ok',false,'code','HERO_TAKEN'); end if;
 update public.boss_raid_participants set hero_type=p_hero where participant_id=pid;
 return jsonb_build_object('ok',true);
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
  if n>g.max_members_per_team or n>5 then raise exception 'RAID_TEAM_CAPACITY'; end if;
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
    select coalesce(array_agg((o->>'id')::uuid),'{}'::uuid[]) into options from jsonb_array_elements(q.options) o;
    insert into public.boss_raid_question_order(participant_id,session_id,display_index,question_id,option_order) values(p.participant_id,g.id,j-1,q.question_id,public.raid_shuffle(options));
   end loop;
  end loop;
 end loop;
 now_at:=clock_timestamp();
 update public.boss_raid_sessions set raid_status='running',started_at=now_at,overall_ends_at=now_at+make_interval(secs=>duration_seconds),question_snapshot=(select jsonb_agg(to_jsonb(q)) from public.boss_raid_questions q where session_id=g.id) where session_id=g.id;
 update public.game_sessions set status='playing',started_at=now_at,question_count=count_q,updated_at=now_at where id=g.id;
 update public.teams t set locked_member_count=rp.locked_member_count from public.boss_raid_team_states rp where rp.team_id=t.id and rp.session_id=g.id;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.raid_resolve(p_participant uuid,p_question uuid,p_index integer,p_key uuid,p_answer text,p_option uuid,p_skip boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare seq_before bigint; presentation_json jsonb; p public.boss_raid_participants%rowtype; t public.boss_raid_team_states%rowtype; r public.boss_raid_sessions%rowtype;
 q public.boss_raid_questions%rowtype; ledger public.boss_raid_answers%rowtype; ord public.boss_raid_question_order%rowtype;
 correct boolean:=false; points integer:=0; academic integer:=0; dmg bigint:=0; healed integer:=0; target uuid; target_hp integer; hp_before integer; phase_now integer; question_count integer; now_at timestamptz; result jsonb; option_found boolean;
begin
 if p_key is null or p_question is null or p_index is null or p_index<0 or char_length(coalesce(p_answer,''))>2000 then return jsonb_build_object('ok',false,'code','INVALID_INPUT'); end if;
 select * into p from public.boss_raid_participants where participant_id=p_participant;
 if p.participant_id is null or not p.eligible then return jsonb_build_object('ok',false,'code','SPECTATOR_ONLY'); end if;
 select * into t from public.boss_raid_team_states where team_id=p.team_id for update;
 perform participant_id from public.boss_raid_participants where team_id=t.team_id order by participant_id for update;
 select * into p from public.boss_raid_participants where participant_id=p_participant;
 select * into ledger from public.boss_raid_answers where participant_id=p_participant and idempotency_key=p_key;
 if ledger.id is not null then
  if ledger.question_id<>p_question or ledger.display_index<>p_index then return jsonb_build_object('ok',false,'code','IDEMPOTENCY_CONFLICT'); end if;
  return ledger.result;
 end if;
 select * into r from public.boss_raid_sessions where session_id=p.session_id;
 now_at:=clock_timestamp();
 if r.raid_status<>'running' or r.overall_ends_at<=now_at then return jsonb_build_object('ok',false,'code','RAID_EXPIRED'); end if;
 if r.rules_version=2 and p.next_question_available_at>now_at then return jsonb_build_object('ok',false,'code','PRESENTATION_PENDING','availableAt',p.next_question_available_at); end if;
 seq_before:=t.event_seq;
 select count(*) into question_count from public.boss_raid_questions where session_id=p.session_id;
 select * into ord from public.boss_raid_question_order where participant_id=p_participant and display_index=p.cursor;
 if ord.question_id is null or p.cursor<>p_index or ord.question_id<>p_question then return jsonb_build_object('ok',false,'code','CONFLICT_REFRESH'); end if;
 select * into q from public.boss_raid_questions where session_id=p.session_id and question_id=p_question;
 if not p_skip then
  if q.question_type='short_text' then correct:=lower(regexp_replace(btrim(coalesce(p_answer,'')),'[[:space:]]+',' ','g'))=lower(regexp_replace(btrim(q.correct_answer),'[[:space:]]+',' ','g'));
  else
   select (o->>'isCorrect')::boolean,true into correct,option_found from jsonb_array_elements(q.options) o where o->>'id'=p_option::text;
   if not coalesce(option_found,false) then return jsonb_build_object('ok',false,'code','INVALID_OPTION'); end if;
  end if;
 end if;
 hp_before:=p.hp;
 if not p_skip and correct then
  academic:=q.points;
  if p.hp>0 then
   points:=q.points; dmg:=least(t.boss_hp,10::bigint*q.points);
   update public.boss_raid_team_states set boss_hp=boss_hp-dmg,damage_dealt=damage_dealt+dmg,score_total=score_total+points,
    defeated_at=case when boss_hp>0 and boss_hp-dmg=0 then now_at else defeated_at end where team_id=t.team_id;
  else
   if t.locked_member_count=1 then target:=p.participant_id;
   else select participant_id into target from public.boss_raid_participants where team_id=t.team_id and eligible and participant_id<>p_participant and hp<100 order by gen_random_uuid() limit 1; end if;
   if target is not null then
    select hp into target_hp from public.boss_raid_participants where participant_id=target; healed:=least(10,100-target_hp);
    update public.boss_raid_participants set hp=hp+healed,updated_at=now_at where participant_id=target;
    if target=p_participant then p.hp:=least(100,p.hp+10); end if;
   end if;
  end if;
 elsif not p_skip and p.hp>0 and t.boss_hp>0 then p.hp:=greatest(0,p.hp-greatest(5,least(20,round(150::numeric/question_count)::integer))); end if;
 update public.boss_raid_participants set hp=p.hp,cursor=cursor+1,points_earned=points_earned+points,academic_points=academic_points+academic,correct_count=correct_count+case when correct then 1 else 0 end,skipped_count=skipped_count+case when p_skip then 1 else 0 end,
 finished_at=case when cursor+1=question_count then now_at else null end,updated_at=now_at where participant_id=p_participant;
 update public.boss_raid_team_states set answered_count=answered_count+1,correct_count=correct_count+case when correct then 1 else 0 end where team_id=t.team_id;
 select case when boss_hp::numeric/boss_max_hp<=0.2 or answered_count::numeric/(t.locked_member_count*question_count)>=0.8 then 3
  when boss_hp::numeric/boss_max_hp<=0.5 or answered_count::numeric/(t.locked_member_count*question_count)>=0.5 then 2 else 1 end into phase_now from public.boss_raid_team_states where team_id=t.team_id;
 update public.boss_raid_team_states set phase=greatest(phase,phase_now),updated_at=now_at where team_id=t.team_id;
 if not p_skip then
  if correct and hp_before>0 then perform public.raid_emit(t.team_id,'hero_attack',p_participant,null,dmg,0,p.hp);
  elsif correct and target is not null then perform public.raid_emit(t.team_id,'heal',p_participant,target,0,healed,(select hp from public.boss_raid_participants where participant_id=target));
  elsif not correct and hp_before<>p.hp then perform public.raid_emit(t.team_id,'hero_hit',null,p_participant,0,0,p.hp); end if;
 end if;
 if phase_now>t.phase then perform public.raid_emit(t.team_id,'boss_phase',null,null,0,0,null); end if;
 if t.boss_hp>0 and t.boss_hp-dmg=0 then perform public.raid_emit(t.team_id,'boss_defeated',p_participant,null,dmg,0,null); end if;
 result:=jsonb_build_object('ok',true,'status',case when p_skip then 'skipped' else 'answered' end,'correct',case when p_skip then null else correct end,'awardedPoints',points,'damage',dmg,'heroHp',p.hp,'bossHp',(select boss_hp from public.boss_raid_team_states where team_id=t.team_id),'cursor',p.cursor+1,'healAmount',healed,'noHealTarget',correct and hp_before=0 and target is null,'serverNow',now_at,'deadline',r.overall_ends_at);
 if r.rules_version=2 and not p_skip then
  update public.boss_raid_participants set next_question_available_at=now_at+interval '3 seconds' where participant_id=p_participant;
  select jsonb_build_object('id',p_key,'durationMs',3000,'availableAt',now_at+interval '3 seconds','events',coalesce(jsonb_agg(jsonb_build_object('seq',e.seq,'type',e.type,'actorId',e.actor_id,'targetId',e.target_id,'damage',e.damage,'heal',e.heal,'phase',e.phase,'bossHp',e.boss_hp,'heroHp',e.hero_hp,'createdAt',e.created_at) order by e.seq),'[]')) into presentation_json from public.boss_raid_battle_events e where e.team_id=t.team_id and e.seq>seq_before;
  result:=result||jsonb_build_object('presentation',presentation_json);
 end if;
 insert into public.boss_raid_answers(session_id,team_id,participant_id,question_id,display_index,outcome,answer_text,selected_option_id,is_correct,academic_correct_points,awarded_score,damage_to_boss,heal_target_participant_id,heal_amount,hp_before,hp_after,idempotency_key,submitted_at,result)
 values(p.session_id,t.team_id,p_participant,p_question,p_index,case when p_skip then 'skipped_visibility' else 'answered' end,case when p_skip then null else left(p_answer,2000) end,case when p_skip then null else p_option end,case when p_skip then null else correct end,academic,points,dmg,target,healed,hp_before,p.hp,p_key,now_at,result);
 return result;
end $$;

create or replace function public.get_private_raid_snapshot(p_room text,p_user text,p_teacher boolean,p_team uuid default null,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare presentation_json jsonb:=null; g public.game_sessions%rowtype; r public.boss_raid_sessions%rowtype; own_p public.boss_raid_participants%rowtype;
 selected uuid; teams_json jsonb; selected_json jsonb; own_json jsonb; question_json jsonb; warning integer:=0; audit_json jsonb:='[]'; academic_json jsonb:='[]';
begin
 select * into g from public.game_sessions where room_code=p_room and game_mode='boss_raid' order by created_at desc limit 1;
 if g.id is null then return jsonb_build_object('ok',false,'code','ROOM_NOT_FOUND'); end if;
 if p_teacher then
  if g.teacher_code<>p_user or not exists(select 1 from public.accounts where user_code=p_user and role='teacher') then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 else
  select rp.* into own_p from public.boss_raid_participants rp join public.participants pp on pp.id=rp.participant_id where rp.session_id=g.id and pp.student_code=p_user and pp.connection_status<>'left';
  if own_p.participant_id is null then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 end if;
 perform public.finalize_boss_raid_if_expired(g.id);
 select * into r from public.boss_raid_sessions where session_id=g.id;
 if p_teacher then
  select t.team_id into selected from public.boss_raid_team_states t join public.teams tt on tt.id=t.team_id where t.session_id=g.id and (p_team is null or t.team_id=p_team) order by tt.team_number limit 1;
  if selected is null then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 else selected:=own_p.team_id; end if;
 -- Hold only the selected team against a scoring write while composing its detail.
 perform team_id from public.boss_raid_team_states where team_id=selected for share;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',t.team_id,'name',tt.team_name,'memberCount',case when r.raid_status='lobby' then (select count(*) from public.boss_raid_participants p where p.team_id=t.team_id and p.eligible) else t.locked_member_count end,
  'bossHp',t.boss_hp,'bossMaxHp',t.boss_max_hp,'totalScore',t.score_total,'averageScore',case when t.locked_member_count=0 then 0 else t.score_total/t.locked_member_count end,
  'defeatedAt',t.defeated_at,'killDurationMs',case when t.defeated_at is null then null else floor(extract(epoch from t.defeated_at-r.started_at)*1000) end,
  'phase',t.phase,'answeredCount',t.answered_count,
  'correctCount',t.correct_count,
  'eventSeq',t.event_seq,'heroes','[]'::jsonb,'events','[]'::jsonb
 ) order by tt.team_number),'[]') into teams_json from public.boss_raid_team_states t join public.teams tt on tt.id=t.team_id where t.session_id=g.id;
 select item into selected_json from jsonb_array_elements(teams_json) item where item->>'id'=selected::text;
 selected_json:=selected_json||jsonb_build_object('heroes',coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.participant_id,'displayName',pp.display_name,'heroType',p.hero_type,'hp',p.hp,'score',p.points_earned,'cursor',p.cursor,
  'eligible',p.eligible,'correctCount',p.correct_count,'academicPoints',p.academic_points,'skippedCount',p.skipped_count,'finished',p.finished_at is not null
 ) order by p.participant_id) from public.boss_raid_participants p join public.participants pp on pp.id=p.participant_id where p.team_id=selected and p.eligible),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('seq',e.seq,'type',e.type,'actorId',e.actor_id,'targetId',e.target_id,'damage',e.damage,'heal',e.heal,'phase',e.phase,'bossHp',e.boss_hp,'heroHp',e.hero_hp,'createdAt',e.created_at) order by e.seq)
 from (select * from public.boss_raid_battle_events where team_id=selected and seq>greatest(p_after,0) order by seq desc limit 50) e),'[]'));
 if not p_teacher then
  select * into own_p from public.boss_raid_participants where participant_id=own_p.participant_id;
  own_json:=jsonb_build_object('id',own_p.participant_id,'displayName',(select display_name from public.participants where id=own_p.participant_id),
   'heroType',own_p.hero_type,'hp',own_p.hp,'score',own_p.points_earned,'cursor',own_p.cursor,'eligible',own_p.eligible,'correctCount',own_p.correct_count,'academicPoints',own_p.academic_points,'skippedCount',own_p.skipped_count,'finished',own_p.finished_at is not null);
  if r.raid_status='running' and r.rules_version=2 and own_p.next_question_available_at>clock_timestamp() then
   select a.result->'presentation' into presentation_json from public.boss_raid_answers a where a.participant_id=own_p.participant_id order by a.display_index desc limit 1;
  end if;
  if r.raid_status='running' and own_p.eligible and own_p.finished_at is null and presentation_json is null then
   select jsonb_build_object('id',q.question_id,'displayIndex',o.display_index,'questionText',q.question_text,'questionType',q.question_type,'imageUrl',q.image_url,'imagePath',q.image_path,'points',q.points,
    'options',coalesce((select jsonb_agg(jsonb_build_object('id',opt->>'id','optionText',opt->>'optionText') order by arr.ord) from unnest(o.option_order) with ordinality arr(id,ord) join lateral jsonb_array_elements(q.options) opt on opt->>'id'=arr.id::text),'[]'))
   into question_json from public.boss_raid_question_order o join public.boss_raid_questions q on q.session_id=o.session_id and q.question_id=o.question_id where o.participant_id=own_p.participant_id and o.display_index=own_p.cursor;
   select count(*) into warning from public.boss_raid_visibility_events where participant_id=own_p.participant_id and question_id=(question_json->>'id')::uuid and qualified;
  end if;
 else
  select coalesce(jsonb_agg(to_jsonb(audit) order by audit."receivedAt" desc),'[]') into audit_json from (
   select pp.display_name as "displayName",e.display_index as "displayIndex",e.duration_ms as "durationMs",e.warning_sequence as warnings,e.received_at as "receivedAt",e.status
   from public.boss_raid_visibility_events e join public.participants pp on pp.id=e.participant_id where e.session_id=g.id order by e.received_at desc limit 200
  ) audit;
 end if;
 if p_teacher and r.raid_status='ended' then
  select coalesce(jsonb_agg(jsonb_build_object('displayName',pp.display_name,'teamName',tt.team_name,'score',p.points_earned,'correctCount',p.correct_count,'academicPoints',p.academic_points,'skippedCount',p.skipped_count,'cursor',p.cursor,'eligible',p.eligible) order by tt.team_number,pp.display_name),'[]') into academic_json
  from public.boss_raid_participants p join public.participants pp on pp.id=p.participant_id join public.teams tt on tt.id=p.team_id where p.session_id=g.id;
 end if;
 return jsonb_build_object('ok',true,'sessionId',g.id,'roomCode',g.room_code,'status',r.raid_status,'title',coalesce(g.activity_name,g.question_set_title),
  'serverNow',clock_timestamp(),'startedAt',r.started_at,'deadline',r.overall_ends_at,'questionCount',g.question_count,'durationSeconds',r.duration_seconds,
  'rulesVersion',r.rules_version,'presentation',presentation_json,'visibilityEnabled',r.visibility_penalty_enabled,'own',own_json,'question',question_json,'warnings',warning,'team',selected_json,'teams',teams_json,'reason',r.end_reason,'visibilityAudit',audit_json,'academicReport',academic_json);
end $$;

create or replace function public.report_raid_visibility(p_room text,p_student text,p_question uuid,p_index integer,p_event uuid,p_duration integer)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare p public.boss_raid_participants%rowtype; tid uuid; pid uuid; r public.boss_raid_sessions%rowtype; e public.boss_raid_visibility_events%rowtype; warning integer; result jsonb;
begin
 select pp.id,pp.team_id into pid,tid from public.participants pp join public.game_sessions g on g.id=pp.session_id where g.room_code=p_room and g.game_mode='boss_raid' and pp.student_code=p_student order by g.created_at desc limit 1;
 if pid is null then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 perform team_id from public.boss_raid_team_states where team_id=tid for update;
 perform participant_id from public.boss_raid_participants where team_id=tid order by participant_id for update;
 select * into p from public.boss_raid_participants where participant_id=pid;
 select * into r from public.boss_raid_sessions where session_id=p.session_id;
 select * into e from public.boss_raid_visibility_events where participant_id=pid and event_id=p_event;
 if e.event_id is not null then return jsonb_build_object('ok',true,'warnings',e.warning_sequence,'status',e.status); end if;
 if not p.eligible then return jsonb_build_object('ok',false,'code','SPECTATOR_ONLY'); end if;
 if r.raid_status<>'running' or r.overall_ends_at<=clock_timestamp() then return jsonb_build_object('ok',false,'code','RAID_EXPIRED'); end if;
 if r.rules_version=2 and p.next_question_available_at>clock_timestamp() then return jsonb_build_object('ok',false,'code','PRESENTATION_PENDING'); end if;
 if not r.visibility_penalty_enabled or p_duration<=3000 then return jsonb_build_object('ok',true,'warnings',0,'status','ignored'); end if;
 if p_duration>86400000 or p.cursor<>p_index or not exists(select 1 from public.boss_raid_question_order where participant_id=pid and display_index=p_index and question_id=p_question) then return jsonb_build_object('ok',false,'code','CONFLICT_REFRESH'); end if;
 select count(*)+1 into warning from public.boss_raid_visibility_events where participant_id=pid and question_id=p_question and qualified;
 insert into public.boss_raid_visibility_events(event_id,participant_id,session_id,question_id,display_index,duration_ms,qualified,warning_sequence,status)
 values(p_event,pid,p.session_id,p_question,p_index,p_duration,true,warning,case when warning>=3 then 'skipped' else 'warning' end);
 if warning>=3 then result:=public.raid_resolve(pid,p_question,p_index,p_event,null,null,true);
  if not (result->>'ok')::boolean then update public.boss_raid_visibility_events set status=coalesce(result->>'code','error') where participant_id=pid and event_id=p_event; end if;
  return result||jsonb_build_object('warnings',warning); end if;
 return jsonb_build_object('ok',true,'warnings',warning,'status','warning');
end $$;

commit;
