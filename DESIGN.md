---
name: KruEIonline Classic Classroom
description: ระบบเกมห้องเรียนภาษาไทย เรียบง่าย สนุก เป็นระเบียบ ในธีมคลาสสิกร่วมสมัย
colors:
  primary: "#790D16"
  primary-dark: "#5E0A11"
  on-primary: "#F5EFE1"
  cream: "#F5EFE1"
  parchment: "#E5D3AF"
  accent-soft: "#AEC4D4"
  background: "#F5EFE1"
  surface: "#F5EFE1"
  panel: "#E5D3AF"
  panel-strong: "#EADDC4"
  foreground: "#392829"
  muted: "#61463F"
  border: "#947754"
  primary-blue: "#25475A"
  cyan: "#25475A"
  success: "#25475A"
  warning: "#634417"
  danger: "#790D16"
  selection-gold: "#D0A04A"
typography:
  display:
    fontFamily: "Noto Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "clamp(30px, 3.1vw, 44px)"
    fontWeight: 650
    lineHeight: 1.5
  login-title:
    fontFamily: "Noto Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.5
  room-title:
    fontFamily: "Noto Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "clamp(19px, 2vw, 28px)"
    fontWeight: 700
    lineHeight: 1.4
  section-title:
    fontSize: "22px"
    fontWeight: 650
  question-title:
    fontSize: "20px"
    fontWeight: 650
  question:
    fontSize: "18px"
    lineHeight: 1.7
  body:
    fontFamily: "Noto Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  party-title:
    fontSize: "15px"
    fontWeight: 700
  label:
    fontSize: "14px"
    fontWeight: 600
  compact:
    fontSize: "13px"
    lineHeight: 1.5
  meta:
    fontSize: "12px"
    lineHeight: 1.5
  small-meta:
    fontSize: "11px"
  timer-warning:
    fontSize: "10px"
  timer:
    fontSize: "24px"
    lineHeight: 1.4
  numeric:
    fontFamily: "Geist Mono, monospace"
rounded:
  progress: "4px"
  compact: "8px"
  control: "10px"
  popover: "12px"
  hero: "14px"
  panel: "16px"
spacing:
  tight: "4px"
  compact: "8px"
  control-gap: "10px"
  small: "12px"
  medium: "16px"
  inset: "20px"
  large: "24px"
  form-gap: "28px"
  login-inset: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "52px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "20px"
  question-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    width: "min(680px, 100%)"
  answer-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
  party-toggle:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  timer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
  hero-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.hero}"
    padding: "15px 7px"
---

# Design System: KruEIonline Classic Classroom

## Overview

**Creative North Star: "ห้องเรียนคลาสสิกร่วมสมัย"**

ธีมวินเทจอ่อนโยนใช้พื้นครีม กระดาษสีน้ำตาลอ่อน น้ำเงินหม่น และสีไวน์ ทำให้ห้องเรียนดูอบอุ่นและร่วมสมัย ภาษาไทย คำถาม เวลา และคำสั่งสำคัญเป็นลำดับแรก บุคลิกของผลิตภัณฑ์ยังเรียบง่าย สนุก และเป็นระเบียบ

นี่คือระบบภาพทดแทนธีมอวกาศเดิมที่ผู้ใช้อนุมัติสำหรับทั้งแอป ใช้ร่วมกันในหน้า Google sign-in หน้าบัญชีและผู้ดูแล Classic และ Boss Raid โลโก้ ภาพตัวละคร ภาพฉากต้นฉบับ และเสียงเดิมยังเป็นสินทรัพย์ของผลิตภัณฑ์ ฉากประกอบและเอฟเฟกต์ใช้เพื่อสื่อสถานะโดยไม่แย่งพื้นที่อ่านหรือควบคุม

**Key Characteristics:**

