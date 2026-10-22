-- Read-only schema reconciliation aid. Run in the Supabase SQL Editor.
-- Compares metadata only; it never reads member records or changes the database.
with app_tables(name) as (
  select unnest(array[
    'profiles','profile_private','animals','animal_private_details',
    'animal_health_flags','animal_behaviour_flags','animal_photos',
    'reports','missing_report_details','report_animal_snapshots',
    'report_photos','report_locations','case_events'
  ])
),
app_functions(name) as (
  select unnest(array[
    'set_updated_at','is_admin','is_active_member',
    'guard_profile_security_fields','handle_new_user',
    'complete_member_profile','get_public_profiles',
    'delete_member_data','create_animal_profile','can_store_animal_photo',
    'update_animal_profile','reorder_animal_photos','delete_animal_profile',
    'save_missing_draft','delete_missing_draft','missing_draft_readiness',
    'owns_animal','set_animal_archived'
  ])
),
objects as (
  select 'tables' as kind, c.relname::text as name,
    jsonb_build_object(
      'rls', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity,
      'columns', (
        select jsonb_agg(jsonb_build_object(
          'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
          'not_null', a.attnotnull,
          'default', pg_get_expr(d.adbin, d.adrelid)
        ) order by a.attnum)
        from pg_attribute a
        left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      ),
      'constraints', (
        select coalesce(jsonb_agg(
          con.conname || ':' || pg_get_constraintdef(con.oid)
          order by con.conname
        ), '[]'::jsonb)
        from pg_constraint con where con.conrelid = c.oid
      ),
      'indexes', (
        select coalesce(jsonb_agg(
          pg_get_indexdef(i.indexrelid) order by i.indexrelid::regclass::text
        ), '[]'::jsonb)
        from pg_index i where i.indrelid = c.oid
      )
    ) as definition
  from app_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.name))

  union all

  select 'functions',
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    to_jsonb(pg_get_functiondef(p.oid))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join app_functions f on f.name = p.proname
  where n.nspname = 'public'

  union all

  select 'policies',
    schemaname || '.' || tablename || '.' || policyname,
    jsonb_build_object(
      'cmd', cmd, 'roles', roles, 'permissive', permissive,
      'qual', qual, 'with_check', with_check
    )
  from pg_policies
  where (schemaname = 'public' and tablename in (select name from app_tables))
     or (schemaname = 'storage' and tablename = 'objects'
         and policyname ~ '^(avatar|animal_photo)')

  union all

  select 'triggers',
    n.nspname || '.' || c.relname || '.' || t.tgname,
    jsonb_build_object('definition', pg_get_triggerdef(t.oid),
                       'enabled', t.tgenabled)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and ((n.nspname = 'public' and c.relname in (select name from app_tables))
      or (n.nspname = 'auth' and c.relname = 'users'
          and t.tgname = 'on_auth_user_created'))

  union all

  select 'buckets', b.id,
    jsonb_build_object('public', b.public, 'size', b.file_size_limit,
                       'mime_types', b.allowed_mime_types)
  from storage.buckets b
  where b.id in ('avatars', 'animal-photos', 'report-photos')

  union all

  select 'table_privileges', c.relname,
    (
      select jsonb_agg(jsonb_build_object(
        'role', r.role_name,
        'select', has_table_privilege(r.role_name, c.oid, 'SELECT'),
        'insert', has_table_privilege(r.role_name, c.oid, 'INSERT'),
        'update', has_table_privilege(r.role_name, c.oid, 'UPDATE'),
        'delete', has_table_privilege(r.role_name, c.oid, 'DELETE')
      ) order by r.role_name)
      from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
    )
  from app_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.name))

  union all

  select 'function_privileges',
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    (
      select jsonb_agg(jsonb_build_object(
        'role', r.role_name,
        'execute', has_function_privilege(r.role_name, p.oid, 'EXECUTE')
      ) order by r.role_name)
      from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join app_functions f on f.name = p.proname
  where n.nspname = 'public'

  union all

  select 'enums', t.typname,
    coalesce((
      select jsonb_agg(e.enumlabel order by e.enumsortorder)
      from pg_enum e where e.enumtypid = t.oid
    ), '[]'::jsonb)
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname in ('app_role', 'account_status', 'animal_profile_status')
)
select kind, count(*) as object_count,
       md5(string_agg(name || '=' || definition::text, E'\n' order by name))
         as fingerprint
from objects
group by kind
order by kind;
