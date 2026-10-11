/* eslint-disable @typescript-eslint/no-require-imports */
// Exercise the production Supabase adapters over a loopback HTTP fixture.
// PGlite serializes transactions: these races are NOT real PostgreSQL lock tests.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = function(module, filename) { module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename); };

(async () => {
  const { startMockSupabase, mockKey } = await import('./helpers/mock-supabase.mjs');
  const { ids } = await import('./helpers/google-database.mjs');
  // An ephemeral loopback port avoids colliding with E2E servers.
  const mock = await startMockSupabase(0);
  process.env.AUTH_MODE = 'google';
  process.env.DATA_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = mock.url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture-publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = mockKey;
  const bank = require('../src/lib/data/question-bank.ts');
  const game = require('../src/lib/data/game-sessions.ts');
  const { createSupabaseAdminClient } = require('../src/lib/supabase/server.ts');
  try {
    const allowed = await (await fetch(mock.url + '/__test/allow-teacher')).json();
    assert.equal(allowed.ok, true);
    const teacher = allowed.userCode;
    await fetch(mock.url + '/__test/room');
    const original = await bank.getLocalQuestionSet('ADMIN', ids.set);
    assert.equal(original.questions.length, 1);
    assert.equal(await bank.getLocalQuestionSet(teacher, ids.set), null);
    assert.deepEqual(await bank.getLocalQuestionSetSummaries(teacher), []);
    assert.equal(await bank.addLocalQuestion(teacher, ids.set, { questionText: 'forged', correctAnswer: 'forged', points: 999, timeLimitSeconds: 30 }), null);
    assert.equal(await bank.deleteLocalQuestion(teacher, ids.set, ids.question), false);
    assert.equal(await bank.deleteLocalQuestions(teacher, ids.set, [ids.question]), false);
    assert.deepEqual(await bank.deleteLocalQuestionSet(teacher, ids.set), { ok: false, reason: 'not_found' });
    assert.equal(await game.getLocalTeacherGameSession(teacher, '1234'), null);
    assert.equal(await game.getActiveTeacherGameSession(teacher), null);
    for (const control of [game.startLocalGameSession, game.lockLocalGameAnswers, game.showLocalGameAnswer, game.advanceLocalGameQuestion, game.endLocalGameSession, game.deleteLocalGameSession]) {
      assert.equal((await control({ teacherCode: teacher, roomCode: '1234' })).ok, false);
    }
    await assert.rejects(() => game.createLocalGameSession({ teacherCode: teacher, questionSetId: ids.set, questionSetTitle: 'forged', questionCount: 1, activityName: null, teamCount: 1, maxMembersPerTeam: 4 }));
    assert.deepEqual(await bank.getLocalQuestionSet('ADMIN', ids.set), original);
    assert.equal((await game.getLocalTeacherGameSession('ADMIN', '1234')).status, 'lobby');

    const client = createSupabaseAdminClient();
    const claim = async (id, code) => {
      const { data, error } = await client.rpc('student_account_operation', { p_auth_user_id: id, p_action: 'claim', p_student_code: code, p_client_key: null });
      assert.equal(error, null);
      return data;
    };
    const competitors = await Promise.all(Array.from({ length: 10 }, (_, i) => claim(i % 2 ? ids.pupil : ids.other, '01234')));
    assert.equal(competitors.filter(result => result.ok).length, 1);
    assert.ok(competitors.filter(result => !result.ok).every(result => ['LINK_STATE_CHANGED', 'STUDENT_ALREADY_LINKED', 'RATE_LIMITED'].includes(result.code)));
    const singleUser = await Promise.all([claim(ids.third, '01236'), claim(ids.third, '01237')]);
    assert.equal(singleUser.filter(result => result.ok).length, 1);
    assert.equal(singleUser.find(result => !result.ok).code, 'LINK_STATE_CHANGED');
    const { data: identity, error } = await client.rpc('resolve_google_account', { p_auth_user_id: ids.third, p_bootstrap_email: 'piyawatpiwsiri@gmail.com', p_touch: false });
    assert.equal(error, null);
    assert.equal(identity.state, 'linked');
    assert.equal(identity.userCode, singleUser[0].ok ? '01236' : '01237');
    console.log('Google Supabase services: foreign question/room reads, writes, deletion and controls denied; owner data preserved; 10 concurrent HTTP claims and one-user/two-code claims PASS (serialized fixture, real PostgreSQL races NOT_RUN)');
  } finally { await mock.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
