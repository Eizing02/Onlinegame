# เพิ่มฮีโร่ Boss Raid อีก 5 ตัว

งานนี้เพิ่มเฉพาะภาพ ท่าเคลื่อนไหว เอฟเฟกต์ และชื่อท่า ใช้คะแนน HP ดาเมจ การฟื้นฟู และเวลารวมชุดเดิมทุกตัว ไม่เพิ่มความได้เปรียบให้คลาสใด

| ID | ตัวละคร | ท่าที่ 1 | ท่าที่ 2 | เสียงเดิมที่ใช้ |
|---|---|---|---|---|
| ranger | นักธนูสายลม | ศรสายลม | ศรพายุ | mage1 / fairy1 |
| ninja | นินจาเงาจันทร์ | คมเงา | ดาวกระจายจันทรา | warrior1 / witch2 |
| monk | นักสู้หมัดอรุณ | หมัดสะเทือน | เตะวงอรุณ | warrior2 / hit |
| engineer | หุ่นกลทองแดง | กระสุนเฟือง | ปืนใหญ่แกนพลัง | warrior2 / wizard2 |
| bard | นักดนตรีดวงดาว | คลื่นพิณ | บทเพลงดารา | fairy1 / fairy2 |

## ไฟล์และขอบเขต

- `src/features/boss-raid/assets/hero-definitions.ts`: ข้อมูลการแสดงผลกลาง ไม่มีสูตรคะแนนหรือ multiplier
- `manifest.ts`, `catalog.json`, `visual-metadata.json`: รายชื่อ 10 ตัว, คลิป และจุดวางเท้าแต่ละเฟรม
- `HeroSelectLobby.tsx`, `HeroPortrait.tsx`, `RaidPartyRoster.tsx`, `raid.css`, `use-raid-tabs.ts`: หน้าเลือกตัว ภาพย่อ ปาร์ตี้ และการปัดที่แยกจากเมนูห้อง
- `combat-scene.ts`, `combat-feedback.ts`, `audio/cues.ts`, `scenes/geometry.ts`: ท่าโจมตี เอฟเฟกต์ เสียง และจัดลงเพียง 5 ตำแหน่ง แม้เลือกตัวซ้ำกัน
- `supabase/migrations/013_raid_hero_catalog_v2.sql`: catalog ใหม่ที่แยกจาก rules_version
- `public/assets/boss-raid/heroes/{ranger,ninja,monk,engineer,bard}`: 30 แผ่น / 480 เฟรมจริง; ภาพต้นแบบ 5 ภาพ, VFX ใหม่ 10 ภาพ; portrait 256px ครบ 10 ตัว

ภาพสร้างด้วย native ImageGen เก็บ prompt ทุกภาพใน `prompts/` และใน metadata PNG แหล่งที่มาอยู่ใน `generation-index.json`; hash และไฟล์ที่ใช้งานจริงอยู่ใน `generated-assets.json` ภาพต้นฉบับที่เครื่องมือสร้างไว้ภายนอกโปรเจกต์ไม่ถูกแก้

ตัวแพ็ก `pack-generated-atlas.mjs` แยกภาพตัวละครจริงจาก alpha แก้ปัญหาแถวต้นฉบับไม่เท่ากัน แล้วจัดเป็นช่อง 320px พร้อมขอบใส ใช้ scale เดียวกันทั้งคลิปเพื่อไม่ขยายตัวละครตอนคุกเข่า ไม่สร้างเฟรมปลอมหรือลบสีขาวออก ส่วน `*.packing.json` บันทึกกรอบต้นทางแต่ละเฟรม

## SQL และการนำขึ้นใช้งาน

ยังไม่ได้รัน SQL หรือเผยแพร่จากงานนี้ ผู้ดูแลต้องรัน **013 เพียงไฟล์เดียว** หลังจากมี migrations 009–012 แล้ว ก่อนนำโค้ดชุดนี้ขึ้นใช้งาน ไม่ต้องรันข้อมูลตั้งต้นหรือ migration เก่าซ้ำ

013 กำหนด `hero_catalog_version=1` ให้ห้องที่มีอยู่ และ default=2 สำหรับห้องที่สร้างต่อจากนั้น ห้องเดิมจึงมี 5 ตัวเหมือนเดิม ห้องใหม่กติกา v2 มี 10 ตัว ห้องเก่าที่ rules_version=1 ยังห้ามตัวซ้ำ ข้อมูลผู้เล่น คะแนน ลำดับโจทย์ ช้อย และ deadline เดิมไม่ถูก reset ตัวละครจะเปลี่ยนไม่ได้หลังเริ่มเกม

ไม่ต้องตั้งค่า Google Cloud, Google Provider, RBAC, Storage bucket หรือ environment เพิ่ม ภาพเสิร์ฟจากไฟล์ static ในแอป ชุดนี้ไม่มีการเปลี่ยน Classic

ลำดับแนะนำ: สำรองฐานข้อมูลตามขั้นตอนเดิม → ทดสอบ SQL/โค้ดใน staging → รัน 013 บนโครงการเป้าหมายเมื่อได้รับอนุญาต → พุช/เผยแพร่เมื่อได้รับอนุญาต → สร้างห้อง Boss Raid ใหม่เพื่อตรวจรายการ 10 ตัว ห้องเดิมไม่แปลง catalog อัตโนมัติ

## สร้างไฟล์ซ้ำและทดสอบ

```powershell
npm run raid:heroes:prepare
node scripts/boss-raid/calibrate-sprite-grounding.mjs --only=ranger,ninja,monk,engineer,bard
npm run raid:assets:validate
npm run test:raid:assets
npm run test:raid
npm run test:raid:presentation
npm run lint
npm run build
npm run test:e2e:raid
npm run test:e2e:google
```

รัน browser suites ทีละชุด เพราะใช้พอร์ต/ทรัพยากรร่วมกัน การทดสอบใช้ Google chooser จำลองและ PGlite บน loopback ไม่เชื่อม Production การพิสูจน์ lock หลาย connection และความลื่นบนมือถือ/คอมโรงเรียนจริงต้องทดสอบ staging/อุปกรณ์จริงแยก

หลักฐานและผลตรวจสุดท้ายอยู่ใน `validation.md` และ `.impeccable/review/raid-heroes-v2/` ไม่ถือว่าภาพนิ่งพิสูจน์ FPS หรือการเล่นเสียงบนอุปกรณ์จริง
