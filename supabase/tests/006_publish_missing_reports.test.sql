begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

create temporary table publish_results (result text) on commit drop;
grant select, insert on publish_results to anon, authenticated, service_role;
create temporary table publish_payload (payload jsonb) on commit drop;
grant select on publish_payload to authenticated, service_role;
grant insert on publish_payload to service_role;

insert into publish_results select ok(
  not has_function_privilege('anon', 'public.publish_missing_report(uuid)', 'EXECUTE'),
  'anonymous cannot publish');
insert into publish_results select ok(
  has_function_privilege('authenticated', 'public.publish_missing_report(uuid)', 'EXECUTE'),
  'authenticated member can call protected publication');
insert into publish_results select ok(
  has_function_privilege('anon', 'public.get_public_missing_reports(integer,integer,uuid,text)', 'EXECUTE'),
  'anonymous can use the safe public projection');
insert into publish_results select ok(
  not has_table_privilege('anon', 'public.report_locations', 'SELECT'),
  'anonymous cannot read private location rows');
insert into publish_results select ok(
  not has_table_privilege('authenticated', 'public.report_locations', 'SELECT'),
  'members cannot read private location rows directly');
insert into publish_results select ok(
  not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_attribute a on a.attrelid = p.prorettype and a.attnum > 0
    where n.nspname = 'public' and p.proname = 'get_public_missing_reports'
      and a.attname in ('private_latitude', 'private_longitude', 'accuracy_m', 'draft_payload')),
  'public projection does not declare private columns');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'publish-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'publish-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'publish-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true where id in
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
  where id = 'c1000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category, breed)
values ('d1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'Nala', 'dog', 'Pekingese mix');
insert into public.animal_private_details (animal_id, microchip_number, ownership_notes)
values ('d1000000-0000-0000-0000-000000000001', 'SECRET-CHIP', 'Private proof');
insert into public.reports (id, report_type, reporter_id, animal_id)
values ('e1000000-0000-0000-0000-000000000001', 'missing',
  'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001');
insert into publish_payload
select jsonb_build_object(
  'appearance', jsonb_build_object('confirmed', true, 'animal_updated_at', a.updated_at,
    'photo_ids', '[]'::jsonb, 'selected_photo_ids', '[]'::jsonb,
    'accessories', 'Blue collar', 'notes', ''),
  'last_seen', jsonb_build_object('complete', true,
    'last_seen_at', now() - interval '1 day',
    'date', to_char(now() - interval '1 day', 'YYYY-MM-DD'),
    'time', to_char(now() - interval '1 day', 'HH24:MI'),
    'timeAccuracy', 'approximate', 'circumstance', 'wandered',
    'travelDirection', 'unknown', 'direction', '', 'explanation', ''),
  'last_seen_location', jsonb_build_object('complete', true,
    'method', 'device', 'province', 'Gauteng', 'city', 'Johannesburg',
    'suburb', 'Melville', 'publicPrecision', 'suburb',
    'streetOrLandmark', '', 'latitude', -26.175123, 'longitude', 28.001234,
    'accuracyMetres', 12),
  'safety_contact', jsonb_build_object('complete', true,
    'urgencyFlags', '[]'::jsonb, 'approach', 'slowly',
    'biteScratchKickRisk', false,
    'contact', jsonb_build_object('inApp', true, 'phone', false, 'whatsapp', false))
)
from public.animals a where a.id = 'd1000000-0000-0000-0000-000000000001';

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anonymous cannot publish a draft');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports()), 0,
  'private draft is absent from public projection');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'member B cannot publish member A draft');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin cannot publish member A draft');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e1000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'incomplete draft cannot publish');
select public.save_missing_draft('d1000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from publish_payload),
    '{last_seen_location,publicPrecision}', '"exact"'::jsonb),
  'e1000000-0000-0000-0000-000000000001');
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e1000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'exact public location cannot publish');
select public.save_missing_draft('d1000000-0000-0000-0000-000000000001',
  (select payload from publish_payload),
  'e1000000-0000-0000-0000-000000000001');
insert into publish_results select ok(
  public.publish_missing_report('e1000000-0000-0000-0000-000000000001') like 'HP-M-%',
  'valid draft receives a public reference');
