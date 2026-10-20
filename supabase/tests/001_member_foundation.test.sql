begin;
create extension if not exists pgtap with schema extensions;
select plan(26);
create temporary table test_results (result text) on commit drop;
grant select, insert on test_results to authenticated, service_role;

insert into test_results select has_table('public', 'profiles', 'profiles table exists');
insert into test_results select has_table('public', 'profile_private', 'private profiles table exists');
insert into test_results select col_default_is('public', 'profiles', 'role', 'member'::app_role, 'new profiles default to member');
insert into test_results select col_default_is('public', 'profiles', 'account_status', 'active'::account_status, 'new profiles default to active');
insert into test_results select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles RLS is enabled');
insert into test_results select ok((select relrowsecurity from pg_class where oid = 'public.profile_private'::regclass), 'profile_private RLS is enabled');
insert into test_results select function_returns('public', 'is_admin', array[]::text[], 'boolean', 'is_admin helper exists');
insert into test_results select function_returns('public', 'is_active_member', array[]::text[], 'boolean', 'is_active_member helper exists');
insert into test_results select is((select public from storage.buckets where id = 'avatars'), true, 'avatars bucket has controlled public reads');
insert into test_results select ok(
  exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatar_select_own'),
  'avatar owner select policy exists'
);
insert into test_results select ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated has profiles Data API access');
insert into test_results select ok(has_table_privilege('authenticated', 'public.profile_private', 'SELECT'), 'authenticated has private profile Data API access');
insert into test_results select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anonymous has no profiles table access');
insert into test_results select ok(has_table_privilege('service_role', 'public.profiles', 'SELECT, INSERT, UPDATE, DELETE'), 'service role has profiles Data API access');
insert into test_results select ok(has_table_privilege('service_role', 'public.profile_private', 'SELECT, INSERT, UPDATE, DELETE'), 'service role has private profile Data API access');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'member-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'member-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into test_results select is((select count(*) from public.profiles), 1::bigint, 'member A reads only own profile');
insert into test_results select is((select count(*) from public.profile_private), 1::bigint, 'member A reads only own private profile');

update public.profiles set first_name = 'Member A', last_name = 'Test' where id = '10000000-0000-0000-0000-000000000001';
update public.profile_private set mobile_e164 = '+27821234567' where user_id = '10000000-0000-0000-0000-000000000001';
insert into test_results select is((select first_name from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'Member A', 'member updates own ordinary profile field');

update public.profiles set first_name = 'Hacked' where id = '20000000-0000-0000-0000-000000000002';
reset role;
insert into test_results select isnt((select first_name from public.profiles where id = '20000000-0000-0000-0000-000000000002'), 'Hacked', 'member cannot update another profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into test_results select throws_ok(
  $$update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'role and account status are server-managed',
  'member cannot promote self'
);
insert into test_results select lives_ok(
  $$select public.complete_member_profile('Gauteng', 'Johannesburg', 'Melville', null, null, 'manual')$$,
  'member can complete a valid profile'
);
insert into test_results select is((select profile_completed from public.profiles where id = '10000000-0000-0000-0000-000000000001'), true, 'profile completion is recorded');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into test_results select throws_ok(
  $$select public.complete_member_profile('Gauteng', 'Johannesburg', 'Melville', null, null, 'manual')$$,
  'P0001',
  'name required',
  'incomplete required details are rejected'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into test_results select lives_ok($$select public.delete_member_data('10000000-0000-0000-0000-000000000001')$$, 'service role can delete member data');
insert into test_results select is((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 0::bigint, 'deletion removes profile');
insert into test_results select is((select count(*) from public.profile_private where user_id = '10000000-0000-0000-0000-000000000001'), 0::bigint, 'deletion removes private profile');

insert into test_results select * from finish();
select coalesce(
  string_agg(result, E'\n\n'),
  'ok - all 26 tests passed'
) as result
from test_results
where result not like 'ok %';
rollback;