- พื้นสว่างอบอุ่นกับตัวอักษรสีน้ำตาลเข้ม
- ภาษาไทยอ่านง่ายบนมือถือและจอครู
- ปุ่มหลักสีไวน์ สถานะและโฟกัสใช้น้ำเงินเข้มบนพื้นอ่อน
- ภาพและเสียงเดิมคงเอกลักษณ์ การเคลื่อนไหวมีหน้าที่และลดได้

## Colors

ใช้สีไวน์เป็นคำสั่งหลัก ครีมกับกระดาษเป็นพื้นที่อ่าน น้ำเงินหม่นเป็นพื้นเน้น และน้ำเงินเข้มเป็นหมึกที่อ่านได้บนพื้นเหล่านั้น ค่าใน frontmatter สะท้อนชุดตัวแปรสุดท้ายใน `src/app/globals.css`; Canvas ใช้ชุดเดียวกันผ่าน `src/lib/theme/palette.ts`

### Primary

- **Wine:** `primary` สำหรับปุ่มหลักและคำตอบที่เลือก; `primary-dark` สำหรับ hover
- **Cream on wine:** `on-primary` สำหรับตัวอักษรและไอคอนบนปุ่มไวน์และช้อยที่เลือก
- **Wine status:** `danger` สำหรับข้อผิดพลาด หมดเวลา และคำเตือนใกล้หมดเวลา โดยมีข้อความประกอบ

### Secondary

- **Mist blue:** `accent-soft` สำหรับพื้นที่ฉาก พื้นเน้น และปุ่มปาร์ตี้ที่เปิดอยู่
- **Blue ink:** `primary-blue`, `cyan`, `success` ใช้กับโฟกัส ลิงก์ แท็บที่เลือก และสถานะสำเร็จ ชื่อ `cyan` เป็น compatibility alias ของระบบเดิม ไม่ได้หมายถึงสีนีออน
- **Amber-brown:** `warning` สำหรับข้อความเตือนและรายละเอียดกติกา

### Tertiary

- **Selection gold:** `selection-gold` ใช้กับขอบและออร่าฮีโร่ที่เลือก เป็นสีเสริมที่ผู้ใช้ระบุ

### Neutral

- **Cream:** `cream`, `background`, `surface` เป็นพื้นหลักและพื้นที่อ่าน
- **Parchment:** `parchment`, `panel` สำหรับหัวคำถามและแผงข้อมูล; `panel-strong` สำหรับพื้นผิว hover และพื้นซ้อน
- **Brown ink:** `foreground` สำหรับเนื้อหาหลัก; `muted` สำหรับข้อความรองและ placeholder; `border` สำหรับขอบช่องกรอกและเส้นแบ่ง

**The Readable Ink Rule.** ตัวอักษรบนพื้นครีมใช้ `foreground` หรือหมึกตามสถานะ ตัวอักษรบนสีไวน์ใช้ `on-primary` เสมอ เพราะ `foreground` ปัจจุบันเป็นสีเข้ม

**The Status With Words Rule.** สี ขอบ ออร่า หรือการสั่นต้องมีข้อความ ไอคอน หรือสถานะควบคุมที่สื่อความหมายร่วมด้วย

## Typography

**Display and body font:** Noto Sans Thai พร้อม Arial, Helvetica และ sans-serif เป็น fallback โหลดผ่าน `next/font` ด้วยตัวแปรชื่อเดิม `--font-geist-sans`
**Numeric font:** Geist Mono สำหรับพื้นที่ที่ใช้ monospace เวลา คะแนน และตารางใช้ tabular numerals

หัวเรื่องใช้ความหนาปานกลางถึงหนา เนื้อหาภาษาไทยมีระยะบรรทัดเพียงพอ หน้าเข้าสู่ระบบใช้ display แบบปรับตามจอ; หัวห้องใช้ room-title และสามารถย่อชื่อยาวในแถวควบคุมได้ หัวคำถามใช้ question-title ส่วนเนื้อคำถามใช้ question ที่ย่อเป็น body บนจอแคบ

