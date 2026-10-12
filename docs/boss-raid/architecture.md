# Authoritative Raid architecture

## State flow

Browser → `authorizeApi` เดิม (Google/legacy role, Origin, x-client-session) → server-only raid-service → service-only Postgres RPC → locks/grade/ledger/aggregate/events ใน transaction เดียว → safe response → bounded animation queue → private snapshot

Create/join/start มี room lock เพื่อล็อก capacity และ snapshot เพียงครั้งเดียว Answer/visibility ล็อก team-state ก่อน แล้ว participant-state ทั้งทีมตาม UUID ไม่ล็อกห้องรวมทุกคำตอบ จึงแยกการเขียนระหว่างทีมได้ การ heal ใช้ลำดับเดียวกัน

ตรวจ deadline ด้วย `clock_timestamp()` หลังได้ locks ถ้าหมดเวลาจะไม่ให้คะแนน Expiry reconciliation ทำหลัง transaction คำตอบคืน locks แล้ว หรือก่อน snapshot จะจับ team read lock เพื่อไม่ย้อนลำดับ room → team และเกิด deadlock

## Migration 009

`game_sessions.game_mode` default classic; ไม่แก้ 001–008 หรือรหัสนักเรียนเดิม

| ตารางใหม่ | หน้าที่ |
|---|---|
| boss_raid_sessions | กติกา เวลา frozen snapshot สถานะ |
| boss_raid_team_states | HP บอส คะแนนรวม จำนวนสมาชิกล็อก aggregates phase kill eventSeq |
| boss_raid_participants | hero reservation HP cursor คะแนน Raid/วิชาการ ข้อถูก/ข้าม |
| boss_raid_questions | frozen bank private keys/options/image metadata |
| boss_raid_question_order | permutation และ option order ต่อผู้เล่น |
| boss_raid_answers | terminal ledger, idempotency, score/damage/heal/HP |
| boss_raid_visibility_events | UUID, warning, approximate duration, server receive time |
| boss_raid_battle_events | sanitized monotonic seq ต่อทีมสำหรับภาพ |

RLS เปิดทุกตารางใหม่ REVOKE PUBLIC/anon/authenticated และ function EXECUTE อนุญาตเฉพาะ service_role ไม่มีตาราง Raid เพิ่มใน public Realtime publication ใช้ unique reservation/ledger/order/event sequence และ indexes ตาม session/team/player Trigger ป้องกัน state/answers/powers ของ Classic เขียนห้อง Raid

เกมสร้าง safe question เฉพาะ current cursor ไม่มี correctAnswer/isCorrect หรือ IDs คำถามอนาคต ครูต้องเป็นเจ้าของห้อง ผู้ชมไม่มี question/hero ใหม่ Student API ไม่รับ team/teacher/HP/damage/score ที่ browser ส่งมา Strict Zod ปฏิเสธ field ส่วนเกินทั้งหมด

## API

Answer: `{ questionId, displayIndex, answerText|null, selectedOptionId|null, idempotencyKey }` ส่งคำตอบหรือตัวเลือกอย่างใดอย่างหนึ่ง เก็บ key และ payload เดิมเมื่อเครือข่ายขาดแล้วลองใหม่

Visibility: `{ questionId, displayIndex, eventId, durationMs }` Hero: `{ heroType }` ครู control: `{ command: 'start'|'end' }` การอ่านใช้ `Cache-Control: private, no-store` และ server timestamp

Mutation ใช้ atomic shared limiter `consume_auth_limit` จาก 008 โดยไม่แก้กติกา Auth และใช้ key แยก `raid:userCode:operation` จาก session ที่เชื่อถือได้: answer 60, hero 30, visibility 20, control 10 คำขอต่อ 10 วินาที เผื่อการตอบเร็วและ retry ให้ 429 / `Retry-After: 10` เมื่อเกินและเก็บ payload/key เดิมไว้ Limit นับทุกห้องรวมต่อผู้ใช้และทำงานข้าม web instances เพิ่ม RPC 1 ครั้งต่อ mutation จึงต้องรวมใน staging API load (สคริปต์ direct RPC ไม่ผ่าน limiter)

Snapshot ใช้ RPC เดียว มี team aggregates ทุกทีม + รายละเอียดฮีโร่สูงสุด 5 คนของทีมที่เลือก + events ใหม่สูงสุด 50 รายการ ผู้เล่นได้ current safe question/own state ครูได้ visibility audit และผลรายคนหลังจบ ไม่มี full-bank/ทุกคนทุกคำตอบใน polling

## Realtime transport choice

ระบบ Google ปัจจุบันใช้ HttpOnly cookies จึงไม่เปิด JWT ให้ browser เพื่อเชื่อม private Supabase Broadcast ใช้ทางเลือกในข้อกำหนด: **authorized adaptive polling** ทุก 1.5s ครู / 2s นักเรียน + jitter, backoff สูงสุด 10s, หลังจบ 15s, hidden ไม่ส่ง request กลับ visible/online ดึงทันที ไม่มีคำขอซ้อน

Broadcast เป็นแนวทางขยายในอนาคต แต่ต้องมี short-lived scoped token/channel policy ที่ทดสอบ per-team/per-owner แล้ว ก่อนแทน polling ไม่ใช้ public channel เพื่อเลี่ยงงาน auth [Supabase แนะนำ Broadcast สำหรับ scalability/security](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

`after=seq` ลด event payload กรองซ้ำ หากเจอ gap เปลี่ยนทีม หรือ burst >20 จะใช้ full current state และข้ามภาพเก่า Client queue สูงสุด 20 เล่นครั้งละไม่เกิน 3 Canvas ครูมีเพียงทีมที่เลือก เมื่อเปลี่ยนทีมล้าง scene ของเดิม

## Retention

ประวัติอยู่จนเจ้าของห้องใช้การลบห้องเดิมอย่างชัดเจน FK cascade ลบเฉพาะข้อมูล Raid ของห้องนั้น ไม่ตั้ง background cleanup ที่ลบข้อมูลเดิมอัตโนมัติ ควรกำหนด retention ของโรงเรียนก่อนเปิดจริง Export CSV ผลไม่มีคำตอบส่วนตัวหรือ service key
