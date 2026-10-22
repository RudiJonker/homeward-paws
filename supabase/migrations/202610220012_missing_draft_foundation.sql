begin;

-- A report starts as a private draft. Public incident tables, snapshots and
-- publishing are added in the next stage; no draft can be read anonymously.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('missing', 'found', 'sighting')),
  status text not null default 'draft' check (status in ('draft', 'active', 'reunited', 'closed', 'hidden')),
  reporter_id uuid references auth.users(id) on delete set null,
  animal_id uuid references public.animals(id) on delete set null,
  public_reference text unique,
  title text,
  summary text,
  draft_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_payload) = 'object'),
  published_at timestamptz,
  activity_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_draft_consistent check (
    (status = 'draft' and reporter_id is not null and animal_id is not null
      and public_reference is null and published_at is null)
    or (status <> 'draft' and public_reference is not null and published_at is not null
      and draft_payload = '{}'::jsonb)
  )
);

create unique index reports_one_missing_draft_per_animal
on public.reports(animal_id) where report_type = 'missing' and status = 'draft';
create unique index reports_one_active_missing_per_animal
on public.reports(animal_id) where report_type = 'missing' and status = 'active';
create index reports_reporter_status_idx on public.reports(reporter_id, status, updated_at desc);
create index reports_public_activity_idx on public.reports(report_type, status, activity_at desc)
where status <> 'draft';

create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
create policy reports_owner_select on public.reports for select to authenticated
using ((reporter_id = auth.uid() and public.is_active_member())
  or (status <> 'draft' and public.is_admin()));

revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;
grant select, insert, update, delete on public.reports to service_role;

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
  if not exists (
    select 1 from public.animals
    where id = target_animal_id and owner_id = auth.uid() and status = 'safe'
  ) then
    raise exception 'only a safe animal can start a missing report' using errcode = '23514';
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

create or replace function public.delete_missing_draft(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'active member required' using errcode = '42501';
  end if;
  delete from public.reports
  where id = target_report_id and report_type = 'missing' and status = 'draft'
    and reporter_id = auth.uid();
  if not found then
    raise exception 'missing report draft not found or access denied' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.save_missing_draft(uuid, jsonb, uuid) from public, anon;
grant execute on function public.save_missing_draft(uuid, jsonb, uuid) to authenticated, service_role;
revoke all on function public.delete_missing_draft(uuid) from public, anon;
grant execute on function public.delete_missing_draft(uuid) to authenticated, service_role;

-- The account-deletion flow must remove unfinished drafts before it deletes
-- the profile. Published reports will be anonymised in the publication stage.
create or replace function public.delete_member_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required';
  end if;
  delete from public.reports
  where reporter_id = target_user_id and status = 'draft';
  delete from public.profile_private where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
end;
$$;

revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;

-- Deleting a source animal also discards its unfinished missing draft. A
-- published report, once supported, keeps its own snapshot and history.
create or replace function public.delete_animal_profile(target_animal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() or not public.owns_animal(target_animal_id) then
    raise exception 'animal not found or access denied' using errcode = '42501';
  end if;
  if exists (
    select 1 from storage.objects
    where bucket_id = 'animal-photos'
      and name like auth.uid()::text || '/' || target_animal_id::text || '/%'
  ) then
    raise exception 'animal photos must be removed first' using errcode = '23514';
  end if;

  delete from public.reports
  where animal_id = target_animal_id and report_type = 'missing'
    and status = 'draft' and reporter_id = auth.uid();
  delete from public.animals
  where id = target_animal_id and owner_id = auth.uid()
    and status in ('safe', 'archived');
  if not found then
    raise exception 'an animal with an active case cannot be deleted' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.delete_animal_profile(uuid) from public, anon;
grant execute on function public.delete_animal_profile(uuid) to authenticated, service_role;

commit;
