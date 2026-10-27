import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createGoogleDatabase,ids } from '../helpers/google-database.mjs';
const db=await createGoogleDatabase({applyRaidMigration:true,applyHeroCatalogMigration:false});let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) r`,args)).rows[0].r;
const migration=await readFile('supabase/migrations/013_raid_hero_catalog_v2.sql','utf8'),old=['warrior','mage','wizard','witch','fairy'],added=['ranger','ninja','monk','engineer','bard'];
try{
 await db.exec("insert into accounts(user_code,display_name,password,role,grade) values('01238','นักเรียนห้า','fixture','student','ม.6')");
 for(let i=1;i<10;i++)await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index) values($1,$2,$3,10,$4)',[ids.set,`ข้อ ${i}`,'5',i]);
 const legacy=await call('create_boss_raid_room',['ADMIN',ids.set,'Old catalog',1,5,180,false]);await call('join_boss_raid',[legacy.roomCode,'01234',null,null]);await call('reserve_raid_hero',[legacy.roomCode,'01234','warrior']);
 await db.exec(migration);
 let snap=await call('get_private_raid_snapshot',[legacy.roomCode,'01234',false,null,0]);eq(snap.heroCatalogVersion,1);eq(snap.availableHeroes,old);eq(snap.own.heroType,'warrior');
 eq((await call('reserve_raid_hero',[legacy.roomCode,'01234','ranger'])).code,'INVALID_HERO');eq((await call('start_boss_raid',[legacy.roomCode,'ADMIN'])).ok,true);
 const before=(await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[legacy.sessionId])).rows;const legacyDeadline=(await call('get_private_raid_snapshot',[legacy.roomCode,'01234',false,null,0])).deadline;
 await db.exec(migration);eq((await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[legacy.sessionId])).rows,before);eq((await call('get_private_raid_snapshot',[legacy.roomCode,'01234',false,null,0])).deadline,legacyDeadline);
 await call('finish_boss_raid',[legacy.sessionId,'ADMIN']);
 const room=await call('create_boss_raid_room',['ADMIN',ids.set,'New catalog',1,5,180,true]),people=['01234','01235','01236','01237','01238'];
 for(let i=0;i<people.length;i++){eq((await call('join_boss_raid',[room.roomCode,people[i],null,null])).ok,true);eq((await call('reserve_raid_hero',[room.roomCode,people[i],added[i]])).ok,true);}
 const snapshot=code=>call('get_private_raid_snapshot',[room.roomCode,code,false,null,0]);
 snap=await snapshot(people[0]);eq(snap.heroCatalogVersion,2);eq(snap.availableHeroes,[...old,...added]);eq(snap.team.heroes.map(h=>h.heroType).sort(),[...added].sort());
 for(const invalid of ['rogue','RANGER','',null])eq((await call('reserve_raid_hero',[room.roomCode,people[0],invalid])).code,'INVALID_HERO');eq((await call('reserve_raid_hero',[room.roomCode,'ADMIN','ranger'])).code,'INVALID_HERO');
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);snap=await snapshot(people[0]);eq(snap.team.bossMaxHp,3750);eq(snap.rulesVersion,2);eq(snap.team.memberCount,5);
 const deadline=snap.deadline;
 for(const person of people){const s=await snapshot(person);eq(s.own.hp,100);eq(s.deadline,deadline);const key=randomUUID(),q=s.question;const args=[room.roomCode,person,q.id,q.displayIndex,key,'5',null];const result=await call('submit_boss_raid_answer',args);eq(result.awardedPoints,10);eq(result.damage,100);eq(result.presentation.durationMs,3000);eq(await call('submit_boss_raid_answer',args),result);eq((await call('reserve_raid_hero',[room.roomCode,person,'warrior'])).code,'LOBBY_CLOSED');}
 const after=await snapshot(people[0]);eq(after.team.totalScore,50);eq(after.team.bossHp,3250);eq(after.team.averageScore,10);
 for(const name of ['reserve_raid_hero(text,text,text)','start_boss_raid(text,text)','get_private_raid_snapshot(text,text,boolean,uuid,bigint)'])eq((await db.query('select has_function_privilege($1,$2,$3) allowed',['authenticated','public.'+name,'EXECUTE'])).rows[0].allowed,false);
 const state=(await db.query('select * from boss_raid_participants where session_id=$1 order by participant_id',[room.sessionId])).rows;
 await db.exec(migration);eq((await db.query('select * from boss_raid_participants where session_id=$1 order by participant_id',[room.sessionId])).rows,state);
 console.log(`Hero catalog SQL: ${checks} checks PASS (old/new room isolation, five distinct heroes, equal damage/scoring/deadline, retries, permissions and reapply).`);
}finally{await db.close();}
