# ผลทดสอบการเพิ่มฮีโร่ 5 ตัว — 2026-10-27

งานในเครื่องเท่านั้น ไม่รัน Production SQL ไม่ deploy และไม่พุช GitHub จากงานนี้

| ระยะ | ไฟล์หลัก | ผลที่ยืนยันแล้ว |
|---|---|---|
| Catalog / กติกา | manifest, catalog, hero-definitions, server/http, migration 013, google-database fixture | 332 SQL assertions ผ่านใน PGlite แยก: ห้องเดิม/ใหม่, 5 ตัวใหม่, คะแนน/HP/ดาเมจ/deadline เท่ากัน, retry, สิทธิ์ และรัน migration ซ้ำ |
| ภาพและแพ็ก Sprite | prepare-generated-heroes, pack-generated-atlas, calibrate-sprite-grounding, public assets, visual-metadata | 45 ภาพเจนจริง; 30 แผ่นใหม่/480 เฟรม; runtime รวม 72 แผ่น/1,152 เฟรม ไม่ว่าง มี alpha และขอบใส ผ่าน hash/prompt/ขนาด/เฟรมต่างกัน ภาพเดิมไม่ถูกแก้ |
| หน้าเลือก / ปาร์ตี้ | HeroSelectLobby, HeroPortrait, RaidPartyRoster, RaidClient, raid.css, use-raid-tabs | E2E ใหม่ผ่าน: desktop/tablet/phone/320px/landscape, keyboard, touch event จำลอง, ไม่ปัดออกจากเมนู, ไม่โหลด idle atlas ในล็อบบี้, เลือกซ้ำ, scoped axe ไม่มี violation, ครูเห็น ranger ใน snapshot |
| ต่อสู้ / เอฟเฟกต์ / เสียง | combat-scene, combat-feedback, audio/cues, geometry, calibration | 46 feedback assertions และ 1,635 presentation assertions ผ่าน; scene browser 4 cases ผ่าน ครอบคลุมเอฟเฟกต์เก่า/ใหม่, ทุกคลิป, ดาเมจจริง 100 เพียงครั้งเดียว, dedup, fallback, grounding; retest ตัวใหม่ผ่านหลังแก้ key ของตัวซ้ำในเครื่องมือ dev |
| Build / โค้ด | source ทั้งชุด | Production build, TypeScript และ ESLint ผ่าน |
| Regression | ชุดทดสอบเดิมและใหม่ | Classic/ระบบเดิม 21 cases, Google Login/RBAC 8 cases, Raid 12 cases และ scene ที่เกี่ยวข้อง 4 cases ผ่านตามรายละเอียดรอบทดสอบด้านล่าง |

## การใช้ภาพและหน่วยความจำ

- Portrait ครบ 10 ตัวรวม **698,138 bytes**; ไม่โหลด Sprite Sheet เพื่อแสดงภาพนิ่งในล็อบบี้/ปาร์ตี้
- ไฟล์ภาพ runtime ที่สร้างใหม่รวม **45,081,179 bytes** หลังแยก silhouette และแพ็กใหม่ ตัวเลขไม่รวมภาพต้นฉบับสำหรับตรวจงานใน docs
- VFX สำหรับตัวใหม่ทั้งห้าและเอฟเฟกต์ร่วม 4 ภาพรวม **6,914,048 decoded bytes** ต่ำกว่า 8 MiB
- หลังทดลองท่าของตัวใหม่ทั้งห้า cache ตัวละคร **48,745,600 decoded bytes / 8 sheets / 6 active references** ต่ำกว่า 64 MiB; ตัวซ้ำ 5 คนใช้เพียง 2 sheets รวมบอส
- ทั้ง catalog หากถอดทุกแผ่นพร้อมกันจะราว 396.5 MiB จึงใช้ SpriteLoader แบบ lease/LRU และ decode พร้อมกันไม่เกิน 2 แผ่น ไม่ preload ทั้ง catalog
- แผ่นใหม่ 30 แผ่นมี cell-edge/black-pixel warnings **0**; warnings 221 รายการในรายงานรวมมาจากแผ่นเดิมที่ไม่ได้เปลี่ยน

## ปัญหาที่พบและแก้

1. แถวภาพจาก generator ไม่เท่ากัน แม้ภาพมี 16 ท่าจริง: แยกแต่ละ silhouette จาก alpha และจัด atlas ใหม่พร้อม scale เดียวต่อคลิป ตรวจภาพเฟรม 0/7/15 บนพื้นครีมครบทุกตัว เก็บกรอบต้นทางใน packing.json
2. จอ desktop/สั้น/320px แสดงชื่อได้ไม่ครบในพื้นที่เริ่มต้น: ลดขนาดภาพย่อและช่องว่าง แบ่งหน้าในจอแนวนอนสั้น รักษาการเลื่อนภายในและข้อความตัวที่เลือก
3. เครื่องทดสอบทำงานช้าจนระบบ auto-confirm 5 วินาทีส่งก่อนสคริปต์กดซ้ำ: ทดสอบการส่งอัตโนมัติโดยรอ response จริงแทนการแข่งกดปุ่ม ไม่เปลี่ยนพฤติกรรมแอป
4. เครื่องมือ calibration ใช้ key ชื่อตัวละครซ้ำเมื่อจำลอง ranger 5 คน: เปลี่ยนเป็น key ของช่องผู้เล่น และเพิ่ม assertion ไม่ให้มีคำเตือน key ซ้ำ
5. Windows เขียนทับภาพหลักฐาน audio เดิมหนึ่งไฟล์ไม่ได้ชั่วคราว: เพิ่มตัวเลือก `RAID_AUDIO_EVIDENCE_DIR` ให้สคริปต์เก็บหลักฐานในโฟลเดอร์แยก โดยไม่แก้พฤติกรรมแอป

