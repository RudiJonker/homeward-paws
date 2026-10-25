begin;

-- Closure is not reunion. Keep the reason and any explanation in an
-- owner/admin-only record; the public outcome stays generic.
create table public.missing_closures (
  report_id uuid primary key references public.reports(id) on delete cascade,
  closed_by uuid references auth.users(id) on delete set null,
  client_request_key text not null check (client_request_key ~ '^[A-Za-z0-9_-]{12,100}$'),
  reason_code text not null check (reason_code in (
    'mistake', 'duplicate', 'incorrect_information', 'withdrawn', 'sensitive_other'
  )),
  private_note text check (private_note is null or char_length(private_note) <= 500),
  animal_safe_confirmed boolean not null default false,
  recorded_at timestamptz not null default now(),
  constraint missing_closure_safe_requires_error_reason check (
    not animal_safe_confirmed or reason_code in ('mistake', 'incorrect_information')
  )
);
alter table public.missing_closures enable row level security;
create policy missing_closures_owner_admin_read on public.missing_closures
  for select to authenticated using (public.is_active_member() and (
    exists (select 1 from public.reports r
      where r.id = report_id and r.reporter_id = auth.uid())
    or public.is_admin()
  ));
revoke all on public.missing_closures from public, anon, authenticated;
grant select on public.missing_closures to authenticated;
grant select, insert, update, delete on public.missing_closures to service_role;

create or replace function public.close_missing_report(
  target_report_id uuid, payload jsonb, submission_key text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  report_row public.reports%rowtype;
  animal_row public.animals%rowtype;
  previous public.missing_closures%rowtype;
  reason_value text;
  note_value text;
  safe_value boolean;
begin
  if not public.is_active_member() or not exists (
    select 1 from public.profiles where id = auth.uid() and profile_completed
  ) then
    raise exception 'a completed, active member profile is required' using errcode = '42501';
  end if;
  if submission_key is null or submission_key !~ '^[A-Za-z0-9_-]{12,100}$' then
    raise exception 'invalid closure request key' using errcode = '23514';
  end if;
  select * into report_row from public.reports
    where id = target_report_id and report_type = 'missing'
      and reporter_id = auth.uid() for update;
  if not found then
    raise exception 'missing report not found or access denied' using errcode = '42501';
  end if;
  if report_row.status = 'closed' then
    select * into previous from public.missing_closures
      where report_id = target_report_id;
    if found and previous.client_request_key = submission_key then
      return report_row.public_reference;
    end if;
    raise exception 'this missing report is already closed' using errcode = '23514';
  end if;
  if report_row.status <> 'active' then
    raise exception 'only an active missing report can be closed' using errcode = '23514';
  end if;
  select * into animal_row from public.animals
    where id = report_row.animal_id and owner_id = auth.uid() for update;
  if not found or animal_row.status <> 'missing' then
    raise exception 'the animal profile is not in an active missing state' using errcode = '23514';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'closure details are required' using errcode = '23514';
  end if;
  reason_value := payload ->> 'reasonCode';
  note_value := nullif(trim(payload ->> 'privateNote'), '');
  if reason_value is null or reason_value not in (
    'mistake', 'duplicate', 'incorrect_information', 'withdrawn', 'sensitive_other'
  ) or (note_value is not null and (
    char_length(note_value) > 500 or note_value ~ '[[:cntrl:]]'
  )) then
    raise exception 'choose a valid reason and brief private note' using errcode = '23514';
  end if;
  if jsonb_typeof(payload -> 'animalSafeConfirmed') is distinct from 'boolean' then
    raise exception 'confirm whether the animal is known to be safe' using errcode = '23514';
  end if;
  safe_value := (payload ->> 'animalSafeConfirmed')::boolean;
  if safe_value and reason_value not in ('mistake', 'incorrect_information') then
    raise exception 'safe confirmation is only available when correcting an erroneous report' using errcode = '23514';
  end if;

  insert into public.missing_closures (
    report_id, closed_by, client_request_key, reason_code, private_note,
    animal_safe_confirmed
  ) values (
    target_report_id, auth.uid(), submission_key, reason_value, note_value,
    safe_value
  );
  update public.reports set status = 'closed', closed_at = now(), activity_at = now()
    where id = target_report_id;
  if safe_value then
    update public.animals set status = 'safe' where id = animal_row.id;
  end if;
  insert into public.case_events (
    report_id, event_type, actor_id, visibility, public_message,
    previous_status, new_status
  ) values (
    target_report_id, 'closed_without_reunion', auth.uid(), 'public',
    'This missing report is no longer active.', 'active', 'closed'
  );
  return report_row.public_reference;
end;
$$;
revoke all on function public.close_missing_report(uuid,jsonb,text) from public, anon;
grant execute on function public.close_missing_report(uuid,jsonb,text)
  to authenticated, service_role;

-- Account deletion must remove the private cold-case reason before it
-- anonymises the public historical report row.
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
  delete from public.missing_closures c using public.reports r
    where c.report_id = r.id and r.reporter_id = target_user_id;
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
