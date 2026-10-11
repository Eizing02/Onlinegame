# Real sprite pipeline

แหล่งภาพที่ผู้ใช้ให้: `D:\ภาพใช้ในเกม` มี 42 PNG โปร่งใส ทุกแผ่นเป็น 4×4 รวม 16 เฟรม เรียงซ้ายไปขวา บนลงล่าง ใช้ขนาดจริงจากแต่ละ PNG ไม่สมมติว่าเท่ากัน

## นำเข้าและตรวจ

```powershell
npm run raid:assets:import -- 'D:\ภาพใช้ในเกม'
npm run raid:assets:provenance
npm run raid:assets:validate
```

Importer จับคู่ตัวพิมพ์/ช่องว่างและ alias (`idel.png` → Warrior idle, `Shield Defend.png` → boss shield) ถ้าหาไม่พบหรือกำกวมจะหยุด พร้อมรองรับ `--mapping=map.json` เพื่อระบุเอง ไม่แก้ไฟล์ต้นฉบับและไม่อัปโหลดไฟล์

รายงาน `asset-import.json` เก็บชื่อแหล่งที่มาและ SHA-256 ของต้นฉบับ ส่วน `asset-validation.json` เก็บขนาด alpha และ bounds ทั้ง 672 เฟรม `public/assets/boss-raid/readiness.json` ใช้ตรวจว่าภาพพร้อมก่อนเปิดสร้างห้อง

ขั้น provenance เพิ่ม metadata แหล่งที่มาในสำเนา PNG ที่แจกกับเว็บตาม Impeccable โดยคงพิกเซล/alpha เดิมและไม่แก้ PNG บนไดรฟ์ต้นฉบับ `sha256` เป็น hash ต้นฉบับ ส่วน `destinationSha256` เป็น hash ของสำเนาหลังเพิ่ม metadata จึงต่างกันได้ ตรวจ scan แล้วทั้ง 42 ภาพมีแหล่งที่มาครบ

ผลนำเข้า: 42 แผ่น / 672 เฟรม / 0 failures มี 221 คำเตือน silhouette แตะขอบ cell ซึ่งเป็นลักษณะในต้นฉบับ ต้องทบทวนท่าที่อาวุธหรือปีกอาจถูกตัดใน preview ไม่ได้แอบวาดภาพใหม่หรืออ้างว่าคำเตือนหายไปแล้ว

## Layout

```text
public/assets/boss-raid/
  boss/idle.png, ready.png, attack_1.png, attack_2.png,
       backward_dodge.png, damage_reaction.png, death.png, run.png,
       shadow_flame_breath.png, shield_defense.png, ultimate.png, victory_roar.png
  heroes/{warrior,mage,wizard,witch,fairy}/
       idle.png, attack_1.png, attack_2.png, hit.png, victory.png, defeat.png
  readiness.json
```

`assets/catalog.json` เป็นชื่อ alias กลาง `manifest.ts` ระบุ fps, loop, hold-last, anchor/scale/flip และ impact frame 7 โจมตีและผลภาพอิง event ที่บันทึกแล้ว ไม่คำนวณ damage จากเฟรมภาพ

Preview แสดงทุกท่า สไลด์เฟรม หยุด/เล่นและกลับด้าน พร้อมแผ่นต้นฉบับ ใช้ ratio ของภาพจริง และไม่มีใน production

## Memory and fallback

ภาพทั้งหมดเมื่อ decode เป็น RGBA ใช้ 209 MiB จึงโหลดเฉพาะ idle ของตัวจริง แล้วโหลดท่าเมื่อต้องใช้ ต่อฉากมี decoder พร้อมกันไม่เกิน 2, cache เป้าหมายไม่เกิน 8 sheets/64 MiB และ LRU ล้างเฉพาะภาพที่ไม่ได้ใช้อยู่ เฟรมแชร์ TextureSource ของแผ่นเดียว ไม่คัดลอกพิกเซล 16 รอบ

มี Pixi renderer หนึ่งตัวต่อฉาก DPR ไม่เกิน 1.5 (คุณภาพประหยัด 1), FPS เป้าหมาย 60/30, projectile ไม่เกิน 8, พลุไม่เกิน 72/24 จุด หยุด ticker เมื่อ hidden และล้าง ResizeObserver, timers, textures, canvas และ audio เมื่อเลิกใช้

WebGL หรือภาพโหลดไม่สำเร็จยังมี DOM HP และระบบตอบคำถาม พร้อมข้อความโหลดใหม่ ภาพขาดใน import/validate ทำให้ readiness ไม่ผ่านและไม่เปิดสร้าง Raid ไม่มี fallback ที่แอบเพิ่มผู้เล่นปลอม
