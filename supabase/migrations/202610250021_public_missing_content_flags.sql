begin;

-- A member can privately flag an active public missing report or one of its
-- public report photos. Full moderation actions remain in Checkpoint 5.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  report_id uuid not null references public.reports(id) on delete cascade,
  photo_path text,
  reason text not null check (reason in (
    'inaccurate', 'scam', 'harassment', 'private_information',
    'inappropriate_image', 'animal_sale', 'child_safety', 'other'
  )),
  description text check (description is null or (
    char_length(description) <= 500 and description !~ '[[:cntrl:]]'
  )),
  status text not null default 'submitted' check (
    status in ('submitted', 'reviewing', 'resolved', 'dismissed')
  ),
  priority smallint generated always as (
    case when reason = 'child_safety' then 0 else 1 end
  ) stored,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolution_note text
);
create unique index content_reports_one_reason_per_member_target
  on public.content_reports(reporter_id, report_id, coalesce(photo_path, ''), reason)
  where reporter_id is not null;
create index content_reports_queue_idx
  on public.content_reports(status, priority, created_at);

alter table public.content_reports enable row level security;
create policy content_reports_private_read
  on public.content_reports for select to authenticated
  using (public.is_active_member() and (
    reporter_id = auth.uid() or public.is_admin()
  ));
revoke all on public.content_reports from public, anon, authenticated;
grant select on public.content_reports to authenticated;
grant select, insert, update, delete on public.content_reports to service_role;

create or replace function public.submit_missing_content_report(
  target_report_id uuid, target_photo_path text,
  report_reason text, report_description text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  flag_id uuid;
  note text := nullif(trim(report_description), '');
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;
  if report_reason is null or report_reason not in (
    'inaccurate', 'scam', 'harassment', 'private_information',
    'inappropriate_image', 'animal_sale', 'child_safety', 'other'
  ) then
    raise exception 'choose a valid report reason' using errcode = '23514';
  end if;
  if target_photo_path is not null and (
    target_photo_path = '' or char_length(target_photo_path) > 500
  ) then
    raise exception 'invalid report photo' using errcode = '23514';
  end if;
  if note is not null and (char_length(note) > 500 or note ~ '[[:cntrl:]]') then
    raise exception 'description is too long or invalid' using errcode = '23514';
  end if;

  -- A lost response can be retried after the report has closed. The unique
  -- member/target/reason key also prevents duplicate queue entries.
  select id into flag_id from public.content_reports
    where reporter_id = auth.uid() and report_id = target_report_id
      and photo_path is not distinct from target_photo_path
      and reason = report_reason;
  if found then return flag_id; end if;

  if not exists (select 1 from public.reports r
    where r.id = target_report_id and r.report_type = 'missing'
      and r.status = 'active') then
    raise exception 'this public missing report is no longer available'
      using errcode = '23514';
  end if;
  if target_photo_path is not null and not exists (
    select 1 from public.report_photos p
    where p.report_id = target_report_id and p.storage_path = target_photo_path
      and p.visibility = 'public'
  ) then
    raise exception 'this public photo is not part of the report'
      using errcode = '23514';
  end if;

  insert into public.content_reports
    (reporter_id, report_id, photo_path, reason, description)
  values (auth.uid(), target_report_id, target_photo_path, report_reason, note)
  on conflict do nothing returning id into flag_id;
  if flag_id is null then
    select id into flag_id from public.content_reports
      where reporter_id = auth.uid() and report_id = target_report_id
        and photo_path is not distinct from target_photo_path
        and reason = report_reason;
  end if;
  return flag_id;
end;
$$;
revoke all on function public.submit_missing_content_report(uuid,text,text,text)
  from public, anon;
grant execute on function public.submit_missing_content_report(uuid,text,text,text)
  to authenticated, service_role;

-- Keep only the moderation signal when a flagger deletes their account.
-- Reports aimed at the deleted member's content become irrelevant once its
-- public content and report photos are removed.
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
  delete from public.content_reports c using public.reports r
    where c.report_id = r.id and r.reporter_id = target_user_id;
  update public.content_reports set reporter_id = null, description = null
    where reporter_id = target_user_id;
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
