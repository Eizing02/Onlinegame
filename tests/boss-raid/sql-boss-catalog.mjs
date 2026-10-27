import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createGoogleDatabase,ids} from '../helpers/google-database.mjs';
const db=await createGoogleDatabase({applyRaidMigration:true,applyBossCatalogMigration:false});
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=value=>{assert.ok(value);checks++;};
const call=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
const snapshot=(room,user='01234',teacher=false,team=null)=>call('get_private_raid_snapshot',[room,user,teacher,team,0]);
const create=(version,teams=1)=>call('create_boss_raid_room',['ADMIN',ids.set,'Boss catalog',teams,5,180,false,...(version===undefined?[]:[version])]);
const migration=await readFile('supabase/migrations/014_raid_team_boss_catalog.sql','utf8');
const bosses=['shadow_dragon','stone_titan','crystal_scorpion'];
try{
 for(let i=1;i<10;i++)await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index) values($1,$2,$3,10,$4)',[ids.set,'ข้อ '+i,'5',i]);
 const old=await create();await call('join_boss_raid',[old.roomCode,'01234',null,null]);await call('reserve_raid_hero',[old.roomCode,'01234','ranger']);await call('start_boss_raid',[old.roomCode,'ADMIN']);
 const before=await snapshot(old.roomCode),order=(await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[old.sessionId])).rows;
 await db.exec(migration);let s=await snapshot(old.roomCode);eq(s.bossCatalogVersion,1);eq(s.team.bossType,'shadow_dragon');eq(s.team.bossAssignedAt,null);eq(s.deadline,before.deadline);eq(s.team.bossHp,before.team.bossHp);eq(s.own.heroType,'ranger');eq((await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[old.sessionId])).rows,order);
 await call('finish_boss_raid',[old.sessionId,'ADMIN']);
 // The old RPC remains callable and explicitly keeps dragon-only rooms.
 const legacy=await create(undefined,3);s=await snapshot(legacy.roomCode,'ADMIN',true);eq(s.bossCatalogVersion,1);eq(s.teams.map(t=>t.bossType),['shadow_dragon','shadow_dragon','shadow_dragon']);ok(s.teams.every(t=>t.bossAssignedAt));await call('finish_boss_raid',[legacy.sessionId,'ADMIN']);
 for(const version of [null,0,3])eq((await create(version)).code,'INVALID_SETTINGS');
 const room=await create(2,12);s=await snapshot(room.roomCode,'ADMIN',true);eq(s.bossCatalogVersion,2);eq(s.heroCatalogVersion,2);eq(s.availableHeroes.length,10);eq(s.teams.length,12);ok(s.teams.every(t=>bosses.includes(t.bossType)&&t.bossAssignedAt));ok(new Set(s.teams.map(t=>t.bossType)).size<s.teams.length);
 const assigned=(await db.query('select team_id,boss_type,boss_assigned_at from boss_raid_team_states where session_id=$1 order by team_id',[room.sessionId])).rows;
 const people=['01234','01235','01236','01237'];
 for(let i=0;i<people.length;i++)await call('join_boss_raid',[room.roomCode,people[i],null,s.teams[i<2?0:1].id]);
 for(const user of people){const student=await snapshot(room.roomCode,user),teacher=await snapshot(room.roomCode,'ADMIN',true,student.team.id);eq(student.team.bossType,teacher.team.bossType);eq(student.team.bossAssignedAt,teacher.team.bossAssignedAt);eq(student.question,null);}
 eq((await call('rename_boss_raid_team',[room.roomCode,'01234',s.teams[0].id,'ชื่อใหม่'])).ok,true);
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);s=await snapshot(room.roomCode);eq(s.team.bossMaxHp,1500);const deadline=s.deadline;
 const answer={id:randomUUID(),question:s.question.id};const reply=await call('submit_boss_raid_answer',[room.roomCode,'01234',answer.question,0,answer.id,'5',null]);eq(reply.damage,100);eq(reply.awardedPoints,10);eq(reply.heroHp,100);eq(reply.presentation.durationMs,3000);
 eq(await call('submit_boss_raid_answer',[room.roomCode,'01234',answer.question,0,answer.id,'5',null]),reply);
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);await db.exec(migration);
 eq((await db.query('select team_id,boss_type,boss_assigned_at from boss_raid_team_states where session_id=$1 order by team_id',[room.sessionId])).rows,assigned);
 s=await snapshot(room.roomCode);eq(s.deadline,deadline);eq(s.own.score,10);eq(s.team.bossHp,1400);
 await call('finish_boss_raid',[room.sessionId,'ADMIN']);
 const result=await snapshot(room.roomCode,'ADMIN',true);ok(result.academicReport.every(r=>r.teamId&&bosses.includes(r.bossType)));
 // Fixed identities are assigned ONLY in this disposable fixture to exercise all three.
 for(const boss of bosses){
  const fixed=await create(2);await db.query('update boss_raid_team_states set boss_type=$2 where session_id=$1',[fixed.sessionId,boss]);await call('join_boss_raid',[fixed.roomCode,'01234',null,null]);await call('start_boss_raid',[fixed.roomCode,'ADMIN']);const state=await snapshot(fixed.roomCode);
  const correct=await call('submit_boss_raid_answer',[fixed.roomCode,'01234',state.question.id,0,randomUUID(),'5',null]);eq(state.team.bossMaxHp,750);eq(state.team.bossType,boss);eq(correct.damage,100);eq(correct.awardedPoints,10);eq(correct.presentation.durationMs,3000);
  await call('finish_boss_raid',[fixed.sessionId,'ADMIN']);eq((await snapshot(fixed.roomCode,'ADMIN',true)).academicReport[0].bossType,boss);
 }
 for(const signature of ['create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean)','create_boss_raid_room(text,uuid,text,integer,integer,integer,boolean,integer)'])for(const role of ['anon','authenticated','service_role'])eq((await db.query('select has_function_privilege($1,$2,$3) allowed',[role,'public.'+signature,'EXECUTE'])).rows[0].allowed,role==='service_role');
 await assert.rejects(db.query("update boss_raid_team_states set boss_type='forged' where session_id=$1",[room.sessionId]));checks++;
 await db.exec(await readFile('scripts/boss-raid/verify-boss-catalog.sql','utf8'));checks++;
 console.log(`Boss catalog SQL: ${checks} checks PASS (legacy/new RPC, per-team draws/repeats, stable identity, teacher/student parity, scores/HP/deadline, academic identity, permissions and safe reapply).`);
}catch(error){console.error('Boss catalog SQL failure:',error.message);process.exitCode=1;}finally{await db.close();}
