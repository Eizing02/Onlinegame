# การตรวจงาน Boss Raid และธีมคลาสสิก

ตรวจในเครื่อง 12–13 ตุลาคม 2026 (Asia/Bangkok) บน branch `feat/boss-raid-scene-audio` เริ่มจาก `80ca22a` ใช้ localhost, mock OAuth/Supabase และ PGlite การทดสอบไม่มีคำสั่งเขียนฐานข้อมูล Production หรือ deploy

หลังตรวจเสร็จ ผู้ใช้อนุญาตให้พุช GitHub วันที่ 13 ตุลาคม 2026 จึงเผยแพร่ branch และเปิด [PR #3](https://github.com/Eizing02/Onlinegame/pull/3) ต่อมาผู้ใช้แจ้งว่ารัน migration 010 เรียบร้อยแล้วและอนุญาตให้รวมเข้า `main` Agent ไม่ได้รัน SQL เพิ่มบน Production ผลทดสอบด้านล่างยังเป็นผลจากในเครื่อง และไม่ได้ใช้คำแจ้งของผู้ใช้แทนการตรวจฐานข้อมูลด้วยตนเอง

## ผลทดสอบ

| การตรวจ | ผลและขอบเขต |
| --- | --- |
| Production build / TypeScript | PASS หลังการปรับ VisualViewport และเอฟเฟกต์บอสเฟส 3 |
| ESLint | PASS |
| ข้อมูลและ Google identity/services | PASS ตามชุดทดสอบเดิม |
| SQL คะแนน / Google / deployment | PASS; Google SQL 68 checks และ deployment 14 checks |
| Raid rules และ SQL v1 | PASS 135 checks หลังติดตั้ง migration 010 ในฐานจำลอง โดย fixture ห้องเก่ายังคง v1 |
| SQL presentation v2 | PASS 47 checks: ตัวซ้ำ, คูลดาวน์รวม skip, ledger retry, event ของคำตอบ, visibility, snapshot privacy, heal/no-action |
| SQL ตรวจหลังอัปเกรด | PASS ทั้ง 5 read-only queries ใน PGlite: คอลัมน์ช่วงรอ, ไม่มี unique index เดิม, RPC ส่วนตัว 6 ตัวไม่เปิดให้ anon/authenticated, ไม่มี Raid publication |
| Sprite/scene/audio unit | PASS 1,095 checks; รวม 672 frames, formation และ audio |
| Classic Playwright | PASS 15 cases; ตรวจ UI 32 captures ไม่พบ horizontal overflow หรือ serious/critical Axe violation ที่รายงาน |
| Google Playwright | PASS 8 cases: ผูก/เปลี่ยนรหัส, RBAC, suspension, origin/identity guards, Classic และหน้าบัญชี |
| Boss Raid Playwright | PASS รวม 7 cases จากรอบเดิม 6 และ legacy ใหม่ 1; ครอบคลุม 1/3/5 คน, ตัวซ้ำ, คำตอบสามชนิด, reload, visibility, heal, จบบอส/เกม และ access guards |
| Vintage interaction หลังแก้ท้ายงาน | PASS: phase-3 attack จบจริงก่อนข้อใหม่, เปลี่ยนช้อย reset, ส่งอัตโนมัติครั้งเดียว, urgent timer, เน็ตขาดหลังบันทึก, หมดเวลายกเลิกส่ง |
| Scene/audio browser | PASS ครบ 5 cases โดย matrix รันซ้ำแยกหนึ่งกรณีหลังยุติรอบที่แย่งทรัพยากรเครื่อง; การวางตัว 1–5, rotation, calibration, decode และ playback |
| Teacher integration / final capture validity | PASS 13 captures: 5 คน, desktop/mobile/landscape/tablet, settings, HP 0, protected question mute; เพลง lobby/battle/final เล่นสำเร็จ ไม่พบ overflow หรือ serious/critical Axe violation |
| Impeccable finish review | Full review ตรวจ 77 ภาพให้ `fix` หนึ่งรายการ: สี progress ของครู; verdict pass ตรวจภาพ integration 13 ภาพให้ `ship` และ scored fix `resolved` ขอบเขตคือจุดแก้ไขนี้ ไม่ใช่การตรวจทั้งระบบใหม่ |

## ข้อผิดพลาดที่พบและแก้ระหว่างตรวจ

- ตัด scene `cacheAsTexture` ที่ผูกผลกรองกับขนาด viewport ออก ใช้ Canvas2D grading ที่ขนาดภาพจริงใน bounded decoded texture cache ภาพหลังหมุนจอจึงไม่ถูกตัดผิดพื้นที่
- เพิ่มความเข้มของหมึกฟ้า/คำเตือน/ข้อความรอง เพื่อให้ข้อความบนธีมสว่างผ่านการตรวจความต่างสี
- แยกผลต่อสู้จากโจทย์ ติดตามคลิปและกระสุนจนจบก่อนกลับไปตอบ และป้องกัน normal event queue ขัดจังหวะคำตอบตัวเอง
- หลังบันทึกสำเร็จแล้วเน็ตขาด จะรอ snapshot ที่ cursor เดินหน้า ไม่เปิดข้อเก่าจาก cache กลับมา
- เพิ่ม VisualViewport resize/scroll สำหรับ dialog เมื่อพื้นที่อ่านลดลง มี cleanup ของ listener/rAF และไม่บีบ layout ระหว่าง pinch zoom
- จับภาพหลัง font/profile/scene พร้อม และรอการเลือกฮีโร่บันทึกแล้ว เพื่อแยกสถานะสำเร็จจากภาพระหว่างโหลด
- แถบ progress ของครูใช้ appearance/track/fill ที่ระบุชัดทั้ง WebKit และ Mozilla แทนสีเขียวมาตรฐาน browser จับภาพ integration 13 กรณีซ้ำแล้วผ่าน
- ห้อง Raid v1 ที่ไม่มี `presentation.events` ใช้คิวฉากเดิม ไม่เข้า/ล้างคิว priority ว่าง ทดสอบ v1 ผ่านโดยยังยืนยันเอง ไม่ส่งหลัง 5.2 วินาที และยังเก็บเหตุการณ์ของตัวเองพร้อมรอหน้าถัดไป

รอบแรกที่รัน browser suites พร้อมกันเกิด timeout จากการแย่งทรัพยากร ได้ยุติและตรวจใหม่ทีละชุด ผลสุดท้ายอ้างอิงรอบที่ผ่าน ภาพรุ่นก่อน grading/capture readiness ถูกแทนที่และไม่ใช้เป็นหลักฐาน final review

การทดสอบ legacy ใหม่ครั้งแรกพบว่า endpoint จำลองวางอยู่ผิดเงื่อนไข จึงยังสร้างห้อง v2 ได้แก้ fixture ที่จำกัด localhost และเพิ่มการตรวจ HTTP status แล้วรันเฉพาะกรณีนี้ผ่าน 25 วินาที ปัญหานี้ไม่ได้เปลี่ยน endpoint ของแอปจริง

## หลักฐานและข้อจำกัด

หลักฐานอยู่ใน `.impeccable/review/raid-vintage/`: HUD/confirmation 12 ภาพ, `classic/` 32 ภาพ, `scene/` 20 ภาพ และ `integration/` 13 ภาพ รวม 77 ภาพที่ผู้พัฒนาเปิดตรวจแล้ว รายการไฟล์และขนาดจริงอยู่ใน `capture-manifest.json` รายงานของแต่ละชุดเก็บความกว้าง/ความสูง, overflow, controls, scene profile และ accessibility ตามที่ชุดนั้นตรวจ

Detector ทำหนึ่งครั้ง: 0 primary findings และ 219 advisories เทียบกับ DESIGN.md รุ่นก่อน (89 color, 117 type, 13 radius) จากนั้นอัปเดต DESIGN.md/sidecar ตามระบบที่สร้างจริง ไม่รัน detector ซ้ำเพื่อทำตัวเลขให้เป็นศูนย์ ส่งรายงานเดิมให้ reviewer ใช้ประกอบ

ไม่มี raster สำหรับแอปที่สร้าง/แก้ใหม่ในงานนี้ sprite, background และ audio เดิมคงอยู่ ภาพหน้าจอเป็นหลักฐาน QA ไม่ใช่ asset ของแอป Git diff ยืนยันว่า migration 001–009, ไฟล์ภาพ/เสียง Boss Raid เดิม และโค้ด Google Auth/Supabase ไม่ถูกแก้

`nominal-animation-budget.json` คำนวณจากคลิปเดิม 16 frames, projectile 350ms และ slow 600ms พบระยะยาวสุด 2,489ms ของทั้ง 5 classes ภายในหน้าต่าง 3,000ms นี่คือค่าตามกติกาคลิป ไม่ใช่เวลาที่วัดบนอุปกรณ์จริงเมื่อเครื่องค้างหรือโหลด asset ช้า

ยังไม่ทดสอบบน Android/iOS/iPad จริง, คีย์บอร์ดมือถือจริง, GPU คอมพิวเตอร์โรงเรียน, ระดับเสียงในห้องเรียน หรือ concurrent load บน Supabase จริง ไม่อ้างว่าได้ 30/60 FPS บนอุปกรณ์เหล่านี้ และตัวเลข decoded cache ไม่ใช่ VRAM/heap ที่วัดจากอุปกรณ์จริง

ก่อนนำขึ้นใช้งานต้องรัน migration 010 ตาม README แล้วตรวจ read-only ด้วย `scripts/boss-raid/verify-presentation.sql` ไม่ต้องแก้ Google Cloud Console หรือ environment variables
