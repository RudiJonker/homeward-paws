begin;

-- Both Storage read-back and upload use the same owner and animal check.
-- A security-definer helper avoids relying on the animals table's own RLS
-- while Storage evaluates its policy.
create or replace function public.can_store_animal_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folders text[] := storage.foldername(object_name);
begin
  if coalesce(array_length(folders, 1), 0) <> 2
     or folders[1] is distinct from auth.uid()::text
     or not public.is_active_member() then
    return false;
  end if;

  return public.owns_animal(folders[2]::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.can_store_animal_photo(text) from public, anon;
grant execute on function public.can_store_animal_photo(text) to authenticated, service_role;

drop policy if exists animal_photo_object_select_own on storage.objects;
create policy animal_photo_object_select_own
on storage.objects for select to authenticated
using (bucket_id = 'animal-photos' and public.can_store_animal_photo(name));

drop policy if exists animal_photo_object_insert_own on storage.objects;
create policy animal_photo_object_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'animal-photos' and public.can_store_animal_photo(name));

commit;
