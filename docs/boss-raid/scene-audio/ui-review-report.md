# รายงาน Impeccable: ฉากและเสียง Boss Raid

วันที่ตรวจเอกสาร: 12 ตุลาคม 2026

**ผลล่าสุด: `ship` เฉพาะการแก้สองประเด็นที่ reviewer ให้คะแนน** ได้แก่ความอ่านได้ของฉากครูแนวนอนสั้น และการเข้าถึงระดับเสียงทั้งสามชุดใน desktop/mobile/landscape คำตัดสินนี้ไม่รับรองทั้ง surface ไม่รับรอง FPS บนอุปกรณ์จริง และไม่รับรองคุณภาพจากการฟังเสียง

## ขอบเขตและอำนาจของระบบภาพ

งานนี้เป็นการต่อยอดโค้ดตามทิศทางที่ผู้ใช้กำหนด ใช้โลกภาพ “ห้องเรียนในอวกาศ” เดิม ไม่ใช่การสร้างโลกใหม่หรือการอนุมัติเปลี่ยนระบบดีไซน์ ผู้ใช้กำหนดให้ใช้ภาพฉากต้นฉบับหกชั้น, Sprite Sheets เดิม 42 ไฟล์ และ OPUS ต้นฉบับ 25 ไฟล์ พร้อมอนุมัติเพลง MP3 เพิ่มทั้งสามรายการ

อ้างอิง [direction contract](../../../.impeccable/surfaces/src-features-boss-raid-components-raidarena-tsx.md): คำถามเป็นงานหลักที่ต้องปกป้อง บอสอยู่ซ้ายบนผิวหิน ฮีโร่จริง 1–5 คนอยู่ขวาแบบมีความลึก Wide/Phone มี polygon ที่ปรับจากภาพของตนเอง HUD อยู่ด้านล่างแยกจากตัวละคร และเสียงเริ่มต้นปิดไว้

เขียนเฉพาะรายงานนี้ รักษา [PRODUCT.md](../../../PRODUCT.md), [DESIGN.md](../../../DESIGN.md) และ [design.json](../../../.impeccable/design.json) แบบ byte-for-byte ไม่มีการแก้ UI กติกาเกม คะแนน Damage Authentication RBAC API หรือฐานข้อมูลในการตรวจเอกสารรอบนี้ และไม่มี production SQL หรือ deployment

## เปรียบเทียบระบบเดิมกับโค้ดที่ส่งมอบ