ขนาดย่อย compact, meta, small-meta และ timer-warning ใช้เฉพาะข้อความรองหรือข้อมูล HUD ช่องกรอกข้อความทั่วไปใช้ขนาดอย่างน้อย body; ช่องคำตอบ Boss Raid ใช้ question บนจอปกติและ body เมื่อพื้นที่แนวตั้งน้อย ข้อความคำถามและช้อยไม่ใช้ขนาดย่อยเหล่านี้

## Layout

หน้าเข้าสู่ระบบมีสองคอลัมน์บน desktop: เนื้อหา/ฉากกับแผงเข้าสู่ระบบ แผงใช้พื้น parchment และไม่มีเงาที่ rest จุดเปลี่ยนเป็นคอลัมน์เดียวอยู่ที่ (800px) ฉากใช้วิดีโอต้นฉบับที่ตรงกับอุปกรณ์ทั้งจอใหญ่และจอแคบ ระยะห่างลดตามจอแคบโดยรักษาปุ่มสัมผัสและข้อความภาษาไทย

ห้องเกมใช้ความสูง viewport จริง และแบ่งพื้นที่อ่านหรือรายชื่อเป็นกรอบเลื่อนภายใน Classic วางเมนูนักเรียน เล่น / ทีม / อันดับ และเมนูครู คุมเกม / ผู้เล่น / คะแนน ไว้ด้านบนบน desktop และด้านล่างเมื่อกว้างไม่เกิน (767px) จอแนวนอนที่เตี้ยรวมเมนูกับหัวห้อง VisualViewport ช่วยรักษาพื้นที่โจทย์ ช่องตอบ และปุ่มส่งเมื่อแป้นพิมพ์เปิด

Boss Raid ใช้ HUD เวลารวมกับปาร์ตี้ที่มุมขวาบน ภายใน native dialog top layer ระหว่างตอบคำถาม และในหัวห้องเมื่อแสดงการต่อสู้ Dialog เต็ม viewport มี HUD เป็นแถวแรกและแผงคำถามความกว้างสูงสุด (680px) อยู่ด้านล่าง แผงแบ่งเป็นหัวกระดาษ พื้นอ่านครีม ส่วนคำตอบที่เลื่อนได้ และ footer ยืนยันซึ่งไม่เลื่อนตามโจทย์ ข้อความยาว สมการ และรูปยังเข้าถึงได้โดยการเลื่อนหรือขยาย

Dialog ของ Boss Raid ใช้ความสูงและ offset ของ VisualViewport เมื่อพื้นที่ที่มองเห็นเปลี่ยนจาก resize หรือ scroll เพื่อรักษา HUD และ footer ไว้ในพื้นที่อ่าน รองรับ safe-area inset และหยุดปรับขนาดระหว่าง pinch zoom ที่ scale เกิน (1.05) การปรับตำแหน่งใช้ requestAnimationFrame เดียวต่อรอบ พร้อมคืน listener และยกเลิก frame เมื่อถอด component

ที่ (800px) Boss Raid ลดขนาดและระยะ inset; รายการฮีโร่เปลี่ยนจากห้าคอลัมน์เป็นสามคอลัมน์ ที่ความสูงไม่เกิน (500px) HUD หัวคำถามและ footer กระชับขึ้น ส่วนคำตอบจำกัดความสูงมากขึ้น ที่ (360px) ลดช่องว่างและปุ่มยกเลิกเพื่อเก็บคำสั่งหลักในจอ ป๊อปโอเวอร์ปาร์ตี้มีความกว้างไม่เกิน (310px) และเลื่อนภายในได้

**The Classroom Task Rule.** การเคลื่อนไหวต้องไม่บังช่องตอบ ปุ่มควบคุม หรือเวลาที่เหลือ

## Elevation & Depth

