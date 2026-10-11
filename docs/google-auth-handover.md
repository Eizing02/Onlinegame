# ส่งมอบ Google Auth, Student Linking และ Teacher RBAC

ตรวจและพัฒนาวันที่ 11 ตุลาคม 2569 บน branch `feat/google-auth-teacher-rbac` เริ่มจาก `38371448ad1c00b7cbe8c4a08d0119e14bc97b66` ซึ่งตรงกับ `origin/main` ตอนเริ่มงาน ไม่ deploy และไม่แก้ Supabase จริง

**โค้ดพร้อมให้ผู้ดูแลตั้งค่าและทดสอบ Staging แต่ยังไม่ผ่าน Google OAuth จริงหรือ PostgreSQL หลาย connection** ค่าเริ่มต้นยังเป็น `AUTH_MODE=legacy` ต้องรัน migration 008 เปิด Google Provider ตั้ง environment จริงและ build ใหม่ก่อนใช้ Google mode

## 1. สิ่งที่ Implement

- **Google Auth:** `/login` ปุ่ม Google เดียวใน Google mode, Supabase SSR/PKCE, callback ที่ใช้ origin กำหนดไว้, proxy refresh, ตรวจ `getUser()` และ verified `getClaims()` ก่อนอ่านสิทธิ์จริงจาก DB ไม่อ่าน role/email จากข้อมูลที่ browser แก้ได้
- **Student:** กรอกรหัส 5 หลักแบบ TEXT เก็บเลขศูนย์หน้า รองรับเลขไทย/fullwidth ดูชื่อและชั้น แก้ก่อนยืนยัน ผูกครั้งเดียวแล้ว login ข้ามหน้ารหัส มี `/account` ดูข้อมูลและเปลี่ยนรหัสแบบ atomic โดยจำกัดความพยายามและห้ามย้ายระหว่างมีเกมไม่จบ ประวัติคำตอบ/คะแนนไม่ย้ายตามรหัส
- **Teacher:** ครูมีรหัสแยก เช่น `T000001` และไม่มีรหัสผ่านเริ่มต้น ครูอีเมลใน allowlist ที่ active login แล้วผูกอัตโนมัติ สถานะ pending/suspended ถูกปฏิเสธคำขอถัดไป เจ้าของข้อสอบและห้องถูกตรวจจาก session ฝั่ง Server
- **Super Admin:** Google ที่ยืนยันแล้วของ `piyawatpiwsiri@gmail.com` bootstrap บัญชี admin เดิม โดยรักษาตัวพิมพ์และ FK มีหน้าค้นหา/แบ่งหน้า/เพิ่มครู/แก้ชื่อ/เปิดหรือระงับครู พร้อมจำนวนชุดคำถามและห้อง active ป้องกันปิดสิทธิ์ตนเองหรือผู้ดูแลคนสุดท้าย
- **Database/session:** ตาราง identity, teacher access, audit และ rate limits พร้อม UNIQUE/FK/RLS/private RPC คง `accounts.role=teacher/student` และ `session.userCode` สำหรับเกมเดิม Session ID อิง Auth UUID + Supabase session UUID + รหัสปัจจุบัน จึงไม่เปลี่ยนเพราะ refresh token แต่เปลี่ยนเมื่อบัญชีหรือรหัสเปลี่ยน

UI ภาษาไทยใช้ระบบเดิม ตรวจด้วย Impeccable audit/adapt/harden/polish และผู้ตรวจแยกให้ **ship** สำหรับ UI ที่ตรวจ ไม่เปลี่ยนกติกาคะแนน โหมดเกม เอฟเฟกต์หรือหน้าเกมเดิม

## 2. Changed Files

เส้นทางในตารางอ้างจาก root repository รายชื่อรวมไฟล์ใหม่และไฟล์แก้ของงาน Auth นี้ งานอัปเดต skill/config/AGENTS ที่มีอยู่ก่อนถูกเก็บไว้แยกจากงาน Auth

