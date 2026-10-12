// Explicitly opt-in. Creates and cleans only this run's disposable STAGING records.
import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const url = process.env.RAID_STAGING_URL, key = process.env.RAID_STAGING_SERVICE_KEY;
const count = Number(process.env.RAID_LOAD_CLIENTS ?? 100);
if (process.env.RAID_STAGING_APPROVED !== 'true' || !url || !key || url.includes('iyytljowajsavrtlnwyj') || new URL(url).protocol !== 'https:' || !new URL(url).hostname.endsWith('.supabase.co') || ![1,5,20,100,250,500].includes(count)) {
  throw new Error('Use an explicitly approved separate Supabase staging project. Production is prohibited. Set RAID_STAGING_APPROVED=true and RAID_LOAD_CLIENTS=1|5|20|100|250|500.');
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = randomUUID(), teachers = [], users = [], sets = [], timings = {};
let responseBytes = 0, rpcErrors = 0, failure, burstDurationMs = null;
async function rpc(name, args) {
  const start = performance.now();
  const {data, error} = await db.rpc(name, args);
  (timings[name] ??= []).push(performance.now() - start);
  if (error || data?.ok === false) { rpcErrors++; throw new Error(error?.message ?? data.code); }
  responseBytes += Buffer.byteLength(JSON.stringify(data));
  return data;
}
// Drain all in-flight work before cleanup, including failures.
async function drain(tasks) {
  const results = await Promise.allSettled(tasks);
  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
  if (errors.length) throw new AggregateError(errors, `${errors.length} staging operations failed`);
  return results.map(r => r.value);
}
try {
  // 12 teams x 5 per room: 500 players need nine rooms.
  for (let offset = 0; offset < count; offset += 60) {
    const n = Math.min(60, count - offset), teacher = `LOAD_${runId}_T${offset}`, setId = randomUUID();
    const account = await db.from('accounts').insert({user_code:teacher,display_name:'Staging load teacher',password:'not-a-login',role:'teacher',grade:'ครู'});
    if (account.error) throw account.error;
    teachers.push(teacher);
    const bankSet = await db.from('question_sets').insert({id:setId,teacher_code:teacher,title:`Disposable Raid load ${runId}`});
    if (bankSet.error) throw bankSet.error;
    sets.push(setId);
    const bank = await db.from('questions').insert(Array.from({length:10},(_,i)=>({question_set_id:setId,question_text:`Load ${i}`,correct_answer:'5',points:10,order_index:i})));
    if (bank.error) throw bank.error;
    const room = await rpc('create_boss_raid_room',{p_teacher:teacher,p_set:setId,p_activity:`Load ${runId}`,p_teams:Math.ceil(n/5),p_members:5,p_duration:180,p_visibility:true});
    const roomUsers = Array.from({length:n},(_,i)=>({user_code:`LOAD_${runId}_P${offset+i}`,display_name:`Load pupil ${offset+i}`,password:'not-a-login',role:'student',grade:'staging'}));
    const accounts = await db.from('accounts').insert(roomUsers);
    if (accounts.error) throw accounts.error;
    const tracked = roomUsers.map(u=>({code:u.user_code,room:room.roomCode})); users.push(...tracked);
    await drain(tracked.map(user=>rpc('join_boss_raid',{p_room:user.room,p_student:user.code})));
    await rpc('start_boss_raid',{p_room:room.roomCode,p_teacher:teacher});
  }
  const start = performance.now();
  await drain(users.map(async user=>{
    const s = await rpc('get_private_raid_snapshot',{p_room:user.room,p_user:user.code,p_teacher:false});
    const answer = {p_room:user.room,p_student:user.code,p_question:s.question.id,p_index:0,p_key:randomUUID(),p_answer:'5'};
    const replies = await drain([rpc('submit_boss_raid_answer',answer),rpc('submit_boss_raid_answer',answer)]);
    if (JSON.stringify(replies[0]) !== JSON.stringify(replies[1])) throw new Error('Same-key result was not stable');
    const next = await rpc('get_private_raid_snapshot',{p_room:user.room,p_user:user.code,p_teacher:false,p_after:s.team.eventSeq});
    if (next.own.cursor !== 1 || next.own.score !== 10) throw new Error('Duplicate/terminal invariant failed');
  }));
  burstDurationMs = performance.now() - start;
} catch (error) { failure = String(error); process.exitCode = 1; }
// Exact teacher keys recover even a room whose RPC response was lost.
const cleanupErrors = [];
async function clean(label, query) {
  try { const {error} = await query; if (error) cleanupErrors.push(`${label}: ${error.message}`); }
  catch (e) { cleanupErrors.push(`${label}: ${String(e)}`); }
}
for (const teacher of teachers) await clean(`rooms of ${teacher}`, db.from('game_sessions').delete().eq('teacher_code',teacher));
for (const set of sets) await clean(`question set ${set}`, db.from('question_sets').delete().eq('id',set));
for (const user of users) await clean(`student ${user.code}`, db.from('accounts').delete().eq('user_code',user.code));
for (const teacher of teachers) await clean(`teacher ${teacher}`, db.from('accounts').delete().eq('user_code',teacher));
const stats = Object.fromEntries(Object.entries(timings).map(([operation,values])=>{
  values.sort((a,b)=>a-b); const percentile=p=>values[Math.min(values.length-1,Math.floor(values.length*p))];
  return [operation,{calls:values.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99)}];
}));
const report = {runId,project:new URL(url).hostname,clients:count,operations:stats,rpcErrors,failure:failure??null,burstDurationMs,responseBytes,cleanupErrors,
  scope:'Direct privileged RPC with synthetic actors. OAuth/API authorization, browser FPS, DB lock-wait telemetry and actual billing require separate staging measurements.'};
await mkdir('tmp/raid-load',{recursive:true});
await writeFile(`tmp/raid-load/${runId}.json`,JSON.stringify(report,null,2));
console.log(report);
if (cleanupErrors.length) process.exitCode = 1;