| เรื่อง | ระบบที่บันทึกไว้ | สิ่งที่พบใน source ของงานนี้ |
|---|---|---|
| สี | navy `#050716`, surface `#081126`, panel `#111f42`, primary `#6d3df1`, cyan `#43ddff`, success `#3df0ad`, warning `#ffcb57`, danger `#ff6686` | Raid ใช้ตัวแปรระบบกับคำสั่ง โฟกัส พื้นผิวและสถานะ; มีสีเฉพาะฉาก/HUD เป็น literal ซึ่งไม่ได้เพิ่มเป็น token กลาง |
| ตัวอักษร | Noto Sans Thai; display `clamp(30px, 3.1vw, 44px)` น้ำหนัก 650; body 16px/1.5 | `layout.tsx` โหลด Noto Sans Thai ลงตัวแปร `--font-geist-sans`; Raid สืบทอดฟอนต์ มีหัวห้อง 19–28px, โจทย์ 18px/1.7 และ 16px บนจอแคบ, ข้อมูลประกอบ 12–14px และ HUD ที่เล็กลงตามพื้นที่ |
| รูปทรงและการควบคุม | control 10px, panel 16px, เป้าสัมผัสอย่างน้อย 44px | Arena/dialog ใช้ 16px; ปุ่มและ disclosure ใช้ 10px; focus cyan 2px; slider มี label/aria-label แยก Master, SFX และ BGM |
| งานหลัก | The Classroom Task Rule: motion ไม่บังช่องตอบ ปุ่มหรือเวลา | `RaidQuestionModal` แยกโจทย์/คำตอบที่เลื่อนได้ออกจาก footer ยืนยันและเวลา มี mute ใน dialog เมื่อเสียงเปิด; `RaidClient` ส่ง cue จาก Arena และรับ event เดิมของทีม |
| ฉากและความลึก | ฉากประกอบต้องคงความเข้าใจได้เมื่อ renderer ใช้ไม่ได้ และเคารพ reduced motion | Raid ใช้ PixiJS; `geometry.ts`/registry เก็บ polygon, slots และ camera ของ Wide/Phone; `scene-layers.ts` วาง Far/Mid/Fight ด้วย transform เดียว เงาและ actor อยู่ในกล้อง ส่วน HUD อยู่ใน DOM; source มี fallback/cleanup และหยุด parallax เมื่อ Low/reduced |
| ครูแนวนอนสั้น | พื้นที่ควบคุมและสถานะต้องอ่านได้ | `TeacherRaidOverview` เปิด `compactViewport`; `combat-scene.ts` fit ขอบลานและ alpha bounds ของทุกคลิปที่เกี่ยวข้อง พร้อมกันพื้นที่ roster; CSS ใช้พื้นที่ flex ที่เหลือจริงและ sidebar 160px ในแนวนอนเตี้ย |
| เสียง | เปิดด้วยผู้ใช้และมี feedback ที่เข้าใจได้ | `use-raid-audio.ts` เริ่ม muted; manager ใช้ gesture unlock, แยกสามระดับเสียง, dedup ตามทีม/event/cue และยกเลิกเสียงเมื่อ mute/ซ่อน/สลับทีม; BGM เปลี่ยนตาม lobby/battle/final phase; Critical Hit/Spawn ยัง dormant |

แหล่ง source ที่ตรวจ: `raid.css`, `RaidArena.tsx`, `TeacherRaidOverview.tsx`, `RaidClient.tsx`, `RaidAudioSettings.tsx`, `RaidQuestionModal.tsx`, `scenes/{geometry,registry,scene-layers}.ts`, `scenes/registry.json`, ส่วน framing/cue/cleanup ของ `engine/combat-scene.ts`, `hooks/use-raid-audio.ts`, ส่วนควบคุมและ lifecycle ของ `audio/sound-manager.ts`, และตัวอย่าง dev calibration รวม production route guard นอกจากนี้ตรวจ `globals.css` และ font setup เพื่อเทียบระบบกลาง

## ขอบเขตจริงของคำตัดสิน

| รอบ | ผล | สิ่งที่คำตัดสินกล่าวไว้ |
|---|---|---|
| [finish-review.md](../../../.impeccable/review/scene-audio/finish-review.md) | `fix` | fresh reviewer เปิด 31 captures และ sample source; ให้รักษาต้นฉบับ การยึดพื้น formation และคำถาม แต่ต้องแก้พื้นที่ฉากครู 844×390 และระดับเสียงที่ถูกตัด |
| [finish-verdict-round-1.md](../../../.impeccable/review/scene-audio/finish-verdict-round-1.md) | `fix` | ฉากเห็นครบแต่รูปต่อสู้ประมาณ 218×98px เล็กเกินไป; desktop/landscape เสียงครบ แต่มือถือมี label หลุดซ้าย; ไม่พบ regression อื่นในชุดที่ตรวจ |
| [finish-verdict.md](../../../.impeccable/review/scene-audio/finish-verdict.md) | `ship` | ฉากครูแนวนอนอ่านได้ เห็น boss/ฮีโร่ห้าคน พื้นสัมผัส roster และ controls; HP บอสยังเห็นใน sidebar; label/slider ทั้งสามและ mute อยู่ใน viewport ของ desktop/mobile/landscape; ไม่พบ regression ใน captures ที่ refresh |

