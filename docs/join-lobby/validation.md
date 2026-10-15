# ผลตรวจงานหน้าห้องและทีม

วันที่ 15 ตุลาคม 2026 — ทดสอบภายในเครื่องกับ production build ของ Next.js, PGlite และ Mock Supabase ไม่มีการเข้าถึง Production Database

## ผลสุดท้าย

| กลุ่ม | ผล |
| --- | --- |
| Build / TypeScript / ESLint | ผ่าน |
| Classic และฟอร์ม/ภาพ/เสียงเดิม | 21 กรณีผ่าน รวมกรณี UI audit ที่ตรวจซ้ำหลังแก้ hydration |
| Google Login, การผูกบัญชี, RBAC และสิทธิ์ครู | 8 กรณีผ่าน |
| Boss Raid เดิมและหน้าห้อง/ทีมใหม่ | 11 กรณีผ่าน รวม 3 กรณีตรวจซ้ำหลังแก้ |
| SQL lobby/ลำดับช้อยใหม่ | 52 checks ผ่าน รวมตรวจสคริปต์ verification อ่านอย่างเดียว |
| SQL Raid เดิม/จังหวะต่อสู้/ดาเมจจริง | 135 + 47 + 27 checks ผ่าน |
| Combat feedback unit | 35 checks ผ่าน |
| Presentation/ฉาก/เสียง/fallback unit | 1,095 checks ผ่าน |
| SQL Classic / Google | ผ่าน (Google Auth 68, deployment checks 14) |
| Identity/service/data regression | ผ่าน |
| Impeccable finish review | **ship** เฉพาะโค้ด UI และภาพ 10 ภาพที่ผู้ตรวจได้รับ ไม่ใช่การรับรองฐานข้อมูลจริง |

จำนวน browser cases ไม่ซ้ำรวม **40** กรณี ผลข้างต้นรวม full run และ targeted rechecks ไม่ได้อ้างว่าเป็น full run ครั้งเดียวทุกกรณี

## พฤติกรรมที่ยืนยันเพิ่มเติม

- การเลือกทีม/สุ่มทีมไม่เขียนสมาชิกก่อนยืนยัน และหลังเข้าทีมไม่แสดงช่องกรอกรหัสซ้ำ
- ปุ่มยืนยันบอกชื่อทีม ปุ่มและสถานะเข้าถึงด้วยคีย์บอร์ด เลือกด้วยปุ่มลูกศรได้
- ข้อมูลห้องไม่ส่ง frozen questions, correct answers หรือ private session ทั้งก้อนให้ TeamPicker
- ถ้าทีมเต็มระหว่างดูหน้า preview กับกดยืนยัน เซิร์ฟเวอร์ปฏิเสธ ไม่มีสมาชิกผี และหน้าห้องแสดงข้อผิดพลาดพร้อมให้เลือกใหม่
- ค้นหาห้องผิดและย้อนเปลี่ยนห้องกลับมาได้
- หัวหน้าทีม rename ได้ สมาชิก/คนนอก/คนปลอมทีมไม่ได้ เกมเริ่มแล้วแก้ไม่ได้ ชื่อใหม่ซิงก์ไปครูและเพื่อน
- หลุดเป็น offline ชั่วคราวยังเป็นหัวหน้า ออกจากทีมจริงจึงให้สมาชิกถัดไปเป็นหัวหน้า
- ชื่อที่กำลังพิมพ์อยู่คงไว้ข้ามแท็บ ข้อผิดพลาดเครือข่ายไม่ลบข้อความ
- ตรวจ touchStart → touchCancel แล้วปัดจริงผ่าน Chromium CDP เพื่อสลับทีมไปสนามต่อสู้ โดยไม่ต้องโหลดหน้าใหม่
- ตัวโหลดแสดงขณะ submit/join/rename และหายเมื่อสำเร็จหรือล้มเหลว; answer spinner อยู่ใน native dialog และหายก่อนเริ่มการต่อสู้
- เปลี่ยนชื่อ/เริ่มเกมใช้ session/team locks ตามลำดับเดียวกัน; safe reapply ไม่เปลี่ยนคำถาม ช้อย deadline หรือประวัติเกมที่เริ่มแล้ว
- ช้อย MC และ true/false คง authored order แม้แทรกแถวฐานข้อมูลคนละลำดับ ข้อ Raid ยังสุ่มและ retry start ไม่สร้าง order ซ้ำ
- เวลารวมและการยืนยัน 5 วินาที/แสดงการต่อสู้ 3 วินาทียังทำงาน การหมดเวลาหลัง reconnect ไม่ส่งอัตโนมัติต่อเมื่อรับสถานะหมดเวลาแล้ว

