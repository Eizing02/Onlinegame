# รายงานพัฒนาและทดสอบบอส — 28 ตุลาคม 2026

## ระยะ 1: ภาพและแค็ตตาล็อก

เสร็จ: บอสใหม่ 2 ตัว × 12 ท่า × 16 เฟรม, ต้นแบบ 2 ภาพ, VFX 6 ภาพ สร้างด้วย native ImageGen รวม 32 ภาพ มีต้นฉบับ prompt และ hash ตรวจสอบย้อนกลับได้ ภาพ runtime ใหม่รวม 60,946,986 ไบต์ แยกไฟล์โหลดเฉพาะที่ใช้

ไฟล์: `assets/boss-definitions.ts`, `catalog.json`, `manifest.ts`, `sprite-loader.ts` ใน feature; `public/assets/boss-raid/bosses/`, portraits/VFX; `scripts/boss-raid/{prepare-generated-bosses,pack-generated-atlas,calibrate-sprite-grounding,review-generated-bosses}.mjs`.

ผล: asset validator ผ่าน 96 แผ่น/1,536 เฟรม; ภาพบอสใหม่ 384 เฟรมมี alpha จริง ขอบว่างครบ และไม่มีเฟรมว่าง/ภาพเติมซ้ำ ทุกแผ่นมีอย่างน้อย 8 เฟรมที่แตกต่างกัน ตรวจ contact sheet เฟรม 0/7/15 ทุกท่าแล้ว คำเตือนขอบภาพ 221 รายการของ validator อยู่ในไฟล์เดิม; ภาพบอสใหม่ผ่านการตรวจขอบแยกแบบเข้มงวด ภาพเดิม 42 แผ่นไม่มี git diff ฮีโร่ใหม่ทั้งห้าจากงานก่อนยังผ่านตรวจ hash เดิม

ข้อจำกัด: ภาพ AI มีความต่างเล็กน้อยระหว่างท่า จัด atlas และปรับขนาด/จุดยืนจากภาพจริง ไม่ได้วาดท่าชดเชยหรือใช้ chroma key

## ระยะ 2: กติกาและ SQL

เสร็จ: migration 014 เพิ่ม catalog/version, boss_type, boss_assigned_at และ RPC สร้างห้องแบบใหม่ สุ่มแยกต่อทีมตอนสร้างห้อง ซ้ำได้และไม่สุ่มใหม่ระหว่างเล่น RPC เดิมยังสร้างมังกรได้ Snapshot/อันดับ/รายงานเชื่อมบอสด้วย team ID จริง

ไฟล์: `supabase/migrations/014_raid_team_boss_catalog.sql`, `server/{config,raid-service}.ts`, `types.ts`, `rules/ranking.ts`, fixture/helper SQL tests และ `scripts/boss-raid/verify-boss-catalog.sql`.

ผล: ชุด Raid SQL เดิม 332 จุดผ่าน และ boss catalog 71 จุดผ่าน รวม verifier แบบอ่านอย่างเดียว (รวม SQL 403 จุด) ครอบคลุมห้องเก่าระหว่างเล่น, RPC เก่า/ใหม่, การสุ่ม/ซ้ำ, retry/start/rename/reapply ไม่เปลี่ยนบอส, teacher/student parity, HP/คะแนน/เวลาคงเดิม, สิทธิ์ RPC และ constraint ป้องกัน boss ID ปลอม

ข้อจำกัด: ใช้ฐานข้อมูล PGlite แยกในเครื่อง ไม่ได้เชื่อม Production และไม่ใช่ผลทดสอบล็อก PostgreSQL หลาย connection บนระบบจริง Migration 014 ยังไม่ได้รันบน Supabase

## ระยะ 3: ฉาก เสียง และหน้าครู–นักเรียน

