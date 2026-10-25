begin;

-- A linked sighting is a private contribution to one missing case, not a
-- standalone public report or an open message thread. Only its contributor,
-- the missing animal's reporter, and an active admin may read it.
create table public.missing_case_sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  contributor_id uuid references auth.users(id) on delete set null,
  client_request_key text not null check (client_request_key ~ '^[A-Za-z0-9_-]{12,100}$'),
  observed_at timestamptz not null,
  province text not null check (char_length(trim(province)) between 1 and 100),
  city text not null check (char_length(trim(city)) between 1 and 120),
  suburb text not null check (char_length(trim(suburb)) between 1 and 120),
  street_or_landmark text check (street_or_landmark is null or char_length(street_or_landmark) <= 200),
  private_latitude numeric(9,6) check (private_latitude is null or private_latitude between -90 and 90),
  private_longitude numeric(9,6) check (private_longitude is null or private_longitude between -180 and 180),
  accuracy_m numeric(9,2) check (accuracy_m is null or accuracy_m >= 0),
  location_source text not null check (location_source in ('manual', 'device')),
  movement text not null check (movement in ('moving', 'stationary', 'hiding', 'trapped', 'picked_up', 'no_longer_visible', 'unsure')),
  direction text check (direction is null or char_length(direction) <= 300),
  observed_condition text not null check (observed_condition in ('unsure', 'appeared_well', 'injured', 'distressed', 'other')),
  still_visible boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  share_phone boolean not null default false,
  contact_phone_e164 text check (contact_phone_e164 is null or contact_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  review_status text not null default 'new' check (review_status in ('new', 'likely', 'possible', 'unlikely', 'not_animal', 'needs_more_information')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sighting_coordinate_pair check ((private_latitude is null) = (private_longitude is null)),
  constraint sighting_device_point check (
    (location_source = 'device' and private_latitude is not null and private_longitude is not null)
    or (location_source = 'manual' and private_latitude is null and accuracy_m is null)
  ),
  constraint sighting_phone_permission check (share_phone or contact_phone_e164 is null),
  unique (contributor_id, client_request_key)
);

create index missing_case_sightings_report_time_idx
  on public.missing_case_sightings(report_id, observed_at desc);
create index missing_case_sightings_contributor_idx
  on public.missing_case_sightings(contributor_id, created_at desc);

alter table public.missing_case_sightings enable row level security;
create policy missing_case_sightings_participant_read
  on public.missing_case_sightings for select to authenticated
  using (public.is_active_member() and (
    contributor_id = auth.uid()
    or exists (select 1 from public.reports r
      where r.id = report_id and r.reporter_id = auth.uid())
    or public.is_admin()
  ));

revoke all on public.missing_case_sightings from public, anon, authenticated;
grant select on public.missing_case_sightings to authenticated;
grant select, insert, update, delete on public.missing_case_sightings to service_role;

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
  if wants_phone then
    select mobile_e164 into phone from public.profile_private where user_id = auth.uid();
    if phone is null then
      raise exception 'a saved phone number is required to share it' using errcode = '23514';
    end if;
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

revoke all on function public.submit_missing_case_sighting(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_missing_case_sighting(uuid, jsonb, text) to authenticated, service_role;

create or replace function public.review_missing_case_sighting(
  target_sighting_id uuid, decision text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  sighting public.missing_case_sightings%rowtype;
  report_row public.reports%rowtype;
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;
  if decision not in ('likely', 'possible', 'unlikely', 'not_animal', 'needs_more_information') then
    raise exception 'invalid sighting review' using errcode = '23514';
  end if;
  select * into sighting from public.missing_case_sightings
    where id = target_sighting_id for update;
  if not found then
    raise exception 'sighting not found' using errcode = '42501';
  end if;
  select * into report_row from public.reports where id = sighting.report_id for update;
  if report_row.reporter_id is distinct from auth.uid() then
    raise exception 'only the missing-report owner can review this sighting' using errcode = '42501';
  end if;
  if sighting.review_status = decision then return; end if;
  update public.missing_case_sightings
    set review_status = decision, reviewed_at = now() where id = target_sighting_id;
  insert into public.case_events
    (report_id, event_type, actor_id, visibility, event_data)
  values (sighting.report_id, 'linked_sighting_reviewed', auth.uid(), 'reporter',
    jsonb_build_object('sighting_id', target_sighting_id, 'decision', decision));
end;
$$;

revoke all on function public.review_missing_case_sighting(uuid, text) from public, anon;
grant execute on function public.review_missing_case_sighting(uuid, text) to authenticated, service_role;

-- Deleting an account removes contributor identity, consented phone, exact
-- point and free text. The general area/time remain as non-public case history.
create or replace function public.anonymise_missing_sightings_on_profile_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.missing_case_sightings set contributor_id = null,
    contact_phone_e164 = null, share_phone = false,
    street_or_landmark = null, private_latitude = null,
    private_longitude = null, accuracy_m = null, location_source = 'manual',
    direction = null, notes = null
    where contributor_id = old.id;
  return old;
end;
$$;
revoke all on function public.anonymise_missing_sightings_on_profile_delete() from public, anon, authenticated;
create trigger anonymise_missing_sightings_before_profile_delete
  before delete on public.profiles for each row
  execute function public.anonymise_missing_sightings_on_profile_delete();

commit;
