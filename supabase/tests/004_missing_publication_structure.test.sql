begin;
create extension if not exists pgtap with schema extensions;
select plan(58);

create temporary table publication_structure_results (result text) on commit drop;
grant select, insert on publication_structure_results to anon, authenticated, service_role;

insert into publication_structure_results
select has_table('public', table_name, table_name || ' exists')
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(
  (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass),
  table_name || ' has RLS enabled'
)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(not has_table_privilege('anon', 'public.' || table_name, 'SELECT'),
  'anonymous has no direct read grant on ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(not has_table_privilege('authenticated', 'public.' || table_name, 'SELECT'),
  'members have no direct read grant on ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(
  not has_table_privilege('anon', 'public.' || table_name, 'INSERT')
    and not has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
    and not has_table_privilege('anon', 'public.' || table_name, 'DELETE'),
  'anonymous cannot write ' || table_name
)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(
  not has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')
    and not has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')
    and not has_table_privilege('authenticated', 'public.' || table_name, 'DELETE'),
  'members cannot write ' || table_name
)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results
select ok(
  has_table_privilege('service_role', 'public.' || table_name, 'SELECT')
    and has_table_privilege('service_role', 'public.' || table_name, 'INSERT')
    and has_table_privilege('service_role', 'public.' || table_name, 'UPDATE')
    and has_table_privilege('service_role', 'public.' || table_name, 'DELETE'),
  'service role has explicit access to ' || table_name
)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results select ok(
  exists (select 1 from storage.buckets where id = 'report-photos' and public = false),
  'report photo bucket is private'
);
insert into publication_structure_results select ok(
  not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'publish_missing_report'),
  'publishing is not callable yet'
);
insert into publication_structure_results select ok(
  not has_table_privilege('anon', 'public.reports', 'SELECT'),
  'report source rows are still private'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'publication-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '72000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'publication-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '73000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'publication-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true
where id in ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
where id = '73000000-0000-0000-0000-000000000003';

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into publication_structure_results
select throws_ok('select count(*) from public.' || table_name, '42501', null,
  'anonymous cannot read ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into publication_structure_results
select throws_ok('select count(*) from public.' || table_name, '42501', null,
  'member A cannot read ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"72000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into publication_structure_results
select throws_ok('select count(*) from public.' || table_name, '42501', null,
  'member B cannot read ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"73000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into publication_structure_results
select throws_ok('select count(*) from public.' || table_name, '42501', null,
  'admin cannot read locked staging ' || table_name)
from (values
  ('missing_report_details'), ('report_animal_snapshots'), ('report_photos'),
  ('report_locations'), ('case_events')
) as tables(table_name);

insert into publication_structure_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 58 tests passed') as result
from publication_structure_results where result not like 'ok %';
rollback;
