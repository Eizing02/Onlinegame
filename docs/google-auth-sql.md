# SQL ที่ต้องรันสำหรับ Google Login

ฐานข้อมูลเดิมที่มี migrations 001–007 แล้ว ต้องเพิ่ม **008_google_auth_identity_and_teacher_access.sql** เพียงไฟล์เดียว ไม่มี migration 009 ในรอบนี้ ถ้าเคยรัน 008 รุ่นนี้ครบแล้ว ไม่ต้องเพิ่ม schema อีก ให้ใช้ postcheck ตรวจผล

## ลำดับใน Supabase SQL Editor

ทำกับ Staging ก่อน สำรอง schema และข้อมูลเดิมไว้ ใช้ SQL Editor ด้วยบัญชีผู้ดูแลฐานข้อมูล ไม่ใช่ browser anon key

1. เปิด [008_google_auth_precheck.sql](../supabase/checks/008_google_auth_precheck.sql) คัดลอกทั้งไฟล์ → New query → Run ตรวจความพร้อมของ schema 001–007, grants และบัญชีครูหลัก `admin`/`ADMIN` ต้องได้ `status=PASS` จด `data_counts` ไว้เทียบ ถ้ามี error ให้แก้สาเหตุก่อนรัน migration; ถ้า `active_rooms>0` ให้จบห้องก่อนเปลี่ยนแอปเป็น Google mode
2. ถ้าฐานข้อมูลยังไม่มี 008 เปิด [008_google_auth_identity_and_teacher_access.sql](../supabase/migrations/008_google_auth_identity_and_teacher_access.sql) คัดลอกทั้งไฟล์ตั้งแต่ `begin;` ถึง `commit;` → New query → Run ต้องไม่มี error การรันนี้เพิ่มตาราง/RPC/สิทธิ์และ nullable password โดยคงบัญชี/ข้อสอบ/ห้อง/ประวัติคะแนนเดิม
3. เปิด [008_google_auth_postcheck.sql](../supabase/checks/008_google_auth_postcheck.sql) คัดลอกทั้งไฟล์ → New query → Run ต้องได้ `status=PASS` ตรวจ RLS, grants, private RPC, UNIQUE/FK, triggers และ password nullability เทียบ `data_counts` กับข้อ 1 เมื่อไม่มีผู้ใช้อื่นกำลังเปลี่ยนข้อมูล จำนวนต้องเท่าเดิม
4. `bootstrap_state=FIRST_GOOGLE_LOGIN_OR_ADMIN_REVIEW_NEEDED` ยังเป็นค่าปกติก่อนผู้ดูแล Google Login ครั้งแรก SQL ไม่ผูกบัญชีหรือให้สิทธิ์จากการกรอก Gmail เมื่อผู้ดูแลเข้าสู่ระบบผ่าน Google ที่ยืนยันแล้ว แอปจะ bootstrap ให้เอง หาก login แล้วค่านี้ยังอยู่ ให้ตรวจข้อผิดพลาดตาม [setup](google-auth-setup.md)

ไฟล์ precheck/postcheck ตรวจเงื่อนไขใน transaction **read only** แล้วแสดงผลด้วย SELECT เป็นคำสั่งสุดท้าย ไม่มี INSERT/UPDATE/DELETE/seed และไม่แสดงชื่อ/อีเมล/รหัสผ่าน/token ของผู้เรียน ผล PASS เป็นการตรวจโครงสร้างและสิทธิ์ ไม่ใช่หลักฐาน OAuth/หลาย connection ทำงานจริง และไม่เทียบ checksum ของ body ของ RPC หากเคยใช้ไฟล์ 008 รุ่นอื่นให้ตรวจ source/migration history ก่อน

ถ้าเห็นข้อความ `current transaction is aborted` หลัง query ล้มเหลว ให้ใช้ New query รัน `ROLLBACK;` ก่อนลองใหม่ อย่าแทนที่ error ด้วยการเปิด public policies หรือ drop ตาราง

## ถ้ายังมี migration เก่าไม่ครบ

precheck บอกชื่อตาราง/คอลัมน์ที่ขาด ตรวจประวัติการรันก่อนแล้วรันเฉพาะไฟล์ที่ขาดตามลำดับ:

`001_initial_schema.sql` → `002_enable_realtime_publication.sql` → `003_gameplay_flow_upgrades.sql` → `004_session_cleanup_functions.sql` → `005_question_types_and_images.sql` → `006_private_game_data.sql` → `007_team_power_scoring.sql` → `008_google_auth_identity_and_teacher_access.sql`

ฐานข้อมูลใหม่ต้องมีบัญชีครูหลักเดิมเพียงหนึ่งบัญชี (ไม่สร้าง shared/default password ใน SQL ชุดนี้) ฐานข้อมูลเดิมไม่ต้องรัน 001 ซ้ำและไม่ต้อง seed ใหม่เพื่อเปิด Google Auth

## หลังรัน SQL

ยังต้องเปิด Google Provider/ตั้ง Google Cloud callback และ Supabase redirect allowlist พร้อม `AUTH_MODE=google`, `DATA_BACKEND=supabase`, public Supabase URL/key, server service role key, `SUPER_ADMIN_EMAIL` และ HTTPS `NEXT_PUBLIC_APP_URL` แล้ว build แอปใหม่ ตาม [คู่มือ Google Auth](google-auth-setup.md)

ก่อนเปิดใช้จริงให้ทดสอบผู้ดูแล → เพิ่มครู → ครู login → นักเรียนผูกรหัส → เล่นเกม และ concurrent transactions ใน Staging การ rollback แอปใช้ feature flag ตามคู่มือ เก็บตาราง mapping/audit และข้อมูลเกมไว้

## ผลตรวจชุด SQL นี้

ทดสอบ precheck → migration 008 → postcheck บน schema เดิมและข้อมูลจำลองด้วย PGlite ผ่าน **14 assertions** รวมข้อมูลไม่เปลี่ยน, ไม่ผูกบัญชีเอง, ตรวจ missing columns และปฏิเสธ table/RPC grants ที่เปิดให้ browser กับ RLS ที่ถูกปิด คำสั่ง `npm run test:sql` รันการตรวจนี้พร้อม scoring และ Google Auth เดิม ส่วนการรันใน Supabase จริงยังไม่ได้ทำ
