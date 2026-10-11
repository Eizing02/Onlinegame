-- Read-only verification. Run manually on the intended project after reviewing 009.
select column_name,column_default,is_nullable from information_schema.columns
 where table_schema='public' and table_name='game_sessions' and column_name='game_mode';
select game_mode,count(*) from public.game_sessions group by game_mode;
select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') anon_read,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') authenticated_access
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname like 'boss_raid_%' and c.relkind='r';
select p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('create_boss_raid_room','join_boss_raid','reserve_raid_hero','start_boss_raid','submit_boss_raid_answer','report_raid_visibility','get_private_raid_snapshot','finish_boss_raid');
select schemaname,tablename from pg_publication_tables where tablename like 'boss_raid_%'; -- expect zero rows
select count(*) accounts from public.accounts;
select count(*) identities from public.account_identities;
select count(*) teachers from public.teacher_access;
select count(*) sets from public.question_sets;
select count(*) questions from public.questions;
