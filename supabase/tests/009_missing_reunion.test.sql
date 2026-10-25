begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

create temporary table reunion_results (result text) on commit drop;
grant select, insert on reunion_results to anon, authenticated, service_role;

insert into reunion_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.missing_reunions'::regclass),
  'private reunion table has RLS');
insert into reunion_results select ok(
  not has_table_privilege('anon', 'public.missing_reunions', 'SELECT'),
  'anonymous cannot read private reunion details');
insert into reunion_results select ok(
  not has_table_privilege('authenticated', 'public.missing_reunions', 'INSERT'),
  'members cannot bypass the reunion transaction');
insert into reunion_results select ok(
  not has_table_privilege('authenticated', 'public.reports', 'UPDATE'),
  'members cannot directly change report status');
insert into reunion_results select ok(
  not has_function_privilege('anon', 'public.confirm_missing_reunion(uuid,jsonb,text)', 'EXECUTE'),
  'anonymous cannot confirm a reunion');
insert into reunion_results select ok(
  has_function_privilege('anon', 'public.get_public_missing_outcome(uuid,text)', 'EXECUTE'),
  'anonymous can read the narrow public outcome');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'reunion-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'reunion-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c9000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'reunion-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'c9000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, status)
values ('d9000000-0000-0000-0000-000000000004',
  'a9000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('e9000000-0000-0000-0000-000000000005', 'missing', 'active',
  'a9000000-0000-0000-0000-000000000001',
  'd9000000-0000-0000-0000-000000000004', 'HP-M-REUNIONTEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('e9000000-0000-0000-0000-000000000005', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('e9000000-0000-0000-0000-000000000005', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('e9000000-0000-0000-0000-000000000005', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');
insert into public.report_photos (report_id, storage_path, display_order)
values ('e9000000-0000-0000-0000-000000000005',
  'a9000000-0000-0000-0000-000000000001/e9000000-0000-0000-0000-000000000005/example.jpg', 0);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', '{}'::jsonb, 'anon-reunion-key-001')$$,
  '42501', null, 'anonymous confirmation is rejected');
insert into reunion_results select throws_ok(
  $$select * from public.get_public_missing_outcome()$$,
  '22023', null, 'outcome lookup requires an id or reference');
insert into reunion_results select is(
  (select count(*)::integer from public.get_public_missing_outcome('e9000000-0000-0000-0000-000000000005')),
  0, 'active report has no finished outcome');
insert into reunion_results select is(
  (select count(*)::integer from public.get_public_missing_reports()),
  1, 'active missing report remains public before reunion');
insert into reunion_results select ok(
  public.can_read_public_report_photo('a9000000-0000-0000-0000-000000000001/e9000000-0000-0000-0000-000000000005/example.jpg'),
  'active report photo is eligible for public reads');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', '{}'::jsonb, 'other-reunion-key-001')$$,
  '42501', null, 'another member cannot confirm the owner reunion');
insert into reunion_results select is(
  (select count(*)::integer from public.missing_reunions), 0,
  'another member cannot read private reunion details');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', '{}'::jsonb, 'admin-reunion-key-001')$$,
  '42501', null, 'admin cannot impersonate owner confirmation');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a9000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', '{}'::jsonb, 'short')$$,
  '23514', null, 'short retry key is rejected');
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', jsonb_build_object('reunitedAt', now() + interval '1 day', 'place', 'At home'), 'future-reunion-001')$$,
  '23514', null, 'future reunion time is rejected');
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', jsonb_build_object('reunitedAt', now() - interval '3 days', 'place', 'At home'), 'early-reunion-001')$$,
  '23514', null, 'reunion before last-seen time is rejected');
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', jsonb_build_object('reunitedAt', now(), 'place', ' '), 'empty-place-001')$$,
  '23514', null, 'private reunion place is required');
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', jsonb_build_object('reunitedAt', now(), 'place', 'At home', 'publicStory', 'Private account details'), 'story-reunion-001')$$,
  '23514', null, 'public story cannot be smuggled into the status action');
