import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

export const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  pupil: '10000000-0000-4000-8000-000000000002',
  other: '10000000-0000-4000-8000-000000000003',
  teacher: '10000000-0000-4000-8000-000000000004',
  third: '10000000-0000-4000-8000-000000000005',
  emailOnly: '10000000-0000-4000-8000-000000000006',
  set: '20000000-0000-4000-8000-000000000001',
  room: '20000000-0000-4000-8000-000000000002',
  team: '20000000-0000-4000-8000-000000000003',
  question: '20000000-0000-4000-8000-000000000004',
};
export const fixtureUsers = [
  [ids.admin, 'piyawatpiwsiri@gmail.com', 'google'],
  [ids.pupil, 'pupil@example.com', 'google'],
  [ids.other, 'other@example.com', 'google'],
  [ids.teacher, 'teacher@example.com', 'google'],
  [ids.third, 'third@example.com', 'google'],
  [ids.emailOnly, 'email@example.com', 'email'],
];
export async function createGoogleDatabase({ applyAuthMigration = true, applyRaidMigration = false } = {}) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create publication supabase_realtime;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,identity_data jsonb);`);
  for (const file of (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    if (file.startsWith('008') || file.startsWith('009') || file.startsWith('010') || file.startsWith('011') || file.startsWith('012')) continue;
    let sql = await readFile(`supabase/migrations/${file}`, 'utf8');
    sql = sql.replace('create extension if not exists pgcrypto;', '');
    if (file.startsWith('005')) sql = sql.split('insert into storage.buckets')[0];
    await db.exec(sql);
  }
  for (const [id, email, provider] of fixtureUsers) {
    await db.query('insert into auth.users values($1,$2,now(),$3,$4)', [id, email, { provider, providers: [provider] }, {}]);
    await db.query('insert into auth.identities(user_id,provider,identity_data) values($1,$2,$3)', [id, provider, { email, email_verified: true }]);
  }
  await db.exec(`insert into accounts(user_code,display_name,password,role,grade) values
    ('ADMIN','ครูหลัก','fixture-only','teacher','ครู'),('T002','ครูเดิม','fixture-only','teacher','ครู'),
    ('01234','นักเรียน หนึ่ง','fixture-only','student','ม.6'),('01235','นักเรียน สอง','fixture-only','student','ม.6'),
    ('01236','นักเรียน สาม','fixture-only','student','ม.6'),('01237','นักเรียน สี่','fixture-only','student','ม.6');
    insert into question_sets(id,teacher_code,title) values('${ids.set}','ADMIN','ชุดคำถามเดิม');
    insert into questions(id,question_set_id,question_text,correct_answer,points) values('${ids.question}','${ids.set}','2+3','5',10);`);
  // Apply the auth migration to existing classroom records, as on an upgrade.
  if (applyAuthMigration) await db.exec(await readFile('supabase/migrations/008_google_auth_identity_and_teacher_access.sql', 'utf8'));
  if (applyRaidMigration) {
    await db.exec(await readFile('supabase/migrations/009_boss_raid_time_attack.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/010_raid_pacing_and_duplicate_heroes.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/011_raid_combat_feedback.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/012_raid_lobby_and_choice_order.sql', 'utf8'));
  }
  return db;
}
export async function rpc(db, name, args) {
  const names = {
    resolve_google_account: ['p_auth_user_id', 'p_bootstrap_email', 'p_touch'],
    student_account_operation: ['p_auth_user_id', 'p_action', 'p_student_code', 'p_client_key'],
    manage_teacher_access: ['p_actor', 'p_action', 'p_target_code', 'p_email', 'p_display_name', 'p_status', 'p_search', 'p_page'],
    join_google_classroom: ['p_actor', 'p_student_code', 'p_room_code', 'p_team_id'],
  };
  const keys = names[name];
  if (!keys) throw new Error('Unsupported fixture RPC');
  return (await db.query(`select public.${name}(${keys.map((_, i) => '$' + (i + 1)).join(',')}) result`, keys.map(key => args[key] ?? null))).rows[0].result;
}
export const resolveAccount = (db, id, touch = false) => rpc(db, 'resolve_google_account', { p_auth_user_id: id, p_bootstrap_email: 'piyawatpiwsiri@gmail.com', p_touch: touch });
export const studentOperation = (db, id, action, code) => rpc(db, 'student_account_operation', { p_auth_user_id: id, p_action: action, p_student_code: code });
export const teacherOperation = (db, id, action, input = {}) => rpc(db, 'manage_teacher_access', { p_actor: id, p_action: action, p_status: 'active', p_search: '', p_page: 1, ...input });
