begin;

-- Apply administrative-area and animal-type filters before pagination. The
-- final rows still come from the existing privacy-limited public projection.
create or replace function public.filter_public_missing_reports(
  result_limit integer default 20,
  result_offset integer default 0,
  filter_province text default null,
  filter_city text default null,
  filter_suburb text default null,
  filter_category text default null
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
  with candidates as materialized (
    select r.id, r.activity_at
    from public.reports r
    join public.report_animal_snapshots s on s.report_id = r.id
    join public.missing_report_details d on d.report_id = r.id
    join public.report_locations l on l.report_id = r.id
      and l.location_type = 'last_seen'
    where r.report_type = 'missing' and r.status = 'active'
      and l.public_precision in ('suburb', 'approximate')
      and (nullif(trim(filter_province), '') is null
        or lower(trim(l.province)) = lower(trim(filter_province)))
      and (nullif(trim(filter_city), '') is null
        or lower(trim(l.city)) = lower(trim(filter_city)))
      and (nullif(trim(filter_suburb), '') is null
        or lower(trim(l.suburb)) = lower(trim(filter_suburb)))
      and (nullif(trim(filter_category), '') is null
        or s.category = lower(trim(filter_category)))
    order by r.activity_at desc, r.id desc
    limit least(greatest(coalesce(result_limit, 20), 1), 100)
    offset greatest(coalesce(result_offset, 0), 0)
  )
  select public_report.*
  from candidates c
  cross join lateral public.get_public_missing_reports(1, 0, c.id, null)
    public_report
  order by c.activity_at desc, c.id desc;
$$;

revoke all on function public.filter_public_missing_reports(
  integer, integer, text, text, text, text
) from public;
grant execute on function public.filter_public_missing_reports(
  integer, integer, text, text, text, text
) to anon, authenticated, service_role;

commit;
