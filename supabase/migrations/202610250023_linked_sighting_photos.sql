begin;

-- One optional, private image belongs to a linked sighting. A fixed path
-- prevents one contributor from placing a file in another sighting's folder.
alter table public.missing_case_sightings add column photo_path text
  check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/sighting\.jpg$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sighting-photos', 'sighting-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_insert_linked_sighting_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  folders text[] := storage.foldername(object_name);
begin
  if not public.is_active_member() or coalesce(array_length(folders, 1), 0) <> 2
    or folders[1] is distinct from auth.uid()::text
    or object_name is distinct from folders[1] || '/' || folders[2] || '/sighting.jpg' then
    return false;
  end if;
  return exists (select 1 from public.missing_case_sightings s
    join public.reports r on r.id = s.report_id
    where s.id = folders[2]::uuid and s.contributor_id = auth.uid()
      and s.photo_path is null and r.status = 'active');
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function public.can_insert_linked_sighting_photo(text) from public, anon;
grant execute on function public.can_insert_linked_sighting_photo(text) to authenticated, service_role;

create or replace function public.can_read_linked_sighting_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_member() then return false; end if;
  return exists (select 1 from public.missing_case_sightings s
    join public.reports r on r.id = s.report_id
    where s.photo_path = object_name
      and (s.contributor_id = auth.uid() or r.reporter_id = auth.uid() or public.is_admin()));
end;
$$;
revoke all on function public.can_read_linked_sighting_photo(text) from public, anon;
grant execute on function public.can_read_linked_sighting_photo(text) to authenticated, service_role;

create policy sighting_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sighting-photos' and public.can_insert_linked_sighting_photo(name));
create policy sighting_photo_read on storage.objects for select to authenticated
  using (bucket_id = 'sighting-photos' and public.can_read_linked_sighting_photo(name));

create or replace function public.attach_linked_sighting_photo(target_sighting_id uuid, object_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  sighting public.missing_case_sightings%rowtype;
  report_status text;
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;
  select * into sighting from public.missing_case_sightings
    where id = target_sighting_id for update;
  if not found or sighting.contributor_id is distinct from auth.uid() then
    raise exception 'sighting not found or access denied' using errcode = '42501';
  end if;
  if object_name is distinct from auth.uid()::text || '/' || target_sighting_id::text || '/sighting.jpg' then
    raise exception 'invalid sighting photo path' using errcode = '23514';
  end if;
  if sighting.photo_path = object_name then return; end if;
  select status into report_status from public.reports where id = sighting.report_id;
  if report_status <> 'active' or sighting.photo_path is not null then
    raise exception 'this sighting cannot accept a photo' using errcode = '23514';
  end if;
  if not exists (select 1 from storage.objects
    where bucket_id = 'sighting-photos' and name = object_name) then
    raise exception 'sighting photo has not been uploaded' using errcode = '23514';
  end if;
  update public.missing_case_sightings set photo_path = object_name
    where id = target_sighting_id;
end;
$$;
revoke all on function public.attach_linked_sighting_photo(uuid, text) from public, anon;
grant execute on function public.attach_linked_sighting_photo(uuid, text) to authenticated, service_role;

-- The Edge Function removes these files through the Storage API before
-- account deletion. It needs paths of the member's own photos and photos
-- attached to that member's cases, including other contributors' files.
create or replace function public.account_sighting_photo_paths(target_user_id uuid)
returns setof text language sql stable security definer set search_path = '' as $$
  select distinct s.photo_path from public.missing_case_sightings s
  join public.reports r on r.id = s.report_id
  where coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    and s.photo_path is not null
    and (s.contributor_id = target_user_id or r.reporter_id = target_user_id);
$$;
revoke all on function public.account_sighting_photo_paths(uuid) from public, anon, authenticated;
grant execute on function public.account_sighting_photo_paths(uuid) to service_role;

create or replace function public.anonymise_missing_sightings_on_profile_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.missing_case_sightings set contributor_id = null,
    contact_phone_e164 = null, share_phone = false,
    street_or_landmark = null, private_latitude = null,
    private_longitude = null, accuracy_m = null, location_source = 'manual',
    direction = null, notes = null, photo_path = null
    where contributor_id = old.id;
  return old;
end;
$$;
revoke all on function public.anonymise_missing_sightings_on_profile_delete() from public, anon, authenticated;

-- Preserve the current deletion transaction from migration 021, adding
-- Storage verification and photo metadata cleanup for both participants.
create or replace function public.delete_member_data(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'report-photos'
    and name like target_user_id::text || '/%') then
    raise exception 'report photos must be removed first' using errcode = '23514';
  end if;
  if exists (select 1 from storage.objects o
    where o.bucket_id = 'sighting-photos' and (
      o.name like target_user_id::text || '/%'
      or o.name in (select public.account_sighting_photo_paths(target_user_id)))) then
    raise exception 'sighting photos must be removed first' using errcode = '23514';
  end if;
  delete from public.content_reports c using public.reports r
    where c.report_id = r.id and r.reporter_id = target_user_id;
  update public.content_reports set reporter_id = null, description = null
    where reporter_id = target_user_id;
  delete from public.reports where reporter_id = target_user_id and status = 'draft';
  delete from public.report_photos p using public.reports r
    where p.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.case_events e using public.reports r
    where e.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.missing_closures c using public.reports r
    where c.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.missing_reunions m using public.reports r
    where m.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.missing_report_details d using public.reports r
    where d.report_id = r.id and r.reporter_id = target_user_id;
  update public.missing_case_sightings s set photo_path = null
    from public.reports r where s.report_id = r.id and r.reporter_id = target_user_id;
  update public.report_locations l set private_latitude = null,
    private_longitude = null, accuracy_m = null, street_or_landmark = null,
    public_precision = 'suburb',
    public_label = concat_ws(', ', l.suburb, l.city, l.province)
    from public.reports r where l.report_id = r.id and r.reporter_id = target_user_id;
  update public.report_animal_snapshots s set name = 'Animal',
    species = null, breed = null, sex = null, approximate_age_years = null,
    size = null, primary_colours = '{}', secondary_colours = '{}',
    pattern = null, coat_description = null, distinctive_features = null,
    accessories = null, current_appearance = null
    from public.reports r where s.report_id = r.id and r.reporter_id = target_user_id;
  update public.reports set status = case when status = 'reunited' then 'reunited' else 'closed' end,
    closed_at = coalesce(closed_at, now()), activity_at = now(),
    reporter_id = null, title = null, summary = null
    where reporter_id = target_user_id and status <> 'draft';
  delete from public.profile_private where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
end;
$$;
revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;

commit;
