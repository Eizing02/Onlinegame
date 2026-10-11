# Google Login และสิทธิ์ครู

ใช้กับ branch `feat/google-auth-teacher-rbac` โดยยังไม่เปิดบน Production อัตโนมัติ การตั้งค่า Google/Supabase จริงเป็นงานของผู้ดูแล ไม่ต้องส่ง Secret ให้ Codex

## ระบบทำงานอย่างไร

`/login` → Supabase Google OAuth (PKCE) → `/auth/callback` → ตรวจ `getUser()` และ `getClaims()` → RPC ตรวจตัวตนจาก `auth.users`/`auth.identities` และสิทธิ์ปัจจุบัน → หน้าครู/นักเรียน

บัญชี `piyawatpiwsiri@gmail.com` เชื่อมบัญชีครูเดิมที่รหัส `admin` หรือ `ADMIN` โดยคงรูปตัวพิมพ์เดิม หากมีบัญชีซ้ำหรือผูกกับผู้อื่นจะปฏิเสธ ครูใน allowlist ที่เปิดใช้งานถูกผูกอัตโนมัติ ส่วนบัญชี Google ที่ยังไม่ผูกเปิดหน้าตรวจรหัสนักเรียน

Google ยืนยันอีเมล ไม่ได้ยืนยันว่าเป็นเจ้าของรหัสนักเรียน การทราบรหัส 5 หลักของผู้อื่นยังทำให้ผูกก่อนเจ้าของจริงได้ จึงไม่ควรใช้ระบบนี้เป็นหลักฐานผู้เข้าสอบอย่างเป็นทางการ

## เตรียมฐานข้อมูล Staging

1. ใช้ Supabase project สำหรับ Staging แยกจาก Production สำรอง schema และข้อมูลก่อนแก้ ตรวจ `accounts` ว่ามีบัญชีครูหลักเพียงหนึ่งแถวเมื่อเทียบ `lower(user_code)='admin'` และ `role='teacher'` ห้ามเปลี่ยนคีย์ของข้อมูลเดิม
2. ตรวจ migration history ถ้าฐานข้อมูลใหม่ให้รัน `001` ถึง `008` ตามลำดับ ถ้ามี `001`–`007` แล้ว รันเฉพาะ [008](../supabase/migrations/008_google_auth_identity_and_teacher_access.sql) ใน SQL Editor หรือด้วยกระบวนการ migration ที่โครงการใช้อยู่ อย่ารัน `001` ซ้ำบนฐานข้อมูลเดิม
3. `008` เป็นธุรกรรมเดียว เพิ่ม 4 ตาราง, UNIQUE/FK, RLS, RPC และอนุญาต `accounts.password=NULL` โดยไม่เปลี่ยน primary key ไม่ลบเกม/คำตอบ และไม่เปลี่ยนคะแนน
4. ตรวจสิทธิ์ `anon` และ `authenticated` ต้องอ่าน `accounts`, `account_identities`, `teacher_access`, `account_link_audit`, `auth_rate_limits`, `answers` ไม่ได้ และเรียก RPC ของ `008` ไม่ได้ บทบาท `service_role` ใช้เฉพาะ Server
5. ไม่ต้อง seed ฐานข้อมูลเดิมใหม่ ถ้าต้องนำบัญชีที่ขาดเข้า สคริปต์ seed จะเพิ่มเฉพาะรหัสที่ยังไม่มี (รวมการเทียบตัวพิมพ์) แต่การ seed ชุดคำถามยังเป็น upsert จึงควรสำรองก่อนและใช้กับข้อมูลที่ตรวจแล้ว

[ตำแหน่งภาพประกอบ: Supabase SQL Editor หลังรัน 008 และหน้า Database Tables]

## Google Cloud Console

1. สร้างหรือเลือก Google Cloud project ตั้ง OAuth consent screen/Branding และ Audience ระบุข้อมูลแอปจริง หากอยู่สถานะ Testing ให้เพิ่มอีเมลครูและนักเรียนทดสอบใน Test users
2. สร้าง OAuth Client ID ประเภท **Web application**
3. Authorized JavaScript origins: ใส่ origin แอปจริง เช่น `https://game.example.edu` และ `http://localhost:3000` สำหรับ Dev ใช้ HTTPS ใน Production ไม่ใส่ path
4. Authorized redirect URIs: คัดลอก **Callback URL จาก Supabase Google Provider** เช่น `https://PROJECT.supabase.co/auth/v1/callback` นี่เป็น callback จาก Google ไป Supabase ไม่ใช่ `/auth/callback` ของแอป
5. ตรวจ scopes `openid`, `email`, `profile` และ Publishing status ของ consent screen ไม่ขอสิทธิ์ Gmail/Drive ที่แอปไม่ใช้

[ตำแหน่งภาพประกอบ: Google OAuth Web client แสดง Origins และ Redirect URIs]

## Supabase Authentication

