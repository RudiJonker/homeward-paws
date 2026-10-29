begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table website_results (result text) on commit drop;
grant select, insert on website_results to anon, authenticated, service_role;

insert into website_results select ok(
  has_function_privilege('anon',
    'public.get_website_missing_reports(integer,integer,text,text,text,text,text)', 'EXECUTE'),
  'anonymous website visitors can call the narrow projection');
insert into website_results select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous visitors cannot directly read profiles');
insert into website_results select ok(
  not has_table_privilege('anon', 'public.profile_private', 'SELECT'),
  'anonymous visitors cannot directly read private profiles');
insert into website_results select ok(
  not has_table_privilege('anon', 'public.report_locations', 'SELECT'),
  'anonymous visitors cannot directly read report locations');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0260000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'web-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0260000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'web-member@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0260000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'web-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set display_name = 'Private Owner'
  where id = 'a0260000-0000-0000-0000-000000000001';
update public.profiles set role = 'admin'
  where id = 'a0260000-0000-0000-0000-000000000003';
update public.profile_private set mobile_e164 = '+27821234567', whatsapp_enabled = true
  where user_id = 'a0260000-0000-0000-0000-000000000001';
insert into public.animals (id, owner_id, name, category, status)
values ('b0260000-0000-0000-0000-000000000001',
  'a0260000-0000-0000-0000-000000000001', 'Nala', 'dog', 'missing');
insert into public.reports
  (id, report_type, status, reporter_id, animal_id, public_reference, published_at, activity_at)
values ('c0260000-0000-0000-0000-000000000001', 'missing', 'active',
  'a0260000-0000-0000-0000-000000000001',
  'b0260000-0000-0000-0000-000000000001', 'HP-M-WEBTEST', now(), now());
insert into public.report_animal_snapshots (report_id, name, category, breed)
values ('c0260000-0000-0000-0000-000000000001', 'Nala', 'dog', 'Mixed');
insert into public.missing_report_details
  (report_id, last_seen_at, time_accuracy, circumstance, approach_code,
   contact_phone, contact_whatsapp)
values ('c0260000-0000-0000-0000-000000000001', now(), 'approximate',
  'wandered', 'slowly', true, true);
insert into public.report_locations
  (report_id, location_type, province, city, suburb, source, public_precision,
   public_label, private_latitude, private_longitude)
values ('c0260000-0000-0000-0000-000000000001', 'last_seen', 'Gauteng',
  'Johannesburg', 'Melville', 'device', 'suburb',
  'Melville, Johannesburg, Gauteng', -26.175123, 28.001234);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into website_results select is(
  (select phone from public.get_public_missing_reports()), '+27821234567',
  'app projection contains an explicitly opted-in phone');
insert into website_results select is(
  (select count(*) from public.get_website_missing_reports()), 1::bigint,
  'website projection returns the active missing alert');
insert into website_results select is(
  (select public_reference from public.get_website_missing_reports(
    search_reference => 'hp-m-webtest')), 'HP-M-WEBTEST',
  'reference search returns the active alert');
insert into website_results select is(
  (select count(*) from public.get_website_missing_reports(
    filter_province => 'Western Cape')), 0::bigint,
  'website area filter excludes a different province');
insert into website_results select is(
  (select count(*) from public.get_website_missing_reports(
    filter_category => 'dog')), 1::bigint,
  'website animal-type filter returns a matching alert');
insert into website_results select is(
  (select public_location from public.get_website_missing_reports()),
  'Melville, Johannesburg, Gauteng',
  'website location stays at suburb level');
insert into website_results select is(
  (select array_agg(key order by key) from jsonb_object_keys(
    (select to_jsonb(w) from public.get_website_missing_reports() as w limit 1)) as key),
  array[
    'accessories', 'animal_name', 'approach_code', 'approach_note',
    'bite_scratch_kick_risk', 'breed', 'category', 'circumstance',
    'current_appearance', 'distinctive_features', 'explanation',
    'last_seen_at', 'photo_paths', 'public_location', 'public_reference',
    'public_timeline', 'published_at', 'time_accuracy', 'travelled_towards',
    'urgency_flags', 'urgency_note'
  ]::text[],
  'website response has exactly the 21 allowed fields');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0260000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into website_results select is(
  (select count(*) from public.get_website_missing_reports()), 1::bigint,
  'other member receives the same website projection');
select set_config('request.jwt.claims', '{"sub":"a0260000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into website_results select is(
  (select count(*) from public.get_website_missing_reports()), 1::bigint,
  'admin receives the same website projection');

insert into website_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 13 tests passed') as result
  from website_results where result not like 'ok %';
rollback;
