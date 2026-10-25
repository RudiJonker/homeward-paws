begin;

-- A request key belongs to one append-only owner update. A unique index
-- prevents a repeated tap or lost response from publishing it twice.
alter table public.case_events add column client_request_key text
  check (client_request_key is null or client_request_key ~ '^[A-Za-z0-9_-]{12,100}$');
create unique index case_events_owner_update_request_key_idx
  on public.case_events(report_id, actor_id, client_request_key)
  where event_type = 'owner_update' and client_request_key is not null;

create or replace function public.add_missing_owner_update(
  target_report_id uuid, update_type text, note text,
  area jsonb, submission_key text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  report_row public.reports%rowtype;
  saved_event_id uuid;
  saved_location_id uuid;
  clean_note text := nullif(trim(note), '');
  precision_value text;
  landmark text;
  area_label text;
  message text;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  if submission_key is null or submission_key !~ '^[A-Za-z0-9_-]{12,100}$' then
    raise exception 'invalid update request key' using errcode = '23514';
  end if;
  select * into report_row from public.reports
    where id = target_report_id and report_type = 'missing'
      and reporter_id = auth.uid() for update;
  if not found then
    raise exception 'missing report not found or access denied' using errcode = '42501';
  end if;
  select id into saved_event_id from public.case_events
    where report_id = target_report_id and actor_id = auth.uid()
      and event_type = 'owner_update' and client_request_key = submission_key;
  if found then return saved_event_id; end if;
  if report_row.status <> 'active' then
    raise exception 'only an active missing report can receive an update' using errcode = '23514';
  end if;
  if update_type not in ('search_note', 'new_confirmed_area', 'medical_warning', 'description_correction') then
    raise exception 'choose a valid update type' using errcode = '23514';
  end if;
  if clean_note is not null and (char_length(clean_note) > 500 or clean_note ~ '[[:cntrl:]]') then
    raise exception 'update text must be 500 characters or fewer and contain no control characters' using errcode = '23514';
  end if;
  if update_type <> 'new_confirmed_area' and clean_note is null then
    raise exception 'please enter an update' using errcode = '23514';
  end if;
  if update_type = 'new_confirmed_area' then
    if area is null or jsonb_typeof(area) <> 'object'
      or nullif(trim(area ->> 'province'), '') is null
      or nullif(trim(area ->> 'city'), '') is null
      or nullif(trim(area ->> 'suburb'), '') is null then
      raise exception 'province, city and suburb are required for a new area' using errcode = '23514';
    end if;
    precision_value := area ->> 'publicPrecision';
    landmark := nullif(trim(area ->> 'streetOrLandmark'), '');
    if precision_value not in ('suburb', 'approximate')
      or (precision_value = 'approximate' and (landmark is null or landmark ~ '[0-9]'))
      or (precision_value = 'suburb' and landmark is not null)
      or area ?| array['latitude', 'longitude', 'privateLatitude', 'privateLongitude', 'houseNumber'] then
      raise exception 'public area must be suburb or a street/landmark name without numbers or coordinates' using errcode = '23514';
    end if;
    area_label := concat_ws(', ', trim(area ->> 'suburb'), trim(area ->> 'city'), trim(area ->> 'province'));
    if precision_value = 'approximate' then
      area_label := 'Near ' || landmark || ', ' || area_label;
    end if;
    insert into public.report_locations (
      report_id, location_type, province, city, suburb, street_or_landmark,
      source, public_precision, public_label, observed_at
    ) values (
      target_report_id, 'search_area', trim(area ->> 'province'),
      trim(area ->> 'city'), trim(area ->> 'suburb'), landmark,
      'manual', precision_value, area_label, now()
    ) returning id into saved_location_id;
    message := 'New confirmed area: ' || area_label;
    if clean_note is not null then message := message || '. ' || clean_note; end if;
  elsif update_type = 'medical_warning' then
    message := 'Safety update: ' || clean_note;
  elsif update_type = 'description_correction' then
    message := 'Description update: ' || clean_note;
  else
    message := 'Search update: ' || clean_note;
  end if;
  if char_length(message) > 1000 then
    raise exception 'public update is too long' using errcode = '23514';
  end if;
  insert into public.case_events (
    report_id, event_type, actor_id, visibility, public_message,
    event_data, client_request_key
  ) values (
    target_report_id, 'owner_update', auth.uid(), 'public', message,
    jsonb_build_object('update_type', update_type, 'location_id', saved_location_id),
    submission_key
  ) returning id into saved_event_id;
  update public.reports set activity_at = now() where id = target_report_id;
  return saved_event_id;
end;
$$;

revoke all on function public.add_missing_owner_update(uuid,text,text,jsonb,text) from public, anon;
grant execute on function public.add_missing_owner_update(uuid,text,text,jsonb,text)
  to authenticated, service_role;

-- An owner sees their public history and a *summary* of private sighting
-- activity. Raw event_data, exact points and contributor contact never leave
-- this function. Another member cannot inspect the owner's timeline.
create or replace function public.get_owner_missing_timeline(target_report_id uuid)
returns table (
  event_id uuid, event_type text, occurred_at timestamptz,
  visibility text, message text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_member() or not exists (
    select 1 from public.reports r
    where r.id = target_report_id and r.report_type = 'missing'
      and r.reporter_id = auth.uid() and r.status <> 'draft'
  ) then
    raise exception 'missing report not found or access denied' using errcode = '42501';
  end if;
  return query
    select e.id, e.event_type, e.occurred_at, e.visibility,
      case
        when e.visibility = 'public' then e.public_message
        when e.event_type = 'linked_sighting_submitted' then 'A new sighting was sent for review'
        when e.event_type = 'linked_sighting_reviewed' then 'A sighting assessment was saved'
        else 'Private case activity'
      end
    from public.case_events e where e.report_id = target_report_id
      and e.visibility in ('public', 'reporter', 'participants')
    order by e.occurred_at desc, e.id desc;
end;
$$;

revoke all on function public.get_owner_missing_timeline(uuid) from public, anon;
grant execute on function public.get_owner_missing_timeline(uuid) to authenticated, service_role;

commit;
