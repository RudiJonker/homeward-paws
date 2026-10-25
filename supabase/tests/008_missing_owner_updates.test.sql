begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

create temporary table owner_update_results (result text) on commit drop;
grant select, insert on owner_update_results to anon, authenticated, service_role;
create temporary table saved_update_ids (id uuid) on commit drop;
grant select, insert on saved_update_ids to authenticated, service_role;

insert into owner_update_results select ok(
  not has_function_privilege('anon', 'public.add_missing_owner_update(uuid,text,text,jsonb,text)', 'EXECUTE'),
  'anonymous cannot add an owner update');
insert into owner_update_results select ok(
  not has_function_privilege('anon', 'public.get_owner_missing_timeline(uuid)', 'EXECUTE'),
  'anonymous cannot read the owner timeline');
insert into owner_update_results select ok(
  not has_table_privilege('authenticated', 'public.case_events', 'INSERT'),
  'members cannot directly insert case events');
insert into owner_update_results select ok(
  not has_table_privilege('authenticated', 'public.report_locations', 'INSERT'),
  'members cannot directly insert report locations');
insert into owner_update_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.case_events'::regclass),
  'case events keep RLS enabled');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'update-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b8000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'update-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c8000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'update-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a8000000-0000-0000-0000-000000000001', 'b8000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'c8000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, status)
values ('d8000000-0000-0000-0000-000000000004',
  'a8000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('e8000000-0000-0000-0000-000000000005', 'missing', 'active',
  'a8000000-0000-0000-0000-000000000001',
  'd8000000-0000-0000-0000-000000000004', 'HP-M-UPDATETEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('e8000000-0000-0000-0000-000000000005', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('e8000000-0000-0000-0000-000000000005', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('e8000000-0000-0000-0000-000000000005', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', 'Looking nearby', null, 'anonymous-key-001')$$,
  '42501', null, 'anonymous update is denied');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b8000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', 'Looking nearby', null, 'other-member-key-001')$$,
  '42501', null, 'another member cannot update the case');
insert into owner_update_results select throws_ok(
  $$select * from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005')$$,
  '42501', null, 'another member cannot read owner timeline');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', 'Looking nearby', null, 'admin-update-key-001')$$,
  '42501', null, 'admin cannot impersonate the report owner');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', 'Looking nearby', null, 'short')$$,
  '23514', null, 'short request key is rejected');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'unknown', 'Looking nearby', null, 'bad-type-key-001')$$,
  '23514', null, 'unknown update type is rejected');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', ' ', null, 'empty-note-key-001')$$,
  '23514', null, 'empty search note is rejected');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'new_confirmed_area', '', '{"province":"Gauteng","city":"Johannesburg","suburb":"Melville","publicPrecision":"exact"}'::jsonb, 'exact-area-key-001')$$,
  '23514', null, 'exact public precision is rejected');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'new_confirmed_area', '', '{"province":"Gauteng","city":"Johannesburg","suburb":"Melville","publicPrecision":"suburb","latitude":-26.1}'::jsonb, 'coordinate-key-001')$$,
  '23514', null, 'private coordinates cannot be supplied as a public update');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'new_confirmed_area', '', '{"province":"Gauteng","city":"Johannesburg","suburb":"Melville","publicPrecision":"approximate","streetOrLandmark":"12 Oak Street"}'::jsonb, 'house-number-key-001')$$,
  '23514', null, 'numbered public address is rejected');
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'new_confirmed_area', '', '{"province":"Gauteng","city":"Johannesburg","suburb":"Melville","publicPrecision":"suburb","streetOrLandmark":"Oak Street"}'::jsonb, 'hidden-landmark-001')$$,
  '23514', null, 'suburb-only update cannot store an unshared street');
insert into owner_update_results select ok(
  public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005',
    'new_confirmed_area', null,
    '{"province":"Gauteng","city":"Johannesburg","suburb":"Melville","publicPrecision":"approximate","streetOrLandmark":"The library"}'::jsonb,
    'valid-area-key-001') is not null,
  'owner adds a street-or-broader confirmed area');
insert into owner_update_results select is(
  (select count(*)::integer from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005')),
  1, 'owner timeline includes update');
insert into saved_update_ids select public.add_missing_owner_update(
  'e8000000-0000-0000-0000-000000000005',
  'search_note', 'Please check nearby gardens', null, 'search-note-key-001');
insert into owner_update_results select ok(
  (select id from saved_update_ids) is not null,
  'owner adds a search note');
insert into owner_update_results select is(
  public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005',
    'search_note', 'Different retry payload', null, 'search-note-key-001'),
  (select id from saved_update_ids),
  'retry returns the original update');
insert into owner_update_results select is(
  (select count(*)::integer from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005') where event_type = 'owner_update'),
  2, 'retry creates no duplicate event');
insert into owner_update_results select ok(
  not has_table_privilege('authenticated', 'public.report_locations', 'SELECT'),
  'direct report location read remains unavailable to members');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into owner_update_results select is(
  (select jsonb_array_length(public_timeline) from public.get_public_missing_reports()),
  2, 'public timeline includes two owner updates');
insert into owner_update_results select ok(
  (select public_timeline::text from public.get_public_missing_reports()) not like '%latitude%'
  and (select public_timeline::text from public.get_public_missing_reports()) not like '%client_request_key%',
  'public timeline omits private and retry metadata');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into owner_update_results select is(
  (select count(*)::integer from public.report_locations where location_type = 'search_area'),
  1, 'confirmed area is stored separately as history');
insert into owner_update_results select is(
  (select public_precision from public.report_locations where location_type = 'search_area'),
  'approximate', 'confirmed area is street-or-broader');
insert into owner_update_results select is(
  (select private_latitude from public.report_locations where location_type = 'search_area'),
  null::numeric, 'confirmed area has no exact point');
insert into public.case_events (report_id, event_type, visibility, event_data)
values ('e8000000-0000-0000-0000-000000000005', 'linked_sighting_submitted', 'reporter',
  '{"sighting_id":"99999999-9999-9999-9999-999999999999","secret":"private"}'::jsonb);
insert into public.case_events (report_id, event_type, visibility, event_data)
values ('e8000000-0000-0000-0000-000000000005', 'moderation_note', 'admin',
  '{"secret":"admin-only"}'::jsonb);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into owner_update_results select is(
  (select count(*)::integer from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005')),
  3, 'owner timeline includes private sighting summary but not admin event');
insert into owner_update_results select ok(
  (select string_agg(message, ' ') from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005')) not like '%private%'
  and (select string_agg(message, ' ') from public.get_owner_missing_timeline('e8000000-0000-0000-0000-000000000005')) not like '%admin-only%',
  'owner timeline never returns raw private event data');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.reports set status = 'closed', closed_at = now()
  where id = 'e8000000-0000-0000-0000-000000000005';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into owner_update_results select throws_ok(
  $$select public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005', 'search_note', 'Still looking', null, 'closed-update-key-001')$$,
  '23514', null, 'closed case rejects a new owner update');
insert into owner_update_results select is(
  public.add_missing_owner_update('e8000000-0000-0000-0000-000000000005',
    'search_note', 'Lost response retry', null, 'search-note-key-001'),
  (select id from saved_update_ids),
  'closed case still resolves an existing retry');

insert into owner_update_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 31 tests passed') as result
  from owner_update_results where result not like 'ok %';
rollback;
