begin;

-- A profile edit updates its public and private fields together. The caller
-- supplies only editable data; ownership and controlled status never change.
create or replace function public.update_animal_profile(target_animal_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  behaviour_item jsonb;
begin
  if not public.is_active_member() or not public.owns_animal(target_animal_id) then
    raise exception 'animal not found or access denied' using errcode = '42501';
  end if;
  if nullif(trim(payload->>'name'), '') is null then
    raise exception 'animal name is required' using errcode = '22023';
  end if;

  update public.animals set
    name = trim(payload->>'name'),
    category = payload->>'category',
    species = nullif(trim(payload->>'species'), ''),
    breed = nullif(trim(payload->>'breed'), ''),
    mixed_breed = coalesce((payload->>'mixed_breed')::boolean, false),
    sex = nullif(payload->>'sex', ''),
    birth_date = case when nullif(payload->>'approximate_age_years', '') is not null
      then null else birth_date end,
    approximate_age_years = nullif(payload->>'approximate_age_years', '')::smallint,
    age_estimated_at = nullif(payload->>'age_estimated_at', '')::date,
    size = nullif(payload->>'size', ''),
    approximate_weight_kg = nullif(payload->>'approximate_weight_kg', '')::numeric,
    relationship = coalesce(nullif(payload->>'relationship', ''), 'my_animal'),
    primary_colours = coalesce(array(select jsonb_array_elements_text(payload->'primary_colours')), '{}'),
    secondary_colours = coalesce(array(select jsonb_array_elements_text(payload->'secondary_colours')), '{}'),
    pattern = nullif(trim(payload->>'pattern'), ''),
    coat_description = nullif(trim(payload->>'coat_description'), ''),
    eye_colour = nullif(trim(payload->>'eye_colour'), ''),
    ears_description = nullif(trim(payload->>'ears_description'), ''),
    tail_description = nullif(trim(payload->>'tail_description'), ''),
    distinctive_features = nullif(trim(payload->>'distinctive_features'), ''),
    sterilised = coalesce((payload->>'sterilised')::boolean, false),
    microchipped = coalesce((payload->>'microchipped')::boolean, false)
  where id = target_animal_id and owner_id = auth.uid();

  insert into public.animal_private_details (
    animal_id, microchip_number, identifier_type, identifier_value,
    private_health_notes, veterinary_practice, ownership_notes
  ) values (
    target_animal_id,
    case when coalesce((payload->>'microchipped')::boolean, false)
      then nullif(trim(payload->>'microchip_number'), '') else null end,
    nullif(payload->>'identifier_type', ''),
    case when nullif(payload->>'identifier_type', '') is not null
      then nullif(trim(payload->>'identifier_value'), '') else null end,
    nullif(trim(payload->>'private_health_notes'), ''),
    nullif(trim(payload->>'veterinary_practice'), ''),
    nullif(trim(payload->>'ownership_notes'), '')
  ) on conflict (animal_id) do update set
    microchip_number = excluded.microchip_number,
    identifier_type = excluded.identifier_type,
    identifier_value = excluded.identifier_value,
    private_health_notes = excluded.private_health_notes,
    veterinary_practice = excluded.veterinary_practice,
    ownership_notes = excluded.ownership_notes;

  delete from public.animal_behaviour_flags where animal_id = target_animal_id;
  for behaviour_item in select value from jsonb_array_elements(coalesce(payload->'behaviour_flags', '[]'::jsonb)) loop
    insert into public.animal_behaviour_flags (animal_id, flag_type, description, public_during_incident)
    values (
      target_animal_id, behaviour_item->>'flag_type', nullif(trim(behaviour_item->>'description'), ''),
      coalesce((behaviour_item->>'public_during_incident')::boolean, true)
    );
  end loop;
end;
$$;

revoke all on function public.update_animal_profile(uuid, jsonb) from public, anon;
grant execute on function public.update_animal_profile(uuid, jsonb) to authenticated, service_role;

-- The three positions remain unique at transaction end, while a single
-- update can swap two positions without an intermediate duplicate error.
alter table public.animal_photos
  drop constraint if exists animal_photos_animal_id_display_order_key;
alter table public.animal_photos
  add constraint animal_photos_order_unique unique (animal_id, display_order) deferrable initially immediate;

create or replace function public.reorder_animal_photos(target_animal_id uuid, ordered_photo_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_count integer;
begin
  if not public.is_active_member() or not public.owns_animal(target_animal_id) then
    raise exception 'animal not found or access denied' using errcode = '42501';
  end if;

  select count(*) into photo_count from public.animal_photos
  where animal_id = target_animal_id and archived_at is null;
  if photo_count < 1 or photo_count > 3
     or coalesce(array_length(ordered_photo_ids, 1), 0) <> photo_count
     or (select count(distinct requested.photo_id)
         from unnest(ordered_photo_ids) as requested(photo_id)) <> photo_count
     or (select count(*) from public.animal_photos
         where animal_id = target_animal_id and archived_at is null and id = any(ordered_photo_ids)) <> photo_count then
    raise exception 'photo order must contain exactly this animal''s active photos' using errcode = '22023';
  end if;

  set constraints public.animal_photos_order_unique deferred;
  update public.animal_photos
  set display_order = array_position(ordered_photo_ids, id) - 1
  where animal_id = target_animal_id and archived_at is null;
  set constraints public.animal_photos_order_unique immediate;
end;
$$;

revoke all on function public.reorder_animal_photos(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_animal_photos(uuid, uuid[]) to authenticated, service_role;

commit;