ใช้การซ้อนสีเป็นพื้นฐาน แผง parchment บนพื้น cream แบ่งด้วยขอบสีน้ำตาล เงาที่ Boss Raid ใช้แยก dialog ปาร์ตี้ และข้อความผลการต่อสู้จากฉาก มีน้ำหนักนุ่มตามหมึกของธีม เงาปุ่มหลักสั้นและยุบเล็กน้อยเมื่อกด ค่าทั้งหมดและ motion/breakpoint อยู่ใน `.impeccable/design.json`

ฉาก Boss Raid ยังใช้เลเยอร์และเรขาคณิตกล้องเดิม การปรับโทนทำครั้งเดียวหลัง decode ภาพใน Canvas2D ที่ขนาดต้นฉบับ (โหมดประหยัดลดด้านยาวเป็นสูงสุด 1024px) แล้วเก็บใน texture cache เดิม ภาพพื้นลานใช้โทนกระดาษ และฉากหลังใช้โทนน้ำเงินหม่น Sprite ตัวละครไม่ผ่านการย้อมภาพฉากนี้และไฟล์ภาพต้นฉบับไม่ถูกแทนที่

การตอบสนองควรสั้นและมีหน้าที่: ปุ่ม (150ms), ฮีโร่ที่เลือก (200ms), การมาถึงของคำถามเดิม (200ms), Classic tab transition (260ms) Boss Raid แสดงผลการตอบที่เซิร์ฟเวอร์ยืนยันด้วยช่วงนำเสนอร่วม (3 วินาที) ก่อนคำถามถัดไป เวลารวมยังเดินต่อ การยืนยันช้อยอัตโนมัติใช้ตัวเลขและเส้น sweep (5 วินาที) ซึ่งยังสื่อเวลาเมื่อปิด animation

เมื่อระบบขอลดการเคลื่อนไหว ปิด transition/animation และแสดงกรอบเตือนเวลาคงที่แทน pulse ออร่าและข้อความเลือกฮีโร่ยังอยู่ ฉากมีการตั้งค่าลดการเคลื่อนไหวและคุณภาพใน Boss Raid เนื้อหา คะแนน และผลสถานะต้องยังครบ

## Shapes

มุมโค้งพอดีใช้ compact สำหรับ HUD ย่อย control สำหรับปุ่มและช่องกรอก popover สำหรับปาร์ตี้ hero สำหรับตัวเลือกฮีโร่ และ panel สำหรับแผงคำถาม พื้นที่สัมผัสอย่างน้อย (44px) ขอบหลักบาง (1px) ฮีโร่ที่เลือกใช้ขอบทอง (2px) Native dialog เป็นกรอบโฟกัสของคำถาม ป๊อปโอเวอร์และกรอบอ่านเก็บเนื้อหาที่เกินไว้ในพื้นที่เลื่อน

## Components

### Buttons

ปุ่มไวน์เป็นคำสั่งหลักและใช้ `on-primary` ปุ่มทั่วไปสูงอย่างน้อย (48px) มี padding (12px 20px); ปุ่ม Raid สูงอย่างน้อย (44px) มี padding (10px 18px) Hover เข้มขึ้นและ active ยุบเล็กน้อย ปุ่มรองใช้พื้นอ่อน หมึกเข้ม และขอบ Disabled แสดงสถานะใช้งานไม่ได้ โฟกัสใช้เส้น blue ink (2px) พร้อมระยะนอก (3px)

### Inputs / Fields

ใช้ label จริง พื้น cream ขอบ brown border และตัวอักษร brown ink Placeholder ใช้ muted ช่องเข้าสู่ระบบสูงอย่างน้อย (52px) ป้ายผิดพลาดใช้สี wine พร้อมข้อความ การกรอกคำตอบแบบข้อความมีขั้นตรวจคำตอบก่อนเริ่มช่วงยืนยัน

### Cards / Containers

แผงข้อมูลใช้ parchment ส่วนพื้นที่อ่านคำถามใช้ cream และหัวคำถามใช้ parchment แผงเข้าสู่ระบบมีขอบ ไม่มีเงาที่ rest; dialog กับปาร์ตี้ใช้เงาเพื่อระบุชั้น Footer แยกด้วยเส้นขอบและคงอยู่ขณะเลื่อนโจทย์

