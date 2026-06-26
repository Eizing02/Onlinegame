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

Server actions ใช้ session จากชีทเพื่อตรวจ role ก่อนเขียนข้อมูลจริงผ่าน Supabase service role key

โหมด backend:

- `DATA_BACKEND=local` ใช้ `data/*.json` และ `data/student.csv`
- `DATA_BACKEND=supabase` ใช้ตาราง Supabase ทั้งหมดผ่าน server-side service role
