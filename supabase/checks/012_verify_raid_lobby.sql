-- Read-only verification after migration 012. No student/answer records are selected.
select to_regprocedure('public.rename_boss_raid_team(text,text,uuid,text)') is not null as rename_rpc_exists;
select
 not has_function_privilege('anon','public.rename_boss_raid_team(text,text,uuid,text)','EXECUTE') as anon_blocked,
 not has_function_privilege('authenticated','public.rename_boss_raid_team(text,text,uuid,text)','EXECUTE') as browser_role_blocked,
 has_function_privilege('service_role','public.rename_boss_raid_team(text,text,uuid,text)','EXECUTE') as server_role_allowed;
select
 position('public.raid_shuffle(options)' in pg_get_functiondef('public.start_boss_raid(text,text)'::regprocedure)) = 0 as choices_not_shuffled,
 position('public.raid_shuffle(ids)' in pg_get_functiondef('public.start_boss_raid(text,text)'::regprocedure)) > 0 as questions_still_shuffled,
 position('canRenameTeam' in pg_get_functiondef('public.get_private_raid_snapshot(text,text,boolean,uuid,bigint)'::regprocedure)) > 0 as captain_permission_available;
