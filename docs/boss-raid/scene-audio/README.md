# Boss Raid: ฉาก ลานประลอง และเสียง

งานนี้ต่อยอด Boss Raid เดิมตาม `ONLINEGAME_BOSS_RAID_SCENE_AUDIO_INTEGRATION.md` และข้อความคำสั่งที่แนบมา ใช้ภาพของผู้ใช้ทั้งหกไฟล์และเสียงเดิมทั้งหมด ผู้ใช้ยืนยันให้เพิ่มเพลง MP3 ทั้งสามด้วย ไม่มีการเปลี่ยนกติกา คะแนน Damage API Authentication RBAC หรือฐานข้อมูล ไม่ต้องรัน SQL เพิ่มสำหรับการอัปเดตนี้

## สิ่งที่พัฒนา

ฉาก `shadow-citadel` ใช้ PixiJS เดิม แยก Wide และ Phone เป็นสองโปรไฟล์ บอสอยู่ซ้าย ฮีโร่ 1–5 คนอยู่ขวาแบบสลับระยะหน้าและหลัง เงาอยู่บนพื้นหินจริง Fairy ลอยเหนือเงา 24 หน่วยของฉากเฉพาะเมื่อ HP มากกว่า 0 HUD แสดงชื่อและ HP เป็นแถวด้านล่างเพื่อไม่บังตัวละคร หน้าตอบคำถามและปุ่มยืนยันเดิมยังครบ มีปุ่มปิดเสียงในหน้าคำถามเมื่อเปิดเสียงไว้

ภาพเรียง Far → Mid → Fight → Shadows → Actors ตามความลึก → Combat VFX ส่วน UI อยู่ใน DOM ภายนอกกล้อง ไม่มีภาพที่สร้างขึ้นใหม่ ไม่มีการยืดภาพหรือแก้พิกเซลต้นฉบับ เพิ่มเพียงข้อมูลที่มาของไฟล์ PNG ที่คัดลอกมา

| โปรไฟล์ | Far | Mid | Fight |
|---|---|---|---|
| Wide | `background far.png` 1870×841 | `background mid.png` 1870×841 | `background fight.png` 1870×841 |
| Phone | `background far phone.png` 941×1672 | `background mid phone.png` 1024×1536 | `background fight phone.png` 1024×1536 |

Phone Far ใช้ uniform scale 1.088204 และ offset V −0.09223 ให้สัมพันธ์กับพิกัด Fight ไม่ยืดสัดส่วน Mid และ Fight ตรวจ alpha จากพิกเซลจริง ภาพต้นฉบับทั้งหกไฟล์อยู่ครบและไม่ถูกเขียนทับ

## ตำแหน่งและการยึดเท้า

`src/features/boss-raid/scenes/registry.json` เก็บ polygon ของผิวลานแต่ละภาพ จุดยืน normalized UV, safe inset, camera bounds, ระดับความลึก, scale และทิศทาง ไม่ใช้ค่า Y เดียวกันกับทุกฉาก

| ตัวละคร | Wide (U,V) | Phone (U,V) |
|---|---|---|
| Boss | .30, .736 | .30, .473 |
| Warrior | .58, .759 | .55, .489 |
| Mage | .68, .683 | .66, .435 |
| Wizard | .72, .774 | .69, .506 |
| Witch | .77, .754 | .78, .490 |
| Fairy | .82, .707 | .82, .456 |

จับ slot ตามอาชีพและ ID อย่างคงที่ มี fallback สำหรับอาชีพซ้ำ ตรวจว่าจุดยืนไม่อยู่นอก polygon หรือใกล้ขอบเกินไป ตรวจรูปร่าง polygon และ slot ที่ทับกัน กล้อง contain กันพื้นที่ด้านล่างตามความสูง roster จริงก่อน fit แล้วแปลงภาพ พื้น เงา ตัวละคร และ VFX ด้วย transform เดียวกัน ตัวละครด้านหลังเล็กกว่าและวาดก่อน ตัวละครด้านหน้าวาดทีหลัง

`assets/visual-metadata.json` บันทึกขนาดเฟรมจริงและ anchor จุดเท้าทั้ง 672 เฟรมจาก 42 Sprite Sheets ใช้ขอบ alpha และช่วงลำตัวส่วนล่างที่ตรวจด้วยภาพจริง เพื่อไม่เอาปีก หาง หรือเอฟเฟกต์เวทมาเป็นเท้า ตำแหน่งบ้านและเงาไม่เปลี่ยนเมื่อสลับคลิป Anchor ปรับตามเฟรมและรองรับการปรับเพิ่มเติมใน calibration บอสต้นฉบับหันขวา ฮีโร่หันซ้ายอยู่แล้ว ไม่กลับภาพโดยไม่จำเป็น