เสร็จ: PixiJS ใช้ตัวตนบอสแยกจาก logical actor; ท่าประชิด/พลัง/อัลติแมตใช้ภาพและเสียงประจำบอส ทั้ง normal event และ confirmed answer; จุดกระทบแมงป่องอยู่ที่ลำตัวต่ำ ตัวเลขใช้ดาเมจเซิร์ฟเวอร์ มี warmup เฉพาะคู่ต่อสู้ที่สุ่มได้ ครูสลับทีมและอ่านชื่อบอสได้ ผล/CSV เก็บชื่อบอสด้วย

ไฟล์: `engine/{combat-scene,combat-feedback}.ts`, `audio/cues.ts`, `hooks/{use-raid-audio,use-boss-warmup}.ts`, `components/{RaidArena,BossIdentity,RaidClient,TeacherRaidOverview,RaidResults}.tsx`, `raid.css`, developer calibration/gallery.

ผล: browser ฉากผ่านทุกท่าของบอสทั้งสาม (36 ท่า), VFX 3 เฟสและดาเมจลอย 15, จุดยืน 5 ขนาดหน้าจอ, ไม่มี asset 404, cache ไม่เกิน 64 MiB/8 แผ่น ชุด presentation ผ่าน 2,067 จุด; combat feedback 46 จุดผ่าน รวม dedup, ค่าจริง, fade, ขอบเขตจำนวนวัตถุและโหลดล้มเหลว

ห้องจริงผ่าน browser: สร้าง 12 ทีมด้วย server RPC สุ่มจริงและมีบอสซ้ำ, teacher/student ID/เวลา assign ตรงกัน, prefetch เฉพาะบอสทีม, สลับรับชม, ตอบถูกไททัน +100 ดาเมจ/+10 คะแนน, ตอบผิดแมงป่องเสีย HP 15, เว้นต่อสู้ก่อนข้อ 2, reload ไม่สุ่มใหม่, deadline เดิม และ CSV เพิ่มชื่อบอสถูกทีม Scoped axe ไม่มี violation

ตรวจภาพ full viewport หน้าครูที่ 1366×768, 768×1024, 390×844, 320×568, 844×390; นักเรียนที่ 390×844 พร้อมคำถาม/ต่อสู้ ผลภาพอยู่ `.impeccable/review/raid-boss-roster/`. แก้หน้าครูจอเล็กที่สนามยุบเหลือ 16px ให้สนามมีพื้นที่ราว 184px พร้อมข้อมูลทีมและปุ่มครบ จากนั้นตามข้อเสนอของผู้ตรวจ แยกแถบชื่อ/HP ไว้เหนือภาพและจัดกล้องตามขอบเขตตัวละครทุกท่า ทำให้เห็นบอสครบโดย HUD ไม่บัง

ข้อจำกัด: headless Chromium บน Windows ไม่แทนมือถือหรือ GPU โรงเรียนจริง ตัวเลข frame time ใน diagnostics เป็นข้อมูลเครื่องทดสอบ ไม่รับรอง FPS อุปกรณ์ผู้ใช้

## ระยะ 4: Regression และ Impeccable

Build และ lint ผ่านแล้ว ชุด browser Raid เดิมผ่าน 12/12 รวม 1/3/5 ผู้เล่น, own-event/idempotency, สิทธิ์, reconnect, knockout/ฟื้น, kill once, ห้อง v1, auto-confirm/combat/timer, ฮีโร่ 10 ตัวและ lobby แข่งขันเข้าทีม หลังแก้ HUD ตามผลตรวจอิสระ ทดสอบ boss catalog browser และ feedback/ปาร์ตี้ responsive ซ้ำผ่านอีก 2/2 โดยมี assertion ตรวจ HUD ไม่ทับ stage จริง รวม Raid browser 13 กรณีไม่ซ้ำ

Google/RBAC ผ่าน 8/8 รวมผูกรหัส/เปลี่ยนรหัส, claims แข่งขัน, สิทธิ์ครู/ผู้ดูแล, suspension, gameplay/reload, forged identity/origin และ responsive/keyboard/axe

