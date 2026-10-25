begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create temporary table flag_results (result text) on commit drop;
grant select, insert on flag_results to anon, authenticated, service_role;
create temporary table flag_ids (report_flag uuid, photo_flag uuid) on commit drop;
grant select, insert, update on flag_ids to authenticated, service_role;

insert into flag_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.content_reports'::regclass),
  'content flags have RLS');
insert into flag_results select ok(
  not has_table_privilege('anon', 'public.content_reports', 'SELECT'),
  'anonymous cannot read private flags');
insert into flag_results select ok(
  not has_table_privilege('authenticated', 'public.content_reports', 'INSERT'),
  'members cannot directly insert a flag');
insert into flag_results select ok(
  not has_table_privilege('authenticated', 'public.content_reports', 'UPDATE'),
  'members cannot change moderation status');
insert into flag_results select ok(
  not has_function_privilege('anon', 'public.submit_missing_content_report(uuid,text,text,text)', 'EXECUTE'),
  'anonymous cannot call the flag RPC');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'flag-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b3000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'flag-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'flag-other@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'flag-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in (
  'a3000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'd3000000-0000-0000-0000-000000000004';
insert into public.animals (id, owner_id, name, category, status)
values ('e3000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values
  ('f3000000-0000-0000-0000-000000000001', 'missing', 'active',
    'a3000000-0000-0000-0000-000000000001',
    'e3000000-0000-0000-0000-000000000001', 'HP-M-FLAGTEST', now(), now()),
  ('f3000000-0000-0000-0000-000000000002', 'missing', 'draft',
    'a3000000-0000-0000-0000-000000000001',
    'e3000000-0000-0000-0000-000000000001', null, null, now());
insert into public.report_photos (report_id, storage_path, display_order, visibility)
values
  ('f3000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/public.jpg', 0, 'public'),
  ('f3000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/private.jpg', 1, 'private');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', null, 'scam', null)$$,
  '42501', null, 'anonymous cannot submit a flag');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', null, 'made_up', null)$$,
  '23514', null, 'invalid reason is rejected');
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000002', null, 'scam', null)$$,
  '23514', null, 'draft report cannot be flagged');
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', 'elsewhere.jpg', 'inappropriate_image', null)$$,
  '23514', null, 'unrelated photo path is rejected');
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/private.jpg', 'inappropriate_image', null)$$,
  '23514', null, 'private report photo cannot be flagged through public flow');
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', null, 'scam', E'bad\nnote')$$,
  '23514', null, 'control characters in private note are rejected');
insert into flag_ids (report_flag) select public.submit_missing_content_report(
  'f3000000-0000-0000-0000-000000000001', null, 'child_safety',
  'Private review note');
insert into flag_results select ok(
  (select report_flag from flag_ids) is not null,
  'member can flag a public missing report');
insert into flag_results select is(
  public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001',
    null, 'child_safety', 'Changed text on retry'),
  (select report_flag from flag_ids), 'retry cannot create a duplicate');
update flag_ids set photo_flag = public.submit_missing_content_report(
  'f3000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/public.jpg',
  'inappropriate_image', null);
insert into flag_results select ok(
  (select photo_flag from flag_ids) is not null,
  'member can flag a specific public report photo');
insert into flag_results select is(
  (select priority::integer from public.content_reports where id = (select report_flag from flag_ids)),
  0, 'child safety flags receive highest queue priority');
insert into flag_results select is(
  (select count(*)::integer from public.content_reports), 2,
  'member sees only their own two flags');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into flag_results select is(
  (select count(*)::integer from public.content_reports), 0,
  'other member cannot read private flags');
insert into flag_results select ok(
  public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001',
    null, 'scam', 'Another report') is not null,
  'another member can independently flag the same report');
insert into flag_results select is(
  (select count(*)::integer from public.content_reports), 1,
  'other member still sees only their own flag');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d3000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into flag_results select is(
  (select count(*)::integer from public.content_reports), 3,
  'active admin can read all flags for later moderation');
insert into flag_results select is(
  (select reason from public.content_reports order by priority, created_at limit 1),
  'child_safety', 'priority ordering places child safety first');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.reports set status = 'closed', closed_at = now()
  where id = 'f3000000-0000-0000-0000-000000000001';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into flag_results select is(
  public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001',
    null, 'child_safety', null),
  (select report_flag from flag_ids), 'lost-response retry works after case closure');
insert into flag_results select throws_ok(
  $$select public.submit_missing_content_report('f3000000-0000-0000-0000-000000000001', null, 'other', null)$$,
  '23514', null, 'a new flag cannot target a closed report');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.delete_member_data('b3000000-0000-0000-0000-000000000002');
insert into flag_results select is(
  (select count(*)::integer from public.content_reports
    where reporter_id is null and description is null),
  2, 'deleting a flagger anonymises their pending flags and note');
select public.delete_member_data('a3000000-0000-0000-0000-000000000001');
insert into flag_results select is(
  (select count(*)::integer from public.content_reports),
  0, 'deleting the report owner removes flags about their removed content');

insert into flag_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 25 tests passed') as result
  from flag_results where result not like 'ok %';
rollback;
