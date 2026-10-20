begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'admin');
create type public.account_status as enum ('active', 'suspended', 'deletion_pending');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 60),
  first_name text check (first_name is null or char_length(first_name) between 1 and 60),
  last_name text check (last_name is null or char_length(last_name) between 1 and 60),
  avatar_path text,
  role public.app_role not null default 'member',
  account_status public.account_status not null default 'active',
  profile_completed boolean not null default false,
  accepted_terms_version text,
  accepted_terms_at timestamptz,
  accepted_privacy_version text,
  accepted_privacy_at timestamptz,
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terms_acceptance_complete check (
    (accepted_terms_version is null and accepted_terms_at is null)
    or (accepted_terms_version is not null and accepted_terms_at is not null)
  ),
  constraint privacy_acceptance_complete check (
    (accepted_privacy_version is null and accepted_privacy_at is null)
    or (accepted_privacy_version is not null and accepted_privacy_at is not null)
  )
);

create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mobile_e164 text check (mobile_e164 is null or mobile_e164 ~ '^\+27[6-8][0-9]{8}$'),
  whatsapp_enabled boolean not null default false,
  country text not null default 'ZA' check (country = 'ZA'),
  province text,
  city text,
  suburb text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location_source text check (location_source is null or location_source in ('manual', 'device')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coordinates_complete check ((latitude is null) = (longitude is null))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profile_private_set_updated_at
before update on public.profile_private
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_status = 'active'
  );
$$;

create or replace function public.guard_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.account_status is distinct from old.account_status then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      raise exception 'role and account status are server-managed';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_security_fields
before update on public.profiles
for each row execute function public.guard_profile_security_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_at timestamptz := now();
begin
  insert into public.profiles (
    id,
    role,
    account_status,
    profile_completed,
    accepted_terms_version,
    accepted_terms_at,
    accepted_privacy_version,
    accepted_privacy_at,
    age_confirmed_at
  ) values (
    new.id,
    'member',
    'active',
    false,
    nullif(new.raw_user_meta_data ->> 'terms_version', ''),
    case when new.raw_user_meta_data ? 'terms_version' then accepted_at end,
    nullif(new.raw_user_meta_data ->> 'privacy_version', ''),
    case when new.raw_user_meta_data ? 'privacy_version' then accepted_at end,
    case when coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false) then accepted_at end
  );

  insert into public.profile_private (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own
on public.profiles for update to authenticated
using ((id = auth.uid() and public.is_active_member()) or public.is_admin())
with check ((id = auth.uid() and public.is_active_member()) or public.is_admin());

create policy profile_private_select_own
on public.profile_private for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy profile_private_update_own
on public.profile_private for update to authenticated
using ((user_id = auth.uid() and public.is_active_member()) or public.is_admin())
with check ((user_id = auth.uid() and public.is_active_member()) or public.is_admin());

revoke all on public.profiles from anon;
revoke all on public.profile_private from anon;
grant select on public.profiles to authenticated;
grant update (display_name, first_name, last_name, avatar_path) on public.profiles to authenticated;
grant select on public.profile_private to authenticated;
grant update (mobile_e164, whatsapp_enabled) on public.profile_private to authenticated;

create or replace function public.complete_member_profile(
  home_province text,
  home_city text,
  home_suburb text,
  home_latitude double precision default null,
  home_longitude double precision default null,
  home_location_source text default 'manual'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles;
  current_private public.profile_private;
begin
  if not public.is_active_member() then raise exception 'active member required'; end if;
  if home_province not in ('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape') then raise exception 'invalid province'; end if;
  if nullif(trim(home_city), '') is null or nullif(trim(home_suburb), '') is null then raise exception 'city and suburb required'; end if;
  if home_location_source not in ('manual', 'device') then raise exception 'invalid location source'; end if;
  if (home_latitude is null) <> (home_longitude is null) then raise exception 'both coordinates are required together'; end if;

  select * into current_profile from public.profiles where id = auth.uid();
  select * into current_private from public.profile_private where user_id = auth.uid();
  if nullif(trim(current_profile.first_name), '') is null or nullif(trim(current_profile.last_name), '') is null then raise exception 'name required'; end if;
  if current_private.mobile_e164 is null then raise exception 'mobile required'; end if;
  if current_profile.age_confirmed_at is null or current_profile.accepted_terms_version is null or current_profile.accepted_privacy_version is null then raise exception 'age, terms and privacy acceptance required'; end if;

  update public.profile_private set
    province = home_province,
    city = trim(home_city),
    suburb = trim(home_suburb),
    latitude = home_latitude,
    longitude = home_longitude,
    location_source = home_location_source
  where user_id = auth.uid();

  update public.profiles set profile_completed = true where id = auth.uid();
end;
$$;

grant execute on function public.complete_member_profile(text, text, text, double precision, double precision, text) to authenticated;

create or replace function public.get_public_profiles(user_ids uuid[])
returns table (id uuid, display_name text, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.display_name, 'Community member'), p.avatar_path
  from public.profiles p
  where p.id = any(user_ids)
    and p.account_status = 'active'
    and cardinality(user_ids) between 1 and 50;
$$;

grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatar_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_member()
);

create policy avatar_update_own
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_member());

create policy avatar_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.delete_member_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  delete from storage.objects
  where bucket_id = 'avatars' and (storage.foldername(name))[1] = target_user_id::text;

  delete from public.profile_private where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
end;
$$;

revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;

commit;