การเคลื่อนเข้าฟันของ Warrior ถูกจำกัดระยะและตรวจ polygon ก่อนขยับ เมื่อจบท่ากลับจุดเดิม ไม่มีผลต่อ Damage ฝั่งเซิร์ฟเวอร์

## Phone, Tablet และ Desktop

เลือกโปรไฟล์จากพื้นที่ Arena ที่วัดได้จริง โดยเปรียบเทียบสัดส่วนพื้นที่ที่ camera bounds ของแต่ละโปรไฟล์ใช้ได้ ไม่ตรวจชื่ออุปกรณ์ iPad แนวตั้งจึงสามารถใช้ Phone ได้เมื่อเหมาะกว่า และแนวนอนใช้ Wide ได้ ResizeObserver หนึ่งตัวติดตาม Arena และความสูง roster คำนวณใหม่เมื่อหมุน เปลี่ยนขนาด หรือข้อความ HP เปลี่ยนความสูง ใช้ safe area และความสูงหน้าจอแบบ dynamic

ในหน้าครูแนวนอนสั้น กล้องเน้นขอบลานและขอบ silhouette จริงของทุกเฟรม/ทุกคลิปที่อาจใช้ของทีม โดยคำนวณจาก metadata และเผื่อ margin จึงขยายตัวละครให้ดูท่าได้โดยไม่เดาจุดยืนใหม่ HP บอสยังอยู่ในรายการทีมด้านซ้าย ส่วน HUD บอสที่ซ้ำกันเก็บไว้สำหรับ accessibility

Parallax ขยับเฉพาะ Far/Mid แบบเล็กน้อย Fight และจุดเท้าไม่ขยับแยกกัน โหมด Low หรือปิด FX หยุด parallax ไม่มีภาพฉากอื่นโหลดพร้อมกัน ภาพ Fight โหลดไม่ได้จะใช้สนามสำรองพร้อมข้อความแจ้ง แต่การตอบคำถามยังใช้งานได้ Phone โหลดไม่ได้ลอง Wide ตามสัดส่วนก่อน

## เสียงที่เชื่อมกับเหตุการณ์จริง

`audio/registry.json` ใช้ชื่อไฟล์จริงรวมเครื่องหมาย em dash ในชื่ออาชีพ OPUS เป็น Ogg Opus จริง มี MP3 ที่แปลงจากไฟล์เดียวกันเป็น fallback ไม่สร้างเสียงใหม่

| ไฟล์ OPUS | จุดเล่น |
|---|---|
| Warrior — Sword Slash / Shield Bash | `attack_1` / `attack_2` เฟรมปล่อยท่า |
| Mage — Arcane Bolt / Frost Burst | `attack_1` / `attack_2` เฟรมปล่อยเวท |
| Wizard — Fireball / Lightning | `attack_1` / `attack_2` เฟรมปล่อยเวท |
| Witch — Poison Orb / Shadow Curse | `attack_1` / `attack_2` เฟรมปล่อยเวท |
| Fairy — Light Bolt / Starburst | `attack_1` / `attack_2` เฟรมปล่อยเวท |
| Dragon Claw | บอส `attack_1` / `attack_2` จังหวะกระทบ |
| Dragon Fire | บอส `breath` จังหวะปล่อยไฟ |
| Dragon Roar | `raid_ended` ขณะเริ่ม `victory_roar` |
| Dragon Ultimate | จังหวะกระทบของท่า Ultimate ที่นำเสนอจาก event เฟส 3 เดิม |
| Dragon Death | เริ่มท่าตายจาก `boss_defeated` ครั้งเดียว |
| Normal Hit | ดาบกระทบ หรือ projectile ถึงเป้าหมาย / บอสกระทบฮีโร่ |
| Defeat | ฮีโร่ HP 0 ครั้งแรก ไม่เล่นซ้ำจาก snapshot |
| Heal | projectile ถึงเป้าหมาย เมื่อ event มีการฟื้น HP จริง |
| Shield | ท่าโล่จาก `boss_phase` เฟส 2 เดิม |
| Victory | เริ่มฉลองชัยของฮีโร่รอดชีวิตจาก `boss_defeated` ครั้งเดียว |
| Screen Shake | เมื่อเล่น shake จริงและ FX เปิด |
| Button Click | ปุ่มใน Boss Raid เมื่อเปิดเสียง |
| Countdown | deadline เดิมเหลือไม่เกิน 10 วินาที ครั้งเดียวต่อ deadline |
| Critical Hit / Spawn | เตรียม mapping ไว้ ยังไม่เล่นในเกม เพราะไม่มี gameplay รองรับ |

