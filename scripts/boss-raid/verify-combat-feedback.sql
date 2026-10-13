-- Read-only verification after 011. Run manually on the intended Supabase project.
select exists(select 1 from information_schema.columns where table_schema='public'
 and table_name='boss_raid_battle_events' and column_name='damage_taken') as damage_taken_column;
select p.proname, position('damageTaken' in pg_get_functiondef(p.oid))>0 as exports_damage_taken
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('raid_resolve','get_private_raid_snapshot');
select role_name,has_function_privilege(role_name,
 'public.raid_emit(uuid,text,uuid,uuid,bigint,integer,integer,integer)','EXECUTE') as may_emit
from (values ('anon'),('authenticated'),('service_role')) roles(role_name);
-- Expected: zero. Historical results without the new field are intentionally excluded.
select count(*) as incorrect_hp_loss_results from public.boss_raid_answers
where result ? 'damageTaken' and (result->>'damageTaken')::integer<>greatest(0,hp_before-hp_after);
-- Expected: zero. No private raid tables added to the public realtime publication.
select count(*) as public_raid_tables from pg_publication_tables
where pubname='supabase_realtime' and tablename like 'boss_raid_%';
