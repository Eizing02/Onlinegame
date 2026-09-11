# Supabase Setup

เอกสารนี้ใช้เมื่อต้องการย้ายระบบจาก local JSON ไปใช้ Supabase เป็น backend จริง

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
```

schema นี้มีตาราง:

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
- Realtime publication สำหรับ `game_sessions`, `teams`, `participants`, `answers`, `game_events`

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
```

## 5. สิ่งที่ยังใช้ Server API

ระบบยังคงให้ Next.js server actions/API เป็นตัวเขียนข้อมูล ไม่ให้ browser เขียน database โดยตรง เหตุผลคือระบบ login ตอนนี้เป็นรหัสจากชีท/ตาราง `accounts` ไม่ใช่ Supabase Auth เต็มรูปแบบ

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