| ไฟล์ | การเปลี่ยน |
|---|---|
| `supabase/migrations/008_google_auth_identity_and_teacher_access.sql` | Schema/RLS/grants/role triggers, rate limits, verified Google identity, bootstrap, claim/switch, teacher administration, Google join |
| `src/lib/auth/mode.ts` | Feature flag/backend validation, exact trusted origin |
| `src/lib/auth/google-identity.ts` | Google verified identity/OAuth AMR/session UUID และ normalize รหัสนักเรียน |
| `src/lib/auth/google-session.ts` | ตรวจ Supabase/DB ต่อ request, account states และ stable session ID |
| `src/lib/auth/account-linking.ts`, `auth-messages.ts` | RPC การผูก/ย้าย/preview, network HMAC, ข้อผิดพลาดภาษาไทย |
| `src/lib/auth/teacher-access.ts` | Service สำหรับผู้ดูแลและชนิดข้อมูลครู |
| `src/lib/auth/accounts.ts`, `session.ts`, `api-session.ts` | แยก Google/legacy, Page/API/Admin guards, Origin และ stale session checks |
| `src/lib/supabase/server.ts`, `src/proxy.ts` | SSR cookies HttpOnly/Lax/Secure และ token refresh |
| `src/types/auth.ts`, `database.ts` | Session Google/RBAC, nullable password และตารางใหม่ |
| `src/app/auth/actions.ts`, `src/app/auth/callback/route.ts` | Google sign-in/callback, logout และล้าง cookies แม้ Auth ล่ม |
| `src/app/login/page.tsx`, `google-login-form.tsx`, `src/app/page.tsx` | Login ตามโหมดและ redirect ตามสิทธิ์/สถานะ |
| `src/app/verify-student/page.tsx`, `src/app/account/page.tsx`, `src/app/access-denied/page.tsx` | หน้าตรวจรหัส บัญชี และปฏิเสธสิทธิ์; dynamic เพื่อรองรับ runtime flag |
| `src/components/auth/student-link-form.tsx` | Input/preview/edit/confirm, loading lock, error/retry และ change-code flow |
| `src/app/api/auth/student/[operation]/route.ts` | Private authenticated lookup/claim/change-code API พร้อม Origin/session checks |
| `src/app/admin/teachers/page.tsx`, `actions.ts`, `teacher-form.tsx` | รายชื่อครู/ค้นหา/แบ่งหน้า/เพิ่ม/แก้/สถานะ และ Server Action guard |
| `src/components/layout/app-shell.tsx`, `src/app/globals.css` | เมนูตาม role/access level, link บัญชีและ responsive forms |
| `src/app/join/actions.ts`, `src/lib/data/game-sessions.ts`, `supabase-game-sessions.ts` | ส่ง verified Auth UUID ให้ atomic Google join โดยคง flow legacy |
| `scripts/seed-supabase.mjs` | เพิ่มเฉพาะบัญชีที่ขาด ไม่ทับชื่อ/role/password/NULL หรือเปลี่ยน canonical account key |
| `tests/google-identity.cjs`, `google-services.cjs`, `sql-google-auth.mjs` | Identity/config/ownership, HTTP adapter integration และ SQL assertions |
| `tests/helpers/google-database.mjs`, `mock-supabase.mjs` | ฐานข้อมูลและ OAuth/REST fixture เฉพาะ test ไม่มี bypass ใน production app |
| `tests/google/auth.spec.ts`, `playwright.google.config.ts`, `scripts/start-google-test-server.mjs` | Google mock E2E และ UI evidence |
| `tests/staging-google-races.mjs` | Opt-in concurrent transactions ใน Supabase project สำหรับทดสอบ |
| `scripts/start-test-server.mjs`, `playwright.config.ts` | แยก test legacy และ Google โดยไม่อ่านข้อมูลผู้ใช้จริง |
| `tests/room-tabs.spec.ts` | รอ transition ของปุ่มจบก่อนวัด contrast ป้องกัน axe วัดสีระหว่าง interpolation |
| `package.json`, `.env.local.example`, `README.md` | คำสั่ง test, ตัวอย่าง environment และ flow/routes ใหม่ |
| `docs/supabase-setup.md`, `database-schema.md` | ลำดับ migrations, schema Auth และ private Realtime invalidation เดิม |
| `docs/google-auth-setup.md`, `google-auth-recovery.md`, `google-auth-testing.md`, `google-auth-handover.md` | Setup/backup/rollback/recovery/test/ส่งมอบ |
| `.impeccable/surfaces/src-app-login-page-tsx.md`, `docs/google-ui-audit-report.md` | Direction ของ extension และขอบเขตหลักฐานการตรวจ UI |

