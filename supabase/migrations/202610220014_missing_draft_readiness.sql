begin;

-- Read-only preflight for the owner of a private missing draft. This function
-- never publishes, mutates or exposes draft contents. The future publishing
-- transaction must repeat these checks while locking its source rows.
create or replace function public.missing_draft_readiness(target_report_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  draft_row public.reports%rowtype;
  animal_row public.animals%rowtype;
  private_row public.profile_private%rowtype;
  payload jsonb;
  appearance jsonb;
  last_seen jsonb;
  location jsonb;
  safety jsonb;
  contact jsonb;
  current_photos jsonb;
  selected_photos jsonb;
  selected_id text;
  seen_ids text[] := '{}';
  appearance_invalid boolean := false;
  last_seen_invalid boolean := false;
  location_invalid boolean := false;
  safety_invalid boolean := false;
  issues text[] := '{}';
  last_seen_at timestamptz;
  noticed_at timestamptz;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles
    where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;

  select * into draft_row from public.reports
  where id = target_report_id and report_type = 'missing'
    and status = 'draft' and reporter_id = auth.uid();
  if not found then
    raise exception 'missing report draft not found or access denied' using errcode = '42501';
  end if;
  select * into animal_row from public.animals
  where id = draft_row.animal_id and owner_id = auth.uid();
  if not found or animal_row.status <> 'safe' then
    return array['appearance']::text[];
  end if;
  select * into private_row from public.profile_private where user_id = auth.uid();

  payload := draft_row.draft_payload;
  appearance := payload -> 'appearance';
  last_seen := payload -> 'last_seen';
  location := payload -> 'last_seen_location';
  safety := payload -> 'safety_contact';

  select coalesce(jsonb_agg(photo.id order by photo.display_order), '[]'::jsonb)
    into current_photos
  from public.animal_photos photo
  where photo.animal_id = animal_row.id and photo.archived_at is null
    and photo.visibility = 'report_eligible';

  if jsonb_typeof(appearance) is distinct from 'object'
     or appearance ->> 'confirmed' is distinct from 'true'
     or appearance -> 'photo_ids' is distinct from current_photos
     or length(coalesce(appearance ->> 'accessories', '')) > 500
     or length(coalesce(appearance ->> 'notes', '')) > 1000 then
    appearance_invalid := true;
  end if;
  if not coalesce(pg_input_is_valid(appearance ->> 'animal_updated_at', 'timestamptz'), false) then
    appearance_invalid := true;
  elsif (appearance ->> 'animal_updated_at')::timestamptz <> animal_row.updated_at then
    appearance_invalid := true;
  end if;

  selected_photos := coalesce(appearance -> 'selected_photo_ids', current_photos);
  if jsonb_typeof(selected_photos) is distinct from 'array' then
    appearance_invalid := true;
  else
    for selected_id in select jsonb_array_elements_text(selected_photos) loop
      if selected_id = any(seen_ids) or not exists (
        select 1 from public.animal_photos photo
        join storage.objects object on object.bucket_id = 'animal-photos'
          and object.name = photo.storage_path
        where photo.id::text = selected_id and photo.animal_id = animal_row.id
          and photo.archived_at is null and photo.visibility = 'report_eligible'
      ) then
        appearance_invalid := true;
      end if;
      seen_ids := array_append(seen_ids, selected_id);
    end loop;
  end if;
  if appearance_invalid then issues := array_append(issues, 'appearance'); end if;

  if jsonb_typeof(last_seen) is distinct from 'object'
     or last_seen ->> 'complete' is distinct from 'true'
     or coalesce(last_seen ->> 'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or coalesce(last_seen ->> 'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     or coalesce(last_seen ->> 'timeAccuracy', '') not in ('exact', 'approximate')
     or coalesce(last_seen ->> 'travelDirection', '') not in ('known', 'unknown')
     or (last_seen ->> 'travelDirection' = 'known'
       and length(trim(coalesce(last_seen ->> 'direction', ''))) = 0)
     or coalesce(last_seen ->> 'circumstance', '') not in (
       'escaped_home', 'escaped_walk', 'escaped_vehicle', 'noise_weather',
       'wandered', 'suspected_stolen', 'another_property', 'transport_incident',
       'other', 'unknown'
     )
     or length(coalesce(last_seen ->> 'direction', '')) > 500
     or length(coalesce(last_seen ->> 'explanation', '')) > 2000 then
    last_seen_invalid := true;
  end if;
  if not coalesce(pg_input_is_valid(last_seen ->> 'last_seen_at', 'timestamptz'), false) then
    last_seen_invalid := true;
  else
    last_seen_at := (last_seen ->> 'last_seen_at')::timestamptz;
    if last_seen_at > now() then last_seen_invalid := true; end if;
  end if;
  if last_seen ->> 'absence_noticed_at' is not null then
    if not coalesce(pg_input_is_valid(last_seen ->> 'absence_noticed_at', 'timestamptz'), false) then
      last_seen_invalid := true;
    else
      noticed_at := (last_seen ->> 'absence_noticed_at')::timestamptz;
      if noticed_at > now() or (last_seen_at is not null and noticed_at < last_seen_at) then
        last_seen_invalid := true;
      end if;
    end if;
  end if;
  if last_seen_invalid then issues := array_append(issues, 'last_seen'); end if;

  if jsonb_typeof(location) is distinct from 'object'
     or location ->> 'complete' is distinct from 'true'
     or coalesce(location ->> 'method', '') not in ('manual', 'home_area', 'device', 'map')
     or coalesce(location ->> 'publicPrecision', '') not in ('suburb', 'approximate')
     or coalesce(location ->> 'province', '') not in (
       'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
       'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
     )
     or length(trim(coalesce(location ->> 'city', ''))) not between 1 and 120
     or length(trim(coalesce(location ->> 'suburb', ''))) not between 1 and 120 then
    location_invalid := true;
  end if;
  if location ->> 'publicPrecision' = 'approximate' and (
    length(trim(coalesce(location ->> 'streetOrLandmark', ''))) not between 1 and 200
    or coalesce(location ->> 'streetOrLandmark', '') ~ '[0-9]'
  ) then
    location_invalid := true;
  end if;
  if location ->> 'method' = 'home_area' and (
    location ->> 'publicPrecision' is distinct from 'suburb'
    or location ->> 'latitude' is not null
    or location ->> 'longitude' is not null
  ) then
    location_invalid := true;
  end if;
  if location ->> 'method' = 'device' and (
    jsonb_typeof(location -> 'latitude') is distinct from 'number'
    or jsonb_typeof(location -> 'longitude') is distinct from 'number'
  ) then
    location_invalid := true;
  end if;
  if jsonb_typeof(location -> 'latitude') = 'number' then
    if (location ->> 'latitude')::numeric not between -90 and 90 then
      location_invalid := true;
    end if;
  end if;
  if jsonb_typeof(location -> 'longitude') = 'number' then
    if (location ->> 'longitude')::numeric not between -180 and 180 then
      location_invalid := true;
    end if;
  end if;
  if location_invalid then issues := array_append(issues, 'last_seen_location'); end if;

  contact := safety -> 'contact';
  if jsonb_typeof(safety) is distinct from 'object'
     or safety ->> 'complete' is distinct from 'true'
     or coalesce(safety ->> 'approach', '') not in ('unknown', 'safe', 'slowly', 'do_not_chase', 'do_not_catch')
     or jsonb_typeof(safety -> 'urgencyFlags') is distinct from 'array'
     or jsonb_typeof(contact) is distinct from 'object'
     or length(coalesce(safety ->> 'urgencyNote', '')) > 500
     or length(coalesce(safety ->> 'approachNote', '')) > 500 then
    safety_invalid := true;
  end if;
  if jsonb_typeof(safety -> 'urgencyFlags') = 'array' then
    if exists (
      select 1 from jsonb_array_elements_text(safety -> 'urgencyFlags') flag
      where flag not in ('medication', 'injury', 'age', 'pregnancy', 'sensory', 'mobility', 'weather')
    ) then
      safety_invalid := true;
    end if;
  end if;
  if contact ->> 'inApp' is distinct from 'true'
     and contact ->> 'phone' is distinct from 'true'
     and contact ->> 'whatsapp' is distinct from 'true' then
    safety_invalid := true;
  end if;
  if contact ->> 'phone' = 'true' and private_row.mobile_e164 is null then
    safety_invalid := true;
  end if;
  if contact ->> 'whatsapp' = 'true' and (
    private_row.mobile_e164 is null or private_row.whatsapp_enabled is distinct from true
  ) then
    safety_invalid := true;
  end if;
  if safety_invalid then issues := array_append(issues, 'safety_contact'); end if;

  return issues;
end;
$$;

revoke all on function public.missing_draft_readiness(uuid) from public, anon;
grant execute on function public.missing_draft_readiness(uuid) to authenticated, service_role;

commit;
