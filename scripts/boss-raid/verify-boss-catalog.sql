-- Read-only verification after 014. Does not modify data or create rooms.
select table_name,column_name,data_type,column_default,is_nullable
from information_schema.columns
where table_schema='public' and
 ((table_name='boss_raid_sessions' and column_name='boss_catalog_version') or
  (table_name='boss_raid_team_states' and column_name in ('boss_type','boss_assigned_at')))
order by table_name,column_name;

select boss_catalog_version,raid_status,count(*) as rooms
from public.boss_raid_sessions group by boss_catalog_version,raid_status
order by boss_catalog_version,raid_status;

select s.session_id,s.boss_type,count(*) as teams
from public.boss_raid_team_states s group by s.session_id,s.boss_type
order by s.session_id,s.boss_type;

select p.oid::regprocedure as signature,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_must_be_false,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_must_be_false,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_must_be_true
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('create_boss_raid_room','get_private_raid_snapshot')
order by p.oid::regprocedure::text;
