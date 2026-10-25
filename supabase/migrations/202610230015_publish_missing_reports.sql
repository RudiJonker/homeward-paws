begin;

-- A public missing location is always street-or-broader. This also protects
-- the table from future service-role writers that bypass the publish RPC.
alter table public.report_locations add constraint missing_public_location_guard check (
  public_precision <> 'exact'
  and (public_precision <> 'approximate' or (
    street_or_landmark is not null
    and length(trim(street_or_landmark)) > 0
    and street_or_landmark !~ '[0-9]'
  ))
);

-- The client stages independent report copies under
-- user/report/photo-id-source-filename. Including the source filename makes
-- a replaced profile photo require a fresh copy even if its row ID survives.
-- The source bucket remains owner-only. A staged file is not public until a
-- matching report_photos row exists on an active report.
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
    join public.animals a on a.id = r.animal_id and a.owner_id = auth.uid() and a.status = 'safe'
    join public.animal_photos p on p.animal_id = a.id and p.id = photo_id
    where r.id = report_id and r.report_type = 'missing' and r.status = 'draft'
      and r.reporter_id = auth.uid() and p.archived_at is null
      and p.visibility = 'report_eligible'
      and r.draft_payload -> 'appearance' -> 'selected_photo_ids' ? photo_id::text
      and file_name = p.id::text || '-' || split_part(p.storage_path, '/', 3)
  );
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.can_read_public_report_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.report_photos p
    join public.reports r on r.id = p.report_id
    where p.storage_path = object_name and p.visibility = 'public'
      and r.report_type = 'missing' and r.status = 'active'
  );
$$;

revoke all on function public.can_stage_missing_report_photo(text) from public, anon;
grant execute on function public.can_stage_missing_report_photo(text) to authenticated, service_role;
revoke all on function public.can_read_public_report_photo(text) from public;
grant execute on function public.can_read_public_report_photo(text) to anon, authenticated, service_role;

create policy missing_report_photo_stage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and public.can_stage_missing_report_photo(name));
create policy missing_report_photo_owner_select on storage.objects for select to authenticated
using (bucket_id = 'report-photos' and ((storage.foldername(name))[1] = auth.uid()::text
  or public.can_read_public_report_photo(name)));
create policy missing_report_photo_public_select on storage.objects for select to anon
using (bucket_id = 'report-photos' and public.can_read_public_report_photo(name));
create policy missing_report_photo_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.can_read_public_report_photo(name));

-- This single transaction rechecks the private draft after locking it and
-- the source animal. Storage copies are staged beforehand, but never exposed
-- until the transaction commits. A retry returns the same reference.
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
  if not found or a.status <> 'safe' then
    raise exception 'only a safe animal can be reported missing' using errcode = '23514';
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

revoke all on function public.publish_missing_report(uuid) from public, anon;
grant execute on function public.publish_missing_report(uuid) to authenticated, service_role;

-- Explicit public projection: no draft JSON, source animal, private location
-- columns, account email, or unapproved contact number is returned.
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
    case when d.contact_phone then private.mobile_e164 end,
    case when d.contact_whatsapp and private.whatsapp_enabled then private.mobile_e164 end,
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
  left join public.profile_private private on private.user_id = r.reporter_id
  where r.report_type = 'missing' and r.status = 'active'
    and l.public_precision in ('suburb', 'approximate')
    and (target_report_id is null or r.id = target_report_id)
    and (search_reference is null or r.public_reference = upper(trim(search_reference)))
  order by r.activity_at desc, r.id desc
  limit least(greatest(coalesce(result_limit, 30), 1), 100)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

revoke all on function public.get_public_missing_reports(integer, integer, uuid, text) from public;
grant execute on function public.get_public_missing_reports(integer, integer, uuid, text) to anon, authenticated, service_role;

-- Account deletion preserves only a minimal, non-public case record. The
-- Edge Function removes report-photos Storage objects before invoking this.
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
  delete from public.reports where reporter_id = target_user_id and status = 'draft';
  delete from public.report_photos p using public.reports r
    where p.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.case_events e using public.reports r
    where e.report_id = r.id and r.reporter_id = target_user_id;
  delete from public.missing_report_details d using public.reports r
    where d.report_id = r.id and r.reporter_id = target_user_id;
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
  update public.reports set status = 'closed', closed_at = now(),
    activity_at = now(), reporter_id = null, title = null, summary = null
    where reporter_id = target_user_id and status <> 'draft';
  delete from public.profile_private where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
end;
$$;

revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;

commit;
