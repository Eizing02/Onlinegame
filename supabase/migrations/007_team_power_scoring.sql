begin;
alter table public.game_sessions add column if not exists rules_version integer not null default 1 check (rules_version in (1,2));
alter table public.game_sessions add column if not exists question_snapshot jsonb;
alter table public.teams add column if not exists boost_question_index integer check (boost_question_index >= 0);
alter table public.answers alter column score_awarded type numeric;
alter table public.teams alter column raw_score type numeric;
alter table public.answers add column if not exists base_score_awarded numeric not null default 0;
alter table public.answers add column if not exists power_bonus_awarded numeric not null default 0;

-- Both operations lock the same session row before checking state. A boost and
-- the first answer therefore have a single, authoritative order in PostgreSQL.
create or replace function public.activate_classroom_power(p_session_id uuid, p_student_code text, p_question_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.game_sessions%rowtype; p public.participants%rowtype; t public.teams%rowtype; captain uuid;
begin
  select * into s from public.game_sessions where id=p_session_id for update;
  if not found or s.rules_version<>2 or s.status<>'question_active' or s.current_question_ends_at is null or clock_timestamp()>s.current_question_ends_at then
    return jsonb_build_object('ok',false,'reason','ตอนนี้ใช้พลังไม่ได้');
  end if;
  if s.question_snapshot->s.current_question_index->>'id' is distinct from p_question_id::text then
    return jsonb_build_object('ok',false,'reason','คำถามเปลี่ยนแล้ว');
  end if;
  select * into p from public.participants where session_id=s.id and student_code=p_student_code;
  if not found or p.team_id is null or not p.is_score_eligible or p.connection_status='left' then
    return jsonb_build_object('ok',false,'reason','ไม่มีสิทธิ์ใช้พลังทีม');
  end if;
  select * into t from public.teams where id=p.team_id and session_id=s.id for update;
  select id into captain from public.participants where team_id=t.id and session_id=s.id and connection_status<>'left' order by joined_at,id limit 1;
  if captain is distinct from p.id or t.boost_question_index is not null or exists(select 1 from public.answers where session_id=s.id and team_id=t.id and question_index=s.current_question_index) then
    return jsonb_build_object('ok',false,'reason','ใช้พลังได้หนึ่งครั้ง โดยหัวหน้าทีม ก่อนคำตอบแรกของทีม');
  end if;
  update public.teams set boost_question_index=s.current_question_index where id=t.id;
  update public.game_sessions set updated_at=clock_timestamp() where id=s.id;
  return jsonb_build_object('ok',true);
end;
$$;

-- Correctness is evaluated against the frozen question by the trusted server.
-- The database chooses the multipliers and commits answer + scores together.
create or replace function public.submit_classroom_answer(p_session_id uuid, p_student_code text, p_question_id uuid, p_answer_text text, p_selected_option_id uuid, p_is_correct boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.game_sessions%rowtype; p public.participants%rowtype; t public.teams%rowtype;
  q jsonb; base_points numeric; awarded numeric; power_factor numeric; total_score numeric;
begin
  select * into s from public.game_sessions where id=p_session_id for update;
  if not found or s.rules_version<>2 or s.status<>'question_active' or s.current_question_ends_at is null or clock_timestamp()>s.current_question_ends_at then
    return jsonb_build_object('ok',false,'reason','ปิดรับคำตอบหรือหมดเวลาแล้ว');
  end if;
  q:=s.question_snapshot->s.current_question_index;
  if q->>'id' is distinct from p_question_id::text then return jsonb_build_object('ok',false,'reason','คำถามเปลี่ยนแล้ว'); end if;
  select * into p from public.participants where session_id=s.id and student_code=p_student_code;
  if not found or p.team_id is null or p.connection_status='left' then return jsonb_build_object('ok',false,'reason','กรุณาเข้าทีมก่อนตอบ'); end if;
  if exists(select 1 from public.answers where session_id=s.id and question_index=s.current_question_index and student_code=p_student_code) then return jsonb_build_object('ok',false,'reason','คุณตอบข้อนี้ไปแล้ว'); end if;
  if length(trim(p_answer_text))=0 or length(p_answer_text)>2000 then return jsonb_build_object('ok',false,'reason','คำตอบไม่ถูกต้อง'); end if;
  select * into t from public.teams where id=p.team_id and session_id=s.id for update;
  base_points:=case when p_is_correct and p.is_score_eligible then (q->>'points')::numeric else 0 end;
  if s.current_question_index=s.question_count-1 then base_points:=base_points*1.5; end if;
  power_factor:=case when t.boost_question_index=s.current_question_index then 1.5 else 1 end;
  awarded:=base_points*power_factor;
  insert into public.answers(session_id,question_id,question_index,team_id,participant_id,student_code,answer_text,selected_option_id,is_correct,score_awarded,base_score_awarded,power_bonus_awarded)
    values(s.id,(select id from public.questions where id=p_question_id),s.current_question_index,t.id,p.id,p_student_code,p_answer_text,(select id from public.question_options where id=p_selected_option_id),p_is_correct,awarded,base_points,awarded-base_points);
  select coalesce(sum(score_awarded),0) into total_score from public.answers where session_id=s.id and team_id=t.id;
  update public.teams set raw_score=total_score, average_score=case when locked_member_count>0 then round(total_score/locked_member_count,2) else 0 end,
    score=case when locked_member_count>0 then round(total_score/locked_member_count,2) else 0 end where id=t.id;
  update public.participants set connection_status='online',last_seen_at=clock_timestamp() where id=p.id;
  update public.game_sessions set updated_at=clock_timestamp() where id=s.id;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.activate_classroom_power(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.submit_classroom_answer(uuid,text,uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.activate_classroom_power(uuid,text,uuid) to service_role;
grant execute on function public.submit_classroom_answer(uuid,text,uuid,text,uuid,boolean) to service_role;
commit;
