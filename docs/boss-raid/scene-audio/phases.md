# รายงานการพัฒนาเป็นระยะ

แต่ละระยะลงมือแก้โค้ดและตรวจในเครื่อง ไม่มี production SQL หรือ deployment

| ระยะตามเอกสาร | งานและไฟล์หลัก | ผลตรวจ | ข้อจำกัดที่ส่งต่อ |
|---|---|---|---|
| A — Audit & Contracts | `inspect-scene-sources.mjs`, `import-scenes.mjs`, `import-audio.mjs`, import audit JSON, scene surface brief | เปิดภาพ Fight สองชุดและ composite จริง; เปิด contact sheets ทุกอาชีพ/บอส; ตรวจหกภาพและเสียง 25 รายการตามชื่อจริง/Unicode/codec; พบ BGM เพิ่มสามและได้รับคำยืนยัน | มีภาพจริงหนึ่งฉาก; Phone Far มีขนาดต่างจาก Mid/Fight ต้อง alignment แยก |
| B — Scene Layers | `scenes/geometry.ts`, `registry.ts`, `registry.json`, `scene-layers.ts`, `validate-scenes.mjs` | schema/geometry/alpha ผ่าน, contain transform roundtrip, Far/Mid/Fight จาก profile เดียว, profile เปลี่ยนตาม Arena จริง, fallback ไฟล์ขาดยังใช้งานได้ | ฉากที่เพิ่มใหม่ต้องวาดและตรวจ polygon จากภาพจริงเอง; ไม่ใช้ค่าเริ่มต้นเป็นการยืนยัน |
| C — Grounded Formation | `calibrate-sprite-grounding.mjs`, `visual-metadata.json`, `combat-scene.ts`, `sprite-loader.ts`, `RaidArena.tsx`, `raid.css`, dev calibration และ config importer | 672 frame anchors, fixed home positions, Facing, Fairy hover, stable/duplicate-class slots, 18 Arena captures, mouse drag/export และ CLI roundtrip/rejection | contact geometry เป็นภาพ 2.5D; ไม่ใช่ physics engine และไม่มี movement gameplay ใหม่ |
| D — Sound | `audio/cues.ts`, `registry.json`, `sound-manager.ts`, `use-raid-audio.ts`, `RaidAudioSettings.tsx`, `RaidClient`, `TeacherRaidOverview`, `RaidQuestionModal`, public audio/fallback/music | decode เสียง OPUS/MP3 จริง 50 ไฟล์ใน Chromium, release ≥ frame 7, death/victory ครั้งเดียว, gesture/mute/team/hide policies, unsupported OPUS ขอ MP3, BGM ทั้งสาม native play resolve ตามสถานะ | Critical/Spawn dormant; ยังไม่ได้ฟังผ่านลำโพงจริงหรือทดสอบ Safari/iOS/Android |
| E — Regression & Polish | `presentation-unit.mjs`, `scene.spec.ts`, `gameplay.spec.ts`, Playwright scene config, `capture-scene-integration.mjs`, docs/review evidence | TypeScript/ESLint/Build, validators, 1,095 presentation checks, 135 Raid SQL checks, 15 Classic + 8 Google + 5 Raid E2E ผ่าน, 5 scene/audio E2E ผ่าน | Headless SwiftShader FPS ต่ำและไม่ได้รับรอง physical device; fresh Impeccable disposition บันทึกใน ui-review-report |

เครื่องมือ calibration ครอบคลุมการเลือกฉาก/profile, ขนาดทดลอง, polygon/slots, pointer, keyboard U/V, scale/foot offset/depth, animation preview, quality, JSON import/export และบันทึกเข้า registry โดย CLI ไม่มี endpoint เขียน filesystem หรือฐานข้อมูลจาก browser และ production route 404

เอกสารผู้ใช้ล่าสุดที่แนบปรับลำดับ Phase 1–10 ให้ละเอียดขึ้น: 1 = A audit, 2 = B config/calibration, 3 = B scene renderer, 4 = C formation, 5 = C responsive, 6 = C developer tool, 7 = D manifest/manager, 8 = D actual cues, 9 = B/C/D caches and cleanup, 10 = E regression/review

ดูคำสั่งใช้งาน รายชื่อเสียง ตำแหน่งและการเพิ่มฉากใน [README.md](README.md) ดูผลจริง/ข้อจำกัดใน [validation.md](validation.md) และคำตัดสิน Impeccable ใน [ui-review-report.md](ui-review-report.md)
