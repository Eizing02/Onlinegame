# บอส 3 แบบและการสุ่มประจำทีม

เพิ่มไททันศิลาและแมงป่องผลึก ร่วมกับมังกรเงาเดิม บอสต่างกันเฉพาะรูปลักษณ์ ท่าโจมตี เอฟเฟกต์ และการจับคู่เสียงเดิม ไม่มีค่าสถานะหรือคะแนนพิเศษ

## กติกาและข้อมูล

- เซิร์ฟเวอร์สุ่มแยกแต่ละทีมจากบอส 3 แบบตอนสร้างห้อง โอกาสแบบละ 1/3 และซ้ำกันได้
- บันทึก `boss_type` และ `boss_assigned_at` ไว้กับทีม ไม่สุ่มใหม่เมื่อเริ่มซ้ำ เปลี่ยนชื่อทีม รีโหลด หรือกลับเข้าห้อง
- ห้องเดิมใช้ `boss_catalog_version=1` และมังกรเงา ห้องที่สร้างด้วยโค้ดใหม่ใช้ version 2; แยกจากเวอร์ชันฮีโร่และกติกาคะแนน
- RPC สร้างห้องแบบเดิม 7 พารามิเตอร์ยังใช้งานได้และสร้างห้องมังกรเท่านั้น แบบใหม่ 8 พารามิเตอร์เลือกแค็ตตาล็อกอย่างชัดเจน ไม่มี default ที่ทำให้ PostgREST เลือก overload ไม่ได้
- คะแนน ดาเมจ การฟื้น HP สูตร HP บอส เฟส เวลารวม การยืนยัน 5 วินาที และช่วงต่อสู้ 3 วินาทีใช้กติกาเดิมทุกตัว

## ภาพและการแสดงผล

สร้างด้วย native ImageGen รวม 32 ภาพ: ต้นแบบ 2 ภาพ, Sprite Sheet 24 แผ่น (384 เฟรมจริง), เอฟเฟกต์ 6 ภาพ ทุกภาพมี alpha จริงและฝัง prompt ต้นฉบับ Runtime atlas เป็น 4×4 ขนาด 1536×1536 พร้อมขอบว่างในแต่ละช่อง ไม่มีการวาดเติมท่าด้วยโปรแกรมหรือใช้สีพื้นเป็น chroma key

ท่าครบทั้ง idle, ready, attack_1, attack_2, dodge, hit, death, run, breath, shield, ultimate, victory_roar รอยกระแทกและตัวเลขลอยใช้ข้อมูลดาเมจที่เซิร์ฟเวอร์ยืนยัน จุดกระทบของแมงป่องปรับลงมาที่ลำตัวต่ำ

หน้าครูแสดงชื่อ/ภาพบอสในรายการทีม และรับชมบอสของทีมที่เลือก นักเรียนใช้ข้อมูลทีมเดียวกัน หน้าผลแสดงชื่อบอส และ CSV เพิ่มคอลัมน์ `บอส` ต่อท้ายคอลัมน์เดิม

โหลดเฉพาะบอสที่ทีมได้รับ: lobby prefetch idle/attack_1 แบบ low priority; ฉากโหลดท่าตามใช้จริง เก็บ texture แบบมี lease/LRU จำกัด 64 MiB และ 8 แผ่นพร้อมกัน ไม่โหลดภาพบอสทุกตัวเข้าหน่วยความจำพร้อมกัน

## ไฟล์หลัก

| ส่วน | ไฟล์ |
|---|---|
| ข้อมูลบอส/เสียง/เอฟเฟกต์ | `src/features/boss-raid/assets/boss-definitions.ts` |
| การโหลดและฉาก PixiJS | `assets/manifest.ts`, `assets/sprite-loader.ts`, `engine/combat-scene.ts`, `engine/combat-feedback.ts` ภายใน feature |
| หน้าเกม/ครู/ผล | `components/RaidArena.tsx`, `BossIdentity.tsx`, `TeacherRaidOverview.tsx`, `RaidResults.tsx` |
| ฐานข้อมูล | `supabase/migrations/014_raid_team_boss_catalog.sql` |
| ภาพต้นฉบับและที่มา | `generation-index.json`, `generated-assets.json`, `prompts/`, `sources/` ในโฟลเดอร์นี้ |
| เตรียมภาพ/ตรวจจุดยืน | `scripts/boss-raid/prepare-generated-bosses.mjs`, `calibrate-sprite-grounding.mjs` |
| ทดสอบใหม่ | `tests/boss-raid/sql-boss-catalog.mjs`, `boss-assets.mjs`, `bosses.spec.ts`, `scene-audio/bosses.spec.ts` |

## ขั้นตอนนำขึ้นใช้งานเมื่อได้รับอนุญาต

1. สำรองข้อมูลด้วยวิธีที่ใช้ดูแล Supabase ตามปกติ และตรวจว่า migration 013 ที่ผู้ใช้รันแล้วสำเร็จ
2. เปิด Supabase SQL Editor ของโปรเจกต์เดิม รัน **014_raid_team_boss_catalog.sql ทั้งไฟล์** หนึ่งครั้ง หากรันซ้ำ การกำหนดบอสเดิมจะไม่เปลี่ยน
3. รัน `scripts/boss-raid/verify-boss-catalog.sql` เพื่ออ่านตรวจคอลัมน์ เวอร์ชันห้อง การกระจายบอส และสิทธิ์ RPC (`anon`/`authenticated` ต้อง false, `service_role` ต้อง true) สคริปต์นี้ไม่แก้ข้อมูล
4. พุช/Deploy โค้ดพร้อมไฟล์ภาพหลัง SQL สำเร็จ ไม่ต้องเปลี่ยน Google Cloud Console, OAuth callback หรือเพิ่ม environment variable บอส
5. สร้างห้อง Boss Raid ใหม่เพื่อตรวจบอสที่สุ่ม ห้องเก่าจะยังเป็นมังกรตามเดิม ไม่ต้องลบห้องหรือข้อมูลนักเรียน

งานพัฒนานี้ไม่ได้รัน SQL บน Production ไม่ได้ Deploy และไม่ได้พุช Git รายงานทดสอบและข้อจำกัดอยู่ใน `validation.md`.