insert into publish_results select is(
  public.publish_missing_report('e1000000-0000-0000-0000-000000000001'),
  (select public_reference from public.reports where id = 'e1000000-0000-0000-0000-000000000001'),
  'repeated publish is idempotent');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into publish_results select is(
  (select status::text from public.animals where id = 'd1000000-0000-0000-0000-000000000001'),
  'missing', 'animal becomes missing');
insert into publish_results select is(
  (select count(*)::integer from public.case_events
    where report_id = 'e1000000-0000-0000-0000-000000000001'),
  1, 'repeated publish creates one timeline event');
insert into publish_results select is(
  (select private_latitude from public.report_locations
    where report_id = 'e1000000-0000-0000-0000-000000000001'),
  -26.175123::numeric, 'exact device latitude is retained only privately');
insert into publish_results select ok(
  not exists (select 1 from public.report_animal_snapshots
    where report_id = 'e1000000-0000-0000-0000-000000000001'
      and (name like '%SECRET%' or current_appearance like '%SECRET%')),
  'private identifier was not copied into public snapshot');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into publish_results select ok(
  not public.can_stage_missing_report_photo(
    'b1000000-0000-0000-0000-000000000002/e1000000-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001.jpg'),
  'member A cannot stage another user path');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports()), 1,
  'anonymous sees active missing report');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports(
    target_report_id => 'e1000000-0000-0000-0000-000000000001')), 1,
  'anonymous can open a public report by id');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports(
    search_reference => (select lower(public_reference) from public.get_public_missing_reports()
      where report_id = 'e1000000-0000-0000-0000-000000000001'))), 1,
  'reference search ignores letter case');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports(
    search_reference => 'HP-M-NOTFOUND')), 0,
  'unknown reference returns no public report');
insert into publish_results select is(
  (select public_location from public.get_public_missing_reports()),
  'Melville, Johannesburg, Gauteng', 'public report shows suburb-level location');
insert into publish_results select is(
  (select phone from public.get_public_missing_reports()),
  null::text, 'unapproved phone remains private');
insert into publish_results select is(
  (select whatsapp from public.get_public_missing_reports()),
  null::text, 'unapproved WhatsApp remains private');
insert into publish_results select throws_ok(
  $$select private_latitude from public.get_public_missing_reports()$$,
  '42703', null, 'public projection has no exact latitude column');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.delete_member_data('a1000000-0000-0000-0000-000000000001');
insert into publish_results select is(
  (select status from public.reports where id = 'e1000000-0000-0000-0000-000000000001'),
  'closed', 'account deletion closes published report');
insert into publish_results select is(
  (select private_latitude from public.report_locations
    where report_id = 'e1000000-0000-0000-0000-000000000001'),
  null::numeric, 'account deletion removes private exact location');
insert into publish_results select is(
  (select name from public.report_animal_snapshots
    where report_id = 'e1000000-0000-0000-0000-000000000001'),
  'Animal', 'account deletion anonymises the animal snapshot');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports()), 0,
  'deleted member report disappears from public browse');

-- A selected profile image must have a separate staged report copy before
-- publication. The copy becomes readable only while the report is active.
insert into public.animals (id, owner_id, name, category)
values ('d2000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002', 'Moose', 'cat');
insert into storage.objects (bucket_id, name, owner_id)
values ('animal-photos',
  'b1000000-0000-0000-0000-000000000002/d2000000-0000-0000-0000-000000000002/source.jpg',
  'b1000000-0000-0000-0000-000000000002');
insert into public.animal_photos (id, animal_id, storage_path, display_order, visibility)
values ('f2000000-0000-0000-0000-000000000002',
  'd2000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002/d2000000-0000-0000-0000-000000000002/source.jpg',
  0, 'report_eligible');
insert into public.reports (id, report_type, reporter_id, animal_id)
values ('e2000000-0000-0000-0000-000000000002', 'missing',
  'b1000000-0000-0000-0000-000000000002',
  'd2000000-0000-0000-0000-000000000002');
insert into publish_results select throws_ok(
  $$insert into public.report_locations
    (report_id, location_type, province, city, suburb, source, public_precision, public_label)
    values ('e2000000-0000-0000-0000-000000000002', 'last_seen',
      'Gauteng', 'Johannesburg', 'Melville', 'manual', 'exact', 'Exact pin')$$,
  '23514', null, 'table constraint rejects exact public precision');