`npm test` ผ่านทั้งหมด: data/identity/service regression, Classic scoring SQL, Google SQL 68 assertions, deployment verification SQL 14 assertions และ browser Classic/UI/auth/wallpaper/audio 21/21 ครอบคลุมเกมครบวงจร คะแนนเฉลี่ย/อันดับร่วม/power/late join/เฉลย/ข้อถัดไป, หน้าจอเดียว/keyboard/swipe, การเข้า/เปลี่ยนบัญชี, role revocation และเสียง/วิดีโอ fallback

งานเสร็จใน working tree ของ branch main โดยไม่ได้รัน Production SQL พุช Git หรือ Deploy ไฟล์ skill/config และข้อมูลเดิมที่เปลี่ยนค้างอยู่ก่อนงานนี้ไม่ได้ถูกรีเซ็ตหรือจัดเข้า commit

Impeccable: ผู้ตรวจอิสระตรวจภาพครบ 38 ภาพและ contact/supporting previews 7 ภาพ ให้แก้หนึ่งรายการเรื่อง HUD บังบอสในหน้าครูจอเล็ก หลังแก้และส่งภาพ 10 viewport เดิมกลับไป ผู้ตรวจให้ `ship` โดยยืนยันว่า **รายการแก้หนึ่งรายการ resolved** ตาม `verdict-pass.md` ขอบเขตนี้ไม่ใช่การรับรอง FPS อุปกรณ์จริงหรือ Production concurrency

Detector รันหนึ่งครั้ง: 0 primary findings, 6 advisories เดิม (ขนาดฟอนต์ 4 จุดและสีพื้นตรวจ alpha ใน dev gallery 2 จุด) Provenance scan 95 ภาพ: 0 missing metadata รายงานอิสระและเอกสารระบบจะบันทึกใน `finish-review.md` และ `documentation-review.md` ของโฟลเดอร์ evidence

Documenter อิสระตรวจเอกสารเสร็จแล้วตาม `documentation-review.md` โดย PRODUCT.md, DESIGN.md และ design.json มี SHA-256 ตรงกับก่อนเริ่มทุกไฟล์ ไม่ยกระดับการแก้เฉพาะหน้าจอให้เป็นการเปลี่ยนระบบดีไซน์ และไม่แก้ drift เดิมนอกขอบเขต

## สรุปการส่งมอบ

| ตรวจสอบ | ผลสุดท้าย |
|---|---|
| Production build / TypeScript / lint | ผ่าน |
| Raid SQL | 403 จุดผ่าน + ranking/rules unit ผ่าน |
| Combat feedback / presentation | 46 / 2,067 จุดผ่าน |
| Asset catalog / prompt provenance | 96 แผ่น, 1,536 เฟรม; 95 rasters ไม่มี metadata ขาด |
| Scene browser | ผ่าน 36 ท่าบอส, 3 เฟส, 5 ขนาดจอและ cache bounds |
| Raid browser | 13 กรณีไม่ซ้ำผ่าน; ตรวจซ้ำ 2 กรณีหลังแก้ HUD ผ่าน |
| Google browser | 8/8 ผ่าน |
| Classic/UI browser + base regression | 21/21 และชุด data/auth/SQL ผ่าน |
| Impeccable | full review พบ 1 รายการ; verdict pass: resolved 1/1, ship เฉพาะรายการแก้; documentation complete |
| ระบบจริง | ไม่ได้รัน SQL/Deploy/พุช; ต้องใช้ migration 014 เพิ่มจาก 013 |

ข้อจำกัดที่เหลือ: ยังไม่ได้ทดสอบบนมือถือ/คอมโรงเรียนจริงและ PostgreSQL staging หลาย connection ไม่มีข้อผิดพลาดจากชุดทดสอบที่รันค้างอยู่
