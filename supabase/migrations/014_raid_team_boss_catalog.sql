-- Three cosmetic bosses. Run after 013; no changes to answer/scoring/deadline functions.
-- The old seven-argument RPC explicitly retains the dragon catalog. New server code
-- opts into catalog 2 through the eight-argument RPC (no default/overload ambiguity).
begin;
alter table public.boss_raid_sessions add column if not exists boss_catalog_version smallint not null default 1 check(boss_catalog_version in (1,2));
alter table public.boss_raid_team_states add column if not exists boss_type text not null default 'shadow_dragon' check(boss_type in ('shadow_dragon','stone_titan','crystal_scorpion'));
alter table public.boss_raid_team_states add column if not exists boss_assigned_at timestamptz;

create or replace function public.create_boss_raid_room(p_teacher text,p_set uuid,p_activity text,p_teams integer,p_members integer,p_duration integer,p_visibility boolean,p_boss_catalog_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare sid uuid:=gen_random_uuid(); code text; bank public.question_sets%rowtype; tid uuid; i integer; tries integer; count_q integer; available boolean:=false;
begin
 if p_boss_catalog_version is null or p_boss_catalog_version not in (1,2) then return jsonb_build_object('ok',false,'code','INVALID_SETTINGS'); end if;
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
 insert into public.boss_raid_sessions(session_id,duration_seconds,visibility_penalty_enabled,rules_version,boss_catalog_version) values(sid,p_duration,p_visibility,2,p_boss_catalog_version);
 for i in 1..p_teams loop
  tid:=gen_random_uuid(); insert into public.teams(id,session_id,team_number,team_name) values(tid,sid,i,'ทีม '||i);
  insert into public.boss_raid_team_states(team_id,session_id,boss_type,boss_assigned_at) values(tid,sid,case when p_boss_catalog_version=2 then (array['shadow_dragon','stone_titan','crystal_scorpion'])[1+floor(random()*3)::integer] else 'shadow_dragon' end,clock_timestamp());
 end loop;
 return jsonb_build_object('ok',true,'roomCode',code,'sessionId',sid);
end $$;

create or replace function public.create_boss_raid_room(p_teacher text,p_set uuid,p_activity text,p_teams integer,p_members integer,p_duration integer,p_visibility boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return public.create_boss_raid_room(p_teacher,p_set,p_activity,p_teams,p_members,p_duration,p_visibility,1);
end $$;

create or replace function public.get_private_raid_snapshot(p_room text,p_user text,p_teacher boolean,p_team uuid default null,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare presentation_json jsonb:=null; g public.game_sessions%rowtype; r public.boss_raid_sessions%rowtype; own_p public.boss_raid_participants%rowtype;
 captain uuid; selected uuid; teams_json jsonb; selected_json jsonb; own_json jsonb; question_json jsonb; warning integer:=0; audit_json jsonb:='[]'; academic_json jsonb:='[]';
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
 select pp.id into captain from public.participants pp where pp.session_id=g.id and pp.team_id=selected and pp.connection_status<>'left' order by pp.joined_at,pp.id limit 1;
 -- Hold only the selected team against a scoring write while composing its detail.
 perform team_id from public.boss_raid_team_states where team_id=selected for share;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',t.team_id,'name',tt.team_name,'memberCount',case when r.raid_status='lobby' then (select count(*) from public.boss_raid_participants p where p.team_id=t.team_id and p.eligible) else t.locked_member_count end,
  'bossType',t.boss_type,'bossAssignedAt',t.boss_assigned_at,'bossHp',t.boss_hp,'bossMaxHp',t.boss_max_hp,'totalScore',t.score_total,'averageScore',case when t.locked_member_count=0 then 0 else t.score_total/t.locked_member_count end,
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
 'events',coalesce((select jsonb_agg(jsonb_build_object('seq',e.seq,'type',e.type,'actorId',e.actor_id,'targetId',e.target_id,'damage',e.damage,'damageTaken',e.damage_taken,'heal',e.heal,'phase',e.phase,'bossHp',e.boss_hp,'heroHp',e.hero_hp,'createdAt',e.created_at) order by e.seq)
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
  select coalesce(jsonb_agg(jsonb_build_object('displayName',pp.display_name,'teamId',p.team_id,'bossType',(select bs.boss_type from public.boss_raid_team_states bs where bs.team_id=p.team_id),'teamName',tt.team_name,'score',p.points_earned,'correctCount',p.correct_count,'academicPoints',p.academic_points,'skippedCount',p.skipped_count,'cursor',p.cursor,'eligible',p.eligible) order by tt.team_number,pp.display_name),'[]') into academic_json
  from public.boss_raid_participants p join public.participants pp on pp.id=p.participant_id join public.teams tt on tt.id=p.team_id where p.session_id=g.id;
 end if;
 return jsonb_build_object('ok',true,'sessionId',g.id,'roomCode',g.room_code,'status',r.raid_status,'title',coalesce(g.activity_name,g.question_set_title),
  'serverNow',clock_timestamp(),'startedAt',r.started_at,'deadline',r.overall_ends_at,'questionCount',g.question_count,'durationSeconds',r.duration_seconds,
  'isTeamCaptain',not p_teacher and own_p.participant_id=captain,'canRenameTeam',not p_teacher and own_p.participant_id=captain and r.raid_status='lobby','captainId',captain,'bossCatalogVersion',r.boss_catalog_version,'heroCatalogVersion',case when r.rules_version=1 then 1 else r.hero_catalog_version end,'availableHeroes',to_jsonb(case when r.hero_catalog_version>=2 and r.rules_version>=2 then array['warrior','mage','wizard','witch','fairy','ranger','ninja','monk','engineer','bard'] else array['warrior','mage','wizard','witch','fairy'] end),'rulesVersion',r.rules_version,'presentation',presentation_json,'visibilityEnabled',r.visibility_penalty_enabled,'own',own_json,'question',question_json,'warnings',warning,'team',selected_json,'teams',teams_json,'reason',r.end_reason,'visibilityAudit',audit_json,'academicReport',academic_json);
end $$;
revoke all on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean,integer) from public,anon,authenticated;
grant execute on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean,integer) to service_role;
revoke all on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean) to service_role;
revoke all on function public.get_private_raid_snapshot(text,text,boolean,uuid,bigint) from public,anon,authenticated;
grant execute on function public.get_private_raid_snapshot(text,text,boolean,uuid,bigint) to service_role;
commit;
