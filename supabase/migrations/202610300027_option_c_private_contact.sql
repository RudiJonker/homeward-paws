-- Option C: keep all owner contact within the app; a contributor may share a phone privately on one sighting.
-- Preserve the public RPC return signature for existing clients while making both contact fields null.

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
begin
  if not public.is_active_member() then raise exception 'active member required'; end if;
  if home_province not in ('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape') then raise exception 'invalid province'; end if;
  if nullif(trim(home_city), '') is null or nullif(trim(home_suburb), '') is null then raise exception 'city and suburb required'; end if;
  if home_location_source not in ('manual', 'device') then raise exception 'invalid location source'; end if;
  if (home_latitude is null) <> (home_longitude is null) then raise exception 'both coordinates are required together'; end if;

  select * into current_profile from public.profiles where id = auth.uid();
  if nullif(trim(current_profile.first_name), '') is null or nullif(trim(current_profile.last_name), '') is null then raise exception 'name required'; end if;
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
  if not found or not public.can_use_animal_for_missing_report(animal_row.id) then
    return array['appearance']::text[];
  end if;

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
     or contact ->> 'phone' = 'true'
     or contact ->> 'whatsapp' = 'true' then
    safety_invalid := true;
  end if;
  if safety_invalid then issues := array_append(issues, 'safety_contact'); end if;

  return issues;
end;
$$;