คำว่า `ship` รอบสุดท้ายครอบคลุม **สอง scored fixes เท่านั้น** ไม่เปลี่ยนเป็นการรับรองทั้งหน้า การตรวจอุปกรณ์จริง หรือการอนุมัติระบบภาพใหม่

## หลักฐานที่เก็บไว้

หลักฐานภาพและ diagnostics อยู่ใน [review/scene-audio](../../../.impeccable/review/scene-audio/) มี 18 Arena captures, 2 dev calibration captures และ 13 captures ของ production build บน fixture ในเครื่อง จำนวนนี้ไม่ใช่อุปกรณ์จริง 33 เครื่อง

| หลักฐาน | ขอบเขตที่ใช้ประกอบรายงาน |
|---|---|
| `desktop-1..5.png`, `phone-1..5.png`, small phone/landscape/iPad/desktop-large, `wide-verified.png`, `phone-verified.png`, `matrix.json` | formation, profile และ geometry; ผลการเปิดภาพเป็นงานของ reviewer รอบก่อน Documenter รอบนี้ไม่เปิด browser หรือทำ capture เพิ่ม |
| `teacher-landscape.png`, `teacher-audio-settings.png`, `teacher-audio-mobile.png`, `teacher-audio-landscape.png` | หลักฐานสองประเด็นตาม final verdict; ภาพ teacher/student/question ที่เหลือช่วยดู regression ของ batch |
| `calibration-desktop.png`, `calibration-mobile.png` | เครื่องมือ dev; ไม่ใช่หน้าสำหรับผู้เล่นจริง |
| [source-preservation.json](source-preservation.json) | บันทึก `pixelsMatch=true` ทั้งหกภาพ และ `bytesMatch=true` ของ 25 OPUS/3 MP3 BGM; บันทึก Sprite PNG diff ว่างแยกใน Git ไม่มีการสร้างภาพหรือเสียงแทนต้นฉบับ |
| [scene-validation.json](scene-validation.json), [audio-validation.json](audio-validation.json), [scene-import.json](scene-import.json), [audio-import.json](audio-import.json) | audit/import/validation ที่เก็บไว้; [validation.md](validation.md) รายงาน Sprite 42 sheets/672 frames และ raster provenance 48 รายการ/0 missing |
| `browser-decode.json`, `audio-playback.json`, `performance-fallback.json` | Chromium decode 50 OPUS/MP3 fallback, cue release/ครั้งเดียว/mute, fallback และ native BGM playback; ไม่เท่ากับผลฟังผ่านลำโพงจริง |
| `integration-metrics.json`, `integration-initial-metrics.json` | production build ที่ใช้ mock OAuth/PGlite ในเครื่อง ไม่ใช่ production service |
| `detector.json` | detector ที่รันครั้งเดียว: 0 primary, 69 token advisories; ไม่มีการรันใหม่ในรอบเอกสารนี้ และ advisory ไม่ถูกทำให้หายด้วยการเพิ่ม token เข้าระบบ |

[validation.md](validation.md) และ [phases.md](phases.md) บันทึกผลเดิมว่า TypeScript/lint/build, 1,095 presentation checks, 135 Raid SQL checks ในเครื่อง, Classic E2E 15, Google E2E 8, Raid E2E 5 และ scene/audio E2E 5 ผ่าน Documenter อ่านผลเหล่านี้และตรวจความสอดคล้องของคำอ้าง ไม่ได้รันทดสอบซ้ำ

## ข้อจำกัดที่ยังคงอยู่

ค่าที่วัดบน headless Chromium/SwiftShader ต่ำกว่าเป้า 30/60 FPS: calibration Full P50 66.6ms (~15 FPS), Low P50 50ms (~20 FPS); fixture หลาย context ก่อนแก้ layout ช้ากว่านี้ตาม `integration-initial-metrics.json` Low ลด scene RGBA bytes ได้ประมาณ 70% แต่จำนวน byte ของ RGBA/PCM ไม่ใช่ heap หรือ VRAM ทั้งหมด และผลนี้ไม่รับรองเครื่องนักเรียน