1. Authentication → Sign In / Providers → Google → เปิด Google แล้วใส่ Client ID/Client Secret ที่สร้างใน Google Cloud Secret เก็บใน Supabase เท่านั้น
2. คงการตรวจ nonce และ email verification ตามค่าที่ Supabase รองรับ ไม่เปิดตัวเลือกข้ามการตรวจความปลอดภัยเพื่อแก้ callback
3. เปิดใช้เฉพาะ Google สำหรับระบบนี้ ปิด email/password, anonymous sign-in และ provider อื่นที่ไม่จำเป็น โค้ดปฏิเสธตัวตนที่ `provider` ไม่ใช่ Google และไม่มี OAuth AMR/Google identity ที่ยืนยันอีเมลตรงกัน
4. URL Configuration → Site URL เป็น origin ของแอปจริง → Redirect URLs เพิ่ม URL แบบเจาะจง:
   - `https://game.example.edu/auth/callback`
   - `http://localhost:3000/auth/callback` สำหรับ Dev
   - URL Staging แบบเจาะจง หลีกเลี่ยง wildcard กว้างใน Production
5. ตรวจข้อจำกัดผู้ใช้ภายนอก/บัญชีโรงเรียนใน Google Workspace กับผู้ดูแลโดเมน

[ตำแหน่งภาพประกอบ: Supabase Google Provider และ URL Configuration]

## Environment ของ Next.js

```dotenv
DATA_BACKEND=supabase
AUTH_MODE=google
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SECRET
SUPER_ADMIN_EMAIL=piyawatpiwsiri@gmail.com
NEXT_PUBLIC_APP_URL=https://YOUR_APP_DOMAIN
```

