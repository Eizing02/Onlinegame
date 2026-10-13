import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createGoogleDatabase, ids } from '../helpers/google-database.mjs';
const db = await createGoogleDatabase({ applyRaidMigration: true });
let checks = 0;
const eq = (a,b) => { assert.deepEqual(a,b); checks++; };
const call = async (name,args) => (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) r`,args)).rows[0].r;
try {
  for(let i=1;i<10;i++) await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index) values($1,$2,$3,10,$4)',[ids.set,`ข้อ ${i}`,'5',i]);
  const room = await call('create_boss_raid_room',['ADMIN',ids.set,'Feedback',1,3,180,true]);
  for(const code of ['01234','01235','01236']) {
    await call('join_boss_raid',[room.roomCode,code,null,null]);
    await call('reserve_raid_hero',[room.roomCode,code,'warrior']);
  }
  await call('start_boss_raid',[room.roomCode,'ADMIN']);
  const snapshot = code => call('get_private_raid_snapshot',[room.roomCode,code,false,null,0]);
  let s = await snapshot('01234');
  const release = () => db.query("update boss_raid_participants set next_question_available_at=clock_timestamp()-interval '1 second' where participant_id=$1",[s.own.id]);
  const answer = async (correct,key=randomUUID(),question=null) => {
    question ??= (await snapshot('01234')).question;
    return call('submit_boss_raid_answer',[room.roomCode,'01234',question.id,question.displayIndex,key,correct?'5':'wrong',null]);
  };
  await db.query('update boss_raid_participants set hp=8 where participant_id=$1',[s.own.id]);
  const q=s.question,key=randomUUID(),hit=await answer(false,key,q);
  eq(hit.heroHp,0); eq(hit.damageTaken,8); eq(hit.damage,0);
  eq(hit.presentation.events.find(e=>e.type==='hero_hit').damageTaken,8);
  eq(hit.presentation.durationMs,3000); eq(await answer(false,key,q),hit);
  const teacher=await call('get_private_raid_snapshot',[room.roomCode,'ADMIN',true,s.team.id,0]);
  eq(teacher.team.events.find(e=>e.type==='hero_hit').damageTaken,8);
  eq((await snapshot('01234')).presentation.events.find(e=>e.type==='hero_hit').damageTaken,8);
  const ledger=(await db.query('select hp_before,hp_after from boss_raid_answers where idempotency_key=$1',[key])).rows[0];
  eq(ledger.hp_before-ledger.hp_after,hit.damageTaken);
  await release();
  const target=s.team.heroes.find(h=>h.id!==s.own.id);
  await db.query('update boss_raid_participants set hp=95 where participant_id=$1',[target.id]);
  const heal=await answer(true);eq(heal.healAmount,5);eq(heal.presentation.events.find(e=>e.type==='heal').heal,5);eq(heal.damageTaken,0);
  await release();const noTarget=await answer(true);eq(noTarget.noHealTarget,true);eq(noTarget.presentation.events.length,0);
  await release();await db.query('update boss_raid_participants set hp=100 where participant_id=$1',[s.own.id]);
  await db.query('update boss_raid_team_states set boss_hp=60 where team_id=$1',[s.team.id]);
  const kill=await answer(true);eq(kill.damage,60);eq(kill.bossHp,0);eq(kill.damageTaken,0);eq(kill.awardedPoints,10);
  eq(kill.presentation.events.filter(e=>e.type==='hero_attack').length,1);eq(kill.presentation.events.filter(e=>e.type==='boss_defeated').length,1);
  // Existing seven-argument producers leave legacy loss unknown, including non-hit events.
  await call('raid_emit',[s.team.id,'hero_hit',null,s.own.id,0,0,90]);
  const old=(await snapshot('01234')).team.events.at(-1);eq(old.damageTaken,null);
  eq((await db.query("select has_function_privilege('authenticated','public.raid_emit(uuid,text,uuid,uuid,bigint,integer,integer,integer)','EXECUTE') allowed")).rows[0].allowed,false);
  eq((await db.query("select has_function_privilege('anon','public.raid_emit(uuid,text,uuid,uuid,bigint,integer,integer,integer)','EXECUTE') allowed")).rows[0].allowed,false);
  eq((await db.query("select has_function_privilege('service_role','public.raid_emit(uuid,text,uuid,uuid,bigint,integer,integer,integer)','EXECUTE') allowed")).rows[0].allowed,true);
  await assert.rejects(db.query('update boss_raid_battle_events set damage_taken=-1 where team_id=$1',[s.team.id]));checks++;
  await db.exec(await readFile('supabase/migrations/011_raid_combat_feedback.sql','utf8'));
  eq((await snapshot('01234')).team.events.find(e=>e.type==='hero_hit').damageTaken,8);
  eq((await db.query('select hp from boss_raid_participants where participant_id=$1',[s.own.id])).rows[0].hp,100);
  console.log(`Raid combat feedback SQL: ${checks} checks PASS (actual HP loss, overkill, healing, teacher/student parity, retry, legacy NULL, permissions, safe reapply).`);
} finally { await db.close(); }
