/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', 'src', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { normalizeStudentCode, isStudentCode, verifiedGoogleIdentity } = require('../src/lib/auth/google-identity.ts');
const id = '10000000-0000-4000-8000-000000000002';
const user = { id, email: 'Pupil@Example.com', email_confirmed_at: '2026-10-11T00:00:00Z', app_metadata: { provider: 'google' }, user_metadata: { email: 'piyawatpiwsiri@gmail.com', role: 'super_admin' }, identities: [{ provider: 'google', identity_data: { email: 'pupil@example.com', email_verified: true } }] };
const claims = { sub: id, session_id: '30000000-0000-4000-8000-000000000001', app_metadata: { provider: 'google' }, amr: [{ method: 'oauth' }] };
assert.equal(verifiedGoogleIdentity(user, claims).email, 'pupil@example.com');
assert.equal(verifiedGoogleIdentity({ ...user, email_confirmed_at: null }, claims), null);
assert.equal(verifiedGoogleIdentity({ ...user, app_metadata: { provider: 'email' } }, claims), null);
assert.equal(verifiedGoogleIdentity(user, { ...claims, sub: 'forged' }), null);
assert.equal(verifiedGoogleIdentity(user, { ...claims, session_id: 'forged' }), null);
assert.equal(verifiedGoogleIdentity(user, { ...claims, amr: [{ method: 'password' }] }), null);
assert.equal(verifiedGoogleIdentity({ ...user, identities: [{ provider: 'google', identity_data: { email: 'other@example.com', email_verified: true } }] }, claims), null);
assert.equal(verifiedGoogleIdentity({ ...user, identities: [{ provider: 'google', identity_data: { email: user.email, email_verified: false } }] }, claims), null);
for (const code of ['01234', '๐๑๒๓๔', '０１２３４', ' 01234 ']) { assert.equal(normalizeStudentCode(code), '01234'); assert.equal(isStudentCode(normalizeStudentCode(code)), true); }
for (const code of ['1234', '123456', 'ADMIN', '12 34', '01a34']) assert.equal(isStudentCode(normalizeStudentCode(code)), false);
const { getAuthMode, getTrustedAppUrl, isTrustedMutation } = require('../src/lib/auth/mode.ts');
delete process.env.AUTH_MODE;
process.env.DATA_BACKEND = 'local';
assert.equal(getAuthMode(), 'legacy');
process.env.AUTH_MODE = 'google';
assert.throws(getAuthMode, /AUTH_BACKEND_MISMATCH/);
process.env.DATA_BACKEND = 'supabase';
assert.equal(getAuthMode(), 'google');
process.env.AUTH_MODE = 'unsafe-mode';
assert.throws(getAuthMode, /AUTH_MODE_INVALID/);
process.env.NODE_ENV = 'production';
delete process.env.NEXT_PUBLIC_APP_URL;
assert.throws(getTrustedAppUrl, /AUTH_APP_URL_MISSING/);
for (const url of ['http://school.example', 'https://name:password@school.example', 'https://school.example/path', 'https://school.example/?next=elsewhere', 'https://school.example/#fragment', 'file:///']) {
  process.env.NEXT_PUBLIC_APP_URL = url;
  assert.throws(getTrustedAppUrl, /AUTH_APP_URL_INVALID/);
}
process.env.NEXT_PUBLIC_APP_URL = 'https://school.example';
assert.equal(getTrustedAppUrl().origin, 'https://school.example');
assert.equal(isTrustedMutation(new Request('https://school.example/api/auth/student/claim', { headers: { origin: 'https://school.example' } })), true);
assert.equal(isTrustedMutation(new Request('https://school.example/api/auth/student/claim', { headers: { origin: 'https://evil.example', host: 'school.example' } })), false);
assert.equal(isTrustedMutation(new Request('https://school.example/api/auth/student/claim')), false);
process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3110';
assert.equal(getTrustedAppUrl().origin, 'http://127.0.0.1:3110');
console.log('Google identity/mode/origin: verified OAuth, forged metadata rejection, student-code normalization, backend isolation and trusted redirect/CSRF configuration PASS');
