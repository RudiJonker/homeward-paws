begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create temporary table restart_results (result text) on commit drop;
grant select, insert on restart_results to anon, authenticated, service_role;
create temporary table restart_ids (draft_id uuid, new_reference text) on commit drop;
grant select, insert, update on restart_ids to authenticated, service_role;
grant select on restart_ids to anon;
create temporary table restart_payload (payload jsonb) on commit drop;
grant select on restart_payload to authenticated, service_role;
grant insert on restart_payload to service_role;

insert into restart_results select ok(
  not has_function_privilege('authenticated', 'public.can_use_animal_for_missing_report(uuid)', 'EXECUTE'),
  'animal eligibility helper cannot be called directly by a member');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'restart-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'restart-other@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'restart-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'c2000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, status) values
  ('d2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing'),
  ('d2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Moose', 'cat', 'missing'),
  ('d2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Simba', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values
  ('e2000000-0000-0000-0000-000000000001', 'missing', 'active',
    'a2000000-0000-0000-0000-000000000001',
    'd2000000-0000-0000-0000-000000000001', 'HP-M-OLDCASE', now(), now()),
  ('e2000000-0000-0000-0000-000000000002', 'missing', 'active',
    'a2000000-0000-0000-0000-000000000001',
    'd2000000-0000-0000-0000-000000000003', 'HP-M-ACTIVECASE', now(), now());
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision,
    public_label, private_latitude, private_longitude)
values ('e2000000-0000-0000-0000-000000000001', 'last_seen', 'Gauteng',
  'Johannesburg', 'Old Suburb', 'manual', 'suburb',
  'Old Suburb, Johannesburg, Gauteng', -26.111, 28.111);
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('e2000000-0000-0000-0000-000000000001', now() - interval '8 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_photos (report_id, storage_path, display_order)
values ('e2000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001/e2000000-0000-0000-0000-000000000001/old.jpg', 0);
insert into restart_payload select jsonb_build_object(
  'appearance', jsonb_build_object('confirmed', true, 'animal_updated_at', a.updated_at,
    'photo_ids', '[]'::jsonb, 'selected_photo_ids', '[]'::jsonb,
    'accessories', 'New collar', 'notes', ''),
  'last_seen', jsonb_build_object('complete', true,
    'last_seen_at', now() - interval '1 day',
    'date', to_char(now() - interval '1 day', 'YYYY-MM-DD'),
    'time', to_char(now() - interval '1 day', 'HH24:MI'),
    'timeAccuracy', 'approximate', 'circumstance', 'wandered',
    'travelDirection', 'unknown', 'direction', '', 'explanation', ''),
  'last_seen_location', jsonb_build_object('complete', true,
    'method', 'manual', 'province', 'Gauteng', 'city', 'Johannesburg',
    'suburb', 'New Suburb', 'publicPrecision', 'suburb',
    'streetOrLandmark', ''),
  'safety_contact', jsonb_build_object('complete', true,
    'urgencyFlags', '[]'::jsonb, 'approach', 'slowly',
    'biteScratchKickRisk', false,
    'contact', jsonb_build_object('inApp', true, 'phone', false, 'whatsapp', false))
) from public.animals a where a.id = 'd2000000-0000-0000-0000-000000000001';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into restart_results select throws_ok(
  $$select public.save_missing_draft('d2000000-0000-0000-0000-000000000002', '{}'::jsonb)$$,
  '23514', null, 'missing animal with no closed case cannot start a draft');
insert into restart_results select throws_ok(
  $$select public.save_missing_draft('d2000000-0000-0000-0000-000000000003', '{}'::jsonb)$$,
  '23514', null, 'animal with an active case cannot start another draft');
insert into restart_results select is(
  public.close_missing_report('e2000000-0000-0000-0000-000000000001',
    '{"reasonCode":"withdrawn","privateNote":"Old private reason","animalSafeConfirmed":false}'::jsonb,
    'new-alert-close-key-001'),
  'HP-M-OLDCASE', 'owner closes the old case without claiming reunion');
insert into restart_results select is(
  (select status::text from public.animals where id = 'd2000000-0000-0000-0000-000000000001'),
  'missing', 'animal remains missing after closure');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into restart_results select throws_ok(
  $$select public.save_missing_draft('d2000000-0000-0000-0000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'another member cannot start the owners new alert');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into restart_results select throws_ok(
  $$select public.save_missing_draft('d2000000-0000-0000-0000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'admin cannot impersonate the owner');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into restart_results select throws_ok(
  $$select public.save_missing_draft('d2000000-0000-0000-0000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'anonymous cannot start a missing draft');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into restart_ids (draft_id) select public.save_missing_draft(
  'd2000000-0000-0000-0000-000000000001', '{}'::jsonb);
insert into restart_results select is(
  (select draft_payload from public.reports where id = (select draft_id from restart_ids)),
  '{}'::jsonb, 'fresh draft does not inherit old case details');
insert into restart_results select ok(
  'appearance' = any(public.missing_draft_readiness((select draft_id from restart_ids))),
  'fresh draft requires appearance review');
insert into restart_results select throws_ok(
  format('select public.publish_missing_report(%L::uuid)', (select draft_id from restart_ids)),
  '23514', null, 'empty fresh draft cannot publish');
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into restart_results select is(
  (select count(*)::integer from public.report_locations where report_id = (select draft_id from restart_ids)),
  0, 'old private location is not copied to new draft');
insert into restart_results select is(
  (select count(*)::integer from public.report_photos where report_id = (select draft_id from restart_ids)),
  0, 'old report photos are not copied to new draft');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into restart_results select is(
  (select count(*)::integer from public.reports where id = (select draft_id from restart_ids)),
  0, 'another member cannot read the new private draft');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into restart_results select is(
  (select count(*)::integer from public.get_public_missing_reports()),
  0, 'fresh private draft and closed case are absent from public Browse');
insert into restart_results select is(
  (select count(*)::integer from public.get_public_missing_outcome(null, 'HP-M-OLDCASE')),
  1, 'old reference returns only a closed outcome');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.save_missing_draft('d2000000-0000-0000-0000-000000000001',
  (select payload from restart_payload), (select draft_id from restart_ids));
insert into restart_results select is(
  cardinality(public.missing_draft_readiness((select draft_id from restart_ids))),
  0, 'fully reviewed new details are ready to publish');
update restart_ids set new_reference = public.publish_missing_report(draft_id);
insert into restart_results select ok(
  (select new_reference from restart_ids) like 'HP-M-%'
    and (select new_reference from restart_ids) <> 'HP-M-OLDCASE',
  'new alert receives a different reference');
insert into restart_results select is(
  public.publish_missing_report((select draft_id from restart_ids)),
  (select new_reference from restart_ids), 'publish retry keeps the new reference');
insert into restart_results select is(
  (select status from public.reports where id = 'e2000000-0000-0000-0000-000000000001'),
  'closed', 'old case remains closed after the new alert publishes');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into restart_results select is(
  (select count(*)::integer from public.get_public_missing_reports()),
  1, 'new alert is publicly discoverable while the old case stays closed');
insert into restart_results select is(
  (select public_location from public.get_public_missing_reports()
    where report_id = (select draft_id from restart_ids)),
  'New Suburb, Johannesburg, Gauteng', 'new public alert uses only the newly reviewed area');

insert into restart_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 22 tests passed') as result
  from restart_results where result not like 'ok %';
rollback;
