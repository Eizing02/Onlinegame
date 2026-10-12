import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGoogleDatabase,ids} from '../helpers/google-database.mjs';
const db=await createGoogleDatabase({applyRaidMigration:true});let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) r`,args)).rows[0].r;
let room;
const snapshot=code=>call('get_private_raid_snapshot',[room.roomCode,code,false,null,0]);
const release=code=>db.query("update boss_raid_participants set next_question_available_at=clock_timestamp()-interval '1 second' where participant_id=(select id from participants where session_id=$1 and student_code=$2)",[room.sessionId,code]);
const send=async(code,correct=true,key=randomUUID(),q=null)=>{q??=(await snapshot(code)).question;const row=(await db.query('select correct_answer from boss_raid_questions where question_id=$1 and session_id=$2',[q.id,room.sessionId])).rows[0];return call('submit_boss_raid_answer',[room.roomCode,code,q.id,q.displayIndex,key,correct?row.correct_answer:'wrong',null]);};
try{
 await db.exec("insert into accounts(user_code,display_name,password,role,grade) values('01238','นักเรียน ห้า','fixture','student','ม.6')");
 for(let i=1;i<5;i++)await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index) values($1,$2,$3,10,$4)',[ids.set,`ข้อ ${i}`,'5',i]);
 room=await call('create_boss_raid_room',['ADMIN',ids.set,'ใหม่',1,5,180,true]);
 for(const code of ['01234','01235','01236','01237','01238']){eq((await call('join_boss_raid',[room.roomCode,code,null,null])).ok,true);eq((await call('reserve_raid_hero',[room.roomCode,code,'warrior'])).ok,true);}
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);let s=await snapshot('01234');eq(s.rulesVersion,2);eq(s.team.heroes.filter(h=>h.heroType==='warrior').length,5);eq(s.team.memberCount,5);
 const q=s.question,key=randomUUID(),result=await send('01234',true,key,q);
 eq(result.presentation.id,key);eq(result.presentation.durationMs,3000);eq(result.presentation.events[0].type,'hero_attack');eq(result.presentation.events[0].actorId,s.own.id);eq(result.awardedPoints,10);eq(result.damage,100);
 eq(await send('01234',false,key,q),result); // a retry returns the original result, even within cooldown
 s=await snapshot('01234');eq(s.question,null);eq(s.presentation.id,key);eq(s.own.cursor,1);eq(s.own.score,10);eq((await snapshot('01235')).question.displayIndex,0);
 const nextRow=(await db.query('select question_id from boss_raid_question_order where participant_id=$1 and display_index=1',[s.own.id])).rows[0];
 eq((await send('01234',true,randomUUID(),{id:nextRow.question_id,displayIndex:1})).code,'PRESENTATION_PENDING');
 eq((await call('report_raid_visibility',[room.roomCode,'01234',nextRow.question_id,1,randomUUID(),4000])).code,'PRESENTATION_PENDING');
 eq((await snapshot('01234')).own.cursor,1);
 for(const forbidden of ['correct_answer','isCorrect','answer_text','option_order','password'])eq(JSON.stringify(s).includes(forbidden),false);
 await release('01234');s=await snapshot('01234');eq(s.presentation,null);eq(s.question.displayIndex,1);
 let wrong=await send('01234',false);eq(wrong.presentation.events[0].type,'hero_hit');eq(wrong.presentation.events[0].targetId,s.own.id);eq(wrong.presentation.durationMs,3000);await release('01234');
 await db.query('update boss_raid_participants set hp=0 where participant_id=$1',[s.own.id]);await db.query('update boss_raid_participants set hp=100 where team_id=$1 and participant_id<>$2',[s.team.id,s.own.id]);
 const noTarget=await send('01234');eq(noTarget.noHealTarget,true);eq(noTarget.presentation.events.filter(e=>e.type==='heal').length,0);eq((await snapshot('01234')).question,null);await release('01234');
 eq((await snapshot('01234')).question.displayIndex,3);await db.query('update boss_raid_participants set hp=95 where participant_id=$1',[s.team.heroes.find(h=>h.id!==s.own.id).id]);
 const heal=await send('01234');eq(heal.healAmount,5);eq(heal.presentation.events.find(e=>e.type==='heal').heal,5);
 eq((await db.query("select has_function_privilege('authenticated','public.raid_resolve(uuid,uuid,integer,uuid,text,uuid,boolean)','EXECUTE') allowed")).rows[0].allowed,false);
 eq((await db.query("select count(*)::int n from pg_publication_tables where tablename like 'boss_raid_%'")).rows[0].n,0);
 console.log(`Raid v2 SQL: ${checks} checks PASS — duplicates, own-event correlation, authoritative cooldown, retry, privacy, no-action/heal and v1 coexistence.`);
}finally{await db.close();}
