# ผลตรวจฉากและเสียง — 12 ตุลาคม 2026

ทดสอบในเครื่องบน branch `feat/boss-raid-scene-audio` จาก `1115545eee47b7ff1de90f5f623c257c03248b1a` ไม่มีการ deploy หรือเขียน Supabase production

## ผลที่ยืนยันแล้ว

| การตรวจ | ผลและขอบเขต |
|---|---|
| Scene validator | PASS — 1 ฉาก / 6 ภาพ, native dimensions, alpha จริง, geometry และ reviewed ทั้งสองโปรไฟล์ |
| Audio validator | PASS — 25 Ogg Opus + 25 MP3 fallback + 3 MP3 music, codec/container/duration |
| Sprite validator | PASS — 42 sheets / 672 เฟรมโปร่งใสและมีภาพ; 221 คำเตือนขอบเซลล์/พิกเซลดำของภาพเดิม ไม่มีไฟล์ Sprite ที่แก้ไข |
| Presentation unit | PASS — 1,095 checks: 8 viewport transforms, polygon/edge/slots, class ซ้ำ, 672 frame anchors, cue mapping, dedup/team/mute/hidden/404/decode fallback |
| Raid rules/SQL | PASS — unit rules และ 135 SQL checks ใน PGlite แยกในเครื่อง |
| Scene/audio Chromium E2E | PASS — 5 กรณี, 18 scene captures, 1–5 heroes, orientation, animation anchor, calibration pointer/export, 50 เสียง decode มี PCM จริง, release frame, event ซ้ำ, BGM เล่นหลัง gesture, MP3 fallback และ Full→Low คืน texture |
| Config CLI | PASS — valid export roundtrip ให้ค่าเดิม; boss slot นอกลานถูกปฏิเสธและไม่เขียน registry |
| TypeScript / ESLint / production build | PASS |
| Impeccable detector | สแกนครั้งเดียว: 0 primary, 69 advisory เรื่องสี/ขนาดตัวอักษร/radius ของ Raid; ส่งต่อ reviewer โดยไม่เปลี่ยนระบบดีไซน์ทั้งแอป |
| Raster provenance | PASS — 48 rasters, 0 missing; source-preservation.json ยืนยันพิกเซลหกภาพและ bytes ของ 25 OPUS/3 BGM ตรงต้นฉบับ |
| Classic / Google / Raid integration | ผลรอบสุดท้ายบันทึกในตาราง regression ด้านล่าง |

## หลักฐานการแสดงผล

เก็บใน `.impeccable/review/scene-audio/`:

- `desktop-1..5.png`, `phone-1..5.png`: formation ตามจำนวนสมาชิกจริงใน preview
- `small-phone.png` 320×568, `phone-9-16.png` 360×640, `phone-landscape.png` 844×390
- `ipad-portrait.png` 768×1024, `ipad-landscape.png` 1024×768, `desktop-large.png` 1920×1080
- `wide-verified.png`, `phone-verified.png`: ทดสอบ profile บังคับหลังสลับและ reset
- `matrix.json`: project/unproject, จุดยึดและเงาจาก Pixi transform จริง, overflow
- `calibration-desktop.png`, `calibration-mobile.png`: เครื่องมือเต็มหน้า ตั้งแต่ด้านบนและ controls
- `browser-decode.json`: Chromium decode ครบ 50 OPUS/MP3 พร้อม nonSilent=true; ไม่ใช่หลักฐาน Safari
- `audio-playback.json`: warrior release ≥ frame 7, death/victory ครั้งเดียว, mute คืน voices=0
- `performance-fallback.json`: ขอเฉพาะ MP3 เมื่อ canPlayType(OPUS) ว่าง, bytes ก่อน/หลัง Low และ BGM play resolved
- `integration-metrics.json` และภาพ teacher/student/question: production build ที่เชื่อม mock OAuth และ PGlite ในเครื่อง