### Navigation

บัญชี บทบาท และทางออกอยู่ใน AppShell พร้อมลิงก์ข้ามไปเนื้อหา แท็บ active ใช้ blue ink ร่วมกับพื้นเน้นหรือเส้นใต้ Classic เก็บ panel ไว้ระหว่างสลับเพื่อรักษาคำตอบ และรองรับคีย์บอร์ด/การปัดตามพฤติกรรมเดิม Boss Raid ล็อกการเปลี่ยนแท็บระหว่างช่วงนำเสนอการต่อสู้

### Shared audio control

ปุ่มลำโพงเปิด native auto-popover เดียวกันในหน้าเข้าสู่ระบบ Join Classic และ Boss Raid มีชื่อที่เข้าถึงได้ `aria-expanded` และ `aria-controls` ไอคอนแสดงสถานะปิดเสียงเมื่อ mute หรือเสียงรวมเป็นศูนย์ แผงปิดด้วยปุ่มปิด การกดด้านนอก หรือ Escape โดยการปรับระดับเสียงภายในไม่ปิดแผง ปุ่มยังเปิดได้ขณะ mute และอยู่ภายใน top layer ของ dialog คำถาม; Boss Raid ซ่อนปุ่มในหัวห้องขณะคำถามเปิด

แผงใช้พื้น cream หมึก brown ink ขอบ brown border มุม popover และ padding medium แบ่งชั้นด้วยขอบโดยไม่มีเงาที่ rest กว้างไม่เกิน (320px) พร้อมระยะจากขอบ VisualViewport (12px) และเลื่อนภายในเมื่อพื้นที่แนวตั้งน้อย หัวแผงใช้ (18px, 700) ปุ่ม mute ใช้ wine กับ `on-primary` และ hover เป็น `primary-dark` ปุ่มปิดและปุ่ม mute มีพื้นที่สัมผัสอย่างน้อย (44px) label และปุ่ม mute ใช้ body (16px); เปอร์เซ็นต์ใช้ label (14px) กับ tabular numerals Native range เต็มความกว้างมีพื้นที่สูงอย่างน้อย (44px) และปรับทีละ (5%) โฟกัสของชุดเสียงใช้ blue ink (3px) พร้อมระยะนอก (3px) กฎของแผงมี scope ของ component เพื่อรักษารูปแบบเดียวกันในหัวห้อง หน้าครู และหน้าปรับฉาก

**The Saved Sound Rule.** เสียงเปิดเป็นค่าเริ่มต้น โดยเสียงรวม (65%) เพลงและวิดีโอ (22%) และเอฟเฟกต์ (70%) ผู้ใช้ปิดเสียงหรือปรับแต่ละระดับเป็นศูนย์ได้ เก็บ mute และระดับเสียงข้ามหน้าและการโหลดใหม่ หาก storage ใช้ไม่ได้ยังใช้ค่าเริ่มต้นได้ เมื่อ browser ไม่อนุญาต audible autoplay วิดีโอยังเล่นแบบ mute และลองเปิดเสียงอีกครั้งเมื่อมี trusted pointer หรือ keyboard interaction โดยไม่รอเสียงก่อนเข้าสู่ระบบหรือส่งคำตอบ

ทั้ง document ใช้เจ้าของเพลงพื้นหลังเพียงรายเดียว เมื่อออกจากหน้าจะหยุดและถอดเส้นทางเสียงเดิมก่อนหน้าใหม่รับช่วง วิดีโอ Login ใช้ระดับเพลง/วิดีโอเดียวกับเพลง Classic และ Raid; Raid ใช้เอฟเฟกต์และเพลงตามเฟสเดิมผ่านระบบเสียงร่วม เมื่อซ่อนหน้าจะพักการเล่นและกลับมาเล่นภายใต้สิทธิ์ของ browser ระดับเสียงของอุปกรณ์ยังเป็นการควบคุมภายนอกเว็บ การย้ายไปหน้า Google สร้าง document ใหม่จึงรับประกันเฉพาะค่าที่บันทึกไว้ ไม่รับประกันเสียงต่อเนื่องบนหน้า Google

