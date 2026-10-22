begin;

create type public.animal_profile_status as enum ('safe', 'missing', 'in_care', 'fostered', 'transferred', 'archived', 'deceased');

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (category in ('dog', 'cat', 'bird', 'horse', 'donkey', 'rabbit', 'reptile', 'small_mammal', 'farm_animal', 'other', 'unsure')),
  species text check (species is null or char_length(species) <= 80),
  breed text check (breed is null or char_length(breed) <= 120),
  mixed_breed boolean not null default false,
  sex text check (sex is null or sex in ('female', 'male', 'unknown')),
  birth_date date,
  approximate_age_years smallint check (approximate_age_years is null or approximate_age_years between 0 and 100),
  age_estimated_at date,
  size text check (size is null or size in ('tiny', 'small', 'medium', 'large', 'giant', 'unknown')),
  approximate_weight_kg numeric(6,2) check (approximate_weight_kg is null or approximate_weight_kg > 0),
  relationship text not null default 'my_animal' check (relationship in ('my_animal', 'family_animal', 'foster', 'other')),
  primary_colours text[] not null default '{}',
  secondary_colours text[] not null default '{}',
  pattern text,
  coat_description text,
  eye_colour text,
  ears_description text,
  tail_description text,
  distinctive_features text,
  sterilised boolean,
  microchipped boolean,
  status public.animal_profile_status not null default 'safe',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint animal_age_choice check (birth_date is null or approximate_age_years is null),
  constraint animal_archive_consistent check ((status = 'archived') = (archived_at is not null))
);

create table public.animal_private_details (
  animal_id uuid primary key references public.animals(id) on delete cascade,
  microchip_number text,
  identifier_type text check (identifier_type is null or identifier_type in ('tag', 'band', 'tattoo', 'brand', 'other')),
  identifier_value text,
  hidden_identifying_feature text,
  private_health_notes text,
  veterinary_practice text,
  ownership_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.animal_health_flags (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  flag_type text not null check (flag_type in ('medication', 'allergy', 'injury', 'medical_condition', 'special_diet', 'other')),
  description text not null check (char_length(trim(description)) between 1 and 500),
  public_during_incident boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.animal_behaviour_flags (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  flag_type text not null check (flag_type in ('friendly', 'nervous', 'likely_to_run', 'may_bite', 'may_scratch', 'may_kick', 'responds_to_name', 'other')),
  description text check (description is null or char_length(description) <= 500),
  public_during_incident boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.animal_photos (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  storage_path text not null unique,
  display_order smallint not null check (display_order between 0 and 2),
  photo_type text not null default 'general' check (photo_type in ('face', 'full_body', 'distinctive_feature', 'general')),
  visibility text not null default 'private' check (visibility in ('private', 'report_eligible')),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (animal_id, display_order)
);

create trigger animals_set_updated_at before update on public.animals
for each row execute function public.set_updated_at();
create trigger animal_private_details_set_updated_at before update on public.animal_private_details
for each row execute function public.set_updated_at();
create trigger animal_health_flags_set_updated_at before update on public.animal_health_flags
for each row execute function public.set_updated_at();
create trigger animal_behaviour_flags_set_updated_at before update on public.animal_behaviour_flags
for each row execute function public.set_updated_at();

create or replace function public.owns_animal(target_animal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.animals
    where id = target_animal_id and owner_id = auth.uid()
  );
$$;

create or replace function public.set_animal_archived(target_animal_id uuid, should_archive boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then raise exception 'active member required'; end if;
  if not public.owns_animal(target_animal_id) then raise exception 'animal not found'; end if;

  if should_archive then
    update public.animals set status = 'archived', archived_at = now() where id = target_animal_id and status = 'safe';
    if not found then raise exception 'only a safe animal can be archived'; end if;
  else
    update public.animals set status = 'safe', archived_at = null where id = target_animal_id and status = 'archived';
    if not found then raise exception 'animal is not archived'; end if;
  end if;
end;
$$;

alter table public.animals enable row level security;
alter table public.animal_private_details enable row level security;
alter table public.animal_health_flags enable row level security;
alter table public.animal_behaviour_flags enable row level security;
alter table public.animal_photos enable row level security;

create policy animals_owner_all on public.animals for all to authenticated
using ((owner_id = auth.uid() and public.is_active_member()) or public.is_admin())
with check ((owner_id = auth.uid() and public.is_active_member()) or public.is_admin());

create policy animal_private_owner_all on public.animal_private_details for all to authenticated
using (public.owns_animal(animal_id) or public.is_admin())
with check (public.owns_animal(animal_id) or public.is_admin());

create policy animal_health_owner_all on public.animal_health_flags for all to authenticated
using (public.owns_animal(animal_id) or public.is_admin())
with check (public.owns_animal(animal_id) or public.is_admin());

create policy animal_behaviour_owner_all on public.animal_behaviour_flags for all to authenticated
using (public.owns_animal(animal_id) or public.is_admin())
with check (public.owns_animal(animal_id) or public.is_admin());

create policy animal_photos_owner_all on public.animal_photos for all to authenticated
using (public.owns_animal(animal_id) or public.is_admin())
with check (public.owns_animal(animal_id) or public.is_admin());

revoke all on public.animals, public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos from anon;
revoke all on public.animals, public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos from authenticated;
grant select on public.animals to authenticated;
grant insert (id, owner_id, name, category, species, breed, mixed_breed, sex, birth_date, approximate_age_years, age_estimated_at, size, approximate_weight_kg, relationship, primary_colours, secondary_colours, pattern, coat_description, eye_colour, ears_description, tail_description, distinctive_features, sterilised, microchipped) on public.animals to authenticated;
grant update (name, category, species, breed, mixed_breed, sex, birth_date, approximate_age_years, age_estimated_at, size, approximate_weight_kg, relationship, primary_colours, secondary_colours, pattern, coat_description, eye_colour, ears_description, tail_description, distinctive_features, sterilised, microchipped) on public.animals to authenticated;
grant select, insert, update, delete on public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos to authenticated;
grant select, insert, update, delete on public.animals, public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos to service_role;

revoke all on function public.owns_animal(uuid) from public, anon;
grant execute on function public.owns_animal(uuid) to authenticated, service_role;
revoke all on function public.set_animal_archived(uuid, boolean) from public, anon;
grant execute on function public.set_animal_archived(uuid, boolean) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animal-photos', 'animal-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy animal_photo_object_select_own on storage.objects for select to authenticated
using (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy animal_photo_object_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id = 'animal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.animals a
    where a.owner_id = auth.uid() and a.id::text = (storage.foldername(name))[2]
  )
);
create policy animal_photo_object_update_own on storage.objects for update to authenticated
using (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy animal_photo_object_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create index animals_owner_status_idx on public.animals(owner_id, status, updated_at desc);
create index animal_health_flags_animal_idx on public.animal_health_flags(animal_id) where active;
create index animal_behaviour_flags_animal_idx on public.animal_behaviour_flags(animal_id) where active;
create index animal_photos_animal_idx on public.animal_photos(animal_id, display_order) where archived_at is null;

commit;
