// Loopback-only test server. No test endpoint or auth shortcut is added to the app.
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { createGoogleDatabase, fixtureUsers, ids, rpc, resolveAccount, teacherOperation } from './google-database.mjs';

export const mockKey = 'fixture-service-key-only';
const secret = new TextEncoder().encode('fixture-supabase-jwt-secret-not-for-production');
const tables = new Set(['accounts','question_sets','questions','question_options','game_sessions','teams','participants','answers','game_events','game_session_updates']);
export async function startMockSupabase(port = 3111, raid = false) {
  const chooser = raid ? [...fixtureUsers,['10000000-0000-4000-8000-000000000007','fourth@example.com','google'],['10000000-0000-4000-8000-000000000008','fifth@example.com','google']] : fixtureUsers;
  async function createFixture() {
    const fixture=await createGoogleDatabase({applyRaidMigration:raid});
    if(raid){await fixture.exec("insert into accounts(user_code,display_name,password,role,grade) values('01238','นักเรียน ห้า','fixture','student','ม.6')");for(const [id,email,provider] of chooser.slice(fixtureUsers.length)){await fixture.query('insert into auth.users values($1,$2,now(),$3,$4)',[id,email,{provider,providers:[provider]},{}]);await fixture.query('insert into auth.identities(user_id,provider,identity_data) values($1,$2,$3)',[id,provider,{email,email_verified:true}]);}}
    return fixture;
  }
  let db = await createFixture();
  if (raid) tables.add('boss_raid_sessions');
  const codes = new Map(), refreshes = new Map(), revoked = new Set();
  function json(response, body, status = 200) { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); }
  async function user(id) {
    const data = (await db.query('select * from auth.users where id=$1', [id])).rows[0];
    if (!data) return null;
    const identities = (await db.query('select * from auth.identities where user_id=$1', [id])).rows.map(identity => ({ ...identity, identity_id: identity.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return { id: data.id, aud: 'authenticated', role: 'authenticated', email: data.email, email_confirmed_at: data.email_confirmed_at, confirmed_at: data.email_confirmed_at, app_metadata: data.raw_app_meta_data, user_metadata: data.raw_user_meta_data, identities, created_at: new Date().toISOString() };
  }
  async function token(id, session = randomUUID(), expiration = 3600) {
    const current = await user(id);
    const access = await new SignJWT({ email: current.email, role: 'authenticated', app_metadata: current.app_metadata, session_id: session, amr: [{ method: 'oauth', timestamp: Math.floor(Date.now()/1000) }] })
      .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setAudience('authenticated').setIssuer(`http://127.0.0.1:${port}/auth/v1`).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)+expiration).sign(secret);
    const refresh = randomUUID(); refreshes.set(refresh, { id, session });
    return { access_token: access, refresh_token: refresh, token_type: 'bearer', expires_in: expiration, expires_at: Math.floor(Date.now()/1000)+expiration, user: current };
  }
  const identifier = value => { if (!/^[a-z_][a-z_0-9]*$/.test(value)) throw new Error('Invalid test identifier'); return `"${value}"`; };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      const path = url.pathname;
      if (path === '/__test/reset') {
        await db.close(); db = await createFixture(); codes.clear(); refreshes.clear(); revoked.clear();
        return json(response, { ok: true });
      }
      if (raid && path === '/__test/raid-bank') {
        for (let i=1;i<10;i++) await db.query('insert into questions(question_set_id,question_text,correct_answer,points,order_index,question_type) values($1,$2,$3,10,$4,$5)', [ids.set, i===1?'จริงหรือเท็จ: 1+1=2':i===2?'เลือกผลลัพธ์ของ $2+2$':`คำถามยาวเพื่อทดสอบการอ่าน ${'ข้อความภาษาไทย '.repeat(20)} ${i}`, '5', i, i===1?'true_false':i===2?'multiple_choice':'short_text']);
        const optionQuestions=(await db.query("select id,question_type from questions where question_type<>'short_text'")).rows;
        for (const q of optionQuestions) for(let i=0;i<(q.question_type==='true_false'?2:4);i++) await db.query('insert into question_options(question_id,option_text,is_correct,order_index) values($1,$2,$3,$4)',[q.id,i===0?'คำตอบถูก':'คำตอบอื่น '+i,i===0,i]);
        await db.query('update questions set image_url=$1 where question_set_id=$2 and order_index=3',['/assets/boss-raid/boss/idle.png',ids.set]);
        return json(response,{ok:true});
      }
      if (raid && path === '/__test/raid-correct-option') {
        const id=url.searchParams.get('question');
        const row=(await db.query('select id from question_options where question_id=$1 and is_correct',[id])).rows[0];
        return json(response,{selectedOptionId:row?.id??null,answerText:'5'});
      }
      if (raid && path === '/__test/raid-legacy') { await db.query('update boss_raid_sessions set rules_version=1 where session_id=$1',[url.searchParams.get('session')]); return json(response,{ok:true}); }
      if (raid && path === '/__test/raid-phase-three') {
        await db.query('update boss_raid_team_states set phase=3 where session_id=$1',[url.searchParams.get('session')]);return json(response,{ok:true});
      }
      if (raid && path === '/__test/raid-last-thirty') {
        await db.query("update boss_raid_sessions set overall_ends_at=clock_timestamp()+interval '29 seconds' where session_id=$1",[url.searchParams.get('session')]);
        return json(response,{ok:true});
      }
      if (raid && path === '/__test/raid-expire') {
        await db.query("update boss_raid_sessions set started_at=now()-interval '10 seconds',overall_ends_at=now()-interval '1 second' where session_id=$1",[url.searchParams.get('session')]);
        return json(response,{ok:true});
      }
      if (raid && path === '/__test/raid-boss-one-hp') {
        await db.query('update boss_raid_team_states set boss_hp=1 where session_id=$1',[url.searchParams.get('session')]);
        return json(response,{ok:true});
      }
      if (path === '/__test/allow-teacher') {
        await resolveAccount(db, ids.admin);
        return json(response, await teacherOperation(db, ids.admin, 'add', { p_email: 'teacher@example.com', p_display_name: 'ครูทดสอบ Google' }));
      }
      if (path === '/__test/suspend-teacher') {
        await db.exec("update teacher_access set status='suspended' where google_email='teacher@example.com'");
        return json(response, { ok: true });
      }
      if (path === '/__test/room') {
        const questionCount = url.searchParams.get('questions') === '2' ? 2 : 1;
        if (questionCount === 2) await db.query('insert into questions(id,question_set_id,question_text,correct_answer,points,order_index,time_limit_seconds) values($1,$2,$3,$4,10,1,120)', [randomUUID(), ids.set, '3+3', '6']);
        await db.exec(`insert into game_sessions(id,room_code,teacher_code,question_set_id,question_set_title,question_count,team_count,max_members_per_team) values('${ids.room}','1234','ADMIN','${ids.set}','Test',1,1,4);
          insert into teams(id,session_id,team_number,team_name) values('${ids.team}','${ids.room}',1,'กลุ่ม 1');`);
        if (questionCount === 2) {
          const snapshot = (await db.query('select * from questions where question_set_id=$1 order by order_index', [ids.set])).rows.map(q => ({
            id: q.id, questionText: q.question_text, correctAnswer: q.correct_answer, questionType: 'short_text', options: [],
            points: q.points, timeLimitSeconds: 120, orderIndex: q.order_index, imageUrl: null, imagePath: null, createdAt: q.created_at,
          }));
          // Full gameplay uses current v2 room rules; the default fixture is a legacy room.
          await db.query('update game_sessions set question_count=2,rules_version=2,question_snapshot=$2 where id=$1', [ids.room, JSON.stringify(snapshot)]);
        }
        return json(response, { ok: true });
      }
      if (path === '/__test/expire') {
        const current = await token(url.searchParams.get('id'), url.searchParams.get('session'), 1);
        current.expires_at = Math.floor(Date.now()/1000)-60;
        return json(response, current);
      }
      if (path === '/auth/v1/authorize') {
        if (url.searchParams.get('provider') !== 'google' || !url.searchParams.get('code_challenge')) return json(response, { error: 'PKCE required' }, 400);
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<html lang="th"><title>Mock Google chooser</title><h1>เลือกบัญชีทดสอบ</h1>' + chooser.map(([id,email]) => {
          const query = new URLSearchParams(url.searchParams); query.set('id', id);
          return `<p><a href="/mock/google?${query.toString()}">${email}</a></p>`;
        }).join('') + '</html>'); return;
      }
      if (path === '/mock/google') {
        const destination = new URL(url.searchParams.get('redirect_to'));
        if (destination.origin !== 'http://127.0.0.1:3110') return json(response, { error: 'Bad redirect' }, 400);
        const code = randomUUID(); codes.set(code, { id: url.searchParams.get('id'), challenge: url.searchParams.get('code_challenge') });
        destination.searchParams.set('code', code); response.writeHead(302, { Location: destination.toString() }); response.end(); return;
      }
      let text = ''; for await (const chunk of request) text += chunk;
      const body = text ? JSON.parse(text) : {};
      if (path === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'refresh_token') {
          const current = refreshes.get(body.refresh_token);
          if (!current || revoked.has(current.session)) return json(response, { error: 'invalid_grant' }, 401);
          return json(response, await token(current.id, current.session));
        }
        const pending = codes.get(body.auth_code); codes.delete(body.auth_code);
        const challenge = createHash('sha256').update(body.code_verifier || '').digest('base64url');
        if (!pending || challenge !== pending.challenge) return json(response, { error: 'invalid_grant', error_description: 'PKCE mismatch' }, 400);
        return json(response, await token(pending.id));
      }
      if (path.startsWith('/auth/v1/')) {
        let claims;
        try { claims = (await jwtVerify((request.headers.authorization || '').replace('Bearer ', ''), secret)).payload; }
        catch { return json(response, { message: 'Invalid JWT', code: 'bad_jwt' }, 401); }
        if (revoked.has(claims.session_id)) return json(response, { message: 'Revoked JWT', code: 'bad_jwt' }, 401);
        if (path === '/auth/v1/user') return json(response, await user(claims.sub));
        if (path === '/auth/v1/logout') { revoked.add(claims.session_id); return json(response, {}); }
      }
      if (path.startsWith('/rest/v1/')) {
        if (request.headers.authorization !== `Bearer ${mockKey}`) return json(response, { message: 'Private data', code: '42501' }, 403);
        if (path.startsWith('/rest/v1/rpc/')) {
          const name = path.split('/').at(-1);
          if (raid && ['consume_auth_limit','create_boss_raid_room','join_boss_raid','leave_boss_raid_lobby','reserve_raid_hero','start_boss_raid','finish_boss_raid','submit_boss_raid_answer','report_raid_visibility','get_private_raid_snapshot'].includes(name)) {
            const keys=Object.keys(body);const result=await db.query(`select public.${identifier(name)}(${keys.map((key,i)=>`${identifier(key)}=>$${i+1}`).join(',')}) as r`,keys.map(key=>body[key]));
            return json(response,result.rows[0].r);
          }
          if (['resolve_google_account','student_account_operation','manage_teacher_access','join_google_classroom'].includes(name)) return json(response, await rpc(db, name, body));
          if (!['close_game_session','delete_question_set_safely','submit_classroom_answer','activate_classroom_power'].includes(name)) return json(response, { message: 'Unsupported fixture RPC' }, 404);
          const keys = Object.keys(body);
          const result = await db.query(`select * from public.${identifier(name)}(${keys.map((key,i)=>`${identifier(key)}=>$${i+1}`).join(',')})`, keys.map(key=>body[key]));
          return json(response, name.startsWith('submit_') || name.startsWith('activate_') ? Object.values(result.rows[0])[0] : result.rows);
        }
        const table = path.split('/').at(-1);
        if (!tables.has(table)) return json(response, { message: 'No fixture table' }, 404);
        const parameters = [], where = [], joined = table === 'participants' && url.searchParams.get('select')?.includes('game_sessions!inner');
        for (const [key, value] of url.searchParams) {
          if (['select','order','limit','offset','on_conflict','columns'].includes(key)) continue;
          const column = key.startsWith('game_sessions.') ? 'g.' + identifier(key.split('.')[1]) : 't.' + identifier(key);
          if (value === 'not.is.null') { where.push(`${column} is not null`); continue; }
          if (value === 'is.null') { where.push(`${column} is null`); continue; }
          const split = value.indexOf('.'), operator = value.slice(0,split), target = value.slice(split+1);
          if (operator === 'in') {
            const values = target.slice(1,-1).split(',').map(v=>v.replace(/^"|"$/g,''));
            where.push(`${column} in (${values.map(v=>{ parameters.push(v); return '$'+parameters.length; }).join(',')})`);
          } else {
            if (!['eq','neq','ilike','gte','lt'].includes(operator)) throw new Error('Unsupported fixture filter');
            parameters.push(target); where.push(`${column} ${ {eq:'=',neq:'<>',ilike:'ilike',gte:'>=',lt:'<'}[operator] } $${parameters.length}`);
          }
        }
        const filter = where.length ? ' where '+where.join(' and ') : '';
        let rows;
        if (request.method === 'GET' || request.method === 'HEAD') {
          const order = url.searchParams.get('order')?.split(',').map(value=>{ const [field,dir] = value.split('.'); return `t.${identifier(field)} ${dir==='desc'?'desc':'asc'}`; }).join(',');
          const limit = url.searchParams.has('limit') ? ` limit ${Math.max(0,Math.min(1000,Number(url.searchParams.get('limit'))||0))}` : '';
          rows = (await db.query(`select t.*${joined?',jsonb_build_object(\'room_code\',g.room_code,\'status\',g.status) game_sessions':''} from public.${identifier(table)} t ${joined?'join public.game_sessions g on g.id=t.session_id':''}${filter}${order?' order by '+order:''}${limit}`, parameters)).rows;
          if (table === 'question_sets' && url.searchParams.get('select')?.includes('questions(')) {
            for (const row of rows) row.questions = (await db.query('select points from questions where question_set_id=$1', [row.id])).rows;
          }
        } else if (request.method === 'POST') {
          rows = [];
          for (const row of Array.isArray(body)?body:[body]) {
            const keys = Object.keys(row), values = keys.map(key=>row[key]);
            const result = await db.query(`insert into public.${identifier(table)}(${keys.map(identifier).join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`, values); rows.push(...result.rows);
          }
        } else if (request.method === 'PATCH') {
          const assignments = Object.keys(body).map(key=>{ parameters.push(body[key]); return `${identifier(key)}=$${parameters.length}`; });
          rows = (await db.query(`update public.${identifier(table)} t set ${assignments.join(',')}${filter} returning t.*`, parameters)).rows;
        } else if (request.method === 'DELETE') rows = (await db.query(`delete from public.${identifier(table)} t${filter} returning t.*`, parameters)).rows;
        // PGlite exposes NUMERIC as strings; PostgREST JSON exposes numbers.
        for (const row of rows || []) for (const key of ['score','raw_score','average_score','score_awarded','base_score_awarded','power_bonus_awarded']) {
          if (row[key] != null) row[key] = Number(row[key]);
        }
        if (request.headers.accept?.includes('vnd.pgrst.object')) return json(response, rows?.[0] || null);
        return json(response, rows || []);
      }
      return json(response, { error: 'Unsupported fixture endpoint' }, 404);
    } catch (error) {
      console.error('mock-supabase:', error.message);
      json(response, { message: error.message, code: error.code || 'MOCK_ERROR' }, 400);
    }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: async () => { await new Promise(resolve=>server.close(resolve)); await db.close(); } };
}
