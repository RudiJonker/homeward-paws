begin;

-- Permanent source profiles may be deleted by their owner only while they are
-- safe or archived. Published incident history must remain in report snapshots.
create or replace function public.delete_animal_profile(target_animal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() or not public.owns_animal(target_animal_id) then
    raise exception 'animal not found or access denied' using errcode = '42501';
  end if;

  -- Direct RPC callers must not bypass Storage cleanup and leave private
  -- objects behind after the animal row has disappeared from the app.
  if exists (
    select 1 from storage.objects
    where bucket_id = 'animal-photos'
      and name like auth.uid()::text || '/' || target_animal_id::text || '/%'
  ) then
    raise exception 'animal photos must be removed first' using errcode = '23514';
  end if;

  delete from public.animals
  where id = target_animal_id
    and owner_id = auth.uid()
    and status in ('safe', 'archived');

  if not found then
    raise exception 'an animal with an active case cannot be deleted' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.delete_animal_profile(uuid) from public, anon;
grant execute on function public.delete_animal_profile(uuid) to authenticated, service_role;

commit;