## รอบทดสอบสุดท้าย

| คำสั่ง/ขอบเขต | ผล |
|---|---|
| `npm run test:raid` | PASS: unit และ SQL 135 + 47 + 27 + 52 + 71 assertions, feedback 46 assertions |
| `npm run test:raid:assets` | PASS: 45 generated records, 480 native frames ใหม่, hash/prompt/alpha/ขอบใส/portrait/VFX budgets |
| `npm run test:raid:presentation` | PASS: 1,635 assertions |
| `npm test` | PASS: data/auth/services/scoring SQL, Auth SQL 68, deployment SQL 14 และ Classic/ระบบเดิม browser 21 cases (2.2m) |
| `npm run test:e2e:google` | PASS: 8 browser cases (58.2s) |
| Raid browser | ยืนยันครบ 12 cases: รอบเต็มผ่าน 10/12; อีก 2 พบปัญหา harness ด้านไฟล์ภาพ/การสังเกตหน้าต่างเวลา หลังแก้สคริปต์ รันซ้ำเฉพาะ 2 cases ผ่านทั้งคู่ (2.2m) ไม่มีการลด assertions ของกติกา |
| Scene browser | PASS: เอฟเฟกต์เดิม 2 cases + ตัวใหม่ 2 cases (4.1m); หลังแก้ key ของตัวซ้ำใน dev รัน case ตัวใหม่ซ้ำ ผ่านพร้อม cache/console assertions (1.5m) |

รอบ Raid ที่รันซ้ำใช้ `RAID_AUDIO_EVIDENCE_DIR=.impeccable/review/raid-heroes-v2/audio-hosts` และ `-g "teacher and student header audio|vintage question HUD"` การยืนยันอัตโนมัติ/เปลี่ยนช้อย/จบแอนิเมชัน/เตือน 30 วินาที/ตัดเครือข่าย/หมดเวลายังถูกทดสอบครบ การบันทึกภาพ countdown ย้ายไปก่อนช่วงรอ เพื่อไม่ให้การตรวจภาพ/axe กลบหน้าต่างแสดง combat ที่มีเพียง 3 วินาที

## ขอบเขตหลักฐาน

ภาพและ browser tests เป็น Headless Chromium บน Windows เครื่องนี้ โดย Google chooser และ Supabase เป็น fixture loopback ไม่ใช่ Google OAuth หรือ Production จริง ค่า frame timing ใน metrics เป็นสภาพทดสอบที่มีงานอื่นร่วม ไม่ใช่ benchmark มือถือหรือการรับรอง FPS ของคอมโรงเรียน การทดสอบ lock/deadlock หลาย connection ต้องใช้ PostgreSQL staging จริงเมื่อได้รับอนุญาต

ก่อนใช้จริงต้องรัน migration **013** หลัง 009–012 แล้วสร้างห้องใหม่เพื่อได้ฮีโร่ 10 ตัว ไม่ต้องตั้งค่า Google/Storage/environment เพิ่ม รายละเอียดใน README.md และ SQL ตรวจแบบอ่านอย่างเดียวใน scripts/boss-raid/verify-hero-catalog.sql

## Impeccable

ใช้ contract และ quality bar ที่ผูกกับระบบสี/โครงหน้าปัจจุบัน ไม่เปลี่ยนโลกภาพหรือ design system ทั้งระบบ Detector รันครั้งเดียว: ไม่มี primary finding; 4 font-size advisories เป็นค่าที่มีอยู่ก่อน ไม่มีค่าหลุด ramp ใหม่ในส่วนที่เพิ่ม Scan provenance 59 PNG: ไม่พบไฟล์ขาด metadata

Finish reviewer ให้ **`disposition: ship`** โดยไม่มี material fixes สำหรับภาพ หน้าจอ และ source/evidence ที่ตรวจ: `.impeccable/review/raid-heroes-v2/finish-review.md` ครบห้าส่วนและเปิดหลักฐานที่กำหนดทั้ง 19 ภาพกับ contact sheets ตรวจ source แบบ sampling ไม่ใช่การรับรองทุก prompt หรืออุปกรณ์จริง

Documenter ยืนยัน ordinary-extension documentation complete ใน `.impeccable/review/raid-heroes-v2/documentation-review.md` และตรวจ SHA-256 ว่า PRODUCT.md, DESIGN.md, `.impeccable/design.json` คงเดิม รายงาน drift เก่าเรื่อง font ramp, รูปแบบ roll serialization และ audio-shadow sidecar โดยไม่ซ่อมเป็นงานแถม

หลัง review ไม่มีการแก้ UI/ภาพเพิ่มเติม มีเพียงการปรับสคริปต์ทดสอบและเติมผลส่งมอบ ผู้ตรวจไม่ได้เป็นผู้รัน regression ชุดสุดท้าย; ผลข้างต้นเป็นการรันของ build thread