ครบ 25 รายการใน manifest แบ่งเป็นเสียงที่ใช้งาน 23 และรอ gameplay 2 รายการ การมีไฟล์พร้อมใช้ไม่หมายความว่าทุกท่าเกิดขึ้นในทุกคำตอบ

เพลง `raid_lobby.mp3` เล่นในล็อบบี้, `raid_battle.mp3` ระหว่างต่อสู้, `raid_final_phase.mp3` เมื่อเฟส 3 เปลี่ยนทีละเพลง ไม่เปิดซ้อน จบห้องหยุดเพลง

แผงระดับเสียงเป็น disclosure ลอยซ้อนในพื้นที่ห้อง ไม่ดันสนามลงใต้จอ แผงตั้งค่าภาพของครูเก็บตัวเลือกไว้หลังปุ่มเพื่อเหลือพื้นที่ให้ฉากในแนวนอน

เริ่มต้นปิดเสียง ต้องแตะเปิดเสียงก่อนตาม autoplay policy ปรับ Master, SFX และเพลงได้แยกกัน ใช้ AudioContext เดียว ถอดรหัสพร้อมกันไม่เกินสองไฟล์ จำกัดเสียงพร้อมกันแปดเสียง เสียงสำคัญมี priority สูงและแทนเสียงสำคัญน้อยกว่า เก็บเสียง death/victory/countdown/hit/heal ไว้ในแคชเพื่อไม่ต้องรอถอดรหัสใหม่ในจังหวะสำคัญ

ป้องกันเสียงซ้ำด้วย team + event sequence + cue ID ซ่อนหน้า สลับทีม ปิดเสียง หรือออกจากฉาก จะยกเลิกเสียงที่ค้างและไม่เล่นย้อนหลัง Event เก่าที่ reconnect ไม่เล่นซ้ำ โหลด/ถอดรหัสเสียงไม่ได้จะแจ้งหนึ่งครั้งและไม่หยุดเกม

## เครื่องมือปรับลานสำหรับนักพัฒนา

ทดลองโดยแยกจาก production settings: รัน `node scripts/boss-raid/start-scene-test-server.mjs` แล้วเปิด `http://127.0.0.1:3120/dev/boss-raid/scene` wrapper นี้บังคับ local backend/legacy auth และไม่ใช้ Supabase production หรือใช้ `npm run dev` กับ development settings ที่จัดไว้แล้ว เครื่องมือนี้มีเฉพาะ development; production ส่ง 404 ไม่เปิดให้นักเรียนเข้าถึง ไม่มี database API ในเครื่องมือ

1. เลือกฉากและโปรไฟล์ Wide/Phone หรือให้เลือกตาม Arena ทดลองขนาดโทรศัพท์ แนวนอน แท็บเล็ต และ desktop
2. เปิด overlay แล้วลาก polygon, boss slot และ hero slots ด้วย pointer ที่รองรับเมาส์และ touch หรือกรอก U/V ด้วยคีย์บอร์ด
3. ปรับ scale, foot X/Y, depth scale, zoom/pan และลองท่าจริง ตรวจเงา จุดยึดพื้น อาชีพ 1–5 และ HP 0
4. ตรวจจุดยืนบนภาพ Fight จริงของทั้งสองโปรไฟล์ แล้วเลือก “ตรวจจุดยืน profile นี้แล้ว” ห้ามติ๊กจากการคาดเดา
5. ส่งออก JSON แล้วนำเข้าผ่าน `npm run raid:scenes:config -- "path/to/exported.json"` ใช้ schema เดียวกับแอป Config ที่ไม่ปลอดภัยถูกปฏิเสธก่อนเขียน registry
6. โหลด JSON เดิมกลับเข้าหน้า preview ได้ ค่าซูมและ pan ใช้ตรวจภาพชั่วคราว; camera bounds ใน config เป็น framing ที่เกมใช้จริง

ทดสอบเสียงจริงได้จากรายการ SFX และจำลอง combat events พร้อมดู diagnostics โดยไม่เพิ่มกติกาใหม่หรือคะแนนจริง

## เพิ่มฉากใหม่จากหกภาพ

เตรียมไฟล์ตามหกชื่อในตารางในโฟลเดอร์ใหม่ ใช้ชื่อ Scene ID ตัวอักษรเล็กและขีด เช่น `new-arena`:

