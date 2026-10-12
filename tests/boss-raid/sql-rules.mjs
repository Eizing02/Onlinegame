import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createGoogleDatabase, ids } from '../helpers/google-database.mjs';
const db = await createGoogleDatabase({ applyRaidMigration: true });
let checks = 0;
const eq = (a,b) => { assert.deepEqual(a,b); checks++; };
const call = async (name,args) => (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as r`,args)).rows[0].r;
let active;
const students=['01234','01235','01236','01237','01238'];
async function room(n=1,count=10,visibility=true) {
 if(active) await call('finish_boss_raid',[active.sessionId,'ADMIN']);
 await db.query('delete from questions where question_set_id=$1',[ids.set]);
 for(let i=0;i<count;i++) await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index) values($1,$2,$3,10,$4)',[ids.set,`ข้อ ${i}`,`answer-${i}`,i]);
 active=await call('create_boss_raid_room',['ADMIN',ids.set,'ทดสอบ',1,5,180,visibility]);eq(active.ok,true);
 await db.query('update boss_raid_sessions set rules_version=1 where session_id=$1',[active.sessionId]); // Existing-v1 regression after migration 010.
 for(let i=0;i<n;i++) eq((await call('join_boss_raid',[active.roomCode,students[i],null,null])).ok,true);
 return active;
}
const snap = code => call('get_private_raid_snapshot',[active.roomCode,code,false,null,0]);
async function answer(code,correct=true,key=randomUUID(),question=null) {
 const s=await snap(code); const q=question??s.question;
 const frozen=(await db.query('select correct_answer from boss_raid_questions where session_id=$1 and question_id=$2',[active.sessionId,q.id])).rows[0];
 return call('submit_boss_raid_answer',[active.roomCode,code,q.id,q.displayIndex,key,correct?frozen.correct_answer:'wrong',null]);
}
try {
 await db.exec("insert into accounts(user_code,display_name,password,role,grade) values('01238','นักเรียน ห้า','fixture','student','ม.6')");
 // Upgrade and privacy. No public table, function or publication grants.
 const tables=(await db.query("select relname,relrowsecurity from pg_class where relname like 'boss_raid_%' and relkind='r'")).rows;
 eq(tables.length,8);for(const t of tables) {eq(t.relrowsecurity,true);eq((await db.query('select has_table_privilege($1,$2,$3) as allowed',['anon',`public.${t.relname}`,'SELECT'])).rows[0].allowed,false);}
 eq((await db.query("select has_function_privilege('authenticated','public.get_private_raid_snapshot(text,text,boolean,uuid,bigint)','EXECUTE') as allowed")).rows[0].allowed,false);
 eq((await db.query("select count(*)::int as n from pg_publication_tables where tablename like 'boss_raid_%'")).rows[0].n,0);
 await room(3);eq((await call('reserve_raid_hero',[active.roomCode,'01234','fairy'])).ok,true);eq((await call('reserve_raid_hero',[active.roomCode,'01235','fairy'])).code,'HERO_TAKEN');
 eq((await call('start_boss_raid',[active.roomCode,'T002'])).code,'ACCESS_DENIED');
 eq((await call('start_boss_raid',[active.roomCode,'ADMIN'])).ok,true);eq((await call('start_boss_raid',[active.roomCode,'ADMIN'])).ok,true);
 const s=await snap('01234');eq(s.team.bossMaxHp,2250);eq(s.team.memberCount,3);eq(new Set(s.team.heroes.map(h=>h.heroType)).size,3);eq(s.own.heroType,'fairy');
 eq((await call('get_private_raid_snapshot',[active.roomCode,'T002',true,null,0])).code,'ACCESS_DENIED');
 eq((await call('get_private_raid_snapshot',[active.roomCode,'01237',false,null,0])).code,'ACCESS_DENIED');
 for(const forbidden of ['correct_answer','isCorrect','question_order','correctAnswer','password']) eq(JSON.stringify(s).includes(forbidden),false);
 eq((await db.query('select count(*)::int n from boss_raid_question_order where session_id=$1',[active.sessionId])).rows[0].n,30);
 // Snapshot frozen; old bank modifications do not change grading.
 await db.query("update questions set correct_answer='changed',points=99 where question_set_id=$1",[ids.set]);
 const key=randomUUID(),q=s.question;const first=await answer('01234',true,key,q);eq(first.awardedPoints,10);eq(first.damage,100);
 eq(await answer('01234',true,key,q),first);eq((await answer('01234',true,randomUUID(),q)).code,'CONFLICT_REFRESH');
 eq((await db.query('select count(*)::int n from boss_raid_answers where session_id=$1',[active.sessionId])).rows[0].n,1);
 // Team denominator persists through disconnect; late join is spectator only.
 await db.query("update participants set connection_status='offline' where student_code='01235' and session_id=$1",[active.sessionId]);eq((await snap('01234')).team.memberCount,3);
 eq((await call('join_boss_raid',[active.roomCode,'01237',null,null])).ok,true);const late=await snap('01237');eq(late.own.eligible,false);eq(late.question,null);eq(late.team.heroes.length,3);
 eq((await answer('01237',true,randomUUID(),q)).code,'SPECTATOR_ONLY');
 // Visibility exact threshold, dedup, third skip, stale race and next-question reset.
 const visibilityQ=(await snap('01235')).question;
 const visibility=(duration,event=randomUUID(),cur=visibilityQ)=>call('report_raid_visibility',[active.roomCode,'01235',cur.id,cur.displayIndex,event,duration]);
 eq((await visibility(2999)).status,'ignored');eq((await visibility(3000)).status,'ignored');
 const event=randomUUID();eq((await visibility(3001,event)).warnings,1);eq((await visibility(5000,event)).warnings,1);eq((await visibility(5000)).warnings,2);
 const skip=await visibility(5000);eq(skip.status,'skipped');eq(skip.awardedPoints,0);eq(skip.damage,0);eq(skip.heroHp,100);eq(skip.cursor,1);
 eq((await answer('01235',true,randomUUID(),visibilityQ)).code,'CONFLICT_REFRESH');eq((await visibility(5000)).code,'CONFLICT_REFRESH');
 const next=(await snap('01235')).question;eq((await snap('01235')).warnings,0);eq((await visibility(5000,randomUUID(),next)).warnings,1);
 const answered=await answer('01235');eq(answered.ok,true);eq((await visibility(5000,randomUUID(),next)).code,'CONFLICT_REFRESH');
 // Wrong damage, zero-HP support, capped healing, no target and solo self-revive.
 await room(3,10);await call('start_boss_raid',[active.roomCode,'ADMIN']);eq((await answer('01234',false)).heroHp,85);
 const combatSnapshot=await snap('01234');const team=combatSnapshot.team;const actor=combatSnapshot.own;
 await db.query('update boss_raid_participants set hp=0 where participant_id=$1',[actor.id]);
 const others=team.heroes.filter(h=>h.id!==actor.id);await db.query('update boss_raid_participants set hp=95 where participant_id=$1',[others[0].id]);
 const healed=await answer('01234');eq(healed.awardedPoints,0);eq(healed.damage,0);eq(healed.healAmount,5);eq(healed.heroHp,0);
 eq((await snap('01234')).own.correctCount,1);eq((await snap('01234')).own.academicPoints,10);
 const noTarget=await answer('01234');eq(noTarget.noHealTarget,true);eq(noTarget.heroHp,0);
 await db.query('update boss_raid_participants set hp=0 where team_id=$1',[team.id]);eq((await answer('01234')).healAmount,10);eq((await snap('01234')).own.hp,0);
 await room(1,10);await call('start_boss_raid',[active.roomCode,'ADMIN']);const solo=(await snap('01234')).own;
 await db.query('update boss_raid_participants set hp=0 where participant_id=$1',[solo.id]);eq((await answer('01234')).heroHp,10);eq((await answer('01234')).awardedPoints,10);
 // First kill time immutability, effective damage cap and no post-kill retaliation.
 await room(1,3);await call('start_boss_raid',[active.roomCode,'ADMIN']);const t=(await snap('01234')).team;
 await db.query('update boss_raid_team_states set boss_hp=1 where team_id=$1',[t.id]);eq((await answer('01234')).damage,1);
 const dead=(await snap('01234')).team;eq(dead.bossHp,0);assert(dead.defeatedAt);checks++;
 eq((await answer('01234',false)).heroHp,100);eq((await answer('01234')).awardedPoints,10);eq((await snap('01234')).team.defeatedAt,dead.defeatedAt);
 eq((await db.query("select count(*)::int n from boss_raid_battle_events where team_id=$1 and type='boss_defeated'",[t.id])).rows[0].n,1);
 // Server expiry and early end. Timestamp deadline is checked by the resolver, not client.
 await room(1,3);await call('start_boss_raid',[active.roomCode,'ADMIN']);const current=(await snap('01234')).question;
 await db.query("update boss_raid_sessions set started_at=now()-interval '10 seconds',overall_ends_at=now()-interval '1 second' where session_id=$1",[active.sessionId]);
 eq((await answer('01234',true,randomUUID(),current)).code,'RAID_EXPIRED');eq((await snap('01234')).status,'ended');eq((await snap('01234')).reason,'time_up');
 await room(1,3,false);await call('start_boss_raid',[active.roomCode,'ADMIN']);const disabled=(await snap('01234')).question;
 eq((await call('report_raid_visibility',[active.roomCode,'01234',disabled.id,0,randomUUID(),5000])).status,'ignored');
 await call('finish_boss_raid',[active.sessionId,'ADMIN']);eq((await snap('01234')).reason,'teacher_ended');
 // Classic commands cannot mutate Raid; old rows retain default mode.
 await assert.rejects(()=>db.query("update game_sessions set status='showing_answer' where id=$1",[active.sessionId]),/CLASSIC_COMMAND_FOR_RAID/);checks++;
 await assert.rejects(()=>db.query('update teams set boost_question_index=0 where session_id=$1',[active.sessionId]),/CLASSIC_POWER_FOR_RAID/);checks++;
 await room(5,2);await call('start_boss_raid',[active.roomCode,'ADMIN']);eq((await snap('01234')).team.heroes.length,5);
 for(const code of students) eq((await snap(code)).own.heroType!==null,true);
 // Typed questions use frozen option IDs and persisted independent option order.
 await room(1,2);
 const bank=(await db.query('select id from questions where question_set_id=$1 order by order_index',[ids.set])).rows;
 for(let j=0;j<2;j++) {
  await db.query('update questions set question_type=$1 where id=$2',[j===0?'true_false':'multiple_choice',bank[j].id]);
  for(let i=0;i<(j===0?2:4);i++)await db.query('insert into question_options(question_id,option_text,is_correct,order_index) values($1,$2,$3,$4)',[bank[j].id,`ตัวเลือก ${i}`,i===0,i]);
 }
 await call('start_boss_raid',[active.roomCode,'ADMIN']);
 for(let i=0;i<2;i++) {
  const question=(await snap('01234')).question;eq((await snap('01234')).question.options,question.options);
  eq(question.options.length,question.questionType==='true_false'?2:4);
  const correctOption=(await db.query('select id from question_options where question_id=$1 and is_correct',[question.id])).rows[0].id;
  const invalid=await call('submit_boss_raid_answer',[active.roomCode,'01234',question.id,i,randomUUID(),null,randomUUID()]);eq(invalid.code,'INVALID_OPTION');
  const result=await call('submit_boss_raid_answer',[active.roomCode,'01234',question.id,i,randomUUID(),null,correctOption]);eq(result.awardedPoints,10);
 }
 // Zero-point sets cannot start, and leaving frees a reservation before start.
 await room(2,2);await call('reserve_raid_hero',[active.roomCode,'01234','warrior']);eq((await call('leave_boss_raid_lobby',[active.roomCode,'01234'])).ok,true);eq((await call('reserve_raid_hero',[active.roomCode,'01235','warrior'])).ok,true);
 await db.query('update questions set points=0 where question_set_id=$1',[ids.set]);
 await assert.rejects(()=>call('start_boss_raid',[active.roomCode,'ADMIN']),/RAID_INVALID_QUESTION_SET/);checks++;
 eq((await db.query('select count(*)::int n from boss_raid_questions where session_id=$1',[active.sessionId])).rows[0].n,0);
 console.log(`Boss Raid SQL: ${checks} checks passed (isolated PGlite; no production access; multi-connection race tests require staging).`);
} catch(e) { console.error(e.message,e.where??'');process.exitCode=1; } finally {await db.close();}