### Wallpaper media

Login ใช้คลิปต้นฉบับวนซ้ำพร้อมเสียง โดยโทรศัพท์ใช้คลิปแนวโทรศัพท์ และ PC/tablet ใช้คลิปกว้าง มี poster ระหว่างโหลดและภาพสำรองเมื่อคลิปเสีย Join ใช้ PNG ต้นฉบับที่ตรงกับ phone/tablet/PC โดย opacity (.5) อยู่ที่ภาพพื้นหลังเท่านั้น ข้อความ โลโก้ ปุ่ม และฟอร์มยังคมชัด ภาพต้นฉบับคง pixels เดิมและไม่ผ่านการย้อมโทนฉาก Boss Raid รูปและวิดีโอเติม viewport ด้วย cover; โทรศัพท์หรือ tablet แบบสัมผัสคงประเภทภาพภายใน document เมื่อหมุนจอหรือเปิดแป้นพิมพ์ ส่วนหน้าต่าง desktop ปรับตามความกว้าง

### Status and countdown

Chip หรือข้อความสถานะใช้หมึกตามความหมายบนพื้นอ่อนพร้อมคำอธิบาย Timer แสดงคำว่าเวลารวมและตัวเลข tabular สถานะ 30 วินาทีสุดท้ายใช้ wine พร้อมข้อความเตือนและ pulse จาง; reduced motion ใช้กรอบคงที่แทน หมดเวลายังคงอ่านได้โดยไม่อาศัยสีอย่างเดียว

แถบความคืบหน้าปราบบอสในรายการทีมครูใช้ native progress สูง (6px) มุมโค้ง progress สีเติมเป็น blue ink และรางเป็น brown border กำหนด appearance กับสีราง/สีเติมของ WebKit และ Mozilla โดยตรง เพื่อให้สีจาก browser ไม่หลุดจากธีม ค่าความคืบหน้ามาจาก HP บอสที่ลดไป พร้อมชื่อทีมและข้อความ HP ปัจจุบัน

### Party HUD

ปุ่มปาร์ตี้มีจำนวนคน `aria-expanded` และ `aria-controls` พื้นเปลี่ยนเป็น mist เมื่อเปิด รายการแสดงเฉพาะสมาชิกทีมของนักเรียน พร้อมภาพย่อ ชื่อ ฮีโร่ HP และเครื่องหมายคุณ รายการอยู่ใน top layer เดียวกับคำถามจึงยังอ่านและกดได้

### Answer confirmation

ช้อยที่เลือกใช้ wine กับ `on-primary` และเส้น sweep สี parchment ปุ่มยืนยันมีตัวเลขเวลาคงเหลือ ผู้เล่นยืนยันได้ทันที เปลี่ยนช้อยหรือยกเลิกก่อนส่งได้ ช้อยใหม่เริ่มช่วงยืนยัน (5 วินาที) อีกครั้ง การแก้ข้อความยกเลิกช่วงยืนยัน และซ่อนหน้าเกมจะยกเลิกการส่งอัตโนมัติ เวลารวมไม่มีการหยุดเพื่อช่วงนี้

### Hero selection

ตัวเลือกเริ่มด้วยภาพสีเดิม เมื่อเลือกแล้วฮีโร่นั้นมีขอบทอง ออร่า เงาภาพ และเครื่องหมายเลือก ภาพตัวเลือกอื่นใช้ grayscale กับ opacity (.45) และยังเลือกได้เมื่อห้องอนุญาตตัวละครซ้ำ ภาพต้นฉบับไม่เปลี่ยน สีที่เหลือไม่ใช้เป็นสัญญาณเลือกเพียงอย่างเดียว

