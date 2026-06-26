# Realtime Quiz Game

เกมตอบคำถามออนไลน์แบบกลุ่มสำหรับใช้คั่นเวลาในห้องเรียน เน้นเข้าใช้ง่ายและเล่นให้จบในคาบเดียว

## สถานะปัจจุบัน

- Login ด้วยรหัสจาก `data/student.csv`
- แยกครู/นักเรียนจากคอลัมน์ `role`
- ครูสร้างชุดคำถามได้
- ครูเพิ่มคำถาม คำตอบ คะแนน และเวลาต่อข้อได้
- ชุดคำถามบันทึกไว้ที่ `data/question-sets.json`
- ครูสร้างห้องเกมจากชุดคำถาม กำหนดจำนวนทีม/จำนวนคนต่อทีม และได้รหัสห้อง 4 หลัก
- ห้องเกมบันทึกไว้ที่ `data/game-sessions.json`
- นักเรียน login แล้วกรอกรหัสห้อง 4 หลัก
- นักเรียนเลือกทีมเอง หรือกดสุ่มทีมให้ระบบเลือกทีมที่ยังว่างให้
- นักเรียนเข้าหน้าเล่นและรอครูเริ่มเกม
- Dashboard ครูเห็นรายชื่อนักเรียนในทีม และอัปเดตเองแบบ polling
- ครูเริ่มเกมได้แม้ทีมไม่ครบ ถ้ามีนักเรียนอย่างน้อย 1 คน
- ครูควบคุมเกมได้: เริ่มเกม, ล็อกคำตอบ, เฉลย, ข้อถัดไป, จบเกม
- นักเรียนเห็นคำถามปัจจุบัน ส่งคำตอบได้ และตอบได้ 1 ครั้งต่อคำถาม
- ระบบรองรับ late join และ reconnect/refresh กลับเข้าห้องเดิม
- ระบบคิดคะแนนเฉลี่ยรายกลุ่ม และรองรับกรณีคะแนนเท่ากันเป็นอันดับร่วม
- มีหน้าสรุปผลหลังจบเกมเฉพาะรอบนั้น
- รองรับ backend 2 แบบ: local JSON และ Supabase ผ่าน `DATA_BACKEND`

## กติกาคะแนนที่วางไว้

```txt
คะแนนเฉลี่ยทีม = คะแนนรวมจากสมาชิกในทีมที่ตอบถูก / จำนวนสมาชิกในทีมตอนเริ่มเกม
```

- นักเรียนตอบรายคน
- คะแนนจากคำตอบถูกถูกรวมเข้าทีม
- จำนวนสมาชิกที่ใช้หารจะล็อกตอนครูกดเริ่มเกม
- ทีมที่คะแนนเฉลี่ยเท่ากันถือว่าเสมอกัน
- ทีมว่างไม่ถูกนำไปจัดอันดับ
- นักเรียนที่เข้าหลังเริ่มเกมเข้าได้ แต่ไม่ร่วมคะแนนรอบนั้น
- นักเรียนที่ refresh/reconnect ต้องกลับเข้าห้องเดิม ทีมเดิม และสถานะล่าสุด
- นักเรียน 1 คนตอบได้ 1 ครั้งต่อคำถาม
- เกมใช้สถานะ `lobby`, `question_active`, `answer_locked`, `showing_answer`, `ended`

## ไฟล์ข้อมูล

บัญชี login ใช้ไฟล์เดียว:

```txt
data/student.csv
```

โครง CSV ที่รองรับ:

```csv
id,name,password,grade,role,photo_url,is_first_login,created_at,updated_at
```

ชุดคำถามเก็บไว้ที่:

```txt
data/question-sets.json
```

ห้องเกมและทีมในรอบที่กำลังเล่นเก็บไว้ที่:

```txt
data/game-sessions.json
```

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Local JSON storage สำหรับ MVP ช่วงแรก
- Supabase schema/adapter สำหรับย้ายขึ้น backend จริง
- Playwright สำหรับ smoke และ flow test

## Getting Started

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

ถ้าจะใช้ Supabase ให้ดู [docs/supabase-setup.md](<D:\สื่อการสอน codex\realtime qa\realtime-quiz-game\docs\supabase-setup.md>)

## Routes

- `/` หน้าแรก
- `/login` หน้า login รวมครูและนักเรียน
- `/teacher/question-sets` หน้ารวมชุดคำถามของครู
- `/teacher/question-sets/[questionSetId]` หน้าเพิ่ม/ลบคำถามในชุดคำถาม
- `/teacher/rooms/new` หน้าสร้างห้องเกมและกำหนดจำนวนทีม
- `/teacher/rooms/[roomCode]/dashboard` Dashboard ครู ดูรหัสห้อง รายชื่อทีม และนักเรียนในทีม
- `/join` นักเรียนใส่รหัสห้อง เลือกทีม หรือสุ่มทีม
- `/play/[roomCode]` นักเรียนเข้าห้องเล่นและรอคำถามจากครู

## ตรวจสอบ

```bash
npm run lint
npm run build
npx playwright test "tests/smoke-login.spec.ts" "tests/question-sets.spec.ts" "tests/rooms.spec.ts" "tests/student-join.spec.ts" "tests/gameplay.spec.ts" --reporter=line
```
