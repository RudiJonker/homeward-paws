begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

create temporary table removal_results (result text) on commit drop;
grant select, insert on removal_results to anon, authenticated, service_role;
create temporary table removal_ids (kind text, sighting_id uuid, path text) on commit drop;
grant select, insert, update on removal_ids to anon, authenticated, service_role;

insert into removal_results select ok(
  not has_function_privilege('anon', 'public.clear_linked_sighting_photo(uuid)', 'EXECUTE'),
  'anonymous cannot clear sighting photo metadata');
insert into removal_results select ok(
  not has_function_privilege('anon', 'public.can_delete_linked_sighting_photo(text)', 'EXECUTE'),
  'anonymous cannot call photo deletion helper');
insert into removal_results select ok(
  not has_table_privilege('authenticated', 'public.missing_case_sightings', 'UPDATE'),
  'members cannot directly clear photo metadata');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'remove-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'remove-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c9000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'remove-other@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd9000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'remove-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-000000000002',
   'c9000000-0000-0000-0000-000000000003');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'd9000000-0000-0000-0000-000000000004';
insert into public.animals (id, owner_id, name, category, status)
values ('e9000000-0000-0000-0000-000000000005',
  'a9000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('f9000000-0000-0000-0000-000000000006', 'missing', 'active',
  'a9000000-0000-0000-0000-000000000001',
  'e9000000-0000-0000-0000-000000000005', 'HP-M-REMOVETEST', now(), now());
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code)
values ('f9000000-0000-0000-0000-000000000006', now() - interval '2 days',
  'approximate', 'wandered', 'slowly');
insert into public.report_animal_snapshots (report_id, name, category)
values ('f9000000-0000-0000-0000-000000000006', 'Nala', 'dog');
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision, public_label)
values ('f9000000-0000-0000-0000-000000000006', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'manual', 'suburb', 'Melville, Johannesburg, Gauteng');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into removal_ids (kind, sighting_id)
select 'attached', public.submit_missing_case_sighting(
  'f9000000-0000-0000-0000-000000000006',
  jsonb_build_object('observedAt', now() - interval '1 hour', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
    'movement', 'moving', 'condition', 'unsure'), 'remove-photo-one-0001');
update removal_ids set path = 'b9000000-0000-0000-0000-000000000002/' || sighting_id::text || '/sighting.jpg';
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into storage.objects (bucket_id, name, owner_id)
select 'sighting-photos', path, 'b9000000-0000-0000-0000-000000000002'
  from removal_ids where kind = 'attached';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.attach_linked_sighting_photo(
  (select sighting_id from removal_ids where kind = 'attached'),
  (select path from removal_ids where kind = 'attached'));
insert into removal_results select ok(
  public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'attached')),
  'contributor may delete their attached photo');
insert into removal_results select ok(
  not public.can_delete_linked_sighting_photo('b9000000-0000-0000-0000-000000000002/not-a-uuid/sighting.jpg'),
  'invalid sighting folder is denied');
insert into removal_results select throws_ok(
  format('select public.clear_linked_sighting_photo(%L)',
    (select sighting_id from removal_ids where kind = 'attached')),
  '23514', null, 'metadata cannot be cleared while photo bytes exist');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a9000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into removal_results select ok(
  not public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'attached')),
  'case owner cannot delete contributor photo');
insert into removal_results select throws_ok(
  format('select public.clear_linked_sighting_photo(%L)',
    (select sighting_id from removal_ids where kind = 'attached')),
  '42501', null, 'case owner cannot clear contributor photo metadata');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into removal_results select ok(
  not public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'attached')),
  'other member cannot delete photo');
insert into removal_results select throws_ok(
  format('select public.clear_linked_sighting_photo(%L)',
    (select sighting_id from removal_ids where kind = 'attached')),
  '42501', null, 'other member cannot clear metadata');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d9000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into removal_results select ok(
  not public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'attached')),
  'admin member does not silently remove contributor photo');

