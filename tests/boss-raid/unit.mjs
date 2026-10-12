import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';const nodeRequire=createRequire(import.meta.url);
function load(file){const compiledModule={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{module:compiledModule,exports:compiledModule.exports,require:nodeRequire,performance,console});return compiledModule.exports;}
const rules=load('src/features/boss-raid/rules/rules-v1.ts');const {raidStandings}=load('src/features/boss-raid/rules/ranking.ts');const {AttackEventQueue}=load('src/features/boss-raid/engine/attack-event-queue.ts');
assert.equal(rules.bossMaxHp(3,100),2250);assert.equal(rules.wrongDamage(3),20);assert.equal(rules.wrongDamage(100),5);assert.equal(rules.wrongDamage(10),15);
for(const [ms,result] of [[2999,false],[3000,false],[3001,true]])assert.equal(rules.qualifiedLeave(ms),result);
const team=(id,totalScore,memberCount,killDurationMs,bossHp=0)=>({id,name:id,totalScore,averageScore:totalScore/memberCount,memberCount,killDurationMs,bossHp,bossMaxHp:1000,correctCount:5});
const result=raidStandings([team('three',30,3,2000),team('one',10,1,2000),team('five',40,5,null,250),team('weak',5,1,null,500)],10);
assert.equal(result.average[0].rank,1);assert.equal(result.average[1].rank,1);assert.equal(result.average[2].rank,3);
assert.equal(result.kill[0].rank,1);assert.equal(result.kill[1].rank,1);assert.equal(result.kill[2].rank,null);assert.equal(result.kill[2].teamId,'five');
const queue=new AttackEventQueue();queue.push([{seq:1},{seq:1},{seq:2}]);assert.equal(queue.take().length,2);assert.equal(queue.take().length,0);
queue.push(Array.from({length:100},(_,i)=>({seq:i+3})));let taken=[];for(let i=0;i<8;i++)taken.push(...queue.take());assert.equal(taken.length,20);assert.equal(taken[0].seq,83);
queue.reset(200);queue.push([{seq:199},{seq:201}]);assert.equal(queue.take()[0].seq,201);
console.log('Boss Raid unit: HP formula, damage clamps, visibility threshold, exact average/kill joint ties, non-kill progress and bounded deduplicated events passed.');
