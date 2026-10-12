import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','-p','3120'],{windowsHide:true,stdio:'inherit',env:{...process.env,DATA_BACKEND:'local',AUTH_MODE:'legacy',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3120',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3121',SUPABASE_SERVICE_ROLE_KEY:'unused-local-scene-preview',AUTH_SESSION_SECRET:'local-development-scene-fixture-secret-only'}});
process.on('SIGTERM',()=>server.kill());process.on('SIGINT',()=>server.kill());server.on('exit',code=>process.exit(code??0));
