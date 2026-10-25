begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

create temporary table sighting_results (result text) on commit drop;
grant select, insert on sighting_results to anon, authenticated, service_role;

insert into sighting_results select ok(
  not has_table_privilege('anon', 'public.missing_case_sightings', 'SELECT'),
  'anonymous cannot read private linked sightings');
insert into sighting_results select ok(
  not has_function_privilege('anon', 'public.submit_missing_case_sighting(uuid,jsonb,text)', 'EXECUTE'),
  'anonymous cannot submit a sighting');
insert into sighting_results select ok(
  not has_function_privilege('anon', 'public.review_missing_case_sighting(uuid,text)', 'EXECUTE'),
  'anonymous cannot review a sighting');
insert into sighting_results select ok(
  not has_table_privilege('authenticated', 'public.missing_case_sightings', 'INSERT'),
  'members cannot bypass the submit function');
insert into sighting_results select ok(
  not has_table_privilege('authenticated', 'public.missing_case_sightings', 'UPDATE'),
  'members cannot bypass owner review');
insert into sighting_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.missing_case_sightings'::regclass),
  'linked sightings have RLS enabled');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sighting-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b7000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sighting-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c7000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'sighting-other@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd7000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'sighting-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a7000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000002',
   'c7000000-0000-0000-0000-000000000003');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'd7000000-0000-0000-0000-000000000004';
update public.profile_private set mobile_e164 = '+27821234567'
  where user_id = 'b7000000-0000-0000-0000-000000000002';
insert into public.animals (id, owner_id, name, category, status)
values ('e7000000-0000-0000-0000-000000000005',
  'a7000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('f7000000-0000-0000-0000-000000000006', 'missing', 'active',
  'a7000000-0000-0000-0000-000000000001',
  'e7000000-0000-0000-0000-000000000005', 'HP-M-SIGHTTEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('f7000000-0000-0000-0000-000000000006', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('f7000000-0000-0000-0000-000000000006', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('f7000000-0000-0000-0000-000000000006', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006', '{}'::jsonb, 'anon-request-0001')$$,
  '42501', null, 'anonymous submission is denied');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006', '{}'::jsonb, 'bad-key')$$,
  '23514', null, 'short request key is rejected');
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    jsonb_build_object('observedAt', now() + interval '1 day', 'province', 'Gauteng',
      'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
      'movement', 'moving', 'condition', 'unsure'), 'future-request-0001')$$,
  '23514', null, 'future observation is rejected');
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    jsonb_build_object('observedAt', now() - interval '1 hour', 'province', 'Gauteng',
      'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
      'latitude', -26.1, 'longitude', 28.0, 'movement', 'moving',
      'condition', 'unsure'), 'manual-point-0001')$$,
  '23514', null, 'manual location cannot smuggle exact coordinates');
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    jsonb_build_object('observedAt', now() - interval '1 hour', 'province', 'Gauteng',
      'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'device',
      'movement', 'moving', 'condition', 'unsure'), 'device-empty-0001')$$,
  '23514', null, 'device source requires a private point');
insert into sighting_results select ok(
  public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    jsonb_build_object('observedAt', now() - interval '1 hour', 'province', 'Gauteng',
      'city', 'Johannesburg', 'suburb', 'Melville', 'streetOrLandmark', 'Near the library',
      'locationSource', 'device', 'latitude', -26.175123, 'longitude', 28.001234,
      'accuracyMetres', 12, 'movement', 'moving', 'direction', 'Towards the park',
      'condition', 'appeared_well', 'stillVisible', false,
      'notes', 'Brown collar', 'sharePhone', true), 'member-sighting-0001') is not null,
  'member submits a private linked sighting');
insert into sighting_results select is(
  (select count(*)::integer from public.missing_case_sightings), 1,
  'contributor sees own sighting');
insert into sighting_results select is(
  (select contact_phone_e164 from public.missing_case_sightings),
  '+27821234567', 'consented phone is copied for owner contact');
insert into sighting_results select is(
  (select private_latitude from public.missing_case_sightings),
  -26.175123::numeric, 'exact device point is stored privately');
insert into sighting_results select ok(
  public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    '{}'::jsonb, 'member-sighting-0001') =
    (select id from public.missing_case_sightings),
  'retry returns the original sighting id');
insert into sighting_results select throws_ok(
  $$select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'likely')$$,
  '42501', null, 'contributor cannot review owner case');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into sighting_results select is(
  (select count(*)::integer from public.get_public_missing_reports()), 1,
  'public missing report remains discoverable after a private sighting');
insert into sighting_results select is(
  (select jsonb_array_length(public_timeline) from public.get_public_missing_reports()), 0,
  'private sighting event does not appear in public timeline');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c7000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into sighting_results select is(
  (select count(*)::integer from public.missing_case_sightings), 0,
  'unrelated member cannot read the sighting');
insert into sighting_results select throws_ok(
  $$select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'likely')$$,
  '42501', null, 'unrelated member cannot review a sighting');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into sighting_results select is(
  (select count(*)::integer from public.missing_case_sightings), 1,
  'missing-report owner can read linked sighting');
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    '{}'::jsonb, 'owner-request-0001')$$,
  '42501', null, 'owner cannot submit a community sighting to own case');
insert into sighting_results select throws_ok(
  $$select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'invalid')$$,
  '23514', null, 'owner cannot set arbitrary review status');
select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'likely');
insert into sighting_results select is(
  (select review_status from public.missing_case_sightings), 'likely',
  'owner can mark a sighting likely');
select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'likely');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d7000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into sighting_results select is(
  (select count(*)::integer from public.missing_case_sightings), 1,
  'active admin can read linked sighting');
insert into sighting_results select throws_ok(
  $$select public.review_missing_case_sighting((select id from public.missing_case_sightings), 'possible')$$,
  '42501', null, 'admin does not silently override owner classification');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into sighting_results select is(
  (select count(*)::integer from public.missing_case_sightings), 1,
  'service sees one sighting after retries');
insert into sighting_results select is(
  (select count(*)::integer from public.case_events where event_type = 'linked_sighting_submitted'),
  1, 'retry creates no duplicate submission event');
insert into sighting_results select is(
  (select count(*)::integer from public.case_events where event_type = 'linked_sighting_reviewed'),
  1, 'repeated owner review creates no duplicate review event');
update public.reports set status = 'closed', closed_at = now()
  where id = 'f7000000-0000-0000-0000-000000000006';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into sighting_results select throws_ok(
  $$select public.submit_missing_case_sighting('f7000000-0000-0000-0000-000000000006',
    '{}'::jsonb, 'closed-request-0001')$$,
  '23514', null, 'closed case rejects new sightings');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.delete_member_data('b7000000-0000-0000-0000-000000000002');
insert into sighting_results select is(
  (select contributor_id from public.missing_case_sightings), null::uuid,
  'account deletion removes sighting contributor identity');
insert into sighting_results select is(
  (select contact_phone_e164 from public.missing_case_sightings), null::text,
  'account deletion removes consented phone');
insert into sighting_results select is(
  (select private_latitude from public.missing_case_sightings), null::numeric,
  'account deletion removes exact sighting point');
insert into sighting_results select is(
  (select notes from public.missing_case_sightings), null::text,
  'account deletion removes sighting free text');
insert into sighting_results select is(
  (select suburb from public.missing_case_sightings), 'Melville',
  'non-public general area remains in case history');

insert into sighting_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 36 tests passed') as result
  from sighting_results where result not like 'ok %';
rollback;