## 3. SQL Migrations

ฐานข้อมูลที่มี 001–007 แล้วรัน **008 เพียงไฟล์เดียว** ฐานข้อมูลใหม่รัน 001 → 008 ตามลำดับ Migration เก่า 001–007 ไม่แก้ไข สำรอง schema/data และทดลอง restore ใน Staging ก่อนทำจริง

008 ไม่ reset/drop ตารางเกม ไม่แก้ primary key/FK ของข้อมูลเดิม และไม่ rewrite participants/answers เปิด `accounts.password` ให้ NULL เฉพาะรองรับ Google-only account โดยไม่ได้ลบรหัสผ่านเดิม ตารางใหม่เปิด RLS และถอนสิทธิ์ PUBLIC/anon/authenticated; browser เรียก RPC ใหม่ไม่ได้ Trusted server ใช้ service role และ RPC ตรวจ Google/สิทธิ์จากฐานข้อมูลอีกชั้น

Bootstrap จะหยุดเมื่อ admin ไม่มี/ซ้ำ/role ผิด/identity ชน ไม่ยึดบัญชีอัตโนมัติ Seed บัญชีไม่ upsert ทับข้อมูลเดิม แต่ seed ชุดคำถามยัง upsert จึงไม่ต้อง seed ฐานข้อมูลเดิมใหม่เพื่อเปิด Auth

Rollback เก็บ 008/mapping/audit แล้วกลับ `AUTH_MODE=legacy` เฉพาะหลังประเมิน password และสิทธิ์เดิม ครู Google-only ที่ password NULL เข้า legacy ไม่ได้ และ legacy ไม่บังคับ teacher allowlist แบบ Google ห้ามสร้าง shared/default password เพื่อแก้ ดู [คู่มือ](google-auth-setup.md)

## 4. Environment และ Manual Setup

ตั้ง `DATA_BACKEND=supabase`, `AUTH_MODE=google`, `NEXT_PUBLIC_SUPABASE_URL`, public anon/publishable key, `SUPABASE_SERVICE_ROLE_KEY` **ฝั่ง Server เท่านั้น**, `SUPER_ADMIN_EMAIL` และ `NEXT_PUBLIC_APP_URL` เป็น HTTPS origin จริง ไม่มี path/query/fragment ต้องตั้ง public environment ก่อน build

Google Cloud ต้องสร้าง OAuth Web client/consent screen/test users แล้วคัดลอก **Supabase Provider Callback URL** ไป Authorized redirect URIs เปิด Google Provider และตั้ง Client ID/Secret ใน Supabase ตั้ง Next `/auth/callback` แบบ exact URL ใน Supabase redirect allowlist Google Client Secret ไม่อยู่ใน Next client

ทำตาม [คู่มือทีละขั้นพร้อมตำแหน่งภาพประกอบ](google-auth-setup.md) งานนี้ไม่แก้ `.env.local` หรือ Provider/hosting/Production ใด ๆ Build สำหรับทดสอบที่มีอยู่ใช้ public URL fixture ต้อง build ใหม่ด้วยค่าจริงก่อน deploy

