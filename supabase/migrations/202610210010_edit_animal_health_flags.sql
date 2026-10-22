begin;

-- Keep structured health needs in the same protected edit transaction as the
-- animal and its private details. The app will confirm report visibility later.
create or replace function public.update_animal_profile(target_animal_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  health_item jsonb;
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

  delete from public.animal_health_flags where animal_id = target_animal_id;
  for health_item in select value from jsonb_array_elements(coalesce(payload->'health_flags', '[]'::jsonb)) loop
    insert into public.animal_health_flags (animal_id, flag_type, description, public_during_incident)
    values (
      target_animal_id, health_item->>'flag_type', trim(health_item->>'description'),
      coalesce((health_item->>'public_during_incident')::boolean, false)
    );
  end loop;

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

commit;
