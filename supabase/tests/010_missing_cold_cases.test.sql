begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

create temporary table cold_results (result text) on commit drop;
grant select, insert on cold_results to anon, authenticated, service_role;

insert into cold_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.missing_closures'::regclass),
  'private cold-case table has RLS');
insert into cold_results select ok(
  not has_table_privilege('anon', 'public.missing_closures', 'SELECT'),
  'anonymous cannot read closure reasons');
insert into cold_results select ok(
  not has_table_privilege('authenticated', 'public.missing_closures', 'INSERT'),
  'members cannot directly create a closure');
insert into cold_results select ok(
  not has_function_privilege('anon', 'public.close_missing_report(uuid,jsonb,text)', 'EXECUTE'),
  'anonymous cannot close a case');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'cold-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bb000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'cold-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cc000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'cold-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'cc000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, status) values
  ('dd000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing'),
  ('dd000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000001', 'Moose', 'cat', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values
  ('ee000000-0000-0000-0000-000000000006', 'missing', 'active',
    'aa000000-0000-0000-0000-000000000001',
    'dd000000-0000-0000-0000-000000000004', 'HP-M-COLDTEST', now(), now()),
  ('ee000000-0000-0000-0000-000000000007', 'missing', 'active',
    'aa000000-0000-0000-0000-000000000001',
    'dd000000-0000-0000-0000-000000000005', 'HP-M-MISTAKETEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('ee000000-0000-0000-0000-000000000006', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('ee000000-0000-0000-0000-000000000006', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('ee000000-0000-0000-0000-000000000006', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');
insert into public.report_photos (report_id, storage_path, display_order)
values ('ee000000-0000-0000-0000-000000000006',
  'aa000000-0000-0000-0000-000000000001/ee000000-0000-0000-0000-000000000006/example.jpg', 0);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into cold_results select is(
  (select count(*)::integer from public.get_public_missing_outcome(null, 'HP-M-COLDTEST')),
  0, 'an active report has no ended outcome');
insert into cold_results select is(
  (select count(*)::integer from public.get_public_missing_reports()),
  1, 'the complete active report is publicly discoverable');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{}'::jsonb, 'other-close-key-001')$$,
  '42501', null, 'another member cannot close the case');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{}'::jsonb, 'admin-close-key-001')$$,
  '42501', null, 'admin cannot impersonate owner closure');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{}'::jsonb, 'short')$$,
  '23514', null, 'short retry key is rejected');
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{"reasonCode":"unknown","animalSafeConfirmed":false}'::jsonb, 'invalid-close-key-001')$$,
  '23514', null, 'unrecognised closure reason is rejected');
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{"reasonCode":"withdrawn"}'::jsonb, 'missing-safe-key-001')$$,
  '23514', null, 'safe confirmation answer is required');
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{"reasonCode":"withdrawn","animalSafeConfirmed":true}'::jsonb, 'false-safe-key-001')$$,
  '23514', null, 'withdrawal cannot silently mark the animal safe');
insert into cold_results select is(
  public.close_missing_report('ee000000-0000-0000-0000-000000000006',
    '{"reasonCode":"withdrawn","privateNote":"I need to pause public search","animalSafeConfirmed":false}'::jsonb,
    'valid-cold-close-001'),
  'HP-M-COLDTEST', 'owner closes the alert without asserting reunion');
insert into cold_results select is(
  public.close_missing_report('ee000000-0000-0000-0000-000000000006',
    '{}'::jsonb, 'valid-cold-close-001'),
  'HP-M-COLDTEST', 'lost-response retry returns the original reference');
insert into cold_results select throws_ok(
  $$select public.close_missing_report('ee000000-0000-0000-0000-000000000006', '{}'::jsonb, 'different-close-key-001')$$,
  '23514', null, 'a new key cannot rewrite a closed case');
insert into cold_results select is(
  (select count(*)::integer from public.missing_closures), 1,
  'owner can read the private cold-case record');
insert into cold_results select is(
  (select private_note from public.missing_closures),
  'I need to pause public search', 'owner can revisit their private closure note');
insert into cold_results select is(
  (select status::text from public.animals where id = 'dd000000-0000-0000-0000-000000000004'),
  'missing', 'animal remains missing after a cold-case closure');
insert into cold_results select is(
  (select status from public.reports where id = 'ee000000-0000-0000-0000-000000000006'),
  'closed', 'the public report status is closed');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into cold_results select is(
  (select count(*)::integer from public.get_public_missing_reports(null, null, 'ee000000-0000-0000-0000-000000000006')),
  0, 'closed case is hidden from public Browse');
insert into cold_results select is(
  (select status from public.get_public_missing_outcome(null, 'HP-M-COLDTEST')),
  'closed', 'an exact public reference has a narrow closed outcome');
insert into cold_results select is(
  (select public_message from public.get_public_missing_outcome(null, 'HP-M-COLDTEST')),
  'This missing report is no longer active.', 'public text does not reveal why the case closed');
insert into cold_results select ok(
  not public.can_read_public_report_photo('aa000000-0000-0000-0000-000000000001/ee000000-0000-0000-0000-000000000006/example.jpg'),
  'a closed report photo is no longer eligible for public reads');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into cold_results select is(
  (select count(*)::integer from public.missing_closures), 0,
  'another member cannot read a saved private closure');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into cold_results select is(
  (select count(*)::integer from public.missing_closures), 1,
  'active admin can review the private closure');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into cold_results select is(
  public.close_missing_report('ee000000-0000-0000-0000-000000000007',
    '{"reasonCode":"mistake","animalSafeConfirmed":true}'::jsonb,
    'valid-mistake-close-001'),
  'HP-M-MISTAKETEST', 'mistaken report can close after explicit safety confirmation');
insert into cold_results select is(
  (select status::text from public.animals where id = 'dd000000-0000-0000-0000-000000000005'),
  'safe', 'explicitly confirmed safe animal returns to safe without reunion');
insert into cold_results select is(
  (select count(*)::integer from public.missing_reunions), 0,
  'mistaken report is not mislabelled as a reunion');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into cold_results select is(
  (select count(*)::integer from public.case_events where event_type = 'closed_without_reunion'),
  2, 'closure wrote one historical event for each case');
select public.delete_member_data('aa000000-0000-0000-0000-000000000001');
insert into cold_results select is(
  (select count(*)::integer from public.missing_closures), 0,
  'account deletion removes private cold-case reasons');
insert into cold_results select is(
  (select status from public.reports where id = 'ee000000-0000-0000-0000-000000000006'),
  'closed', 'account deletion preserves only the minimal closed outcome');
insert into cold_results select is(
  (select name from public.report_animal_snapshots where report_id = 'ee000000-0000-0000-0000-000000000006'),
  'Animal', 'account deletion anonymises the historical animal');

insert into cold_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 32 tests passed') as result
  from cold_results where result not like 'ok %';
rollback;