## 5. Security Review

- **ยกระดับสิทธิ์:** ไม่รับ role/teacher code/email จาก client เป็นหลักฐาน ตรวจ Google identity ที่ยืนยันอีเมล, OAuth AMR และ matching subject/session UUID ใช้สิทธิ์ปัจจุบันใน DB แม้เปิดแท็บเดิม ครูทั่วไปเรียก management ไม่ได้ และ Super Admin ไม่ได้รับทางลัดแก้ข้อสอบผู้อื่น
- **Ownership:** Teacher Pages/APIs/Server Actions ใช้ `session.userCode` ฝั่ง Server แทน posted teacher code บริการข้อมูลตรวจ owner ก่อนอ่าน/เขียน/ลบข้อสอบหรือควบคุมห้อง ทดสอบ foreign IDs และยืนยันข้อมูลเจ้าของไม่เปลี่ยน
- **ผูกซ้ำ/ย้ายรหัส:** PK/UNIQUE เป็นข้อบังคับจริง Transaction ล็อก identity/email/account; account rows ล็อกตามลำดับ Google join ร่วมล็อก identity จึงไม่ปล่อยให้เปลี่ยนรหัสผ่านระหว่าง join Audit เขียนใน transaction เดียว ห้ามย้ายเมื่อรหัสเก่าหรือใหม่มี participant ในห้องไม่จบ รวมผู้ที่ออกทีมไปแล้ว
- **CSRF/callback:** API mutation ใน Google mode ตรวจ exact Origin; Server Actions ใช้การตรวจ origin ของ Next.js Callback ใช้ configured origin ไม่รับ next/Host/forwarded Host เป็นปลายทาง PKCE และ Supabase ดูแล OAuth exchange
- **Rate/privacy:** DB fixed windows ข้าม instance ตรวจรหัส 10/10 นาที, claim 5/10 นาที, switch 2/24 ชั่วโมง นับ failures Preview เฉพาะรหัสที่ถาม แสดงรหัส/ชื่อ/ชั้น ไม่มี bulk student list หรือ Gmail ของผู้ครอบครอง เพิ่ม network HMAC limit เมื่อใช้ forwarded IP ที่ hosting ควบคุม
- **Session/secrets:** Google mode ไม่ยอมรับ legacy cookies/password ตรวจ Auth แบบ authoritative ต่อ request, cache เฉพาะใน request, private/no-store, stale client session ถูกปฏิเสธ Logout ล้าง Supabase/legacy cookies แม้ endpoint ล้มเหลว Service key ไม่อยู่ใน client imports/bundle ไม่มี token/email/SQL detail ใน Auth logs ของโค้ดใหม่

## 6. Test Results

ผลจากการรันจริงในเครื่องนี้ แยก fixture ออกจาก environment จริงอย่างชัดเจน

