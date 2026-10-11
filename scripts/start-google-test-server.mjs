import { spawn } from 'node:child_process';
import { startMockSupabase, mockKey } from '../tests/helpers/mock-supabase.mjs';
const mock = await startMockSupabase(3111, process.env.RUN_RAID_TESTS === '1');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-p','3110'], { stdio: 'inherit', env: { ...process.env,
  AUTH_MODE: 'google', DATA_BACKEND: 'supabase', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3110',
  BOSS_RAID_ENABLED: process.env.RUN_RAID_TESTS === '1' ? 'true' : 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3111', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-publishable-key', SUPABASE_SERVICE_ROLE_KEY: mockKey,
  SUPER_ADMIN_EMAIL: 'piyawatpiwsiri@gmail.com', AUTH_SESSION_SECRET: 'fixture-legacy-secret-only-12345678901234567890',
} });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { child.kill(signal); void mock.close(); });
child.on('exit', async code => { await mock.close(); process.exit(code ?? 0); });