## ปัญหาที่พบระหว่างทำและแก้แล้ว

1. fieldset ที่ใช้ครอบฟอร์มเพื่อ disable ทำให้ layout editor ล้นบนมือถือ: เปลี่ยนเป็นติดตาม pending ของ React, ป้องกัน submit ซ้ำ และใช้ inert พร้อม overlay portal โดยไม่เปลี่ยนโครงสร้างช่องกรอก
2. ตัวโหลดระดับ root ทำให้หน้า dev ที่ปิดใน production ส่ง HTTP 200 ระหว่าง streaming: จำกัด loading boundary ให้ route งานจริง และทดสอบ HTTP 404 เดิมซ้ำแล้ว
3. Date.now คนละจังหวะระหว่าง SSR/hydration ทำให้ตัวนับเวลา Classic ไม่ตรงกัน: ส่ง clock anchor จากเซิร์ฟเวอร์ให้ client ใช้ค่าเริ่มต้นเดียวกัน
4. รอบ poll ที่เคย backoff ระหว่างหลุดอาจค้างรอนานหลังเชื่อมต่อกลับ: ปลุก polling ปกติทันทีเมื่อ recovery สำเร็จ พร้อม timeout ของ snapshot/foreground requests
5. ปรับ assertions เดิมตามข้อความและขั้นยืนยันใหม่ รวมแยก error alert ออกจาก Next route announcer

## Responsive / Audit / Polish

ภาพหลักและ geometry อยู่ใน `.impeccable/review/join-lobby/`:

- Join: 1440×900, 390×844, 320×640, 768×1024, 844×390
- Team: 1440×900, 390×844, 320×640
- Loading: เข้าทีมบนโทรศัพท์ และ submit ใน native question dialog บน desktop
- ไม่พบ outer horizontal/vertical overflow ของหน้าเลือกทีม ปุ่มยืนยันสูง 48px และอยู่ภายใน viewport ทุกขนาดที่ตรวจ
- Axe ของหน้าทีมที่เลือก: ไม่มี violations; Classic UI audit และ Google accessibility cases ผ่านด้วย
- Detector: ไม่มี primary findings มี advisory 27 รายการ (ขนาดอักษร 11, สี 16) ส่วนใหญ่เป็น incumbent CSS; ขนาดใหม่ 32px และ 26px ได้รับการประเมินตามภาพว่าไม่เป็นปัญหาที่บล็อกงาน
- Finish reviewer เปิดภาพที่ส่งครบทั้ง 10 ภาพ และให้ ship ที่ขอบเขต UI ตามรายงาน `finish-review.md`

ไม่มีการเจนหรือเปลี่ยน production raster ในงานรอบนี้ ภาพใน review เป็นหลักฐานทดสอบ ไม่ใช่ asset ที่ส่งให้ผู้เล่น

## สิ่งที่ยังไม่ได้ยืนยัน

- ผู้ใช้แจ้งว่ารัน SQL 012 แล้วเมื่อ 15 ตุลาคม 2026 ผู้ช่วยไม่ได้ตรวจฐานข้อมูล Production โดยตรง
- PGlite/mock ใช้การเชื่อมต่อจำลอง ไม่ใช่การทดสอบ transaction race หลาย connection บน PostgreSQL จริง
- ขนาดหน้าจอและ touch ทดสอบด้วย Chromium emulation/CDP ไม่ใช่เครื่อง iOS/Android จริง หรือคอมโรงเรียน GPU ต่ำ
- ผู้ใช้อนุญาตให้ commit/push เข้า `main` แล้ว การ deploy และสถานะ Vercel จริงไม่ได้ตรวจยืนยันในชุดทดสอบนี้
