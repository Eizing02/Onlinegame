# การทดสอบ Google Auth

## Local แบบแยกข้อมูล

Unit/SQL ใช้ข้อมูลสมมติในหน่วยความจำ PGlite และเกมเดิมใช้ `tmp/e2e-data` ไม่อ่านบัญชีจริงหรือเขียน Supabase จริง

```powershell
npm run lint
npx tsc --noEmit
npm run test:data
npm run test:auth
npm run test:sql
```

ก่อน E2E ให้ build ด้วย public URL สำหรับ fixture (Next.js ฝัง public env ตอน build):

```powershell
$env:AUTH_MODE='legacy'
$env:DATA_BACKEND='local'
$env:NEXT_PUBLIC_APP_URL='http://127.0.0.1:3110'
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:3111'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='fixture-publishable-key'
$env:SUPABASE_SERVICE_ROLE_KEY='fixture-service-key-only'
npm run build
npm run test:e2e
npm run test:e2e:google
```

`test:e2e` เริ่มเกม legacy port 3100 ส่วน `test:e2e:google` เริ่ม Next production server port 3110 และ mock Supabase port 3111 ทดสอบ Google chooser จำลอง, OAuth code + SHA256 PKCE verifier, SSR exchange/cookie, token refresh, verified identity, RPC จาก migration จริง, UI/API, suspension, owner isolation และเกมสองข้อครบวงจรกับพลัง/คะแนน/refresh ไม่มี test bypass endpoint ใน Next.js แอป

อย่าใช้ build/environment fixture เพื่อ deploy จริง ตั้ง Environment ของโครงการจริงและ build ใหม่ก่อนใช้งานจริง Mock endpoints อยู่ใน `tests/helpers/mock-supabase.mjs` เท่านั้น ไม่ใช่ production route

ภาพและ axe report อยู่ `tmp/google-ui-audit`, เกมเดิมอยู่ `tmp/ui-audit` และ `tmp/room-tabs-audit` Testตรวจ 320/390/1440px ใช้ Chromium viewport emulation ไม่ใช่มือถือจริง ถ้า assertion ล้มเหลวให้ตรวจ trace ใน `test-results` ซึ่งอาจมี session ทดสอบ ห้าม commit trace/token

## PostgreSQL หลาย connection ใน Staging

PGlite ใช้ connection เดียว จึงไม่ใช่หลักฐานว่า advisory/row locks ทำงานเมื่อคนหลายคนส่งพร้อมกันจริง มีสคริปต์ opt-in `tests/staging-google-races.mjs` สำหรับส่ง RPC ผ่าน PostgREST จริง รวม 10 คำขอแย่งรหัสพร้อมกัน ให้ทำตามนี้ใน **Supabase project ที่แยกเพื่อทดสอบเท่านั้น**:

1. รัน migrations 001–008, มี admin เดิม, Google Provider เปิดและมีแอป Staging ตามคู่มือ setup
2. Google Login ผู้ดูแลหลักจนผูกแล้ว และ Google Login นักเรียนทดสอบสามบัญชี ให้หยุดที่ `/verify-student` โดยยังไม่ผูกรหัส จด Auth UUID จาก Dashboard ไม่ใช้ผู้เรียนจริง ใช้บัญชีทดสอบใหม่เพื่อไม่ชน rate limit จากการทดสอบครั้งก่อน
3. รหัส `98001`–`98004` ต้องยังไม่มีใน accounts หากมีสคริปต์จะหยุดก่อนสร้าง fixture ห้ามลบทิ้งเพื่อให้ testผ่าน
4. ตั้งค่าฝั่งเครื่องผู้ดูแลโดยไม่ใส่ secret ใน command ที่บันทึก/commit:

```dotenv
STAGING_TEST_ACK=isolated-test-project
STAGING_PROJECT_REF=YOUR_STAGING_REF
STAGING_SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
STAGING_SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_STAGING_KEY
STAGING_ADMIN_AUTH_USER_ID=VERIFIED_ADMIN_UUID
STAGING_PUPIL_A_AUTH_USER_ID=VERIFIED_UNLINKED_GOOGLE_UUID_A
STAGING_PUPIL_B_AUTH_USER_ID=VERIFIED_UNLINKED_GOOGLE_UUID_B
STAGING_PUPIL_C_AUTH_USER_ID=VERIFIED_UNLINKED_GOOGLE_UUID_C
```

5. `npm run test:staging:auth` ทดสอบเพิ่มครูอีเมลเดียวกันพร้อมกัน, 10 คำขอจาก A/B แย่งผูกรหัสเดียวกัน, C ผูกสองรหัสพร้อมกัน, join แข่งกับเปลี่ยนรหัส ต้องสำเร็จเพียงผลที่สอดคล้องกับข้อมูลใน DB สคริปต์สร้าง/ลบเฉพาะ fixture ที่ตรวจว่าไม่มีอยู่ก่อน เก็บ audit และ rate counters ไว้ ไม่ reset ตาราง ไม่ลบ Auth users
6. ถ้า process ถูกหยุดก่อน cleanup ให้ผู้ดูแลตรวจ fixture ของ run นั้นก่อนลบ ห้ามลบตาม prefix กว้าง หากไม่มี environment สคริปต์แสดง **NOT_RUN** ไม่ใช่ PASS

## Matrix ที่ผู้ดูแลต้องตรวจจริง

| รายการ | หลักฐาน local | ยังต้องตรวจจริง |
|---|---|---|
| Google PKCE/cookies/callback | E2E mock | Gmail/Google Cloud/Supabase ที่ตั้งจริง |
| Bootstrap admin/teacher allowlist | SQL + E2E | admin canonical key และ Auth identity ใน Staging |
| Student lookup/claim/change | SQL + E2E | ข้อมูลทดสอบถูกต้องและหลาย instance |
| Race/atomicity | UNIQUE และ forced rollback ใน PGlite + concurrent HTTP mock | `test:staging:auth` บน PostgreSQL จริง |
| Suspension/ownership | SQL + E2E + production Supabase service adapters ผ่าน HTTP mock | ครูจริงสองบัญชี, page/API/Server Actions ทุกงาน |
| Gameplay | Legacy E2E + Google สองข้อ/power/reveal/next/end/reload ผ่าน mock + scoring RPC | Google users เล่นเต็มรอบกับ Realtime จริง |
| Responsive/accessibility | Axe, keyboard, viewport/screenshots | มือถือจริงและ keyboard พิมพ์ภาษาไทย |
| Recovery/rollback | คู่มือพร้อม transaction checks | สำรอง/กู้คืนและทดลองย้ายสิทธิ์ใน Staging |

อ่าน [handover](google-auth-handover.md) สำหรับผลการรันที่บันทึกไว้ อย่าตีความว่ารายการที่มีคู่มือเป็นรายการที่รันผ่านแล้ว
