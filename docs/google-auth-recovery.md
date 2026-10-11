# การผูกผิดและข้อพิพาทรหัสนักเรียน

ระบบ Google + รหัส 5 หลักไม่พิสูจน์เจ้าของรหัส ใครทราบรหัสอาจผูกก่อนเจ้าของจริง UNIQUE กันซ้ำแต่ไม่กันการสวมรหัส ไม่ใช้ผลนี้เป็นหลักฐานผู้เข้าสอบทางการ

## ขั้นตอนสำหรับผู้ดูแล

1. รับเรื่องนอกแอปผ่านช่องทางโรงเรียน ให้ครูตรวจชื่อ ชั้น รหัส และหลักฐานความเป็นเจ้าของจากทะเบียน ห้ามบอก Gmail ของผู้ครอบครองเดิมให้ผู้ร้องเห็น
2. ให้เจ้าของจริง Google Login เพื่อให้มี auth user ที่ตรวจ Google identity/อีเมลแล้ว จด Auth UUID ของบัญชีปัจจุบันและบัญชีที่ควรรับสิทธิ์จาก Supabase Authentication ผู้ดูแลตรวจข้อมูลในเครื่องที่ได้รับอนุญาต ไม่ส่ง token/secret ให้ผู้ใช้
3. สำรอง mapping และ audit ที่เกี่ยวข้อง จบห้องที่ยังเล่นอยู่ของรหัสที่เกี่ยวข้อง รวมถึงห้องของรหัสเดิมที่บัญชีผู้รับสิทธิ์อาจผูกไว้ หากยัง active ห้ามแก้
4. ตรวจว่าผู้รับยังไม่มี mapping อื่นและรหัสเป็น student ถ้ามี mapping อยู่ อย่าเขียนทับ จัดการทั้งสองเรื่องด้วยหลักฐานและผู้ดูแลก่อน
5. ย้ายสิทธิ์เฉพาะ `account_identities.auth_user_id` ในธุรกรรมเดียว พร้อมล็อก identity ทั้งสอง, account row และ audit ไม่แก้ `accounts.user_code`, participants, answers หรือประวัติคะแนน อย่าลบ mapping แล้วปล่อยว่างให้ใครผูกแข่ง
6. ให้ทั้งสองฝ่าย reload/login ใหม่ แท็บเก่าจะถูก SessionGuard/สิทธิ์ฝั่ง Server ปฏิเสธบัญชีที่เปลี่ยน ตรวจ audit และบันทึกเหตุผล/เลขคำร้องในระบบโรงเรียนที่ควบคุมการเข้าถึง

## SQL ตัวอย่างสำหรับผู้ดูแลฐานข้อมูล

ใช้กับ Staging เพื่อทดลองก่อน ตัวอย่างมี UUID ศูนย์ที่ต้องแทนด้วยข้อมูลที่ตรวจแล้วและ transaction จะปฏิเสธหากข้อมูลไม่ตรง ใช้ผู้ดูแลที่มี mapping super_admin จริง ห้ามนำไปทำปุ่ม recovery สาธารณะ

```sql
begin;
do $$
declare
  administrator uuid := '00000000-0000-0000-0000-000000000000';
  previous_holder uuid := '00000000-0000-0000-0000-000000000001';
  rightful_holder uuid := '00000000-0000-0000-0000-000000000002';
  student_key text := '01234';
  lock_key text;
  recipient_email text;
begin
  if not exists (
    select 1 from public.account_identities i join public.teacher_access t using(user_code)
    where i.auth_user_id=administrator and t.access_level='super_admin' and t.status='active'
      and t.google_email=public.verified_google_email(administrator)
  ) then raise exception 'VERIFIED_ADMIN_REQUIRED'; end if;
  if previous_holder=rightful_holder then raise exception 'SAME_IDENTITY'; end if;
  for lock_key in select 'identity:'||u::text from unnest(array[previous_holder,rightful_holder]) u order by u::text loop
    perform pg_advisory_xact_lock(hashtextextended(lock_key,0));
  end loop;
  recipient_email:=public.verified_google_email(rightful_holder);
  if recipient_email is null then raise exception 'VERIFIED_GOOGLE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('email:'||recipient_email,0));
  perform user_code from public.accounts where user_code=student_key and role='student' for update;
  if not found then raise exception 'STUDENT_REQUIRED'; end if;
  if exists(select 1 from public.teacher_access where google_email=recipient_email) then
    raise exception 'STUDENT_ONLY';
  end if;
  if exists(select 1 from public.account_identities where auth_user_id=rightful_holder) then raise exception 'RECIPIENT_ALREADY_LINKED'; end if;
  if exists(select 1 from public.participants p join public.game_sessions g on g.id=p.session_id
    where p.student_code=student_key and g.status<>'ended') then raise exception 'ACTIVE_GAME'; end if;
  update public.account_identities set auth_user_id=rightful_holder,updated_at=now()
    where auth_user_id=previous_holder and user_code=student_key;
  if not found then raise exception 'MAPPING_CHANGED'; end if;
  insert into public.account_link_audit(actor_auth_user_id,old_user_code,new_user_code,action)
    values(administrator,student_key,student_key,'recovery_unlink');
end $$;
commit;
```

Audit action `recovery_unlink` ระบุว่าถอนการผูกของผู้ครอบครองเดิมแล้วมอบให้ผู้รับที่ตรวจแล้ว UUID คู่/เหตุผลอยู่ในทะเบียนคำร้องที่จำกัดสิทธิ์ ไม่ลงอีเมล/IP/หลักฐานส่วนตัวเพิ่มในเกม รหัสยังไม่พิสูจน์ตัวตนด้วยตัวมันเอง หากประวัติคำตอบเดิมถูกสวมรหัส ต้องให้ครูจัดการผลคะแนนตามนโยบายแยกต่างหาก

การเปลี่ยน Gmail ของครู/ผู้ดูแลเป็นการ recovery ที่ต้องตรวจ Google UUID ใหม่, uniqueness ของอีเมล, mapping เดิม, allowlist และห้ามเหลือ admin ที่ active เป็นศูนย์ ไม่มี UI เปลี่ยน Gmail หรือยึดบัญชีอัตโนมัติในงานนี้
