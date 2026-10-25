begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create temporary table filter_results (result text) on commit drop;
grant select, insert on filter_results to anon, authenticated, service_role;

insert into filter_results select ok(
  has_function_privilege('anon', 'public.filter_public_missing_reports(integer,integer,text,text,text,text)', 'EXECUTE'),
  'guests may filter the public missing list');
insert into filter_results select ok(
  not has_table_privilege('anon', 'public.report_locations', 'SELECT'),
  'guests still cannot read private location rows');
insert into filter_results select ok(
  position('private_latitude' in pg_get_function_result(
    'public.filter_public_missing_reports(integer,integer,text,text,text,text)'::regprocedure)) = 0,
  'filtered result type has no private coordinate column');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'filter-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b4000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'filter-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c4000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'filter-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in (
  'a4000000-0000-0000-0000-000000000001',
  'b4000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'c4000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, status) values
  ('d4000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing'),
  ('d4000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001', 'Moose', 'cat', 'missing'),
  ('d4000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000001', 'Simba', 'dog', 'missing'),
  ('d4000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000001', 'Luna', 'dog', 'missing'),
  ('d4000000-0000-0000-0000-000000000005', 'a4000000-0000-0000-0000-000000000001', 'Old case', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at, closed_at)
values
  ('e4000000-0000-0000-0000-000000000001', 'missing', 'active', 'a4000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'HP-M-FILTER1', now() - interval '4 days', now() - interval '1 day', null),
  ('e4000000-0000-0000-0000-000000000002', 'missing', 'active', 'a4000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000002', 'HP-M-FILTER2', now() - interval '20 days', now() - interval '20 days', null),
  ('e4000000-0000-0000-0000-000000000003', 'missing', 'active', 'a4000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000003', 'HP-M-FILTER3', now() - interval '7 days', now() - interval '7 days', null),
  ('e4000000-0000-0000-0000-000000000004', 'missing', 'active', 'a4000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000004', 'HP-M-FILTER4', now() - interval '40 days', now() - interval '40 days', null),
  ('e4000000-0000-0000-0000-000000000005', 'missing', 'closed', 'a4000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000005', 'HP-M-FILTER5', now() - interval '10 days', now() - interval '2 days', now() - interval '2 days');
insert into public.report_animal_snapshots (report_id, name, category) values
  ('e4000000-0000-0000-0000-000000000001', 'Nala', 'dog'),
  ('e4000000-0000-0000-0000-000000000002', 'Moose', 'cat'),
  ('e4000000-0000-0000-0000-000000000003', 'Simba', 'dog'),
  ('e4000000-0000-0000-0000-000000000004', 'Luna', 'dog'),
  ('e4000000-0000-0000-0000-000000000005', 'Old case', 'dog');
insert into public.missing_report_details (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
select id, now() - interval '45 days', 'approximate', 'wandered', 'slowly'
  from public.reports where id in (
    'e4000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000002',
    'e4000000-0000-0000-0000-000000000003', 'e4000000-0000-0000-0000-000000000004',
    'e4000000-0000-0000-0000-000000000005');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision,
    public_label, private_latitude, private_longitude)
values
  ('e4000000-0000-0000-0000-000000000001', 'last_seen', 'Gauteng', 'Johannesburg', 'Melville', 'device', 'suburb', 'Melville, Johannesburg, Gauteng', -26.175123, 28.001234),
  ('e4000000-0000-0000-0000-000000000002', 'last_seen', 'Gauteng', 'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng', null, null),
  ('e4000000-0000-0000-0000-000000000003', 'last_seen', 'Gauteng', 'Johannesburg', 'Sandton', 'manual', 'suburb', 'Sandton, Johannesburg, Gauteng', null, null),
  ('e4000000-0000-0000-0000-000000000004', 'last_seen', 'Western Cape', 'Cape Town', 'Woodstock', 'manual', 'suburb', 'Woodstock, Cape Town, Western Cape', null, null),
  ('e4000000-0000-0000-0000-000000000005', 'last_seen', 'Gauteng', 'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng', null, null);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports()),
  4, 'unfiltered guests see active public missing reports only');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_province => '  gAuTeNg  ')),
  3, 'province matching ignores case and surrounding spaces');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_city => 'Johannesburg')),
  3, 'city filter excludes another city');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_suburb => 'Melville')),
  2, 'suburb filter excludes other suburbs and closed cases');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_category => 'cat')),
  1, 'animal type filter uses public snapshot category');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(
    filter_province => 'Gauteng', filter_city => 'Johannesburg',
    filter_suburb => 'Melville', filter_category => 'dog')),
  1, 'combined filters return the single matching public case');
insert into filter_results select is(
  (select public_reference from public.filter_public_missing_reports(
    result_limit => 1, result_offset => 1, filter_province => 'Gauteng')),
  'HP-M-FILTER3', 'pagination sorts matching cases by activity');
insert into filter_results select is(
  (select public_reference from public.filter_public_missing_reports(
    result_limit => 1, result_offset => 2, filter_province => 'Gauteng')),
  'HP-M-FILTER2', 'older active case remains reachable after paging');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_suburb => 'missing place')),
  0, 'unmatched area returns an empty result');
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(result_limit => 0)),
  1, 'page size is clamped to at least one');
insert into filter_results select is(
  (select public_location from public.filter_public_missing_reports(filter_suburb => 'Melville', filter_category => 'dog')),
  'Melville, Johannesburg, Gauteng', 'filtered public location stays at suburb level');
insert into filter_results select ok(
  (select row_to_json(f)::text from public.filter_public_missing_reports(fILTER_SUBURB => 'Melville', filter_category => 'dog') f)
    not like '%private_latitude%' and
  (select row_to_json(f)::text from public.filter_public_missing_reports(filter_suburb => 'Melville', filter_category => 'dog') f)
    not like '%private_longitude%',
  'filtered result does not expose private coordinate keys');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b4000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_province => 'Western Cape')),
  1, 'other member sees the same safe public filter result');
insert into filter_results select is(
  (select count(*)::integer from public.reports), 0,
  'other member cannot read the owners report rows directly');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c4000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into filter_results select is(
  (select count(*)::integer from public.filter_public_missing_reports(filter_category => 'dog')),
  3, 'admin receives the same safe public projection');

insert into filter_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 18 tests passed') as result
  from filter_results where result not like 'ok %';
rollback;