รองรับ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` แทน anon key และชื่อสำรองเดิมจาก `src/lib/supabase/env.ts` แต่เลือกใช้เพียงชุดเดียวเพื่อไม่ให้ค่าขัดกัน ห้ามสร้างตัวแปร `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_APP_URL` ต้องเป็น origin เดียว ไม่มี username/password/query/fragment/path เพิ่มเติม Production ต้อง HTTPS ยกเว้น loopback สำหรับการทดสอบ Callback ไม่ใช้ Host/Forwarded Host และไม่รับ `next` จากผู้ใช้ ตัวแปร `NEXT_PUBLIC_*` ต้องกำหนดก่อน build และ rebuild เมื่อเปลี่ยน

`AUTH_MODE` ไม่กำหนดจะเป็น `legacy` เพื่อให้ deploy เดิมยังทำงานได้ Google mode ต้อง `DATA_BACKEND=supabase` เสมอ ไม่อ่าน CSV เป็นทางสำรอง และไม่ยอมรับ legacy cookie/password login

`AUTH_SESSION_SECRET` ยังต้องมีหากเตรียม rollback ไป legacy ใช้ค่าเดิมที่ปลอดภัยอย่างน้อย 32 ตัวอักษร ไม่มีรหัสผ่านเริ่มต้นสำหรับครู Google ใหม่ และห้ามสร้างรหัสผ่านร่วมเพื่อ rollback

## ทดลองจริงทีละขั้น

1. เปิด `/login` ต้องเห็น Google ปุ่มเดียว เลือก Gmail ผู้ดูแลหลัก ระบบเชื่อม `ADMIN` เดิมแล้วเข้าห้องที่ยังเล่นอยู่ หรือ `/teacher/question-sets`
2. เปิด “จัดการครู” เพิ่ม Gmail ครูทดสอบและชื่อ เลือก “เปิดใช้งาน” ครูมีรหัส `T000001` ของตนเอง
3. เปิดอีก browser/profile เลือก Gmail ครูนั้น เข้าหน้าครูทันทีโดยไม่กรอกรหัส ครูเห็นเฉพาะชุดคำถาม/ห้องของตนเอง
4. เปลี่ยนสถานะเป็น “ระงับ” ทดสอบ API และ Server Action จากแท็บครูเดิม คำขอถัดไปต้องถูกปฏิเสธ แล้วเปิดใช้งานใหม่
5. นักเรียนเลือก Google → `/verify-student` → กรอก `01234` → ดูชื่อ/ชั้น → “แก้ไขรหัส” → ตรวจใหม่ → “ยืนยันและเข้าเกม”
6. ใส่รหัสห้อง 4 หลัก เลือกทีม ตอบคำถาม ครูเฉลย/จบเกม ตรวจคะแนนและประวัติเดิม
7. เปิด “ข้อมูลบัญชี” เปลี่ยนรหัสใหม่ ต้องถูกปฏิเสธถ้ารหัสเดิมหรือรหัสใหม่มีห้องไม่จบ แม้ participant ออกจากทีมแล้ว หลังครูจบห้องจึงเปลี่ยนได้ ประวัติเดิมไม่ย้ายตาม
8. Logout แล้ว Login ใหม่ นักเรียนที่ผูกแล้วข้ามหน้ารหัส สลับ Google account ต้องได้ session ของบัญชีใหม่ ทดสอบสองแท็บและ token refresh

## จำกัดจำนวนครั้งและข้อมูลที่เปิดเผย

ฐานข้อมูลใช้ fixed window ร่วมทุก instance: ตรวจรหัส 10 ครั้ง/10 นาที, ยืนยันครั้งแรก 5 ครั้ง/10 นาที, เปลี่ยนรหัส 2 ครั้ง/24 ชั่วโมง **นับความพยายามที่ไม่สำเร็จด้วย** ตรวจรหัสจาก network เพิ่มอีก 250 ครั้ง/10 นาทีเมื่อมี `x-forwarded-for` จาก hosting ที่เชื่อถือได้ เก็บเฉพาะ HMAC ของ IP ไม่เก็บ IP ดิบ อย่าให้ client เขียนทับ header ของ proxy ได้

การจำกัดสองครั้งต่อวันเป็น window จากความพยายามครั้งแรก ไม่ใช่ rolling 24 ชั่วโมงต่อเนื่อง จุดเปลี่ยน window อาจมีความพยายามติดกันได้ มี UNIQUE/transaction ป้องกันซ้ำควบคู่ ข้อมูล preview มีเพียงรหัส ชื่อ ชั้น ไม่เผย Gmail เจ้าของรหัส และไม่มี API รายชื่อนักเรียนทั้งหมด

Rate-limit rows ที่หมดอายุล้างครั้งละไม่เกิน 100 แถวโดยข้าม row ที่ถูกล็อกในคำขอปัจจุบัน หากมีข้อมูลมาก ผู้ดูแลอาจตั้งงานลบ `auth_rate_limits where expires_at < now()` ตามรอบ อายุ audit ควรกำหนดตามนโยบายโรงเรียน ลบได้เฉพาะผ่านผู้ดูแลตาม retention policy

## ตรวจข้อผิดพลาด

- กลับ login หลัง Google: ตรวจ Provider, Consent Test users, callback สองช่วง, cookies PKCE และ URL allowlist เปิด Network ดู redirect โดยไม่คัดลอก access/refresh token ไป log
- หน้าบัญชียังไม่พร้อม: ตรวจ 008 และ service key ฝั่ง Server ต้องชี้ Supabase project เดียวกับ public key อย่าแสดง SQL error/token ให้ผู้ใช้
- `ADMIN_ACCOUNT_CONFIGURATION`: ไม่มี admin เพียงหนึ่งบัญชี หรือ role ไม่ถูกต้อง ตรวจด้วยผู้ดูแลโดยคง FK เดิม
- `IDENTITY_CONFLICT`: ข้อมูล Google ผูกกับรหัสอื่นอยู่แล้ว อย่าเปลี่ยนโดยอัตโนมัติ ใช้ [ขั้นตอน Recovery](google-auth-recovery.md)
- ถูกระงับ/รอเปิดใช้งาน: ตรวจ `teacher_access.status` การแก้ claims/cookie ไม่สามารถเปิดสิทธิ์ได้
- รหัสเปลี่ยนกลางแท็บ: client session เปลี่ยนตาม auth user + Supabase session UUID + user code การ refresh token UUID เดิมไม่ทำให้หลุด
- Auth ล่ม: สิทธิ์ปฏิเสธแบบ fail closed; Logout ล้าง cookies ในเครื่องได้แม้ Auth endpoint ไม่ตอบ

## Rollback และก่อน Production

1. จบห้องทั้งหมด เลือก maintenance window สำรองข้อมูลและจดเวลาที่เปลี่ยนโหมด
2. หากจำเป็น rollback ให้ `AUTH_MODE=legacy` พร้อม `AUTH_SESSION_SECRET` และ backend เดิมที่มี password ถูกต้อง แล้ว restart/redeploy แอป **เก็บ 008 และ mapping/audit ไว้** ไม่ drop ตาราง ไม่ restore ทับประวัติที่มีใหม่
3. Google-only teachers ที่ `password=NULL` เข้า legacy ไม่ได้ อย่าสร้าง default password การสลับไป legacy ไม่บังคับสถานะ allowlist เหมือน Google mode จึงต้องประเมินครูที่ถูกระงับ/รหัสผ่านเดิมก่อนเปิด legacy ให้ผู้ใช้
4. กลับ Google โดยใช้ mapping เดิมหลังตรวจข้อมูล ไม่แก้ primary key, participants หรือ answers ปิดใช้การ logout และเคลียร์แท็บเก่าตามขั้นตอนให้ผู้ใช้เข้าใหม่
5. ก่อน Production ต้องผ่าน Gmail จริง, คำขอพร้อมกันบน PostgreSQL หลาย connection, RLS จริง, provider config, staging gameplay และตรวจ backup/restore พร้อมผู้ดูแล ห้ามนับ mock OAuth เป็นผล Google จริง

อ้างอิงตรวจวันที่ 2026-10-11: [Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google), [SSR client และ Proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Auth users](https://supabase.com/docs/guides/auth/users), [Next.js Auth](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