| สถานะ | คำสั่ง/หลักฐาน | ผลและขอบเขต |
|---|---|---|
| PASS | `npm run lint` | ไม่มี error/warning ในการตรวจล่าสุด |
| PASS | `npx tsc --noEmit` | TypeScript ผ่าน |
| PASS | `npm run build` | Production build ผ่าน หน้าที่ขึ้นกับ Google mode เป็น dynamic |
| PASS | `npm run test:data` | เกม local เดิม รวม concurrent join/answer/ownership/scoring ผ่าน |
| PASS | `npm run test:sql` | Scoring RPC เดิมและ Google SQL ผ่าน; PGlite Auth **68 assertions** รวม upgrade, verified identity, constraints, permissions, forced rollback, canonical teacher-code collision และประวัติเดิม |
| PASS | `npm run test:auth` | Identity/config/origin, Supabase service ownership และ SQL 68 assertions; HTTP mock 10 concurrent claims สำเร็จหนึ่ง และคนเดียวผูกสองรหัสได้หนึ่ง |
| PASS | `npm run test:e2e` | Legacy **15 tests** ผ่าน รวม login/ownership/gameplay/room tabs/swipe/draft/score feedback |
| PASS | `npm run test:e2e:google` ก่อนเพิ่ม test เกมเต็มรอบ | Google mock **7 tests** ผ่าน: PKCE/preview/edit/claim/re-login/change-code/refresh/limits/roles/suspend/join/negative tests/UI |
| PASS | `npm run test:e2e:google -- --grep 'Google gameplay'` | Test เพิ่มเล่นสองข้อด้วย Google ผ่านจริง: reload ทีมเดิม, พลัง +50%, ส่งคำตอบ/ซ่อนคะแนน/ล็อก/เฉลย/ข้อถัดไป/จบ และ login ใหม่; คะแนน 15 + 15 = 30 ตามกติกาเดิม |
| PASS | `npm run test:e2e:google -- --grep-invert 'Google surfaces'` | 7 functional tests ผ่านพร้อมกันในรอบสุดท้ายหลังเพิ่มเกมเต็มรอบ ส่วน UI capture test ที่ผ่านก่อนหน้าคงหลักฐานเดิม |
| PASS | UI screenshots/axe และ finish review | 21 states ที่ 1440/390/320px ไม่มี axe violation หรือ horizontal overflow ผู้ตรวจให้ ship ในขอบเขต UI extension |
| NOT_RUN | `npm run test:staging:auth` | สคริปต์รันแล้วรายงาน NOT_RUN เพราะไม่มี isolated staging credentials/verified users ไม่ใช่ผล PASS |
| NOT_RUN | Google Cloud/Supabase OAuth จริง | ไม่มีบัญชี/Provider Staging ที่ตั้งค่าพร้อมใช้งาน จึงยังไม่รับรอง Google login จริง |
| NOT_RUN | PostgreSQL หลาย connection/10–50 concurrent load จริง | PGlite serializes queries แม้ส่ง HTTP พร้อมกัน สคริปต์ Staging เตรียม teacher-add/10 duplicate claims/one-user-two-code/join-vs-switch races ต้องใช้ admin และ Google นักเรียนทดสอบสามบัญชี ไม่ยิง Production |
| NOT_RUN | Realtime/หลาย instance/มือถือจริง/recovery restore | ต้องทดลองใน Staging จริง รวมรอบเกมจาก Google หลายบัญชี, network outage และ backup/restore |

รวม test Google ที่รันผ่านมี **8 tests** นับ UI audit เดิมและ test เกมเต็มรอบที่เพิ่มภายหลัง Fixture เต็มรอบใช้ rules v2 และ frozen questions เหมือนห้องใหม่จริง แปลง NUMERIC ของ PGlite ให้ตรง JSON number ของ PostgREST ผล mock ไม่ใช่ผล concurrency/Realtime ของ Supabase จริง

รายละเอียดขอบเขตภาพ/คะแนน audit/performance ที่ไม่ได้วัด: [Google UI audit](google-ui-audit-report.md) รายละเอียด fixture/คำสั่ง: [testing](google-auth-testing.md) ภาพ/trace อยู่ tmp/test-results ที่ git ignore ไม่ใช่ไฟล์ส่งขึ้น repo

## 7. Known Limitations / Risks

**Google + รหัส 5 หลักไม่พิสูจน์เจ้าของรหัส** ผู้ที่ทราบรหัสผู้อื่นอาจผูกก่อน UNIQUE ป้องกันผูกซ้ำแต่ไม่พิสูจน์ความเป็นเจ้าของ ต้องมีครูตรวจทะเบียนกรณีพิพาทตาม [recovery procedure](google-auth-recovery.md) ห้ามถือเป็นระบบยืนยันผู้เข้าสอบทางการ