### Combat presentation

คำถามปิดหลังการตอบได้รับการยืนยันเพื่อแสดงการต่อสู้จริง มีข้อความผลตามข้อมูลเซิร์ฟเวอร์และข้อความว่าคำถามถัดไปจะขึ้นเมื่อจบ ช่วงนำเสนอร่วมใช้กับทุกฮีโร่และผลโจมตี ถูกโจมตี หรือฟื้น HP ฉากบอสทางซ้ายและฮีโร่ทางขวาควรอ่านออกพร้อม HUD โดยไม่ใส่แผงคำถามทับระหว่างนำเสนอ ภาพสำรองต้องไม่ขัดขวางการตอบหรือการแสดงข้อความผล

คลิปโจมตีบอสและเสียงเดิมใช้การเลือกเดียวกันทั้งเหตุการณ์ปาร์ตี้และช่วงนำเสนอคำตอบตัวเอง รวม ultimate ในเฟส 3 และเอฟเฟกต์ตามเฟส การเชื่อมต่อหลังบันทึกคำตอบต้องรอสถานะล่าสุดที่เดินหน้าแล้วก่อนเปิดคำถามใหม่ โดยไม่ย้อนกลับไปเปิดข้อเดิมจากข้อมูลที่ค้างอยู่

ห้องกติกา v1 ยังคงยืนยันด้วยตนเองและใช้คิวเหตุการณ์ต่อสู้เดิม ถ้าคำตอบไม่มี packet เหตุการณ์ใหม่ ช่วงแสดงผลร่วมยังทำงานแต่ไม่เปิด priority lock ว่างหรือหยุดคิวเดิมเมื่อจบช่วงนั้น ผลและ canvas เดิมจึงยังอยู่ระหว่างรอคำถามถัดไป

## Do's and Don'ts

### Do:

- **Do** ใช้ token ของชุดคลาสสิกร่วมสมัยร่วมกันทั้งหน้า Google บัญชี Classic และ Boss Raid
- **Do** ใช้ `on-primary` บนพื้นไวน์ และหมึกเข้มบนพื้นครีม
- **Do** แสดงข้อความสถานะพร้อมความหมายของสีและสถานะควบคุมที่เข้าถึงได้
- **Do** รักษาโจทย์ ช้อย รูป และคำสั่งยืนยันให้เข้าถึงได้บนพื้นที่อ่านที่เลื่อนได้
- **Do** เก็บภาพและเสียงต้นฉบับ และรักษาข้อความผลเมื่อปิด motion หรือฉากโหลดไม่ได้
- **Do** ใช้ชุดควบคุมเสียงร่วม เคารพ mute และระดับเสียงที่บันทึกไว้ และให้ผู้ใช้เปิดแผงได้ภายใน dialog
- **Do** ลด opacity ของภาพ Join เท่านั้นตามค่าที่ผู้ใช้ยืนยัน โดยรักษาข้อความและปุ่มให้คมชัด

### Don't:

- **Don't** ใช้ `foreground` สีเข้มเป็นตัวอักษรบนปุ่มไวน์
- **Don't** ย้อม sprite ตัวละครด้วยกระบวนการปรับโทนภาพฉาก หรือแทนไฟล์ภาพ/เสียงต้นฉบับเพื่อเปลี่ยนธีม
- **Don't** ใช้สีหรือ animation เพียงอย่างเดียวเพื่อบอกการเลือก ความถูกต้อง หรือเวลาที่เหลือ
- **Don't** ข้ามสถานะปิดเสียงหรือระดับเสียงที่ผู้ใช้บันทึกไว้ หรือขัดจังหวะการเข้าสู่ระบบและการตอบคำถามเพื่อรอเสียง
- **Don't** ใส่ตัวเลขห้องหรือคะแนนสมมติในหน้าเข้าสู่ระบบ