```powershell
npm run raid:scenes:import -- "D:/path/to/new-six-layers" new-arena
```

คำสั่งนำเข้าไม่สร้าง floor geometry อัตโนมัติ คัดลอก config ของฉากเดิมเป็นจุดตั้งต้น เปลี่ยน `sceneId`, label, dimensions, filename mapping, layer alignment, camera bounds และ polygon ให้ตรงกับภาพใหม่ ตั้ง reviewed=false ทั้งสองโปรไฟล์ นำเข้า config แล้วเปิด preview เพื่อปรับและตรวจทั้งสองโปรไฟล์ ส่งออกและนำเข้าอีกครั้งเมื่อยืนยันแล้ว เปลี่ยน `defaultSceneId` หากต้องการให้ห้องใช้ฉากใหม่นั้น

หากชื่อไฟล์ใหม่ต่างจากหกชื่อมาตรฐาน ให้วางสำเนาที่ใช้ชื่อมาตรฐานในโฟลเดอร์นำเข้า โดยรักษาต้นฉบับไว้ รองรับหลายฉากใน registry โดยไม่ต้องแก้ combat engine แต่ยังต้อง calibration ของฉากนั้นจริง ไม่มี UI เปลี่ยนฉากให้ครูในอัปเดตนี้

## คำสั่งตรวจสอบ

```powershell
npm run raid:scenes:validate
npm run raid:audio:validate
npm run raid:assets:validate
npm run test:raid:presentation
npm run test:raid
npm run test:e2e:scene
npm run lint
npx tsc --noEmit
npm run build
npm test
npm run test:e2e:google
npm run test:e2e:raid
```

ทดสอบ scene ใช้ Next development ที่ loopback 3120 ไม่มี Supabase production ชุด Classic ใช้ local fixture; ชุด Google/Raid ใช้ mock OAuth + Supabase ที่ 3110/3111 และ PGlite ในเครื่อง ต้องรันสองชุดนี้ตามลำดับเพราะใช้ port เดียวกัน

ผลทดสอบ ภาพหลักฐาน และข้อจำกัดอุปกรณ์จริงอยู่ใน [validation.md](validation.md) รายงานภาพและ Impeccable อยู่ใน [ui-review-report.md](ui-review-report.md)

## ทรัพยากรและขอบเขต

PixiJS lazy load เฉพาะ Boss Raid แคชภาพฉากแบ่งตามคุณภาพ มี reference counting และ LRU ภาพ Low ลดด้านยาวสุดเหลือ 1024 แต่ชดเชยด้วย native geometry จึงไม่เลื่อนจุดเท้า Full จำกัด renderer resolution 1.5 และ Low 1 มี ticker เดียวต่อ arena และ renderer เฉพาะทีมที่ครูเลือก

แคช Sprite: 8 sheets / 64 MiB; scene: 3 layers / 24 MiB; decoded SFX: 14 buffers / 16 MiB เป็น soft budgets ภาพหรือเสียงที่กำลังใช้อยู่และเสียงสำคัญไม่ถูกลบเพื่อบังคับให้ได้ตัวเลข ทดสอบการคืนแคช Full เมื่อสลับ Low เพลง stream ด้วย HTMLAudioElement หนึ่งตัว ปิดฉากคืน texture leases, buffers, audio nodes, observer, listeners และ animation frame

ตัวเลข decoded bytes เป็นขนาดข้อมูลภาพ RGBA/PCM ที่คำนวณได้ ไม่ใช่การวัด GPU allocation จริงหรือหน่วยความจำทั้ง browser ต้องตรวจบนเครื่องนักเรียนจริงก่อนรับรอง FPS โดยเฉพาะ iOS/Android และ iPad

ไฟล์หลัก: `scenes/*`, `audio/*`, `engine/combat-scene.ts`, `assets/visual-metadata.json`, `assets/sprite-loader.ts`, `hooks/use-raid-audio.ts`, `RaidArena`, `RaidAudioSettings`, `RaidClient`, `TeacherRaidOverview`, `RaidQuestionModal`, `raid.css`, dev calibration, import/validate scripts และ presentation/E2E tests รายการเปลี่ยนเต็มอยู่ใน Git diff ของ branch นี้

ไม่มี migration ใหม่ ไม่มีการอ่าน secret หรือเขียน production database การเผยแพร่ต้องนำ code + ไฟล์ public ไปด้วยกัน งานนี้ยังไม่ push หรือ deploy อัตโนมัติ

อ้างอิงเทคนิค: [PixiJS Container](https://pixijs.com/8.x/guides/components/scene-objects/container), [decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData), [AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)
