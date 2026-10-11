# Realtime Quiz Game

เกมตอบคำถามออนไลน์แบบกลุ่มสำหรับใช้คั่นเวลาในห้องเรียน เน้นเข้าใช้ง่ายและเล่นให้จบในคาบเดียว

## สถานะปัจจุบัน

- Login แบบ legacy จากข้อมูลบัญชีเดิม หรือ Google ผ่าน Supabase Auth เมื่อเปิด `AUTH_MODE=google` และตั้งค่าตามคู่มือ
- แยกครู/นักเรียนจาก `accounts.role`; Google mode เพิ่มสิทธิ์ Super Admin และสถานะครูใน `teacher_access`
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

ถ้าจะใช้ Supabase ให้ดู [Supabase setup](docs/supabase-setup.md) และ [Google Login / สิทธิ์ครู](docs/google-auth-setup.md)

ระบบรองรับ `AUTH_MODE=legacy` (ค่าเริ่มต้น) หรือ `google` ผ่าน Supabase Auth แบบ PKCE/SSR โดยคงข้อมูลเกมและกติกาคะแนนเดิม Google mode ปิดการเข้าระบบด้วยรหัสผ่านและ legacy cookie ต้องรัน migration `008` และตั้ง Provider/Environment ก่อนเปิดใช้จริง

นักเรียน Google ตรวจชื่อและชั้นก่อนเชื่อมรหัส 5 หลัก มีหน้าแก้รหัสภายหลัง ผู้ดูแลเพิ่มอีเมลครูและระงับสิทธิ์ได้ ครูแต่ละคนเห็นงานของตนเอง การผูกรหัส **ไม่พิสูจน์ว่าเป็นเจ้าของรหัส**; ดู [การผูกผิด/Recovery](docs/google-auth-recovery.md)

## Routes

- `/` หน้าแรก
- `/login` หน้า login รวมครูและนักเรียน
- `/auth/callback` OAuth callback ที่ตรวจตัวตนฝั่ง Server
- `/verify-student` ตรวจและยืนยันรหัสนักเรียนใน Google mode
- `/account` ข้อมูลบัญชีและเปลี่ยนรหัสนักเรียน
- `/admin/teachers` ผู้ดูแลหลักจัดการสิทธิ์ครู
- `/access-denied` อธิบายสิทธิ์ที่ยังใช้งานไม่ได้และออกจากระบบ
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
npm run test:auth
npm run test:sql
npm run test:data
npx playwright test "tests/smoke-login.spec.ts" "tests/question-sets.spec.ts" "tests/rooms.spec.ts" "tests/student-join.spec.ts" "tests/gameplay.spec.ts" --reporter=line
```

Google E2E จำลองใช้ `npm run test:e2e:google` ดู [วิธีทดสอบและผลที่ต้องตรวจใน Staging](docs/google-auth-testing.md) สำหรับ build ที่ใช้ URL fixture ต้อง rebuild ด้วย Environment จริงก่อนนำไป deploy Mock ทดสอบ PKCE/cookies/SSR/RPC ได้ แต่ไม่ใช่การรับรอง OAuth จริง

รายละเอียดไฟล์ที่เปลี่ยน ผลทดสอบ ความเสี่ยง และสิ่งที่ต้องทำก่อน Production อยู่ใน [รายงานส่งมอบ Google Auth](docs/google-auth-handover.md)
