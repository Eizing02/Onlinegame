create or replace function public.close_game_session(
  p_room_code text,
  p_teacher_code text
)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  delete from public.game_sessions
  where room_code = p_room_code
    and teacher_code = p_teacher_code;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    return query select false, 'not_found'::text;
    return;
  end if;

  return query select true, null::text;
end;
$$;

revoke all on function public.close_game_session(text, text) from public, anon, authenticated;
grant execute on function public.close_game_session(text, text) to service_role;

create or replace function public.delete_question_set_safely(
  p_question_set_id uuid,
  p_teacher_code text
)
returns table(ok boolean, reason text, active_room_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_room_code text;
  v_deleted_count integer;
begin
  select room_code
  into v_active_room_code
  from public.game_sessions
  where question_set_id = p_question_set_id
    and teacher_code = p_teacher_code
    and status <> 'ended'
  order by created_at desc
  limit 1;

  if v_active_room_code is not null then
    return query select false, 'active_room'::text, v_active_room_code;
    return;
  end if;

  delete from public.game_sessions
  where question_set_id = p_question_set_id
    and teacher_code = p_teacher_code
    and status = 'ended';

  delete from public.question_sets
  where id = p_question_set_id
    and teacher_code = p_teacher_code;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    return query select false, 'not_found'::text, null::text;
    return;
  end if;

  return query select true, null::text, null::text;
end;
$$;

revoke all on function public.delete_question_set_safely(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_question_set_safely(uuid, text) to service_role;
