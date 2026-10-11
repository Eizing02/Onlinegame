import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGoogleDatabase, ids, rpc, resolveAccount, studentOperation, teacherOperation } from './helpers/google-database.mjs';

const db = await createGoogleDatabase();
let assertions = 0;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); assertions++; };
try {
  equal((await resolveAccount(db, ids.admin, true)).userCode, 'ADMIN');
  equal((await resolveAccount(db, ids.admin)).accessLevel, 'super_admin');
  equal((await db.query("select count(*)::int n from account_link_audit where action='bootstrap'")).rows[0].n, 1);
  equal((await db.query('select password from accounts where user_code=$1', ['ADMIN'])).rows[0].password, 'fixture-only');
  equal((await resolveAccount(db, ids.emailOnly)).code, 'GOOGLE_IDENTITY_REQUIRED');
  equal((await resolveAccount(db, ids.pupil)).state, 'unlinked');
  equal((await studentOperation(db, ids.admin, 'claim', '01234')).code, 'STUDENT_ONLY');
  equal((await studentOperation(db, ids.pupil, 'lookup', '1234')).code, 'INVALID_STUDENT_CODE');
  equal((await studentOperation(db, ids.pupil, 'lookup', 'ADMIN')).code, 'INVALID_STUDENT_CODE');
  equal((await studentOperation(db, ids.pupil, 'lookup', '99999')).code, 'STUDENT_NOT_FOUND');
  equal((await studentOperation(db, ids.pupil, 'lookup', '01234')).student.userCode, '01234');
  equal((await db.query('select count(*)::int n from account_identities')).rows[0].n, 1);
  equal((await studentOperation(db, ids.pupil, 'claim', '01234')).ok, true);
  equal((await studentOperation(db, ids.other, 'claim', '01234')).code, 'STUDENT_ALREADY_LINKED');
  equal((await studentOperation(db, ids.pupil, 'claim', '01235')).code, 'LINK_STATE_CHANGED');
  equal((await resolveAccount(db, ids.pupil)).userCode, '01234');
  const join = () => rpc(db, 'join_google_classroom', { p_actor: ids.pupil, p_student_code: '01234', p_room_code: '1234', p_team_id: ids.team });
  await db.exec(`insert into game_sessions(id,room_code,teacher_code,question_set_id,question_set_title,question_count,team_count,max_members_per_team) values('${ids.room}','1234','ADMIN','${ids.set}','Test',1,1,4);
    insert into teams(id,session_id,team_number,team_name) values('${ids.team}','${ids.room}',1,'Team');`);
  equal((await join()).ok, true);
  equal((await studentOperation(db, ids.pupil, 'switch', '01235')).code, 'ACTIVE_GAME');
  equal((await studentOperation(db, ids.third, 'claim', '01234')).code, 'STUDENT_ALREADY_LINKED');
  // Both old and target codes are checked, including left participants.
  await db.exec(`update participants set connection_status='left'; update game_sessions set status='ended';
    insert into answers(session_id,question_id,question_index,team_id,student_code,answer_text,is_correct,score_awarded) values('${ids.room}','${ids.question}',0,'${ids.team}','01234','5',true,10);`);
  equal((await studentOperation(db, ids.pupil, 'switch', '01235')).ok, true);
  equal((await db.query('select student_code from participants')).rows[0].student_code, '01234');
  equal((await db.query('select student_code from answers')).rows[0].student_code, '01234');
  equal((await resolveAccount(db, ids.pupil)).userCode, '01235');
  equal((await studentOperation(db, ids.pupil, 'switch', '01236')).code, 'RATE_LIMITED');
  equal((await join()).code, 'ACCOUNT_CHANGED');
  // A new code with an existing active membership cannot be claimed.
  await db.exec(`update game_sessions set status='lobby';`);
  equal((await studentOperation(db, ids.third, 'claim', '01234')).code, 'ACTIVE_GAME');
  await db.exec(`update game_sessions set status='ended';`);
  // Failed lookups consume the same durable limit as successful lookups.
  for (let i = 0; i < 10; i++) await studentOperation(db, ids.third, 'lookup', '99999');
  equal((await studentOperation(db, ids.third, 'lookup', '01236')).code, 'RATE_LIMITED');
  equal((await db.query("select attempts from auth_rate_limits where rate_key=$1", [`user:${ids.third}:lookup`])).rows[0].attempts, 11);
  equal((await teacherOperation(db, ids.pupil, 'add', { p_email: 'teacher@example.com', p_display_name: 'Teacher' })).code, 'ADMIN_REQUIRED');
  await db.exec("insert into accounts(user_code,display_name,password,role) values('t000001','ครูเก่าตัวพิมพ์เล็ก','fixture-only','teacher')");
  const added = await teacherOperation(db, ids.admin, 'add', { p_email: ' Teacher@Example.com ', p_display_name: 'ครูที่เพิ่ม' });
  equal(added.userCode, 'T000002');
  equal((await db.query("select display_name from accounts where user_code='t000001'")).rows[0].display_name, 'ครูเก่าตัวพิมพ์เล็ก');
  equal((await db.query('select password from accounts where user_code=$1', [added.userCode])).rows[0].password, null);
  equal((await teacherOperation(db, ids.admin, 'add', { p_email: 'TEACHER@example.com', p_display_name: 'duplicate' })).code, 'TEACHER_EMAIL_EXISTS');
  equal((await resolveAccount(db, ids.teacher, true)).userCode, added.userCode);
  equal((await studentOperation(db, ids.teacher, 'claim', '01236')).code, 'STUDENT_ONLY');
  equal((await teacherOperation(db, ids.admin, 'update', { p_target_code: added.userCode, p_display_name: 'ครูระงับ', p_status: 'suspended' })).ok, true);
  equal((await resolveAccount(db, ids.teacher)).code, 'TEACHER_SUSPENDED');
  equal((await teacherOperation(db, ids.admin, 'update', { p_target_code: added.userCode, p_display_name: 'ครูเปิดอีกครั้ง', p_status: 'active' })).ok, true);
  equal((await resolveAccount(db, ids.teacher)).state, 'linked');
  equal((await teacherOperation(db, ids.admin, 'update', { p_target_code: 'ADMIN', p_display_name: 'Admin', p_status: 'suspended' })).code, 'LAST_ADMIN');
  equal((await teacherOperation(db, ids.admin, 'list', { p_search: 'example.com' })).total, 1);
  // Force a failure after the account insert: the statement must roll back both rows.
  const countBefore = (await db.query('select count(*)::int n from accounts')).rows[0].n;
  await db.exec(`create function public.fail_fixture_teacher() returns trigger language plpgsql as $$ begin
    if new.google_email='fail@example.com' then raise exception 'FIXTURE_INSERT_FAILURE'; end if; return new; end $$;
    create trigger fail_fixture_teacher before insert on teacher_access for each row execute function public.fail_fixture_teacher();`);
  await assert.rejects(teacherOperation(db, ids.admin, 'add', { p_email: 'fail@example.com', p_display_name: 'No half account' }), /FIXTURE_INSERT_FAILURE/); assertions++;
  equal((await db.query('select count(*)::int n from accounts')).rows[0].n, countBefore);
  await db.exec('drop trigger fail_fixture_teacher on teacher_access; drop function public.fail_fixture_teacher();');
  equal((await teacherOperation(db, ids.admin, 'add', { p_email: 'pupil@example.com', p_display_name: 'Conflict' })).code, 'IDENTITY_CONFLICT');
  const pending = await teacherOperation(db, ids.admin, 'add', { p_email: 'other@example.com', p_display_name: 'Pending', p_status: 'pending' });
  equal(pending.ok, true);
  equal((await resolveAccount(db, ids.other)).code, 'TEACHER_PENDING');
  equal((await studentOperation(db, ids.other, 'claim', '01236')).code, 'STUDENT_ONLY');
  await db.query('update auth.users set email_confirmed_at=null where id=$1', [ids.third]);
  equal((await resolveAccount(db, ids.third)).code, 'GOOGLE_IDENTITY_REQUIRED');
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [ids.third]);
  await db.query('update auth.identities set identity_data=$2 where user_id=$1', [ids.third, { email: 'forged@example.com', email_verified: true }]);
  equal((await studentOperation(db, ids.third, 'claim', '01236')).code, 'GOOGLE_IDENTITY_REQUIRED');
  await db.query('update auth.identities set identity_data=$2 where user_id=$1', [ids.third, { email: 'third@example.com', email_verified: true }]);
  // Constraint rejects a second binding even if application prechecks are bypassed.
  await assert.rejects(db.query('insert into account_identities(auth_user_id,user_code) values($1,$2)', [ids.third, '01235']), /unique/); assertions++;
  await assert.rejects(db.exec("update accounts set role='student' where user_code='ADMIN'"), /LINKED_ACCOUNT_ROLE_IMMUTABLE/); assertions++;
  await assert.rejects(db.exec("insert into teacher_access(user_code,google_email,access_level) values('01236','forged@example.com','teacher')"), /TEACHER_ROLE_REQUIRED/); assertions++;
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['accounts', 'account_identities', 'teacher_access', 'auth_rate_limits', 'account_link_audit', 'answers']) {
      equal((await db.query('select has_table_privilege($1,$2,$3) ok', [role, 'public.' + table, 'SELECT'])).rows[0].ok, false);
    }
    equal((await db.query("select has_function_privilege($1,'student_account_operation(uuid,text,text,text)','EXECUTE') ok", [role])).rows[0].ok, false);
  }
  equal((await db.query("select has_function_privilege('service_role','student_account_operation(uuid,text,text,text)','EXECUTE') ok")).rows[0].ok, true);
  // Reapplying 008 is idempotent and does not reset accounts or history.
  await db.exec(await readFile('supabase/migrations/008_google_auth_identity_and_teacher_access.sql', 'utf8'));
  equal((await db.query('select student_code,score_awarded from answers')).rows[0], { student_code: '01234', score_awarded: '10' });
  console.log(`Google Auth SQL: ${assertions} assertions PASS (PGlite single connection; real multi-connection races require staging)`);
} finally { await db.close(); }
