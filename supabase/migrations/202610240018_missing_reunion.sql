begin;

-- The public result is a status; the reunion place and assistance remain
-- private. A later, separately consented story/photo flow may use the flag.
create table public.missing_reunions (
  report_id uuid primary key references public.reports(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  client_request_key text not null check (client_request_key ~ '^[A-Za-z0-9_-]{12,100}$'),
  reunited_at timestamptz not null,
  reunion_place text not null check (char_length(trim(reunion_place)) between 1 and 300),
  assistance text check (assistance is null or char_length(assistance) <= 500),
  veterinary_help_needed boolean not null default false,
  public_story_consent boolean not null default false,
  recorded_at timestamptz not null default now()
);
alter table public.missing_reunions enable row level security;
create policy missing_reunions_owner_admin_read on public.missing_reunions
  for select to authenticated using (public.is_active_member() and (
    exists (select 1 from public.reports r
      where r.id = report_id and r.reporter_id = auth.uid())
    or public.is_admin()
  ));
revoke all on public.missing_reunions from public, anon, authenticated;
grant select on public.missing_reunions to authenticated;
grant select, insert, update, delete on public.missing_reunions to service_role;

alter table public.missing_report_details add column reunited_at timestamptz;

create or replace function public.confirm_missing_reunion(
  target_report_id uuid, payload jsonb, submission_key text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  report_row public.reports%rowtype;
  animal_row public.animals%rowtype;
  previous public.missing_reunions%rowtype;
  reunited_time timestamptz;
  place_value text;
  assistance_value text;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  if submission_key is null or submission_key !~ '^[A-Za-z0-9_-]{12,100}$' then
    raise exception 'invalid reunion request key' using errcode = '23514';
  end if;
  select * into report_row from public.reports
    where id = target_report_id and report_type = 'missing'
      and reporter_id = auth.uid() for update;
  if not found then
    raise exception 'missing report not found or access denied' using errcode = '42501';
  end if;
  if report_row.status = 'reunited' then
    select * into previous from public.missing_reunions
      where report_id = target_report_id;
    if found and previous.client_request_key = submission_key then
      return report_row.public_reference;
    end if;
    raise exception 'this missing report is already reunited' using errcode = '23514';
  end if;
  if report_row.status <> 'active' then
    raise exception 'only an active missing report can be reunited' using errcode = '23514';
  end if;
  select * into animal_row from public.animals
    where id = report_row.animal_id and owner_id = auth.uid() for update;
  if not found or animal_row.status <> 'missing' then
    raise exception 'the animal profile is not in an active missing state' using errcode = '23514';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'reunion details are required' using errcode = '23514';
  end if;
  reunited_time := nullif(payload ->> 'reunitedAt', '')::timestamptz;
  if reunited_time is null or reunited_time > now() + interval '5 minutes'
    or reunited_time < (select d.last_seen_at from public.missing_report_details d
      where d.report_id = target_report_id) then
    raise exception 'reunion time must follow the last sighting and not be in the future' using errcode = '23514';
  end if;
  place_value := nullif(trim(payload ->> 'place'), '');
  assistance_value := nullif(trim(payload ->> 'assistance'), '');
  if place_value is null or char_length(place_value) > 300
    or place_value ~ '[[:cntrl:]]' or (assistance_value is not null
      and (char_length(assistance_value) > 500 or assistance_value ~ '[[:cntrl:]]')) then
    raise exception 'enter a brief reunion place and optional assistance details' using errcode = '23514';
  end if;
  if payload ? 'publicStory' or payload ? 'photoPath' then
    raise exception 'public stories and photos need a separate consented flow' using errcode = '23514';
  end if;

  insert into public.missing_reunions (
    report_id, confirmed_by, client_request_key, reunited_at, reunion_place,
    assistance, veterinary_help_needed, public_story_consent
  ) values (
    target_report_id, auth.uid(), submission_key, reunited_time, place_value,
    assistance_value, coalesce((payload ->> 'veterinaryHelpNeeded')::boolean, false),
    coalesce((payload ->> 'publicStoryConsent')::boolean, false)
  );
  update public.missing_report_details set reunited_at = reunited_time
    where report_id = target_report_id;
  update public.reports set status = 'reunited', closed_at = now(), activity_at = now()
    where id = target_report_id;
  update public.animals set status = 'safe' where id = animal_row.id;
  insert into public.case_events (
    report_id, event_type, actor_id, visibility, public_message,
    previous_status, new_status
  ) values (
    target_report_id, 'reunited', auth.uid(), 'public',
    'The animal has been reunited. This missing alert is no longer active.',
    'active', 'reunited'
  );
  return report_row.public_reference;
end;
$$;
revoke all on function public.confirm_missing_reunion(uuid,jsonb,text) from public, anon;
grant execute on function public.confirm_missing_reunion(uuid,jsonb,text)
  to authenticated, service_role;

-- A reference remains useful after an alert ends, but the public lookup is
-- deliberately minimal: no animal identity, reporter, phone, photos, private
-- reunion place or historical location is returned.
create or replace function public.get_public_missing_outcome(
  target_report_id uuid default null, search_reference text default null
)
returns table (
  report_id uuid, public_reference text, status text,
  closed_at timestamptz, public_message text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if target_report_id is null and nullif(trim(search_reference), '') is null then
    raise exception 'report id or reference is required' using errcode = '22023';
  end if;
  return query
    select r.id, r.public_reference, r.status, r.closed_at,
      case when r.status = 'reunited'
        then 'This animal has been reunited. The missing alert is no longer active.'
        else 'This missing report is no longer active.' end
    from public.reports r
    where r.report_type = 'missing' and r.status in ('reunited', 'closed')
      and (target_report_id is null or r.id = target_report_id)
      and (search_reference is null or r.public_reference = upper(trim(search_reference)))
    limit 1;
end;
$$;
revoke all on function public.get_public_missing_outcome(uuid,text) from public;
grant execute on function public.get_public_missing_outcome(uuid,text)
  to anon, authenticated, service_role;

-- The existing deletion function removes private reunion detail and keeps
-- only the outcome of a reunited case in the minimal historical report row.
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
  delete from public.missing_reunions m using public.reports r
    where m.report_id = r.id and r.reporter_id = target_user_id;
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
  update public.reports set status = case when status = 'reunited' then 'reunited' else 'closed' end,
    closed_at = coalesce(closed_at, now()), activity_at = now(),
    reporter_id = null, title = null, summary = null
    where reporter_id = target_user_id and status <> 'draft';
  delete from public.profile_private where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
end;
$$;
revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;

commit;
