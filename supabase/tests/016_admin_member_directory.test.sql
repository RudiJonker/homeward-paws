begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create temporary table directory_results (result text) on commit drop;
grant select, insert on directory_results to authenticated, service_role;

insert into directory_results select ok(
  not has_function_privilege('anon', 'public.admin_member_directory()', 'EXECUTE'),
  'anonymous cannot execute the account directory');
insert into directory_results select ok(
  has_function_privilege('authenticated', 'public.admin_member_directory()', 'EXECUTE'),
  'authenticated callers can reach the guarded function');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0250000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'directory-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now() - interval '5 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0250000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'directory-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now() - interval '4 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0250000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'directory-suspended@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now() - interval '3 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0250000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'directory-no-profile@example.test', crypt('password', gen_salt('bf')), null, '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now() - interval '2 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0250000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'directory-deleted@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now() - interval '1 day', now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set role = 'admin', first_name = 'Active'
  where id = 'a0250000-0000-0000-0000-000000000001';
update public.profiles set role = 'admin', account_status = 'suspended'
  where id = 'a0250000-0000-0000-0000-000000000003';
delete from public.profiles where id = 'a0250000-0000-0000-0000-000000000004';
reset role;
update auth.users set deleted_at = now()
  where id = 'a0250000-0000-0000-0000-000000000005';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0250000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into directory_results select throws_ok(
  $$select * from public.admin_member_directory()$$,
  '42501', 'admin access required',
  'ordinary member cannot read account directory');

select set_config('request.jwt.claims', '{"sub":"a0250000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into directory_results select throws_ok(
  $$select * from public.admin_member_directory()$$,
  '42501', 'admin access required',
  'suspended admin cannot read account directory');

select set_config('request.jwt.claims', '{"sub":"a0250000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into directory_results select is(
  (select count(*) from public.admin_member_directory()), 4::bigint,
  'active admin sees one row per non-deleted account');
insert into directory_results select is(
  (select first_name from public.admin_member_directory()
    where email = 'directory-admin@example.test'), 'Active',
  'directory includes the first name');
insert into directory_results select ok(
  exists (select 1 from public.admin_member_directory()
    where email = 'directory-no-profile@example.test'
      and first_name is null and email_confirmed = false),
  'account without profile appears with null first name and unconfirmed email');
insert into directory_results select ok(
  exists (select 1 from public.admin_member_directory()
    where email = 'directory-member@example.test' and email_confirmed = true),
  'directory includes confirmed-email status');
insert into directory_results select ok(
  not exists (select 1 from public.admin_member_directory()
    where email = 'directory-deleted@example.test'),
  'soft-deleted account is excluded');
insert into directory_results select is(
  (select array_agg(key order by key) from jsonb_object_keys(
    (select to_jsonb(d) from public.admin_member_directory() as d limit 1)) as key),
  array['created_at', 'email', 'email_confirmed', 'first_name']::text[],
  'directory returns only the four approved fields');
insert into directory_results select ok(
  (select bool_and(created_at is not null) from public.admin_member_directory()),
  'each directory row has an account creation time');

insert into directory_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 11 tests passed') as result
  from directory_results where result not like 'ok %';
rollback;