Rate limits เป็น fixed window ไม่ใช่ rolling window และผู้ดูแลต้องกำหนด retention ของ audit การย้ายรหัสไม่ย้ายประวัติคะแนน เมนูผู้ดูแลไม่แก้ Gmail/access level หรือยึดบัญชีอัตโนมัติ การเปลี่ยนอีเมลครูเป็นงาน recovery แยก

การตรวจ provider ใช้นโยบาย Google-only อย่างเข้มงวด บัญชี Supabase ที่สร้างจาก email/password แล้ว link Google ภายหลังแต่ app metadata ยังระบุ provider=email จะถูกปฏิเสธ ต้องวางแผน migration บัญชีประเภทนี้กับผู้ดูแล ไม่แก้ metadata เพื่อผ่านการตรวจโดยไม่ตรวจตัวตน

Impeccable พบ design sidecar ที่ไม่ตรง DESIGN.md อยู่ก่อนงานนี้ บันทึกเป็น advisory และไม่แก้เอกสารหลัก ไม่มีการวัดประสิทธิภาพจริงหรือรับรอง WCAG ทั้งระบบจากผล axe เพียงอย่างเดียว

## 8. วิธีทดลองทีละขั้น

1. ตั้ง project Staging รัน migration 008 เปิด Google Provider และตั้ง environment/build ตาม setup
2. Google Login ผู้ดูแลหลัก → เชื่อม admin เดิม → dashboard ของห้องที่ยังเล่น หรือชุดคำถาม
3. “จัดการครู” → เพิ่ม Gmail/ชื่อ/เปิดใช้งาน → อีก browser/profile ใช้ Gmail ครูนั้น → มีพื้นที่ครูของตนเอง
4. ทดสอบครูสองบัญชีเข้าข้อสอบ/ห้องกันด้วย URL/API/POST ต้องถูกปฏิเสธ ระงับครูแล้วคำขอถัดไปจากแท็บเดิมต้องถูกปฏิเสธ
5. นักเรียน Google Login → กรอก 5 หลัก → preview → แก้รหัส → ยืนยัน → ใส่รหัสห้อง 4 หลัก/เลือกหรือสุ่มทีม → เล่น
6. ครูเริ่ม/ล็อก/เฉลย/ข้อถัดไป/จบ ตรวจพลังทีม คะแนนและทีมหลัง reload/reconnect
7. นักเรียนดู `/account` เปลี่ยนรหัสระหว่างห้องไม่จบต้องไม่ได้ หลังห้องจบตรวจเปลี่ยนได้ตาม limit และประวัติรหัสเก่ายังคงเดิม
8. Logout/re-login/switch Google account และสองแท็บต้องได้ identity ถูกต้อง นักเรียนที่ผูกแล้วข้ามหน้ารหัส

## 9. ก่อน Production

- สำรองและทดลอง restore ตรวจ migration history/canonical admin/Google verified identities/RLS/grants ใน Staging
- ตั้ง Google Cloud consent/provider/callback/allowlist และ public/server environment ของ domain จริง จากนั้น build ใหม่
- ทดสอบ Gmail จริงผู้ดูแล ครูสองคนและนักเรียนหลายบัญชี รวม suspended old tab, foreign IDs, concurrent claims, refresh และ Google gameplay กับ Realtime
- รัน opt-in PostgreSQL races ใน isolated project ตรวจหลาย instance และ load แบบควบคุมก่อนเปิดใช้หลายห้องเรียน
- จัดช่องทาง recovery/ข้อพิพาททะเบียน นโยบาย audit/privacy และ rollback ที่ไม่สร้าง default password
- จบห้องและวาง maintenance window ก่อนเปลี่ยนโหมด ให้ผู้ใช้ login ใหม่

ยังไม่ควรเปิด Google mode ให้ผู้ใช้ Production จนข้อที่เป็น NOT_RUN สำคัญผ่าน Staging และผู้ดูแลตรวจสิทธิ์ครบ งานนี้ไม่ได้ deploy/เปลี่ยนฐานข้อมูลจริงหรือ push main
