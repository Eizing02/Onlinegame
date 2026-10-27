-- Read-only verification after migration 013. Does not create rooms or touch data.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name='boss_raid_sessions'
  and column_name='hero_catalog_version';

select hero_catalog_version, rules_version, raid_status, count(*) as rooms
from public.boss_raid_sessions
group by hero_catalog_version,rules_version,raid_status
order by hero_catalog_version,rules_version,raid_status;

select conname,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.boss_raid_participants'::regclass
  and conname='boss_raid_participants_hero_type_check';

select has_function_privilege('anon','public.reserve_raid_hero(text,text,text)','EXECUTE') as anon_must_be_false,
       has_function_privilege('authenticated','public.reserve_raid_hero(text,text,text)','EXECUTE') as authenticated_must_be_false,
       has_function_privilege('service_role','public.reserve_raid_hero(text,text,text)','EXECUTE') as service_role_must_be_true;
