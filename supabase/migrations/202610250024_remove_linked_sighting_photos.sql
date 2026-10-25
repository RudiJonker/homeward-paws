begin;

-- A contributor may remove the object for their own linked sighting, even
-- after the missing case has closed. This also permits cleanup of an upload
-- that succeeded but was never attached to the sighting row.
create or replace function public.can_delete_linked_sighting_photo(object_name text)
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
    where s.id = folders[2]::uuid and s.contributor_id = auth.uid()
      and (s.photo_path = object_name or s.photo_path is null));
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function public.can_delete_linked_sighting_photo(text) from public, anon;
grant execute on function public.can_delete_linked_sighting_photo(text) to authenticated, service_role;

-- Storage deletion also needs SELECT visibility for the object it removes.
-- This makes the contributor's own unattached upload visible for cleanup.
create policy sighting_photo_read_unlinked_own on storage.objects for select to authenticated
  using (bucket_id = 'sighting-photos' and public.can_delete_linked_sighting_photo(name));
create policy sighting_photo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sighting-photos' and public.can_delete_linked_sighting_photo(name));

-- The Storage API removes the bytes first. If the response is lost, a retry
-- can safely clear the metadata once the object is absent. The original
-- sighting, its owner review and private case history remain in place.
create or replace function public.clear_linked_sighting_photo(target_sighting_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  saved_path text;
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;
  select photo_path into saved_path from public.missing_case_sightings
    where id = target_sighting_id and contributor_id = auth.uid() for update;
  if not found then
    raise exception 'sighting not found or access denied' using errcode = '42501';
  end if;
  if saved_path is null then return; end if;
  if exists (select 1 from storage.objects
    where bucket_id = 'sighting-photos' and name = saved_path) then
    raise exception 'remove the sighting photo file first' using errcode = '23514';
  end if;
  update public.missing_case_sightings set photo_path = null
    where id = target_sighting_id;
end;
$$;
revoke all on function public.clear_linked_sighting_photo(uuid) from public, anon;
grant execute on function public.clear_linked_sighting_photo(uuid) to authenticated, service_role;

commit;
