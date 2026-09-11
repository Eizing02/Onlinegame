import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try {
 await db.exec('create role anon; create role authenticated; create role service_role;');
 // Use the real schema, omitting only platform extension/publication/storage setup.
 const initial=(await readFile('supabase/migrations/001_initial_schema.sql','utf8')).replace('create extension if not exists pgcrypto;','').replace(/alter publication[^;]+;/g,'');
 await db.exec(initial);
 await db.exec((await readFile('supabase/migrations/005_question_types_and_images.sql','utf8')).split('insert into storage.buckets')[0]);
 await db.exec('create publication supabase_realtime;');
 await db.exec(await readFile('supabase/migrations/006_private_game_data.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/007_team_power_scoring.sql','utf8'));
 const sid='00000000-0000-4000-8000-000000000001',set='00000000-0000-4000-8000-000000000002',qid='00000000-0000-4000-8000-000000000003',tid='00000000-0000-4000-8000-000000000004';
 await db.exec(`insert into accounts(user_code,display_name,password,role) values ('T','Teacher','test','teacher'),('A','Captain','test','student'),('B','Member','test','student'),('L','Late','test','student');
 insert into question_sets(id,teacher_code,title) values ('${set}','T','Test');
 insert into questions(id,question_set_id,question_text,correct_answer,points) values ('${qid}','${set}','2+3','5',10);
 insert into game_sessions(id,room_code,teacher_code,question_set_id,question_set_title,question_count,team_count,max_members_per_team,status,current_question_ends_at,rules_version,question_snapshot) values ('${sid}','1234','T','${set}','Test',1,1,3,'question_active',now()+interval '2 minutes',2,'[{"id":"${qid}","points":10}]');
 insert into teams(id,session_id,team_number,team_name,locked_member_count) values ('${tid}','${sid}',1,'Team',2);
 insert into participants(session_id,team_id,student_code,display_name,joined_at,is_score_eligible) values ('${sid}','${tid}','A','Captain',now()-interval '2 minutes',true),('${sid}','${tid}','B','Member',now()-interval '1 minute',true),('${sid}','${tid}','L','Late',now(),false);`);
 const boost=async(code,q=qid)=>(await db.query('select activate_classroom_power($1,$2,$3) result',[sid,code,q])).rows[0].result;
 const answer=async(code,correct=true)=>(await db.query('select submit_classroom_answer($1,$2,$3,$4,$5,$6) result',[sid,code,qid,correct?'5':'0',null,correct])).rows[0].result;
 assert.equal((await boost('B')).ok,false);assert.equal((await boost('L')).ok,false);
 assert.equal((await boost('A',set)).ok,false);
 assert.equal((await boost('A')).ok,true);assert.equal((await boost('A')).ok,false);
 assert.equal((await answer('A')).ok,true);assert.equal((await answer('A')).ok,false);
 assert.equal((await answer('B')).ok,true);assert.equal((await answer('L')).ok,true);
 const team=(await db.query('select raw_score,average_score from teams')).rows[0];assert.equal(Number(team.raw_score),45);assert.equal(Number(team.average_score),22.5);
 const ledger=(await db.query("select base_score_awarded,power_bonus_awarded from answers where student_code='A'")).rows[0];assert.equal(Number(ledger.base_score_awarded),15);assert.equal(Number(ledger.power_bonus_awarded),7.5);
 assert.equal((await db.query("select has_function_privilege('anon','activate_classroom_power(uuid,text,uuid)','EXECUTE') ok")).rows[0].ok,false);
 await db.exec(`delete from answers; update teams set boost_question_index=null;`);
 assert.equal((await answer('B')).ok,true);assert.equal((await boost('A')).ok,false);
 await db.exec(`delete from answers; delete from questions;`);
 assert.equal((await answer('A')).ok,true);assert.equal((await db.query('select question_id from answers')).rows[0].question_id,null);
 await db.exec(`delete from answers; update game_sessions set current_question_ends_at=now()-interval '1 minute';`);
 assert.equal((await answer('A')).ok,false);assert.equal((await boost('A')).ok,false);
 console.log('PostgreSQL migration + RPC: captain, once, stale question, final stacking, exact ledger, late eligibility, private privilege, answer-first, frozen deleted question, timeout PASSED');
} finally {await db.close();}