insert into publish_results select throws_ok(
  $$insert into public.report_locations
    (report_id, location_type, province, city, suburb, street_or_landmark,
      source, public_precision, public_label)
    values ('e2000000-0000-0000-0000-000000000002', 'last_seen',
      'Gauteng', 'Johannesburg', 'Melville', '12 Main Road',
      'manual', 'approximate', '12 Main Road')$$,
  '23514', null, 'table constraint rejects numbered public street');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.save_missing_draft('d2000000-0000-0000-0000-000000000002',
  jsonb_set(jsonb_set(jsonb_set((select payload from publish_payload),
    '{appearance,animal_updated_at}',
    (select to_jsonb(updated_at) from public.animals where id = 'd2000000-0000-0000-0000-000000000002')),
    '{appearance,photo_ids}', '["f2000000-0000-0000-0000-000000000002"]'::jsonb),
    '{appearance,selected_photo_ids}', '["f2000000-0000-0000-0000-000000000002"]'::jsonb),
  'e2000000-0000-0000-0000-000000000002');
insert into publish_results select ok(
  public.can_stage_missing_report_photo(
    'b1000000-0000-0000-0000-000000000002/e2000000-0000-0000-0000-000000000002/f2000000-0000-0000-0000-000000000002-source.jpg'),
  'owner may stage an explicitly selected photo copy');
insert into publish_results select ok(
  not public.can_stage_missing_report_photo(
    'b1000000-0000-0000-0000-000000000002/e2000000-0000-0000-0000-000000000002/f2000000-0000-0000-0000-000000000002-old.jpg'),
  'stale source filename cannot be staged as the current photo');
insert into publish_results select ok(
  not public.can_read_public_report_photo(
    'b1000000-0000-0000-0000-000000000002/e2000000-0000-0000-0000-000000000002/f2000000-0000-0000-0000-000000000002-source.jpg'),
  'staged photo is not public');
insert into publish_results select throws_ok(
  $$select public.publish_missing_report('e2000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'publication requires the selected photo copy');
insert into storage.objects (bucket_id, name, owner_id)
values ('report-photos',
  'b1000000-0000-0000-0000-000000000002/e2000000-0000-0000-0000-000000000002/f2000000-0000-0000-0000-000000000002-source.jpg',
  'b1000000-0000-0000-0000-000000000002');
insert into publish_results select ok(
  public.publish_missing_report('e2000000-0000-0000-0000-000000000002') like 'HP-M-%',
  'selected photo report publishes after copy is staged');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into publish_results select is(
  (select array_length(photo_paths, 1) from public.get_public_missing_reports()
    where report_id = 'e2000000-0000-0000-0000-000000000002'),
  1, 'public projection returns one independent report photo path');
insert into publish_results select ok(
  public.can_read_public_report_photo(
    'b1000000-0000-0000-0000-000000000002/e2000000-0000-0000-0000-000000000002/f2000000-0000-0000-0000-000000000002-source.jpg'),
  'published report photo is publicly readable');
insert into publish_results select is(
  (select count(*)::integer from storage.objects where bucket_id = 'animal-photos'
    and name like 'b1000000-0000-0000-0000-000000000002/%'),
  0, 'original animal photo remains private to its owner');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into publish_results select throws_ok(
  $$select public.delete_member_data('b1000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'account deletion refuses to leave report photo files behind');
-- Test-only simulation of successful Storage API removal, rolled back below.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'report-photos'
  and name like 'b1000000-0000-0000-0000-000000000002/%';
select public.delete_member_data('b1000000-0000-0000-0000-000000000002');
insert into publish_results select is(
  (select count(*)::integer from public.report_photos
    where report_id = 'e2000000-0000-0000-0000-000000000002'),
  0, 'account deletion removes report photo metadata');
insert into publish_results select is(
  (select count(*)::integer from public.missing_report_details
    where report_id = 'e2000000-0000-0000-0000-000000000002'),
  0, 'account deletion removes incident free text and contact choices');
insert into publish_results select is(
  (select count(*)::integer from public.get_public_missing_reports()),
  0, 'deleted member photo report is no longer public');

insert into publish_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 45 tests passed') as result
from publish_results where result not like 'ok %';
rollback;
