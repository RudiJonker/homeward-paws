begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

create temporary table photo_results (result text) on commit drop;
grant select, insert on photo_results to anon, authenticated, service_role;
create temporary table photo_ids (contributor_id uuid, sighting_id uuid, path text) on commit drop;
grant select, insert, update on photo_ids to anon, authenticated, service_role;

insert into photo_results select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'Storage objects retain RLS');
insert into photo_results select ok(
  (select not public from storage.buckets where id = 'sighting-photos'),
  'sighting bucket is private');
insert into photo_results select ok(
  not has_function_privilege('anon', 'public.attach_linked_sighting_photo(uuid,text)', 'EXECUTE'),
  'anonymous cannot attach photos');
insert into photo_results select ok(
  not has_function_privilege('authenticated', 'public.account_sighting_photo_paths(uuid)', 'EXECUTE'),
  'members cannot list account cleanup paths');
insert into photo_results select ok(
  not has_table_privilege('authenticated', 'public.missing_case_sightings', 'UPDATE'),
  'members cannot write photo metadata directly');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'photo-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b8000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'photo-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c8000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'photo-other@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd8000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'photo-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a8000000-0000-0000-0000-000000000001', 'b8000000-0000-0000-0000-000000000002',
   'c8000000-0000-0000-0000-000000000003');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'd8000000-0000-0000-0000-000000000004';
insert into public.animals (id, owner_id, name, category, status)
values ('e8000000-0000-0000-0000-000000000005',
  'a8000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('f8000000-0000-0000-0000-000000000006', 'missing', 'active',
  'a8000000-0000-0000-0000-000000000001',
  'e8000000-0000-0000-0000-000000000005', 'HP-M-PHOTOTEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('f8000000-0000-0000-0000-000000000006', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('f8000000-0000-0000-0000-000000000006', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('f8000000-0000-0000-0000-000000000006', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b8000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into photo_ids (contributor_id, sighting_id)
select 'b8000000-0000-0000-0000-000000000002', public.submit_missing_case_sighting(
  'f8000000-0000-0000-0000-000000000006',
  jsonb_build_object('observedAt', now() - interval '1 hour', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
    'movement', 'moving', 'condition', 'unsure'), 'photo-submission-b001');
update photo_ids set path = contributor_id::text || '/' || sighting_id::text || '/sighting.jpg';
insert into photo_results select ok(
  public.can_insert_linked_sighting_photo((select path from photo_ids)),
  'contributor can upload one photo to their own active sighting');
insert into photo_results select ok(
  not public.can_insert_linked_sighting_photo('b8000000-0000-0000-0000-000000000002/not-a-uuid/sighting.jpg'),
  'invalid sighting folder is denied');
insert into photo_results select throws_ok(
  format('select public.attach_linked_sighting_photo(%L,%L)',
    (select sighting_id from photo_ids), (select path from photo_ids)),
  '23514', null, 'photo must exist in Storage before attachment');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into storage.objects (bucket_id, name, owner_id)
select 'sighting-photos', path, contributor_id::text from photo_ids;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 0,
  'anonymous cannot read a private sighting photo');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into photo_results select ok(
  not public.can_insert_linked_sighting_photo((select path from photo_ids)),
  'other member cannot upload into a contributor folder');
insert into photo_results select throws_ok(
  format('select public.attach_linked_sighting_photo(%L,%L)',
    (select sighting_id from photo_ids), (select path from photo_ids)),
  '42501', null, 'other member cannot attach photo');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into photo_results select throws_ok(
  format('select public.attach_linked_sighting_photo(%L,%L)',
    (select sighting_id from photo_ids), (select path from photo_ids)),
  '42501', null, 'report owner cannot attach a contributor photo');
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 0,
  'owner cannot read an unlinked photo');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b8000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.attach_linked_sighting_photo((select sighting_id from photo_ids), (select path from photo_ids));
select public.attach_linked_sighting_photo((select sighting_id from photo_ids), (select path from photo_ids));
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 1,
  'contributor can read the attached private photo');
insert into photo_results select is(
  (select photo_path from public.missing_case_sightings where id = (select sighting_id from photo_ids)),
  (select path from photo_ids), 'repeat attachment leaves the same photo');
insert into photo_results select ok(
  not public.can_insert_linked_sighting_photo((select path from photo_ids)),
  'attached photo cannot be overwritten');
insert into photo_results select throws_ok(
  format('select public.attach_linked_sighting_photo(%L,%L)',
    (select sighting_id from photo_ids), 'wrong/path/sighting.jpg'),
  '23514', null, 'arbitrary storage paths cannot be attached');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 1,
  'owner can read attached private sighting photo');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 0,
  'unrelated member cannot read photo');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d8000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into photo_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'sighting-photos'), 1,
  'active admin can read photo');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into photo_results select is(
  (select count(*)::integer from public.account_sighting_photo_paths('b8000000-0000-0000-0000-000000000002')), 1,
  'account cleanup lists contributor photo');
insert into photo_results select throws_ok(
  $$select public.delete_member_data('b8000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'account deletion waits until contributor photo file is removed');
-- Simulate the Storage API removing its object metadata; the Edge Function
-- removes the actual bytes in production before calling delete_member_data.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'sighting-photos' and name = (select path from photo_ids);
select public.delete_member_data('b8000000-0000-0000-0000-000000000002');
insert into photo_results select is(
  (select photo_path from public.missing_case_sightings where id = (select sighting_id from photo_ids)),
  null::text, 'contributor deletion clears photo metadata');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into photo_ids (contributor_id, sighting_id)
select 'c8000000-0000-0000-0000-000000000003', public.submit_missing_case_sighting(
  'f8000000-0000-0000-0000-000000000006',
  jsonb_build_object('observedAt', now() - interval '30 minutes', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
    'movement', 'stationary', 'condition', 'unsure'), 'photo-submission-c001');
update photo_ids set path = contributor_id::text || '/' || sighting_id::text || '/sighting.jpg'
  where contributor_id = 'c8000000-0000-0000-0000-000000000003';
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into storage.objects (bucket_id, name, owner_id)
select 'sighting-photos', path, contributor_id::text from photo_ids
  where contributor_id = 'c8000000-0000-0000-0000-000000000003';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.attach_linked_sighting_photo(
  (select sighting_id from photo_ids where contributor_id = auth.uid()),
  (select path from photo_ids where contributor_id = auth.uid()));
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into photo_results select is(
  (select count(*)::integer from public.account_sighting_photo_paths('a8000000-0000-0000-0000-000000000001')), 1,
  'account cleanup finds another contributor photo on owner case');
insert into photo_results select throws_ok(
  $$select public.delete_member_data('a8000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'owner deletion waits until linked contributor photo is removed');
delete from storage.objects where bucket_id = 'sighting-photos'
  and name = (select path from photo_ids where contributor_id = 'c8000000-0000-0000-0000-000000000003');
select public.delete_member_data('a8000000-0000-0000-0000-000000000001');
insert into photo_results select is(
  (select photo_path from public.missing_case_sightings
    where id = (select sighting_id from photo_ids where contributor_id = 'c8000000-0000-0000-0000-000000000003')),
  null::text, 'owner deletion clears linked photo metadata');

insert into photo_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 26 tests passed') as result
  from photo_results where result not like 'ok %';
rollback;