ภาพจริงถูกเปิดตรวจ ไม่ใช้ชื่อไฟล์แทนการตรวจ ทั้ง Wide/Phone มี polygon แยกและเท้าอยู่บนผิวหิน ส่วน Fairy hover เป็นข้อยกเว้นที่ตั้งใจไว้ มีเงาสัมพันธ์กัน

## ประสิทธิภาพที่วัดได้

ค่าจาก headless Chromium บน Windows host นี้ ในการสุ่มตัวอย่างหลังแก้กล้องเว้นพื้นที่ roster รอบ finish review หลังโหลดและเล่นท่าใน calibration (ค่าล่าสุดอยู่ใน performance-fallback.json):

| ค่า | Full | Low |
|---|---:|---:|
| RGBA scene bytes | 18,872,040 (18.0 MiB) | 5,664,768 (5.4 MiB) |
| Scene textures / active references | 3 / 3 | 3 / 3 |
| Sprite bytes ณ เวลาสุ่มตัวอย่าง | 37,690,112 | 28,520,128 |
| Decoded SFX bytes | 10,951,680 | 10,951,680 |
| เสียงในแคช | 14 | 14 |
| Tick P50 | 66.6 ms (~15 FPS) | 50 ms (~20 FPS) |
| Tick P95 | 100 ms | 83.3 ms |

Low ลด scene bytes ประมาณ 70% และ texture Full ที่ไม่ใช้งานถูกคืน ตัวอย่างล่าสุด Low มี tick P50 ดีขึ้นจาก Full แต่ **ยังไม่ถึง 30/60 FPS** จึงไม่อ้างว่าผ่านเป้าหมาย FPS ค่านี้มีข้อจำกัดจาก headless renderer, host และ preview diagnostics ต้องวัด browser ที่ใช้ GPU จริงบนมือถือ/คอมโรงเรียนก่อนรับรองความลื่น

ค่าข้อมูล RGBA/PCM ไม่ใช่ total heap, VRAM หรือจำนวน draw calls ที่วัดจาก GPU ไม่มีการวัด GPU allocator หรือ long-duration soak บนอุปกรณ์จริง แคชเป็น soft budgets เพื่อไม่ทำลาย resource ที่กำลังใช้ มี cleanup และเสียง/texture bounded ที่ทดสอบใน fixture

ตัวอย่างก่อนรอบแก้ layout จาก production fixture (integration-initial-metrics.json) ที่เปิดครูและนักเรียน 5 context พร้อมกันใช้ **SwiftShader software renderer** (ตรวจ vendor จาก WebGL จริง): Full P50 200 ms/P95 299.9 ms, Low P50 216.6 ms/P95 300 ms, JS heap ที่รายงานประมาณ 19.3 MB ตัวอย่างนี้ช้ากว่า calibration และไม่ผ่านเป้าหมาย FPS; เป็น software GPU กับหลายหน้าพร้อมกันบน host เดียว ไม่ใช่การรับรองหรือการจำลองเครื่องนักเรียนหนึ่งเครื่อง ไม่มีการซ่อนผลนี้ การ recapture หลังแก้ layout ไม่สุ่ม production FPS ซ้ำ เพราะไม่ใช้ software renderer รับรองอุปกรณ์จริง

## Regression รอบสุดท้าย

ตารางนี้ปรับจากผลคำสั่งจริงก่อน commit; pending ไม่ถือว่า pass

| ชุด | สถานะ |
|---|---|
| `npm test`: data/auth/SQL และ Classic E2E 15 กรณี | PASS |
| Google E2E 8 กรณี | PASS |
| Raid E2E 5 กรณี รวม modal mute 320×400 และ dev route production 404 | PASS — รอบสุดท้ายครบทั้ง 5; ก่อนหน้านี้แก้ helper ที่พยายาม parse หน้า HTML 404 เป็น JSON; ไม่ใช่บั๊กแอป |
| Teacher/student production fixture captures | PASS — 13 captures, Axe serious/critical=0, native play() ของ BGM ทั้งสาม resolve; responsive landscape/settings แก้และได้รับ ship เฉพาะสอง scored fixes จาก reviewer |
| Impeccable fresh finish review + documenter | PASS ตามขอบเขต — reviewer ship เฉพาะสอง scored fixes; documenter บันทึก ui-review-report และยืนยันสามไฟล์ระบบ SHA-256 ไม่เปลี่ยน |

