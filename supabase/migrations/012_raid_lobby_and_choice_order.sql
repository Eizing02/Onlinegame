-- Additive upgrade after 011. Run manually; active question orders and Classic are preserved.
begin;
create or replace function public.rename_boss_raid_team(p_room text,p_student text,p_team uuid,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare g public.game_sessions%rowtype; player public.participants%rowtype; captain uuid; next_name text;
begin
 select * into g from public.game_sessions where room_code=p_room and game_mode='boss_raid' order by created_at desc limit 1 for update;
 if g.id is null then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 if g.status<>'lobby' or (select raid_status from public.boss_raid_sessions where session_id=g.id)<>'lobby' then return jsonb_build_object('ok',false,'code','LOBBY_CLOSED'); end if;
 select * into player from public.participants where session_id=g.id and student_code=p_student and connection_status<>'left';
 if player.id is null or p_team is null or player.team_id is distinct from p_team then return jsonb_build_object('ok',false,'code','ACCESS_DENIED'); end if;
 perform team_id from public.boss_raid_team_states where team_id=p_team for update;
 select id into captain from public.participants where team_id=p_team and session_id=g.id and connection_status<>'left' order by joined_at,id limit 1;
 if captain is distinct from player.id then return jsonb_build_object('ok',false,'code','CAPTAIN_ONLY'); end if;
 next_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 if char_length(next_name) not between 2 and 30 then return jsonb_build_object('ok',false,'code','INVALID_TEAM_NAME'); end if;
 update public.teams set team_name=next_name where id=p_team and session_id=g.id;
 update public.game_sessions set updated_at=clock_timestamp() where id=g.id;
 insert into public.game_events(session_id,event_type,payload) values(g.id,'rename_team',jsonb_build_object('studentCode',p_student,'teamId',p_team,'teamName',next_name));
 return jsonb_build_object('ok',true,'teamName',next_name);
end $$;
revoke all on function public.rename_boss_raid_team(text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.rename_boss_raid_team(text,text,uuid,text) to service_role;

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
  select coalesce(jsonb_agg(jsonb_build_object('displayName',pp.display_name,'teamName',tt.team_name,'score',p.points_earned,'correctCount',p.correct_count,'academicPoints',p.academic_points,'skippedCount',p.skipped_count,'cursor',p.cursor,'eligible',p.eligible) order by tt.team_number,pp.display_name),'[]') into academic_json
  from public.boss_raid_participants p join public.participants pp on pp.id=p.participant_id join public.teams tt on tt.id=p.team_id where p.session_id=g.id;
 end if;
 return jsonb_build_object('ok',true,'sessionId',g.id,'roomCode',g.room_code,'status',r.raid_status,'title',coalesce(g.activity_name,g.question_set_title),
  'serverNow',clock_timestamp(),'startedAt',r.started_at,'deadline',r.overall_ends_at,'questionCount',g.question_count,'durationSeconds',r.duration_seconds,
  'isTeamCaptain',not p_teacher and own_p.participant_id=captain,'canRenameTeam',not p_teacher and own_p.participant_id=captain and r.raid_status='lobby','captainId',captain,'rulesVersion',r.rules_version,'presentation',presentation_json,'visibilityEnabled',r.visibility_penalty_enabled,'own',own_json,'question',question_json,'warnings',warning,'team',selected_json,'teams',teams_json,'reason',r.end_reason,'visibilityAudit',audit_json,'academicReport',academic_json);
end $$;

commit;