-- Simulate Storage API metadata deletion without any external file bytes.
reset role;
select set_config('storage.allow_delete_query', 'true', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
with removed as (delete from storage.objects
  where bucket_id = 'sighting-photos'
    and name = (select path from removal_ids where kind = 'attached') returning id)
insert into removal_results select is((select count(*)::integer from removed), 0,
  'other member Storage deletion is denied by policy');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
with removed as (delete from storage.objects
  where bucket_id = 'sighting-photos'
    and name = (select path from removal_ids where kind = 'attached') returning id)
insert into removal_results select is((select count(*)::integer from removed), 1,
  'contributor Storage deletion removes own photo');
select public.clear_linked_sighting_photo((select sighting_id from removal_ids where kind = 'attached'));
select public.clear_linked_sighting_photo((select sighting_id from removal_ids where kind = 'attached'));
insert into removal_results select is(
  (select photo_path from public.missing_case_sightings
    where id = (select sighting_id from removal_ids where kind = 'attached')),
  null::text, 'photo metadata clears and a retry remains safe');
insert into removal_results select is(
  (select count(*)::integer from public.missing_case_sightings
    where id = (select sighting_id from removal_ids where kind = 'attached')),
  1, 'sighting remains after photo removal');
insert into removal_results select is(
  (select review_status from public.missing_case_sightings
    where id = (select sighting_id from removal_ids where kind = 'attached')),
  'new', 'owner review state remains unchanged');

-- An uploaded file can exist without an attached row after an interrupted
-- upload. The contributor must be able to discard that orphan too.
insert into removal_ids (kind, sighting_id)
select 'orphan', public.submit_missing_case_sighting(
  'f9000000-0000-0000-0000-000000000006',
  jsonb_build_object('observedAt', now() - interval '30 minutes', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
    'movement', 'stationary', 'condition', 'unsure'), 'remove-photo-two-0002');
update removal_ids set path = 'b9000000-0000-0000-0000-000000000002/' || sighting_id::text || '/sighting.jpg'
  where kind = 'orphan';
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into storage.objects (bucket_id, name, owner_id)
select 'sighting-photos', path, 'b9000000-0000-0000-0000-000000000002'
  from removal_ids where kind = 'orphan';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into removal_results select ok(
  public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'orphan')),
  'contributor may discard unattached upload');
with removed as (delete from storage.objects
  where bucket_id = 'sighting-photos'
    and name = (select path from removal_ids where kind = 'orphan') returning id)
insert into removal_results select is((select count(*)::integer from removed), 1,
  'unattached photo object is removed');

-- Photo removal also remains available after a case has ended.
insert into removal_ids (kind, sighting_id)
select 'closed', public.submit_missing_case_sighting(
  'f9000000-0000-0000-0000-000000000006',
  jsonb_build_object('observedAt', now() - interval '10 minutes', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville', 'locationSource', 'manual',
    'movement', 'hiding', 'condition', 'unsure'), 'remove-photo-three-0003');
update removal_ids set path = 'b9000000-0000-0000-0000-000000000002/' || sighting_id::text || '/sighting.jpg'
  where kind = 'closed';
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into storage.objects (bucket_id, name, owner_id)
select 'sighting-photos', path, 'b9000000-0000-0000-0000-000000000002'
  from removal_ids where kind = 'closed';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.attach_linked_sighting_photo(
  (select sighting_id from removal_ids where kind = 'closed'),
  (select path from removal_ids where kind = 'closed'));
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.reports set status = 'closed', closed_at = now()
  where id = 'f9000000-0000-0000-0000-000000000006';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into removal_results select ok(
  public.can_delete_linked_sighting_photo((select path from removal_ids where kind = 'closed')),
  'contributor may remove photo after case closure');
with removed as (delete from storage.objects
  where bucket_id = 'sighting-photos'
    and name = (select path from removal_ids where kind = 'closed') returning id)
insert into removal_results select is((select count(*)::integer from removed), 1,
  'closed-case photo file is removed');
select public.clear_linked_sighting_photo((select sighting_id from removal_ids where kind = 'closed'));
insert into removal_results select is(
  (select photo_path from public.missing_case_sightings
    where id = (select sighting_id from removal_ids where kind = 'closed')),
  null::text, 'closed-case photo metadata clears');

insert into removal_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 21 tests passed') as result
  from removal_results where result not like 'ok %';
rollback;
