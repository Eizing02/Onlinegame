# Database Schema

Migration หลักอยู่ที่ `supabase/migrations/001_initial_schema.sql`

แนวคิดสำคัญ: โหมด local ยังอ่านบัญชีจาก `data/student.csv` ได้ แต่โหมด Supabase ใช้ตาราง `accounts` เพื่อให้ deploy จริงได้ง่ายขึ้น

ตารางหลัก:

- `accounts` บัญชีครู/นักเรียนจากชีท มี `user_code`, `password`, `display_name`, `grade`, `role`
- `question_sets` ชุดคำถามถาวรของครู อ้างอิงด้วย `teacher_code`
- `questions` คำถามในแต่ละชุด
- `game_sessions` ห้องเกมแต่ละรอบ อ้างอิง `teacher_code` และ `question_set_id`
- `teams` ทีมในรอบนั้น
- `participants` นักเรียนที่เข้าร่วมรอบนั้น อ้างอิงด้วย `student_code`
- `answers` คำตอบที่ส่งในรอบนั้น
- `game_events` event สำคัญของเกม เช่น join, start, submit, end

ฟิลด์ gameplay ที่ต้องรองรับ:

- `teams.locked_member_count` จำนวนสมาชิกที่ล็อกตอนเริ่มเกม ใช้เป็นตัวหารคะแนนเฉลี่ย
- `teams.raw_score` คะแนนรวมดิบจากสมาชิกที่ตอบถูก
- `teams.average_score` คะแนนเฉลี่ยที่ใช้แสดงผลและจัดอันดับ
- `participants.joined_after_start` ระบุว่านักเรียนเข้าหลังครูเริ่มเกมหรือไม่
- `participants.is_score_eligible` ระบุว่านักเรียนมีสิทธิ์ร่วมคะแนนในรอบนั้นหรือไม่
- `participants.last_seen_at` ใช้ช่วย reconnect/online status
- `game_sessions.started_at` เวลาที่ครูกดเริ่มเกม
- `game_sessions.ended_at` เวลาที่จบเกม
- `answers.question_index` คำถามที่ตอบ
- `answers.student_code` นักเรียนที่ส่งคำตอบ
- `answers.team_id` ทีมของนักเรียนตอนส่งคำตอบ
- `answers.answer_text` คำตอบที่ส่ง
- `answers.is_correct` ผลตรวจคำตอบ
- `answers.score_awarded` คะแนนที่ได้จากคำตอบนั้น
- `answers.submitted_at` เวลาส่งคำตอบ

ข้อจำกัดสำคัญ:

- กันตอบซ้ำด้วย unique key: `game_session_id + question_index + student_code`
- ทีมที่ `locked_member_count = 0` ไม่ถูกนำไปจัดอันดับ
- ถ้า `average_score` เท่ากัน ให้เป็นอันดับร่วม
- นักเรียนที่ `is_score_eligible = false` ส่งคำตอบได้เฉพาะถ้าต้องการเก็บข้อมูลเพื่อดูย้อนหลัง แต่ไม่บวกคะแนน
- Late join หลังเริ่มเกมต้องไม่เพิ่ม `locked_member_count`

ข้อมูลที่ตั้งใจให้คงอยู่:

- ชุดคำถาม
- คำถามในชุดคำถาม

ข้อมูลที่ตั้งใจให้เป็นรายรอบ:

- ห้องเกม
- ทีม
- ผู้เข้าร่วม
- คำตอบ
- event
- สรุปผลหลังจบเกม

Server actions ตรวจ session และ role ฝั่ง Server ก่อนเขียนข้อมูลจริงผ่าน Supabase service role key โหมด legacy ตรวจบัญชีเดิม ส่วน Google ตรวจ Supabase Auth และสิทธิ์ปัจจุบันในฐานข้อมูล

โหมด backend:

- `DATA_BACKEND=local` ใช้ `data/*.json` และ `data/student.csv`
- `DATA_BACKEND=supabase` ใช้ตาราง Supabase ทั้งหมดผ่าน server-side service role

## Google Auth — migration 008

Google mode (`AUTH_MODE=google`) ต้องใช้ Supabase backend โดยเพิ่ม [008_google_auth_identity_and_teacher_access.sql](../supabase/migrations/008_google_auth_identity_and_teacher_access.sql) ต่อจาก 001–007:

| ตาราง | หน้าที่และข้อจำกัด |
|---|---|
| `account_identities` | PK `auth_user_id` อ้าง `auth.users`; UNIQUE `user_code` อ้าง `accounts` ป้องกันผูกซ้ำทั้งสองด้าน |
| `teacher_access` | สิทธิ์ `super_admin`/`teacher` และสถานะ `pending`/`active`/`suspended`; Google email lowercase UNIQUE; ต้องอ้างบัญชี role teacher |
| `account_link_audit` | Audit การผูก ย้ายรหัส เพิ่ม/แก้ครู Bootstrap และ recovery; ไม่แก้หรือตามย้ายประวัติคำตอบ |
| `auth_rate_limits` | ตัวนับแบบ fixed window ใน DB ร่วมทุก instance รวมความพยายามที่ไม่สำเร็จ |

`accounts.password` อนุญาต NULL สำหรับครู Google ใหม่ แต่คง password ของบัญชีเดิมและคีย์ทุกบัญชี `accounts.role` ยังเป็น teacher/student; access level แยกอยู่ใน `teacher_access` ไม่เปลี่ยน schema เกมหรือสูตรคะแนน

ตารางใหม่เปิด RLS โดยไม่มี policy ให้ browser; ถอน grants จาก PUBLIC/anon/authenticated ใช้ RPC ผ่าน trusted server/service role เท่านั้น การเปลี่ยนรหัสล็อก identity/account และปฏิเสธรหัสที่มี participant ในห้องไม่จบ Google join ใช้ `join_google_classroom` ร่วมล็อก identity เพื่อไม่ให้แข่งกับการย้ายรหัส ประวัติ `participants.student_code` และ `answers.student_code` คงเดิม

ดู [setup/backup/rollback](google-auth-setup.md), [recovery](google-auth-recovery.md) และ [ผลทดสอบ](google-auth-handover.md) ก่อนใช้กับฐานข้อมูลจริง