**NOT_RUN:** การวัด FPS/GPU/VRAM บนอุปกรณ์จริง, Safari/WebKit, Firefox, iOS/Android/iPad จริง, การฟังเสียงและเทียบความดังด้วยลำโพงจริง, classroom network throttle, long session soak, production PostgreSQL หลาย connection/load/races และ production OAuth/deployment ภาพ viewport emulation ไม่ใช้แทนหลักฐานเหล่านี้

มีภาพจริงเพียงหนึ่งฉากสองโปรไฟล์ การรองรับ registry/import หลายฉากไม่เท่ากับตรวจ calibration ของภาพฉากที่สองแล้ว Critical Hit/Spawn มี asset/mapping แต่ไม่มี gameplay ใหม่ในงานนี้

## ความคลาดเคลื่อนที่ไม่ยกเป็นมาตรฐาน

ระบบเดิมมีรายการที่ไม่ตรงกันอยู่ก่อนรอบเอกสารนี้: sidecar Panel snippet ใช้ radius 8px ขณะที่ frontmatter ระบุ panel 16px; snippet ใช้ `sans-serif` ตรง ๆ ขณะที่ระบบและ font setup ใช้ Noto Sans Thai; prose/sidecar ไม่ได้ครอบคลุมค่าขนาด ตัวเลือก Full/Low/reduced และสีเฉพาะ Raid ทั้งหมด นอกจากนี้ `globals.css` ยังมี `.eyebrow` ซึ่งเป็น craft-floor refusal; ไม่ยกให้เป็นกฎของระบบหรือชวนให้ surface ใหม่ทำตาม

บันทึกความคลาดเคลื่อนเหล่านี้เป็นข้อสังเกต ไม่มีการซ่อม root spec หรือ sidecar ไม่มีการขยาย type ramp/palette/radius เพื่อกลบ 69 advisories และไม่ยกสีเฉพาะฉาก, HUD ขนาดเล็ก หรือ disclosure placement เฉพาะห้อง Raid เป็นมาตรฐานของทั้งแอป งานนี้ไม่มีอำนาจเปลี่ยนโลกหรือระบบดีไซน์

## การตรวจเอกสารอิสระ

Documenter อ่าน operating spec และ agent contract เต็ม ตรวจ source/system ตามรายการข้างต้น แล้วเทียบ README/validation/phases กับ initial review, verdict รอบแรก และ final verdict แยกผลทดสอบที่มีหลักฐานเดิมออกจากสิ่งที่ยังไม่ได้ทดสอบ ตรวจว่าคำว่า `ship` ยังคงขอบเขตสอง scored fixes และไม่มีการอ้างว่ารอบเอกสารนี้ได้ตรวจภาพ ฟังเสียงหรือทดสอบ browser ใหม่

SHA-256 ก่อนและหลังการเขียนรายงานของไฟล์ที่ต้องรักษาตรงกัน:

| ไฟล์ | SHA-256 |
|---|---|
| `PRODUCT.md` | `B32075374717249CD2AE6C3EC90DC387F86818163E60FA95A0DF1CB3A8C3A8D2` |
| `DESIGN.md` | `E9CB2525165CC5B44C47E942D60BD3187252315BDE0BE85FDDE3AC1545C72F74` |
| `.impeccable/design.json` | `141999F9245D27577AB646FB536C312E2F3904C40419E0F50972A18541FDCD1E` |

**ไม่ canonize/ไม่ซ่อม:** drift ของ spec/sidecar, `.eyebrow`, และ literal สี/ขนาด/radius เฉพาะ Raid ถูกเก็บเป็นข้อสังเกต เนื่องจากนี่เป็น ordinary pinned extension และไม่ได้รับอนุมัติให้เปลี่ยนระบบกลาง
