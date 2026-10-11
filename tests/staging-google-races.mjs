// Opt-in only: two real PostgREST requests use separate PostgreSQL transactions.
// Supply an isolated Supabase staging project and four real Google auth users.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const names = ['STAGING_SUPABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY','STAGING_ADMIN_AUTH_USER_ID','STAGING_PUPIL_A_AUTH_USER_ID','STAGING_PUPIL_B_AUTH_USER_ID','STAGING_PUPIL_C_AUTH_USER_ID','STAGING_PROJECT_REF'];
if (process.env.STAGING_TEST_ACK !== 'isolated-test-project' || names.some(name=>!process.env[name])) {
  console.log('NOT_RUN: staging credentials, four verified Google users and STAGING_TEST_ACK=isolated-test-project are required.');
  process.exit(0);
}
const url = new URL(process.env.STAGING_SUPABASE_URL);
assert.equal(url.protocol,'https:'); assert.equal(url.hostname,`${process.env.STAGING_PROJECT_REF}.supabase.co`);
const client = createClient(url.toString(),process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const admin = process.env.STAGING_ADMIN_AUTH_USER_ID, pupilA = process.env.STAGING_PUPIL_A_AUTH_USER_ID, pupilB = process.env.STAGING_PUPIL_B_AUTH_USER_ID, pupilC = process.env.STAGING_PUPIL_C_AUTH_USER_ID;
assert.equal(new Set([admin,pupilA,pupilB,pupilC]).size,4);
const codes = ['98001','98002','98003','98004'], setId=randomUUID(), roomId=randomUUID(), teamId=randomUUID();
let teacherCode, seeded = false;
const check = result => { if (result.error) throw new Error(`Staging database error ${result.error.code || 'unknown'}`); return result.data; };
const call = async (name,args) => check(await client.rpc(name,args));
const resolve = id => call('resolve_google_account',{p_auth_user_id:id,p_bootstrap_email:'piyawatpiwsiri@gmail.com',p_touch:false});
const claim = (id,code,action='claim') => call('student_account_operation',{p_auth_user_id:id,p_action:action,p_student_code:code,p_client_key:null});
const add = email => call('manage_teacher_access',{p_actor:admin,p_action:'add',p_email:email,p_display_name:'Staging race fixture',p_status:'active'});
try {
  assert.equal((await resolve(admin)).accessLevel,'super_admin');
  assert.equal((await resolve(pupilA)).state,'unlinked'); assert.equal((await resolve(pupilB)).state,'unlinked');
  assert.equal((await resolve(pupilC)).state,'unlinked');
  assert.equal(check(await client.from('accounts').select('user_code').in('user_code',codes)).length,0,'Reserved fixture codes must not exist');
  const email=`race-${randomUUID()}@example.com`;
  const additions = await Promise.all([add(email),add(email.toUpperCase())]);
  assert.equal(additions.filter(r=>r.ok).length,1); assert.equal(additions.find(r=>!r.ok).code,'TEACHER_EMAIL_EXISTS');
  teacherCode=additions.find(r=>r.ok).userCode;
  check(await client.from('accounts').insert(codes.map(code=>({user_code:code,display_name:'Staging fixture '+code,password:null,role:'student',grade:'TEST'})))); seeded=true;
  const competitors=Array.from({length:10},(_,i)=>i%2?pupilB:pupilA);
  const claims=await Promise.all(competitors.map(id=>claim(id,codes[0])));
  assert.equal(claims.filter(r=>r.ok).length,1);
  assert.ok(claims.filter(r=>!r.ok).every(r=>['LINK_STATE_CHANGED','STUDENT_ALREADY_LINKED','RATE_LIMITED'].includes(r.code)));
  assert.equal(check(await client.from('account_identities').select('auth_user_id').eq('user_code',codes[0])).length,1);
  const winner=competitors[claims.findIndex(r=>r.ok)];
  const twoCodes=await Promise.all([claim(pupilC,codes[2]),claim(pupilC,codes[3])]);
  assert.equal(twoCodes.filter(r=>r.ok).length,1); assert.equal(twoCodes.find(r=>!r.ok).code,'LINK_STATE_CHANGED');
  const singleUserMappings=check(await client.from('account_identities').select('user_code').eq('auth_user_id',pupilC));
  assert.equal(singleUserMappings.length,1); assert.equal(singleUserMappings[0].user_code,twoCodes[0].ok?codes[2]:codes[3]);
  check(await client.from('question_sets').insert({id:setId,teacher_code:teacherCode,title:'Staging race fixture'}));
  let roomCode;
  for (let attempt=0;attempt<20;attempt++) {
    const candidate=String(Math.floor(Math.random()*9000)+1000);
    if (!check(await client.from('game_sessions').select('id').eq('room_code',candidate)).length) {roomCode=candidate;break;}
  }
  assert.ok(roomCode,'No free test room code');
  check(await client.from('game_sessions').insert({id:roomId,room_code:roomCode,teacher_code:teacherCode,question_set_id:setId,question_set_title:'Staging race fixture',question_count:1,team_count:1,max_members_per_team:4}));
  check(await client.from('teams').insert({id:teamId,session_id:roomId,team_number:1,team_name:'Fixture'}));
  const [joined,changed] = await Promise.all([
    call('join_google_classroom',{p_actor:winner,p_student_code:codes[0],p_room_code:roomCode,p_team_id:teamId}),
    claim(winner,codes[1],'switch'),
  ]);
  assert.ok((joined.ok && !changed.ok && changed.code==='ACTIVE_GAME') || (changed.ok && !joined.ok && joined.code==='ACCOUNT_CHANGED'));
  const mapping=check(await client.from('account_identities').select('user_code').eq('auth_user_id',winner))[0];
  assert.equal(mapping.user_code,joined.ok?codes[0]:codes[1]);
  const participants=check(await client.from('participants').select('student_code').eq('session_id',roomId));
  assert.equal(participants.length,joined.ok?1:0);
  console.log('PASS: real concurrent teacher add, 10 competing pupil claims, one-user/two-code claim and join-versus-code-switch; private PostgreSQL RPC transactions.');
} finally {
  // Delete only fixtures whose keys were generated/verified absent by this run.
  // Audit/rate rows remain as a record of the staging test; never reset a table.
  if (teacherCode) {
    check(await client.from('game_sessions').delete().eq('id',roomId).eq('teacher_code',teacherCode));
    check(await client.from('question_sets').delete().eq('id',setId).eq('teacher_code',teacherCode));
  }
  if (seeded) {
    check(await client.from('account_identities').delete().in('auth_user_id',[pupilA,pupilB,pupilC]).in('user_code',codes));
    check(await client.from('accounts').delete().in('user_code',codes));
  }
  if (teacherCode) {
    check(await client.from('teacher_access').delete().eq('user_code',teacherCode));
    check(await client.from('accounts').delete().eq('user_code',teacherCode));
  }
}