create or replace function public.publish_missing_report(target_report_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  r public.reports%rowtype;
  a public.animals%rowtype;
  payload jsonb;
  appearance jsonb;
  last_seen jsonb;
  location jsonb;
  safety jsonb;
  contact jsonb;
  selected jsonb;
  p public.animal_photos%rowtype;
  photo_id text;
  photo_order smallint := 0;
  staged_path text;
  public_label text;
  reference text;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  select * into r from public.reports
    where id = target_report_id and report_type = 'missing' and reporter_id = auth.uid()
    for update;
  if not found then
    raise exception 'missing report not found or access denied' using errcode = '42501';
  end if;
  if r.status = 'active' then return r.public_reference; end if;
  if r.status <> 'draft' then
    raise exception 'only a draft can be published' using errcode = '23514';
  end if;
  select * into a from public.animals where id = r.animal_id and owner_id = auth.uid() for update;
  if not found or not public.can_use_animal_for_missing_report(a.id) then
    raise exception 'animal needs a safe profile or a closed missing case' using errcode = '23514';
  end if;
  if exists (select 1 from public.reports active_report
    where active_report.animal_id = a.id and active_report.report_type = 'missing'
      and active_report.status = 'active') then
    raise exception 'this animal already has an active missing report' using errcode = '23514';
  end if;
  if cardinality(public.missing_draft_readiness(target_report_id)) <> 0 then
    raise exception 'missing report needs review before publishing' using errcode = '23514';
  end if;

  payload := r.draft_payload;
  appearance := payload -> 'appearance';
  last_seen := payload -> 'last_seen';
  location := payload -> 'last_seen_location';
  safety := payload -> 'safety_contact';
  contact := safety -> 'contact';
  selected := coalesce(appearance -> 'selected_photo_ids', appearance -> 'photo_ids');
  if jsonb_array_length(selected) > 3 then
    raise exception 'too many report photos' using errcode = '23514';
  end if;
  for photo_id in select jsonb_array_elements_text(selected) loop
    select * into p from public.animal_photos
      where id = photo_id::uuid and animal_id = a.id and archived_at is null
        and visibility = 'report_eligible';
    if not found then
      raise exception 'selected photo is unavailable' using errcode = '23514';
    end if;
    staged_path := auth.uid()::text || '/' || r.id::text || '/' || p.id::text
      || '-' || split_part(p.storage_path, '/', 3);
    if not exists (select 1 from storage.objects
      where bucket_id = 'report-photos' and name = staged_path) then
      raise exception 'a selected report photo has not been copied yet' using errcode = '23514';
    end if;
    insert into public.report_photos
      (report_id, source_animal_photo_id, storage_path, display_order, photo_type)
    values (r.id, p.id, staged_path, photo_order, p.photo_type);
    photo_order := photo_order + 1;
  end loop;

  insert into public.report_animal_snapshots (
    report_id, source_animal_id, name, category, species, breed, sex,
    approximate_age_years, size, primary_colours, secondary_colours, pattern,
    coat_description, distinctive_features, accessories, current_appearance
  ) values (
    r.id, a.id, a.name, a.category, a.species, a.breed, a.sex,
    a.approximate_age_years, a.size, a.primary_colours, a.secondary_colours,
    a.pattern, a.coat_description, a.distinctive_features,
    nullif(trim(appearance ->> 'accessories'), ''), nullif(trim(appearance ->> 'notes'), '')
  );

  insert into public.missing_report_details (
    report_id, last_seen_at, time_accuracy, circumstance, noticed_missing_at,
    travelled_towards, explanation, accessories, appearance_notes,
    urgency_flags, urgency_note, approach_code, bite_scratch_kick_risk,
    approach_note, contact_in_app, contact_phone, contact_whatsapp
  ) values (
    r.id, (last_seen ->> 'last_seen_at')::timestamptz,
    last_seen ->> 'timeAccuracy', last_seen ->> 'circumstance',
    (last_seen ->> 'absence_noticed_at')::timestamptz,
    case when last_seen ->> 'travelDirection' = 'known' then nullif(trim(last_seen ->> 'direction'), '') end,
    nullif(trim(last_seen ->> 'explanation'), ''),
    nullif(trim(appearance ->> 'accessories'), ''), nullif(trim(appearance ->> 'notes'), ''),
    array(select jsonb_array_elements_text(safety -> 'urgencyFlags')),
    nullif(trim(safety ->> 'urgencyNote'), ''), safety ->> 'approach',
    coalesce((safety ->> 'biteScratchKickRisk')::boolean, false),
    nullif(trim(safety ->> 'approachNote'), ''),
    true, false, false
  );

  public_label := concat_ws(', ', trim(location ->> 'suburb'),
    trim(location ->> 'city'), trim(location ->> 'province'));
  if location ->> 'publicPrecision' = 'approximate' then
    public_label := 'Near ' || trim(location ->> 'streetOrLandmark') || ', ' || public_label;
  end if;
  insert into public.report_locations (
    report_id, location_type, province, city, suburb, street_or_landmark,
    private_latitude, private_longitude, accuracy_m, source, public_precision,
    public_label, observed_at
  ) values (
    r.id, 'last_seen', trim(location ->> 'province'), trim(location ->> 'city'),
    trim(location ->> 'suburb'),
    case when location ->> 'publicPrecision' = 'approximate'
      then trim(location ->> 'streetOrLandmark') end,
    (location ->> 'latitude')::numeric, (location ->> 'longitude')::numeric,
    (location ->> 'accuracyMetres')::numeric, location ->> 'method',
    location ->> 'publicPrecision', public_label,
    (last_seen ->> 'last_seen_at')::timestamptz
  );

  reference := 'HP-M-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  update public.reports set status = 'active', public_reference = reference,
    title = a.name || ' is missing', draft_payload = '{}'::jsonb,
    published_at = now(), activity_at = now()
    where id = r.id;
  update public.animals set status = 'missing' where id = a.id;
  insert into public.case_events
    (report_id, event_type, actor_id, visibility, public_message, previous_status, new_status)
  values (r.id, 'published', auth.uid(), 'public', 'Missing report published', 'draft', 'active');
  return reference;
end;
$$;

create or replace function public.get_public_missing_reports(
  result_limit integer default 30, result_offset integer default 0,
  target_report_id uuid default null, search_reference text default null
)
returns table (
  report_id uuid, public_reference text, published_at timestamptz,
  title text, animal_name text, category text, breed text,
  province text, city text, suburb text, public_location text,
  last_seen_at timestamptz, time_accuracy text, circumstance text,
  approach_code text, bite_scratch_kick_risk boolean,
  reporter_name text, phone text, whatsapp text, photo_paths text[],
  accessories text, current_appearance text, distinctive_features text,
  travelled_towards text, explanation text, urgency_flags text[],
  urgency_note text, approach_note text, contact_in_app boolean,
  public_timeline jsonb
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.public_reference, r.published_at, r.title,
    s.name, s.category, s.breed, l.province, l.city, l.suburb,
    case when l.public_precision = 'approximate'
      and l.street_or_landmark is not null and l.street_or_landmark !~ '[0-9]'
      then 'Near ' || l.street_or_landmark || ', ' || concat_ws(', ', l.suburb, l.city, l.province)
      else concat_ws(', ', l.suburb, l.city, l.province) end,
    d.last_seen_at, d.time_accuracy, d.circumstance, d.approach_code,
    d.bite_scratch_kick_risk,
    coalesce(nullif(trim(profile.display_name), ''), nullif(trim(profile.first_name), ''), 'Animal owner'),
    null::text, null::text,
    coalesce((select array_agg(p.storage_path order by p.display_order)
      from public.report_photos p where p.report_id = r.id and p.visibility = 'public'), '{}'::text[]),
    s.accessories, s.current_appearance, s.distinctive_features,
    d.travelled_towards, d.explanation, d.urgency_flags,
    d.urgency_note, d.approach_note, d.contact_in_app,
    coalesce((select jsonb_agg(jsonb_build_object(
      'event_type', e.event_type, 'message', e.public_message, 'occurred_at', e.occurred_at)
      order by e.occurred_at)
      from public.case_events e where e.report_id = r.id and e.visibility = 'public'), '[]'::jsonb)
  from public.reports r
  join public.report_animal_snapshots s on s.report_id = r.id
  join public.missing_report_details d on d.report_id = r.id
  join public.report_locations l on l.report_id = r.id and l.location_type = 'last_seen'
  left join public.profiles profile on profile.id = r.reporter_id
  where r.report_type = 'missing' and r.status = 'active'
    and l.public_precision in ('suburb', 'approximate')
    and (target_report_id is null or r.id = target_report_id)
    and (search_reference is null or r.public_reference = upper(trim(search_reference)))
  order by r.activity_at desc, r.id desc
  limit least(greatest(coalesce(result_limit, 30), 1), 100)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

create or replace function public.submit_missing_case_sighting(
  target_report_id uuid, payload jsonb, submission_key text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  report_row public.reports%rowtype;
  existing public.missing_case_sightings%rowtype;
  sighting_id uuid;
  observed_at_value timestamptz;
  lat numeric;
  lon numeric;
  accuracy numeric;
  phone text;
  wants_phone boolean;
  source_value text;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  if submission_key is null or submission_key !~ '^[A-Za-z0-9_-]{12,100}$' then
    raise exception 'invalid sighting request key' using errcode = '23514';
  end if;
  select * into existing from public.missing_case_sightings
    where contributor_id = auth.uid() and client_request_key = submission_key;
  if found then
    if existing.report_id <> target_report_id then
      raise exception 'request key belongs to another report' using errcode = '23514';
    end if;
    return existing.id;
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'sighting details are required' using errcode = '23514';
  end if;

  select * into report_row from public.reports
    where id = target_report_id and report_type = 'missing' and status = 'active'
    for update;
  if not found then
    raise exception 'this missing report is no longer accepting sightings' using errcode = '23514';
  end if;
  if report_row.reporter_id = auth.uid() then
    raise exception 'report owners should use an owner update' using errcode = '42501';
  end if;
  observed_at_value := (payload ->> 'observedAt')::timestamptz;
  if observed_at_value is null or observed_at_value > now() + interval '5 minutes'
    or observed_at_value < (select d.last_seen_at from public.missing_report_details d where d.report_id = target_report_id) then
    raise exception 'observation time must be after the animal went missing and not in the future' using errcode = '23514';
  end if;
  if nullif(trim(payload ->> 'province'), '') is null
    or nullif(trim(payload ->> 'city'), '') is null
    or nullif(trim(payload ->> 'suburb'), '') is null then
    raise exception 'province, city and suburb are required' using errcode = '23514';
  end if;
  source_value := payload ->> 'locationSource';
  if source_value not in ('manual', 'device') then
    raise exception 'choose a valid observation location source' using errcode = '23514';
  end if;
  lat := nullif(payload ->> 'latitude', '')::numeric;
  lon := nullif(payload ->> 'longitude', '')::numeric;
  accuracy := nullif(payload ->> 'accuracyMetres', '')::numeric;
  if (lat is null) <> (lon is null)
    or (source_value = 'device' and lat is null)
    or (source_value = 'manual' and (lat is not null or accuracy is not null)) then
    raise exception 'device coordinates must be a complete private point' using errcode = '23514';
  end if;
  wants_phone := coalesce((payload ->> 'sharePhone')::boolean, false);
  phone := nullif(trim(payload ->> 'contactPhone'), '');
  if wants_phone then
    if phone is null or phone !~ '^\+27[6-8][0-9]{8}$' then
      raise exception 'a valid South African mobile number is required when sharing it' using errcode = '23514';
    end if;
  elsif phone is not null then
    raise exception 'phone number requires explicit sharing consent' using errcode = '23514';
  end if;

  insert into public.missing_case_sightings (
    report_id, contributor_id, client_request_key, observed_at,
    province, city, suburb, street_or_landmark,
    private_latitude, private_longitude, accuracy_m, location_source,
    movement, direction, observed_condition, still_visible, notes,
    share_phone, contact_phone_e164
  ) values (
    target_report_id, auth.uid(), submission_key, observed_at_value,
    trim(payload ->> 'province'), trim(payload ->> 'city'), trim(payload ->> 'suburb'),
    nullif(trim(payload ->> 'streetOrLandmark'), ''),
    lat, lon, accuracy, source_value,
    payload ->> 'movement', nullif(trim(payload ->> 'direction'), ''),
    payload ->> 'condition', coalesce((payload ->> 'stillVisible')::boolean, false),
    nullif(trim(payload ->> 'notes'), ''), wants_phone, phone
  ) on conflict on constraint missing_case_sightings_contributor_id_client_request_key_key do nothing
  returning id into sighting_id;

  if sighting_id is null then
    select * into existing from public.missing_case_sightings
      where contributor_id = auth.uid() and client_request_key = submission_key;
    if existing.report_id <> target_report_id then
      raise exception 'request key belongs to another report' using errcode = '23514';
    end if;
    return existing.id;
  end if;
  insert into public.case_events
    (report_id, event_type, actor_id, visibility, event_data)
  values (target_report_id, 'linked_sighting_submitted', auth.uid(), 'reporter',
    jsonb_build_object('sighting_id', sighting_id));
  update public.reports set activity_at = now() where id = target_report_id;
  return sighting_id;
end;
$$;

update public.missing_report_details
set contact_in_app = true, contact_phone = false, contact_whatsapp = false
where contact_in_app is distinct from true or contact_phone or contact_whatsapp;

alter table public.missing_report_details
  add constraint missing_details_in_app_only
  check (contact_in_app and not contact_phone and not contact_whatsapp);

-- Profile numbers have no remaining product use. Sighting numbers stay on the private sighting row.
alter table public.profile_private
  drop column whatsapp_enabled,
  drop column mobile_e164;
