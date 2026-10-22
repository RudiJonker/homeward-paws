begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table readiness_results (result text) on commit drop;
grant select, insert on readiness_results to anon, authenticated, service_role;
create temporary table readiness_valid_payload (payload jsonb) on commit drop;
grant select on readiness_valid_payload to authenticated, service_role;
grant insert on readiness_valid_payload to service_role;

insert into readiness_results select ok(
  not has_function_privilege('anon', 'public.missing_draft_readiness(uuid)', 'EXECUTE'),
  'anonymous cannot call draft readiness'
);
insert into readiness_results select ok(
  has_function_privilege('authenticated', 'public.missing_draft_readiness(uuid)', 'EXECUTE'),
  'authenticated members can call draft readiness'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'readiness-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '82000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'readiness-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'readiness-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true
where id in ('81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
where id = '83000000-0000-0000-0000-000000000003';
insert into public.animals (id, owner_id, name, category)
values
  ('91000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'Ready Dog', 'dog'),
  ('92000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 'Other Cat', 'cat');
insert into public.reports (id, report_type, reporter_id, animal_id, draft_payload)
values
  ('a1000000-0000-0000-0000-000000000001', 'missing', '81000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '{}'::jsonb),
  ('a2000000-0000-0000-0000-000000000002', 'missing', '82000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', '{}'::jsonb);

insert into readiness_valid_payload
select jsonb_build_object(
  'appearance', jsonb_build_object(
    'confirmed', true, 'animal_updated_at', animal.updated_at,
    'photo_ids', '[]'::jsonb, 'selected_photo_ids', '[]'::jsonb,
    'accessories', '', 'notes', ''
  ),
  'last_seen', jsonb_build_object(
    'complete', true, 'last_seen_at', now() - interval '1 day',
    'date', to_char(now() - interval '1 day', 'YYYY-MM-DD'),
    'time', to_char(now() - interval '1 day', 'HH24:MI'),
    'timeAccuracy', 'exact', 'circumstance', 'wandered',
    'travelDirection', 'unknown', 'direction', '', 'explanation', ''
  ),
  'last_seen_location', jsonb_build_object(
    'complete', true, 'method', 'manual', 'province', 'Gauteng',
    'city', 'Johannesburg', 'suburb', 'Melville',
    'streetOrLandmark', '', 'publicPrecision', 'suburb'
  ),
  'safety_contact', jsonb_build_object(
    'complete', true, 'urgencyFlags', '[]'::jsonb,
    'approach', 'unknown', 'contact', jsonb_build_object(
      'inApp', true, 'phone', false, 'whatsapp', false
    )
  )
)
from public.animals animal where animal.id = '91000000-0000-0000-0000-000000000001';

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into readiness_results select throws_ok(
  $$select public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anonymous cannot inspect a private draft'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'appearance,last_seen,last_seen_location,safety_contact',
  'owner sees which blank steps need completion'
);
insert into readiness_results select is(
  (select status from public.reports where id = 'a1000000-0000-0000-0000-000000000001'),
  'draft', 'readiness never publishes the report'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"82000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into readiness_results select throws_ok(
  $$select public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'member B cannot inspect member A draft'
);
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a2000000-0000-0000-0000-000000000002'), ','),
  'appearance,last_seen,last_seen_location,safety_contact',
  'member B can inspect their own private draft'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into readiness_results select throws_ok(
  $$select public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin cannot inspect a member private draft'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  (select payload from readiness_valid_payload), 'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  cardinality(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001')),
  0, 'a complete draft has no readiness issues'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{last_seen_location,publicPrecision}', '"exact"'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'last_seen_location', 'exact public precision is rejected for missing'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set(jsonb_set((select payload from readiness_valid_payload),
    '{last_seen_location,publicPrecision}', '"approximate"'::jsonb),
    '{last_seen_location,streetOrLandmark}', '"12 Main Road"'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'last_seen_location', 'house numbers cannot enter an approximate public label'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{appearance,selected_photo_ids}', '["not-owned"]'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'appearance', 'an unowned photo cannot be selected'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{safety_contact,contact,inApp}', 'false'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'safety_contact', 'at least one contact route is required'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set(jsonb_set((select payload from readiness_valid_payload),
    '{safety_contact,contact,inApp}', 'false'::jsonb),
    '{safety_contact,contact,phone}', 'true'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'safety_contact', 'phone contact requires a profile mobile number'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{last_seen,last_seen_at}',
    to_jsonb(now() + interval '1 day')),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'last_seen', 'future last-seen time is rejected'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{last_seen,travelDirection}', '"known"'::jsonb),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'last_seen', 'known travel direction requires a description'
);

select public.save_missing_draft('91000000-0000-0000-0000-000000000001',
  jsonb_set((select payload from readiness_valid_payload), '{appearance,animal_updated_at}',
    to_jsonb(now() - interval '10 days')),
  'a1000000-0000-0000-0000-000000000001');
insert into readiness_results select is(
  array_to_string(public.missing_draft_readiness('a1000000-0000-0000-0000-000000000001'), ','),
  'appearance', 'stale animal appearance must be reconfirmed'
);

insert into readiness_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 17 tests passed') as result
from readiness_results where result not like 'ok %';
rollback;
