import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGoogleDatabase } from './helpers/google-database.mjs';

const precheck = await readFile('supabase/checks/008_google_auth_precheck.sql','utf8');
const migration = await readFile('supabase/migrations/008_google_auth_identity_and_teacher_access.sql','utf8');
const postcheck = await readFile('supabase/checks/008_google_auth_postcheck.sql','utf8');
const db = await createGoogleDatabase({ applyAuthMigration: false });
let assertions = 0;
const equal = (actual,expected) => { assert.deepEqual(actual,expected); assertions++; };
const run = async sql => (await db.exec(sql)).flatMap(result=>result.rows).find(row=>row.status==='PASS');
const denied = async (sql,reason) => {
  try { await assert.rejects(db.exec(sql),reason); assertions++; }
  finally { await db.exec('rollback;'); }
};
try {
  const before = await run(precheck);
  equal(before.status,'PASS'); equal(before.auth_schema_state,'NOT_INSTALLED');
  await denied(postcheck,/GOOGLE_AUTH_POSTCHECK_MISSING_TABLES/);
  await db.exec('alter table public.game_sessions rename column rules_version to fixture_rules_version;');
  await denied(precheck,/GOOGLE_AUTH_PRECHECK_MISSING_COLUMNS/);
  await db.exec('alter table public.game_sessions rename column fixture_rules_version to rules_version;');
  await db.exec('grant select on public.accounts to anon;');
  await denied(precheck,/GOOGLE_AUTH_PRECHECK_PRIVATE_GRANTS/);
  await db.exec('revoke select on public.accounts from anon;');
  await db.exec('grant execute on function public.close_game_session(text,text) to authenticated;');
  await denied(precheck,/GOOGLE_AUTH_PRECHECK_PRIVATE_RPC/);
  await db.exec('revoke execute on function public.close_game_session(text,text) from authenticated;');
  await db.exec(migration);
  const after = await run(postcheck);
  equal(after.status,'PASS'); equal(after.bootstrap_state,'FIRST_GOOGLE_LOGIN_OR_ADMIN_REVIEW_NEEDED');
  equal(after.data_counts,before.data_counts);
  equal((await db.query('select count(*)::int n from public.account_identities')).rows[0].n,0);
  await db.exec('grant select on public.teacher_access to anon;');
  await denied(postcheck,/GOOGLE_AUTH_POSTCHECK_PRIVATE_GRANTS/);
  await db.exec('revoke select on public.teacher_access from anon;');
  await db.exec('alter table public.account_identities disable row level security;');
  await denied(postcheck,/GOOGLE_AUTH_POSTCHECK_RLS/);
  await db.exec('alter table public.account_identities enable row level security;');
  await db.exec('grant execute on function public.student_account_operation(uuid,text,text,text) to authenticated;');
  await denied(postcheck,/GOOGLE_AUTH_POSTCHECK_PRIVATE_RPC/);
  await db.exec('revoke execute on function public.student_account_operation(uuid,text,text,text) from authenticated;');
  equal((await run(postcheck)).data_counts,before.data_counts);
  console.log(`Google deployment SQL: ${assertions} assertions PASS (read-only checks, unchanged data, missing prerequisites, unsafe grants/RLS/RPC detected; real Supabase NOT_RUN)`);
} finally { await db.close(); }
