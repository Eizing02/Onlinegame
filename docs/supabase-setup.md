# Supabase Setup

เอกสารนี้ใช้เมื่อต้องการย้ายระบบจาก local JSON ไปใช้ Supabase เป็น backend จริง

สำหรับ Google Login ให้ทำตาม [คู่มือ Google Auth](google-auth-setup.md) เพิ่มเติม ใช้ `AUTH_MODE=legacy` จนกว่า Staging และ Provider settings จะพร้อม

[SQL สำหรับ Google Login พร้อมตรวจผลก่อน/หลังรัน](google-auth-sql.md): ฐานข้อมูลที่มี 001–007 แล้วเพิ่มเฉพาะ 008 สำหรับ Google Login

Boss Raid เป็นส่วนเพิ่มแยกต่างหาก: [คู่มือ migration 009 และ feature flag](boss-raid/deploy.md) ไม่รัน SQL เดิมซ้ำ และต้องผ่าน staging/ขออนุญาตก่อนแก้ Production ใช้ Google/RBAC เดิม ไม่มีการตั้ง OAuth เพิ่มสำหรับ Raid

## 1. สร้าง Project ใน Supabase

สร้าง project ใหม่ใน Supabase แล้วเตรียมค่า:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

นำค่าไปใส่ใน `.env.local`:

```env
DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 2. รัน Migration

ใช้ SQL จากไฟล์นี้กับ Supabase SQL Editor หรือ Supabase CLI:

```txt
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_enable_realtime_publication.sql
supabase/migrations/003_gameplay_flow_upgrades.sql
supabase/migrations/004_session_cleanup_functions.sql
supabase/migrations/005_question_types_and_images.sql
supabase/migrations/006_private_game_data.sql
supabase/migrations/007_team_power_scoring.sql
supabase/migrations/008_google_auth_identity_and_teacher_access.sql
```

schema นี้มีตาราง:

ฐานข้อมูลเดิมรันเฉพาะ migration ที่ยังไม่มี หลัง `006` Realtime เปิดเฉพาะ `game_session_updates` สำหรับแจ้งให้อ่านข้อมูลใหม่ เกม/คำตอบและข้อมูลส่วนตัวอ่านผ่าน Server ที่ตรวจสิทธิ์ ห้ามเปิด policy สาธารณะเก่ากลับมา

- `accounts`
- `question_sets`
- `questions`
- `game_sessions`
- `teams`
- `participants`
- `answers`
- `game_events`

และรองรับ:

- active room ของครู 1 ห้องต่อครั้ง
- รหัสห้อง 4 หลักไม่ซ้ำเฉพาะห้องที่ยัง active
- late join
- reconnect/last seen
- กันตอบซ้ำด้วย `session_id + question_index + student_code`
- คะแนนรวมและคะแนนเฉลี่ยทีม
- Realtime invalidation ผ่าน `game_session_updates` หลัง migration `006`; อ่านข้อมูลเกมจริงผ่าน Server

## 3. Seed บัญชีและชุดคำถาม

ตรวจว่าไฟล์ local ยังอยู่ในเครื่อง:

```txt
data/student.csv
data/question-sets.json
```

จากนั้นรัน:

```bash
npm run seed:supabase
```

สคริปต์นี้จะ:

- นำ `data/student.csv` เข้า `accounts`
- เพิ่มเฉพาะบัญชีที่ขาด โดยรักษา profile/password/role/คีย์เดิมและครู Google ที่ไม่มีรหัสผ่าน
- นำ `data/question-sets.json` เข้า `question_sets`
- นำคำถามเข้า `questions`

## 4. เปิดแอปด้วย Supabase Backend

```bash
npm run dev
```

ระบบจะใช้ Supabase เมื่อ `.env.local` มี:

```env
DATA_BACKEND=supabase
```

ถ้าต้องการกลับไปใช้ไฟล์ local:

```env
DATA_BACKEND=local
AUTH_MODE=legacy
```

## 5. สิ่งที่ยังใช้ Server API

ระบบยังคงให้ Next.js server actions/API เป็นตัวเขียนข้อมูล ไม่ให้ browser เขียน database โดยตรง โหมด legacy ตรวจ session จากบัญชีเดิม ส่วน Google mode ตรวจ Supabase Auth และสิทธิ์ปัจจุบันใน DB ก่อนใช้ server-side service role

ดังนั้น `SUPABASE_SERVICE_ROLE_KEY` ต้องอยู่เฉพาะฝั่ง server และห้ามเผยแพร่ใน client

## 6. ก่อน Push Git

ไม่ควร commit ไฟล์ข้อมูลจริง:

```txt
data/student.csv
data/question-sets.json
data/game-sessions.json
```

ไฟล์เหล่านี้ถูก ignore แล้ว ให้ commit เฉพาะไฟล์ตัวอย่าง:

```txt
data/student.example.csv
data/question-sets.example.json
data/game-sessions.example.json
```

## 7. ทดสอบ

โหมด local:

```bash
npm run lint
npm run build
npx playwright test "tests/smoke-login.spec.ts" "tests/question-sets.spec.ts" "tests/rooms.spec.ts" "tests/student-join.spec.ts" "tests/gameplay.spec.ts" --reporter=line
```

โหมด Supabase ต้องมี Supabase project จริงและ seed ข้อมูลก่อน แล้วจึงรัน flow ทดสอบด้วย browser หรือ Playwright เพิ่มเติม