## ปัญหาที่พบและแก้ในงานนี้

- จุด Witch/Fairy เริ่มต้นบังกัน: ปรับ slot จากภาพจริงให้ทั้งห้าอาชีพมองเห็น
- iPad portrait ที่ Arena กว้างกว่าที่คาด: เปลี่ยน profile selector ให้เลือกจากพื้นที่ framing ที่ใช้ได้จริง
- ท่า held-last เดินเฟรมต่อ และ callback คลิปเก่าทับคลิปใหม่: หยุด sprite/ล้าง callback ก่อน await lease, ตรวจ generation และ update เฉพาะเมื่อ playing
- เสียงสำคัญหลุดแคชหลังทดลองหลายรายการ: เก็บ death/victory/countdown/hit/heal ไว้พร้อมงบและ priority เดิม
- Screen Shake/Heal ถูก cooldown ร่วมกับเสียงอื่น: จำกัด cooldown ต่อ sound ID ทำให้เสียงคนละหน้าที่เล่นร่วมกันได้
- เดิมหน้าคำถามปิดเสียงไม่ได้: เพิ่มปุ่มปิดเสียงเฉพาะเมื่อเปิดเสียงไว้ โดยคง task protection และปุ่มยืนยัน
- Config importer อ้าง helper เก่า: ใช้ ESM helper เดียวกับ validators และทดสอบ roundtrip/rejection จริง
- Debug dropped-cue log: จำกัด 64 รายการ, metrics คืนล่าสุด 30 ไม่สะสมไม่จำกัด

## สิ่งที่ยังไม่ได้ทดสอบ

**NOT_RUN:** Safari/WebKit, Firefox, iOS/Android และ iPad จริง, ลำโพงจริง/การฟังเปรียบเทียบความดัง, GPU/VRAM allocation, network throttle จริงของห้องเรียน, long session soak, multi-connection production PostgreSQL load/races และ production OAuth/deployment ทั้งหมดนี้ไม่ถูกแทนด้วย Chromium viewport emulation

มีภาพชุดใหม่เพียงหนึ่งฉาก จึงตรวจสลับ Wide/Phone และ quality จริง รวม schema/importer ของหลายฉาก แต่ยังไม่มีภาพชุดที่สองสำหรับตรวจ calibration ต่างฉากจริง Critical Hit/Spawn พร้อมไฟล์และ mapping ยังไม่เปิด gameplay ไม่มี SQL เพิ่ม

การแก้ตาม fresh finish reviewer: teacher spectator ใช้ flex ตามพื้นที่คงเหลือจริง, ลด UI ซ้ำในแนวนอน, เก็บตัวเลือกภาพใน disclosure, ระดับเสียงซ้อนในห้องแทนเพิ่มความสูง toolbar, และกล้องกันพื้นที่ roster เพื่อให้เท้า/ฉากไม่ทับ HP. ไม่มีการแก้ game rules/API/DB.

Verdict รอบแก้ครั้งแรกยังเป็น fix: ครูแนวนอนเห็นครบแต่เล็กเกินไป และแผงเสียงมือถือถูกตัดด้านซ้าย จึงเพิ่ม compact camera ที่ครอบคลุม floor polygon + alpha bounds ของคลิปจริงทั้งหมด พร้อม fixed mobile audio panel ที่เคารพ safe area. ผล scoring รอบที่สองบันทึกใน ui-review-report.md โดยไม่ขยายเป็น whole-surface certification.
