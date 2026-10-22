begin;
create extension if not exists pgtap with schema extensions;
select plan(26);
create temporary table missing_test_results (result text) on commit drop;
grant select, insert on missing_test_results to authenticated, service_role;

insert into missing_test_results select has_table('public', 'reports', 'reports table exists');
insert into missing_test_results select ok(
  (select relrowsecurity from pg_class where oid = 'public.reports'::regclass),
  'reports RLS is enabled'
);
insert into missing_test_results select ok(
  not has_table_privilege('anon', 'public.reports', 'SELECT'),
  'anonymous cannot read private draft source rows'
);
insert into missing_test_results select ok(
  has_table_privilege('authenticated', 'public.reports', 'SELECT'),
  'member role has explicit draft read access'
);
insert into missing_test_results select ok(
  not has_table_privilege('authenticated', 'public.reports', 'INSERT, UPDATE, DELETE'),
  'member cannot write report status or draft rows directly'
);
insert into missing_test_results select ok(
  not has_function_privilege('anon', 'public.save_missing_draft(uuid,jsonb,uuid)', 'EXECUTE'),
  'anonymous cannot save a missing draft'
);
insert into missing_test_results select ok(
  has_function_privilege('authenticated', 'public.save_missing_draft(uuid,jsonb,uuid)', 'EXECUTE'),
  'member can call the protected draft function'
);
insert into missing_test_results select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'reports_one_active_missing_per_animal'),
  'one-active-missing-report index exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'missing-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'missing-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '53000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'missing-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set profile_completed = true
where id in ('51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000002');
update public.profiles set role = 'admin', profile_completed = true
where id = '53000000-0000-0000-0000-000000000003';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.animals (id, owner_id, name, category)
values ('61000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Missing A Dog', 'dog');
insert into missing_test_results select lives_ok(
  $$select public.save_missing_draft('61000000-0000-0000-0000-000000000001', '{"step":1}'::jsonb)$$,
  'member A can start a private missing draft'
);
insert into missing_test_results select is(
  (select count(*) from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'),
  1::bigint, 'first save creates one draft'
);
insert into missing_test_results select lives_ok(
  $$select public.save_missing_draft('61000000-0000-0000-0000-000000000001', '{"step":2}'::jsonb)$$,
  'saving again resumes the same animal draft'
);
insert into missing_test_results select is(
  (select count(*) from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'),
  1::bigint, 'repeated save does not duplicate the draft'
);
insert into missing_test_results select is(
  (select draft_payload->>'step' from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'),
  '2', 'draft contents can be recovered'
);
insert into missing_test_results select throws_ok(
  $$select public.save_missing_draft('61000000-0000-0000-0000-000000000001', '[]'::jsonb)$$,
  '22023', null, 'non-object draft payload is rejected'
);
insert into missing_test_results select throws_ok(
  $$insert into public.reports (report_type, reporter_id, animal_id) values ('missing', '51000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'member cannot bypass the draft function with direct insert'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.animals (id, owner_id, name, category)
values ('62000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'Missing B Cat', 'cat');
insert into missing_test_results select is(
  (select count(*) from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'),
  0::bigint, 'member B cannot read member A draft'
);
insert into missing_test_results select throws_ok(
  $$select public.save_missing_draft('61000000-0000-0000-0000-000000000001', '{"stolen":true}'::jsonb)$$,
  '42501', null, 'member B cannot change member A draft'
);
insert into missing_test_results select throws_ok(
  $$select public.delete_missing_draft((select id from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'member B cannot delete member A draft'
);
insert into missing_test_results select lives_ok(
  $$select public.save_missing_draft('62000000-0000-0000-0000-000000000002', '{"step":1}'::jsonb)$$,
  'member B can save a separate own draft'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"53000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into missing_test_results select is(
  (select count(*) from public.reports where status = 'draft'),
  0::bigint, 'admin cannot read another member private draft'
);
insert into missing_test_results select throws_ok(
  $$select public.save_missing_draft('61000000-0000-0000-0000-000000000001', '{"admin":true}'::jsonb)$$,
  '42501', null, 'admin cannot impersonate an animal owner in draft RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.animals (id, owner_id, name, category)
values ('63000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', 'Archived A Dog', 'dog');
select public.set_animal_archived('63000000-0000-0000-0000-000000000003', true);
insert into missing_test_results select throws_ok(
  $$select public.save_missing_draft('63000000-0000-0000-0000-000000000003', '{}'::jsonb)$$,
  '23514', null, 'archived animal cannot start a missing draft'
);
insert into missing_test_results select lives_ok(
  $$select public.delete_animal_profile('61000000-0000-0000-0000-000000000001')$$,
  'owner can delete a safe animal with an unfinished draft'
);
insert into missing_test_results select is(
  (select count(*) from public.reports where animal_id = '61000000-0000-0000-0000-000000000001'),
  0::bigint, 'deleting an animal also removes its unfinished draft'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into missing_test_results select lives_ok(
  $$select public.delete_member_data('52000000-0000-0000-0000-000000000002')$$,
  'account deletion still succeeds with a missing draft'
);
insert into missing_test_results select is(
  (select count(*) from public.reports where reporter_id = '52000000-0000-0000-0000-000000000002'),
  0::bigint, 'account deletion removes unfinished drafts'
);

insert into missing_test_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 26 tests passed') as result
from missing_test_results where result not like 'ok %';
rollback;