insert into reunion_results select is(
  public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005',
    jsonb_build_object('reunitedAt', now() - interval '1 hour', 'place', 'At my home',
      'assistance', 'A neighbour helped', 'veterinaryHelpNeeded', true,
      'publicStoryConsent', false), 'valid-reunion-key-001'),
  'HP-M-REUNIONTEST', 'owner confirms reunion and receives original reference');
insert into reunion_results select is(
  public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005',
    '{}'::jsonb, 'valid-reunion-key-001'),
  'HP-M-REUNIONTEST', 'lost-response retry returns original result');
insert into reunion_results select throws_ok(
  $$select public.confirm_missing_reunion('e9000000-0000-0000-0000-000000000005', '{}'::jsonb, 'different-reunion-key-001')$$,
  '23514', null, 'a second request cannot rewrite the reunion');
insert into reunion_results select is(
  (select count(*)::integer from public.missing_reunions), 1,
  'owner can read their one private reunion row');
insert into reunion_results select is(
  (select reunion_place from public.missing_reunions), 'At my home',
  'exact reunion place stays in the private table');
insert into reunion_results select ok(
  public.save_missing_draft('d9000000-0000-0000-0000-000000000004', '{}'::jsonb) is not null,
  'the now-safe animal can start a later, separate missing draft');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into reunion_results select is(
  (select count(*)::integer from public.missing_reunions), 0,
  'another member cannot read the saved private reunion');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into reunion_results select is(
  (select count(*)::integer from public.missing_reunions), 1,
  'active admin can read the private reunion for safety review');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into reunion_results select is(
  (select count(*)::integer from public.get_public_missing_reports()), 0,
  'reunited report leaves active Browse results');
insert into reunion_results select is(
  (select status from public.get_public_missing_outcome('e9000000-0000-0000-0000-000000000005')),
  'reunited', 'public reference resolves to a reunited status');
insert into reunion_results select is(
  (select status from public.get_public_missing_outcome(null, 'hp-m-reuniontest')),
  'reunited', 'case-insensitive reference lookup resolves outcome');
insert into reunion_results select ok(
  not public.can_read_public_report_photo('a9000000-0000-0000-0000-000000000001/e9000000-0000-0000-0000-000000000005/example.jpg'),
  'reunited report photos are no longer public');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into reunion_results select is(
  (select status::text from public.animals where id = 'd9000000-0000-0000-0000-000000000004'),
  'safe', 'the animal status returns to safe');
insert into reunion_results select is(
  (select status from public.reports where id = 'e9000000-0000-0000-0000-000000000005'),
  'reunited', 'report status becomes reunited');
insert into reunion_results select is(
  (select count(*)::integer from public.case_events where event_type = 'reunited'),
  1, 'retry did not duplicate the public reunion event');
insert into reunion_results select is(
  (select reunited_at from public.missing_report_details where report_id = 'e9000000-0000-0000-0000-000000000005'),
  (select reunited_at from public.missing_reunions),
  'report detail records the confirmed reunion time');
insert into reunion_results select is(
  (select count(*)::integer from public.reports where animal_id = 'd9000000-0000-0000-0000-000000000004' and status = 'draft'),
  1, 'new draft is distinct from the reunited historical case');
select public.delete_member_data('a9000000-0000-0000-0000-000000000001');
insert into reunion_results select is(
  (select count(*)::integer from public.missing_reunions), 0,
  'account deletion removes private reunion detail');
insert into reunion_results select is(
  (select status from public.reports where id = 'e9000000-0000-0000-0000-000000000005'),
  'reunited', 'account deletion preserves minimal outcome');
insert into reunion_results select is(
  (select name from public.report_animal_snapshots where report_id = 'e9000000-0000-0000-0000-000000000005'),
  'Animal', 'account deletion anonymises the historical animal');

insert into reunion_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 39 tests passed') as result
  from reunion_results where result not like 'ok %';
rollback;
