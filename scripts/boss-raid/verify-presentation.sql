-- Read-only checks after 009 + 010. Execute manually on the intended project.
select rules_version,count(*) from public.boss_raid_sessions group by rules_version;
select column_name,data_type from information_schema.columns
 where table_schema='public' and table_name='boss_raid_participants' and column_name='next_question_available_at';
select indexname from pg_indexes where schemaname='public' and indexname='boss_raid_hero_unique'; -- v2: expect zero rows
select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('create_boss_raid_room','reserve_raid_hero','start_boss_raid','raid_resolve','get_private_raid_snapshot','report_raid_visibility');
select schemaname,tablename from pg_publication_tables where tablename like 'boss_raid_%'; -- expect zero rows
