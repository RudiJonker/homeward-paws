begin;

-- The public website does not offer direct owner contact. Project only the
-- fields it renders, so names and opted-in phone/WhatsApp never reach its
-- browser network response. The app's existing public RPCs are unchanged.
create function public.get_website_missing_reports(
  result_limit integer default 20,
  result_offset integer default 0,
  filter_province text default null,
  filter_city text default null,
  filter_suburb text default null,
  filter_category text default null,
  search_reference text default null
)
returns table (
  public_reference text,
  published_at timestamptz,
  animal_name text,
  category text,
  breed text,
  public_location text,
  last_seen_at timestamptz,
  time_accuracy text,
  circumstance text,
  approach_code text,
  bite_scratch_kick_risk boolean,
  photo_paths text[],
  accessories text,
  current_appearance text,
  distinctive_features text,
  travelled_towards text,
  explanation text,
  urgency_flags text[],
  urgency_note text,
  approach_note text,
  public_timeline jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if nullif(trim(search_reference), '') is not null then
    return query
      select r.public_reference, r.published_at, r.animal_name,
        r.category, r.breed, r.public_location, r.last_seen_at,
        r.time_accuracy, r.circumstance, r.approach_code,
        r.bite_scratch_kick_risk, r.photo_paths, r.accessories,
        r.current_appearance, r.distinctive_features,
        r.travelled_towards, r.explanation, r.urgency_flags,
        r.urgency_note, r.approach_note, r.public_timeline
      from public.get_public_missing_reports(
        result_limit, result_offset, null, search_reference) as r;
  else
    return query
      select r.public_reference, r.published_at, r.animal_name,
        r.category, r.breed, r.public_location, r.last_seen_at,
        r.time_accuracy, r.circumstance, r.approach_code,
        r.bite_scratch_kick_risk, r.photo_paths, r.accessories,
        r.current_appearance, r.distinctive_features,
        r.travelled_towards, r.explanation, r.urgency_flags,
        r.urgency_note, r.approach_note, r.public_timeline
      from public.filter_public_missing_reports(
        result_limit, result_offset, filter_province, filter_city,
        filter_suburb, filter_category) as r;
  end if;
end;
$$;

revoke all on function public.get_website_missing_reports(
  integer, integer, text, text, text, text, text
) from public, anon;
grant execute on function public.get_website_missing_reports(
  integer, integer, text, text, text, text, text
) to anon, authenticated, service_role;

commit;
