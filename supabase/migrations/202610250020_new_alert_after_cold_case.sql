begin;

-- Only a safe animal, or a still-missing animal with an owner's closed
-- case, may start a fresh incident. A closed case is never made active again.
create or replace function public.can_use_animal_for_missing_report(target_animal_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.animals a
    where a.id = target_animal_id and a.owner_id = auth.uid()
      and (
        a.status = 'safe'
        or (a.status = 'missing' and exists (
          select 1 from public.reports previous
          where previous.animal_id = a.id and previous.reporter_id = auth.uid()
            and previous.report_type = 'missing' and previous.status = 'closed'
        ))
      )
  );
$$;
revoke all on function public.can_use_animal_for_missing_report(uuid)
  from public, anon, authenticated;
grant execute on function public.can_use_animal_for_missing_report(uuid)
  to service_role;

create or replace function public.save_missing_draft(
  target_animal_id uuid,
  payload jsonb,
  target_report_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles
    where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  if not public.owns_animal(target_animal_id) then
    raise exception 'animal not found or access denied' using errcode = '42501';
  end if;
  if not public.can_use_animal_for_missing_report(target_animal_id) then
    raise exception 'animal needs a safe profile or a closed missing case' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.reports
    where animal_id = target_animal_id and report_type = 'missing' and status = 'active'
  ) then
    raise exception 'this animal already has an active missing report' using errcode = '23514';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
     or length(payload::text) > 32768 then
    raise exception 'invalid missing report draft' using errcode = '22023';
  end if;

  if target_report_id is null then
    insert into public.reports (report_type, status, reporter_id, animal_id, draft_payload)
    values ('missing', 'draft', auth.uid(), target_animal_id, payload)
    on conflict (animal_id) where report_type = 'missing' and status = 'draft'
    do update set draft_payload = excluded.draft_payload
    where reports.reporter_id = auth.uid()
    returning id into saved_id;
    if saved_id is null then
      raise exception 'missing report draft not found or access denied' using errcode = '42501';
    end if;
  else
    update public.reports set draft_payload = payload
    where id = target_report_id and report_type = 'missing' and status = 'draft'
      and reporter_id = auth.uid() and animal_id = target_animal_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'missing report draft not found or access denied' using errcode = '42501';
    end if;
  end if;
  return saved_id;
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
  if not found or not public.can_use_animal_for_missing_report(animal_row.id) then
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

create or replace function public.can_stage_missing_report_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  parts text[] := storage.foldername(object_name);
  photo_id uuid;
  report_id uuid;
  file_name text;
begin
  if not public.is_active_member() or coalesce(array_length(parts, 1), 0) <> 2
     or parts[1] is distinct from auth.uid()::text
     or object_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}-[^/]+$' then
    return false;
  end if;
  report_id := parts[2]::uuid;
  file_name := split_part(object_name, '/', 3);
  photo_id := left(file_name, 36)::uuid;
  return exists (
    select 1 from public.reports r
    join public.animals a on a.id = r.animal_id and a.owner_id = auth.uid()
    join public.animal_photos p on p.animal_id = a.id and p.id = photo_id
    where r.id = report_id and r.report_type = 'missing' and r.status = 'draft'
      and r.reporter_id = auth.uid()
      and public.can_use_animal_for_missing_report(a.id)
      and p.archived_at is null
      and p.visibility = 'report_eligible'
      and r.draft_payload -> 'appearance' -> 'selected_photo_ids' ? photo_id::text
      and file_name = p.id::text || '-' || split_part(p.storage_path, '/', 3)
  );
exception when invalid_text_representation then
  return false;
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
    coalesce((contact ->> 'inApp')::boolean, false),
    coalesce((contact ->> 'phone')::boolean, false),
    coalesce((contact ->> 'whatsapp')::boolean, false)
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

commit;
