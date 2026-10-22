begin;

create or replace function public.create_animal_profile(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_animal_id uuid;
  health_item jsonb;
  behaviour_item jsonb;
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;

  if nullif(trim(payload->>'name'), '') is null then
    raise exception 'animal name is required' using errcode = '22023';
  end if;

  insert into public.animals (
    owner_id, name, category, species, breed, mixed_breed, sex,
    birth_date, approximate_age_years, age_estimated_at, size,
    approximate_weight_kg, relationship, primary_colours, secondary_colours,
    pattern, coat_description, eye_colour, ears_description, tail_description,
    distinctive_features, sterilised, microchipped
  ) values (
    auth.uid(), trim(payload->>'name'), payload->>'category',
    nullif(trim(payload->>'species'), ''), nullif(trim(payload->>'breed'), ''),
    coalesce((payload->>'mixed_breed')::boolean, false), nullif(payload->>'sex', ''),
    nullif(payload->>'birth_date', '')::date,
    nullif(payload->>'approximate_age_years', '')::smallint,
    nullif(payload->>'age_estimated_at', '')::date,
    nullif(payload->>'size', ''), nullif(payload->>'approximate_weight_kg', '')::numeric,
    coalesce(nullif(payload->>'relationship', ''), 'my_animal'),
    coalesce(array(select jsonb_array_elements_text(payload->'primary_colours')), '{}'),
    coalesce(array(select jsonb_array_elements_text(payload->'secondary_colours')), '{}'),
    nullif(trim(payload->>'pattern'), ''), nullif(trim(payload->>'coat_description'), ''),
    nullif(trim(payload->>'eye_colour'), ''), nullif(trim(payload->>'ears_description'), ''),
    nullif(trim(payload->>'tail_description'), ''), nullif(trim(payload->>'distinctive_features'), ''),
    case when payload ? 'sterilised' then (payload->>'sterilised')::boolean else null end,
    case when payload ? 'microchipped' then (payload->>'microchipped')::boolean else null end
  ) returning id into new_animal_id;

  insert into public.animal_private_details (
    animal_id, microchip_number, identifier_type, identifier_value,
    hidden_identifying_feature, private_health_notes, veterinary_practice, ownership_notes
  ) values (
    new_animal_id, nullif(trim(payload->>'microchip_number'), ''),
    nullif(payload->>'identifier_type', ''), nullif(trim(payload->>'identifier_value'), ''),
    nullif(trim(payload->>'hidden_identifying_feature'), ''),
    nullif(trim(payload->>'private_health_notes'), ''),
    nullif(trim(payload->>'veterinary_practice'), ''), nullif(trim(payload->>'ownership_notes'), '')
  );

  for health_item in select value from jsonb_array_elements(coalesce(payload->'health_flags', '[]'::jsonb)) loop
    insert into public.animal_health_flags (animal_id, flag_type, description, public_during_incident)
    values (
      new_animal_id, health_item->>'flag_type', trim(health_item->>'description'),
      coalesce((health_item->>'public_during_incident')::boolean, false)
    );
  end loop;

  for behaviour_item in select value from jsonb_array_elements(coalesce(payload->'behaviour_flags', '[]'::jsonb)) loop
    insert into public.animal_behaviour_flags (animal_id, flag_type, description, public_during_incident)
    values (
      new_animal_id, behaviour_item->>'flag_type', nullif(trim(behaviour_item->>'description'), ''),
      coalesce((behaviour_item->>'public_during_incident')::boolean, true)
    );
  end loop;

  return new_animal_id;
end;
$$;

revoke all on function public.create_animal_profile(jsonb) from public, anon;
grant execute on function public.create_animal_profile(jsonb) to authenticated, service_role;

commit;
