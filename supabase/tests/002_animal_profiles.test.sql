begin;
create extension if not exists pgtap with schema extensions;
select plan(67);
create temporary table animal_test_results (result text) on commit drop;
grant select, insert on animal_test_results to authenticated, service_role;

insert into animal_test_results select has_table('public', 'animals', 'animals table exists');
insert into animal_test_results select has_table('public', 'animal_private_details', 'animal private details table exists');
insert into animal_test_results select has_table('public', 'animal_health_flags', 'animal health flags table exists');
insert into animal_test_results select has_table('public', 'animal_behaviour_flags', 'animal behaviour flags table exists');
insert into animal_test_results select has_table('public', 'animal_photos', 'animal photos table exists');
insert into animal_test_results select ok((select relrowsecurity from pg_class where oid = 'public.animals'::regclass), 'animals RLS is enabled');
insert into animal_test_results select ok((select relrowsecurity from pg_class where oid = 'public.animal_private_details'::regclass), 'animal private details RLS is enabled');
insert into animal_test_results select ok((select relrowsecurity from pg_class where oid = 'public.animal_health_flags'::regclass), 'animal health flags RLS is enabled');
insert into animal_test_results select ok((select relrowsecurity from pg_class where oid = 'public.animal_behaviour_flags'::regclass), 'animal behaviour flags RLS is enabled');
insert into animal_test_results select ok((select relrowsecurity from pg_class where oid = 'public.animal_photos'::regclass), 'animal photos RLS is enabled');
insert into animal_test_results select is((select public from storage.buckets where id = 'animal-photos'), false, 'animal photos bucket is private');
insert into animal_test_results select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'animal_photo_object_insert_own'), 'animal photo owner upload policy exists');
insert into animal_test_results select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'animal_photo_object_select_own'), 'animal photo owner read-back policy exists');
insert into animal_test_results select ok(not has_table_privilege('anon', 'public.animals', 'SELECT'), 'anonymous cannot query source animal profiles');
insert into animal_test_results select ok(has_table_privilege('authenticated', 'public.animals', 'SELECT'), 'authenticated role has explicit animals Data API access');
insert into animal_test_results select ok(not has_column_privilege('authenticated', 'public.animals', 'status', 'UPDATE'), 'authenticated cannot update controlled animal status column');
insert into animal_test_results select ok(has_table_privilege('service_role', 'public.animals', 'SELECT, INSERT, UPDATE, DELETE'), 'service role has explicit animals access');
insert into animal_test_results select ok(
  (select count(*) from pg_constraint where conrelid = 'public.animals'::regclass
    and conname in ('animals_primary_colour_codes', 'animals_secondary_colour_codes')) = 2,
  'animal colour code constraints exist'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '31000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'animal-a@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '32000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'animal-b@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'animal-admin@example.test', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"age_confirmed":true,"terms_version":"1.0","privacy_version":"1.0"}', now(), now(), '', '', '', '');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.animals (id, owner_id, name, category)
values ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Member A Dog', 'dog');
insert into public.animal_private_details (animal_id, microchip_number)
values ('41000000-0000-0000-0000-000000000001', 'PRIVATE-A');

