import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGoogleDatabase, ids } from '../helpers/google-database.mjs';
const db=await createGoogleDatabase({applyRaidMigration:true});let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) r`,args)).rows[0].r;
const migration=await readFile('supabase/migrations/012_raid_lobby_and_choice_order.sql','utf8');
try {
 // Deliberately insert options out of authored order, including true/false.
 for(let i=1;i<6;i++){
  const q=(await db.query("insert into questions(question_set_id,question_text,question_type,correct_answer,points,order_index) values($1,$2,$3,'ถูก',10,$4) returning id",[ids.set,`ข้อ ${i}`,i===1?'true_false':'multiple_choice',i])).rows[0].id;
  for(const j of (i===1?[1,0]:[3,1,0,2]))await db.query('insert into question_options(question_id,option_text,is_correct,order_index) values($1,$2,$3,$4)',[q,`ช้อย ${j}`,j===0,j]);
 }
 const room=await call('create_boss_raid_room',['ADMIN',ids.set,'Lobby',2,5,180,false]);
 const teams=(await db.query('select id from teams where session_id=$1 order by team_number',[room.sessionId])).rows;
 for(const code of ['01234','01235'])eq((await call('join_boss_raid',[room.roomCode,code,null,teams[0].id])).ok,true);
 const snap=code=>call('get_private_raid_snapshot',[room.roomCode,code,false,null,0]);
 let s=await snap('01234');eq(s.canRenameTeam,true);eq(s.isTeamCaptain,true);eq(s.captainId,s.own.id);eq((await snap('01235')).canRenameTeam,false);
 const rename=(code,name,team=teams[0].id)=>call('rename_boss_raid_team',[room.roomCode,code,team,name]);
 eq((await rename('01235','ปลอม')).code,'CAPTAIN_ONLY');eq((await rename('ADMIN','ครู')).code,'ACCESS_DENIED');eq((await rename('01236','นอกห้อง')).code,'ACCESS_DENIED');eq((await rename('01234','ผิดทีม',teams[1].id)).code,'ACCESS_DENIED');
 for(const name of ['', 'ก', 'x'.repeat(31),null])eq((await rename('01234',name)).code,'INVALID_TEAM_NAME');
 eq((await rename('01234','  มังกร   ทอง  ')).ok,true);eq((await snap('01235')).team.name,'มังกร ทอง');eq((await call('get_private_raid_snapshot',[room.roomCode,'ADMIN',true,teams[0].id,0])).team.name,'มังกร ทอง');
 await db.query("update participants set connection_status='offline' where id=$1",[s.own.id]);eq((await snap('01235')).canRenameTeam,false);eq((await rename('01234','มังกรทอง')).ok,true);
 eq((await call('leave_boss_raid_lobby',[room.roomCode,'01234'])).ok,true);eq((await snap('01235')).canRenameTeam,true);eq((await rename('01235','ทีมใหม่')).ok,true);
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);eq((await rename('01235','หลังเริ่ม')).code,'LOBBY_CLOSED');eq((await snap('01235')).canRenameTeam,false);
 const orders=(await db.query(`select qo.*, q.options from boss_raid_question_order qo join boss_raid_questions q on q.session_id=qo.session_id and q.question_id=qo.question_id where qo.session_id=$1 order by display_index`,[room.sessionId])).rows;
 eq(orders.length,6);for(const row of orders)eq(row.option_order,row.options.map(o=>o.id));
 s=await snap('01235');const stored=orders.find(o=>o.question_id===s.question.id);eq(s.question.options.map(o=>o.id),stored.option_order);
 for(const word of ['isCorrect','correct_answer','option_order','password'])eq(JSON.stringify(s).includes(word),false);
 eq((await call('start_boss_raid',[room.roomCode,'ADMIN'])).ok,true);eq((await db.query('select count(*)::int n from boss_raid_question_order where session_id=$1',[room.sessionId])).rows[0].n,6);
 for(const role of ['anon','authenticated'])eq((await db.query(`select has_function_privilege($1,'public.rename_boss_raid_team(text,text,uuid,text)','EXECUTE') allowed`,[role])).rows[0].allowed,false);
 eq((await db.query("select has_function_privilege('service_role','public.rename_boss_raid_team(text,text,uuid,text)','EXECUTE') allowed")).rows[0].allowed,true);
 // Migration reapplication must preserve every persisted question/option order and the deadline.
 const before=(await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[room.sessionId])).rows;const deadline=s.deadline;
 await db.exec(migration);eq((await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[room.sessionId])).rows,before);eq((await snap('01235')).deadline,deadline);
 // Installing after an older running game must not rewrite its already assigned choices.
 await call('finish_boss_raid',[room.sessionId,'ADMIN']);
 const old=await readFile('supabase/migrations/010_raid_pacing_and_duplicate_heroes.sql','utf8');await db.exec(old.slice(old.indexOf('create or replace function public.start_boss_raid'),old.indexOf('create or replace function public.raid_resolve')));
 const legacy=await call('create_boss_raid_room',['ADMIN',ids.set,'Legacy',1,5,180,false]);await call('join_boss_raid',[legacy.roomCode,'01234',null,null]);await call('start_boss_raid',[legacy.roomCode,'ADMIN']);
 const legacyOrder=(await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[legacy.sessionId])).rows;
 await db.exec(migration);eq((await db.query('select * from boss_raid_question_order where session_id=$1 order by display_index',[legacy.sessionId])).rows,legacyOrder);
 for(const result of await db.exec(await readFile('supabase/checks/012_verify_raid_lobby.sql','utf8')))for(const row of result.rows)for(const value of Object.values(row))eq(value,true);
 console.log(`Raid lobby/ordering SQL: ${checks} checks PASS (permissions, captain, normalization, locks, authored choices, active-game preservation, safe reapply).`);
}finally{await db.close();}