insert into animal_test_results select is((select count(*) from public.animals), 1::bigint, 'member A reads own animal');
insert into animal_test_results select is((select microchip_number from public.animal_private_details), 'PRIVATE-A', 'member A reads own private identifier');
insert into animal_test_results select lives_ok(
  $$select public.create_animal_profile('{"name":"Created by RPC","category":"cat","relationship":"my_animal","primary_colours":["black"],"microchipped":true,"microchip_number":"RPC-PRIVATE","health_flags":[{"flag_type":"medication","description":"Daily medicine","public_during_incident":true}],"behaviour_flags":[{"flag_type":"friendly","description":"Calm","public_during_incident":true}]}'::jsonb)$$,
  'member can create a complete animal profile through the protected function'
);
insert into animal_test_results select is((select count(*) from public.animals where name = 'Created by RPC'), 1::bigint, 'create function records the animal');
insert into animal_test_results select is((select count(*) from public.animal_private_details where microchip_number = 'RPC-PRIVATE'), 1::bigint, 'create function records private details');
insert into animal_test_results select is((select count(*) from public.animal_health_flags where description = 'Daily medicine'), 1::bigint, 'create function records a structured health need');
insert into animal_test_results select throws_ok(
  $$select public.create_animal_profile('{"name":"Invalid colour","category":"cat","primary_colours":["striped"]}'::jsonb)$$,
  '23514', null, 'unknown free-text colour codes are rejected'
);
insert into animal_test_results select is(public.can_store_animal_photo('31000000-0000-0000-0000-000000000001/41000000-0000-0000-0000-000000000001/0-test.jpg'), true, 'member A may upload to own animal folder');
insert into animal_test_results select is(public.can_store_animal_photo('32000000-0000-0000-0000-000000000002/41000000-0000-0000-0000-000000000001/0-test.jpg'), false, 'member A cannot upload to another member folder');
insert into animal_test_results select is(public.can_store_animal_photo('31000000-0000-0000-0000-000000000001/not-an-animal/0-test.jpg'), false, 'malformed animal folder is denied');
insert into animal_test_results select lives_ok(
  $$insert into public.animal_photos (animal_id, storage_path, display_order, photo_type) values ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001/41000000-0000-0000-0000-000000000001/0-test.jpg', 0, 'face')$$,
  'member can link a photo to own animal'
);
insert into animal_test_results select lives_ok(
  $$select public.update_animal_profile('41000000-0000-0000-0000-000000000001', '{"name":"Edited Member A Dog","category":"dog","status":"missing","owner_id":"32000000-0000-0000-0000-000000000002","microchipped":true,"microchip_number":"EDITED-PRIVATE","ownership_notes":"Private owner note","health_flags":[{"flag_type":"allergy","description":"Bee sting allergy","public_during_incident":false}],"behaviour_flags":[{"flag_type":"friendly","description":"Calm"}]}'::jsonb)$$,
  'owner can edit animal and private details in one transaction'
);
insert into animal_test_results select is((select name from public.animals where id = '41000000-0000-0000-0000-000000000001'), 'Edited Member A Dog', 'edit changes animal name');
insert into animal_test_results select is((select microchip_number from public.animal_private_details where animal_id = '41000000-0000-0000-0000-000000000001'), 'EDITED-PRIVATE', 'edit changes private identifier');
insert into animal_test_results select is((select ownership_notes from public.animal_private_details where animal_id = '41000000-0000-0000-0000-000000000001'), 'Private owner note', 'edit changes private ownership notes');
insert into animal_test_results select is((select count(*) from public.animal_behaviour_flags where animal_id = '41000000-0000-0000-0000-000000000001'), 1::bigint, 'edit replaces behaviour flags');
insert into animal_test_results select is((select count(*) from public.animal_health_flags where animal_id = '41000000-0000-0000-0000-000000000001' and description = 'Bee sting allergy'), 1::bigint, 'edit records a structured health need');
insert into animal_test_results select is((select public_during_incident from public.animal_health_flags where animal_id = '41000000-0000-0000-0000-000000000001'), false, 'health need remains private by default');
insert into animal_test_results select is((select status::text from public.animals where id = '41000000-0000-0000-0000-000000000001'), 'safe', 'edit cannot change controlled status');
insert into animal_test_results select is((select owner_id from public.animals where id = '41000000-0000-0000-0000-000000000001'), '31000000-0000-0000-0000-000000000001'::uuid, 'edit cannot transfer ownership');
insert into animal_test_results select lives_ok(
  $$select public.update_animal_profile('41000000-0000-0000-0000-000000000001', '{"name":"Edited Member A Dog","category":"dog","health_flags":[]}'::jsonb)$$,
  'owner can clear a saved health need'
);
insert into animal_test_results select is((select count(*) from public.animal_health_flags where animal_id = '41000000-0000-0000-0000-000000000001'), 0::bigint, 'cleared health need is removed');
insert into public.animal_photos (animal_id, storage_path, display_order, photo_type)
values ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001/41000000-0000-0000-0000-000000000001/1-test.jpg', 1, 'full_body');
insert into animal_test_results select lives_ok(
  $$select public.reorder_animal_photos('41000000-0000-0000-0000-000000000001',
    (select array_agg(id order by display_order desc) from public.animal_photos
     where animal_id = '41000000-0000-0000-0000-000000000001'))$$,
  'owner can reorder own photos'
);
insert into animal_test_results select is((select display_order from public.animal_photos where storage_path like '%/0-test.jpg'), 1::smallint, 'photo order is recorded');
insert into animal_test_results select throws_ok(
  $$insert into public.animals (owner_id, name, category) values ('32000000-0000-0000-0000-000000000002', 'Not Mine', 'cat')$$,
  '42501', null, 'member A cannot create an animal for member B'
);
insert into animal_test_results select throws_ok(
  $$update public.animals set status = 'missing' where id = '41000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'member cannot directly change controlled animal status'
);
insert into animal_test_results select lives_ok(
  $$select public.set_animal_archived('41000000-0000-0000-0000-000000000001', true)$$,
  'owner can archive a safe animal'
);
insert into animal_test_results select is((select status::text from public.animals where id = '41000000-0000-0000-0000-000000000001'), 'archived', 'archive status is recorded');
insert into animal_test_results select lives_ok(
  $$select public.set_animal_archived('41000000-0000-0000-0000-000000000001', false)$$,
  'owner can restore an archived animal'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"32000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.animals (id, owner_id, name, category)
values ('42000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 'Member B Cat', 'cat');
insert into animal_test_results select is((select count(*) from public.animals where id = '41000000-0000-0000-0000-000000000001'), 0::bigint, 'member B cannot read member A animal');
insert into animal_test_results select is((select count(*) from public.animal_private_details where animal_id = '41000000-0000-0000-0000-000000000001'), 0::bigint, 'member B cannot read member A private animal details');
insert into animal_test_results select is((select count(*) from public.animal_health_flags where description = 'Daily medicine'), 0::bigint, 'member B cannot read member A health needs');
insert into animal_test_results select is((select count(*) from public.animal_photos where animal_id = '41000000-0000-0000-0000-000000000001'), 0::bigint, 'member B cannot read member A animal photos');
insert into animal_test_results select is(public.can_store_animal_photo('32000000-0000-0000-0000-000000000002/41000000-0000-0000-0000-000000000001/1-test.jpg'), false, 'member B cannot upload to member A animal');
insert into animal_test_results select throws_ok(
  $$insert into public.animal_photos (animal_id, storage_path, display_order) values ('41000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002/41000000-0000-0000-0000-000000000001/2-test.jpg', 2)$$,
  '42501', null, 'member B cannot link a photo to member A animal'
);
insert into animal_test_results select throws_ok(
  $$select public.update_animal_profile('41000000-0000-0000-0000-000000000001', '{"name":"Stolen","category":"dog"}'::jsonb)$$,
  '42501', null, 'member B cannot edit member A animal'
);
insert into animal_test_results select throws_ok(
  $$select public.reorder_animal_photos('41000000-0000-0000-0000-000000000001', array[]::uuid[])$$,
  '42501', null, 'member B cannot reorder member A photos'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set role = 'admin' where id = '33000000-0000-0000-0000-000000000003';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into animal_test_results select is(
  (select count(*) from public.animals
   where owner_id in (
     '31000000-0000-0000-0000-000000000001'::uuid,
     '32000000-0000-0000-0000-000000000002'::uuid
   )),
  3::bigint,
  'active admin can read both members test animal profiles'
);

reset role;
insert into animal_test_results select ok(
  not has_function_privilege('anon', 'public.delete_animal_profile(uuid)', 'EXECUTE'),
  'anonymous cannot call animal profile deletion'
);
insert into animal_test_results select ok(
  not has_table_privilege('authenticated', 'public.animals', 'DELETE'),
  'members cannot bypass protected animal deletion with direct table DELETE'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"32000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into animal_test_results select throws_ok(
  $$select public.delete_animal_profile('41000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'member B cannot delete member A animal'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into animal_test_results select lives_ok(
  $$select public.delete_animal_profile('41000000-0000-0000-0000-000000000001')$$,
  'owner can delete a safe animal profile'
);
insert into animal_test_results select is(
  (select count(*) from public.animals where id = '41000000-0000-0000-0000-000000000001'),
  0::bigint, 'deleted animal profile is gone'
);
insert into animal_test_results select is(
  (select count(*) from public.animal_private_details where animal_id = '41000000-0000-0000-0000-000000000001'),
  0::bigint, 'deletion cascades to private details'
);
insert into animal_test_results select is(
  (select count(*) from public.animal_photos where animal_id = '41000000-0000-0000-0000-000000000001'),
  0::bigint, 'deletion cascades to photo metadata'
);

insert into public.animals (id, owner_id, name, category)
values ('43000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'Archived Animal', 'dog');
select public.set_animal_archived('43000000-0000-0000-0000-000000000003', true);
insert into animal_test_results select lives_ok(
  $$select public.delete_animal_profile('43000000-0000-0000-0000-000000000003')$$,
  'owner can delete an archived animal profile'
);
insert into animal_test_results select is(
  (select count(*) from public.animals where id = '43000000-0000-0000-0000-000000000003'),
  0::bigint, 'archived animal profile is gone'
);

insert into public.animals (id, owner_id, name, category)
values ('44000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', 'Active Case Animal', 'dog');
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.animals set status = 'missing' where id = '44000000-0000-0000-0000-000000000004';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into animal_test_results select throws_ok(
  $$select public.delete_animal_profile('44000000-0000-0000-0000-000000000004')$$,
  '23514', null, 'owner cannot delete an animal with an active case'
);
insert into animal_test_results select is(
  (select count(*) from public.animals where id = '44000000-0000-0000-0000-000000000004'),
  1::bigint, 'active case animal is preserved after denied deletion'
);

insert into animal_test_results select * from finish();
select coalesce(string_agg(result, E'\n\n'), 'ok - all 67 tests passed') as result
from animal_test_results where result not like 'ok %';
rollback;
