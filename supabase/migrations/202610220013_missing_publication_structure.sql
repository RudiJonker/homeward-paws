begin;

-- Publication storage is deliberately locked at this checkpoint. A later
-- migration adds the validated publishing transaction and narrow read API.
-- Creating these tables does not make an existing draft public.
create table public.missing_report_details (
  report_id uuid primary key references public.reports(id) on delete cascade,
  last_seen_at timestamptz not null,
  time_accuracy text not null check (time_accuracy in ('exact', 'approximate')),
  circumstance text not null check (circumstance in (
    'escaped_home', 'escaped_walk', 'escaped_vehicle', 'noise_weather',
    'wandered', 'suspected_stolen', 'another_property', 'transport_incident',
    'other', 'unknown'
  )),
  noticed_missing_at timestamptz,
  travelled_towards text check (travelled_towards is null or char_length(travelled_towards) <= 500),
  explanation text check (explanation is null or char_length(explanation) <= 2000),
  accessories text check (accessories is null or char_length(accessories) <= 500),
  appearance_notes text check (appearance_notes is null or char_length(appearance_notes) <= 1000),
  urgency_flags text[] not null default '{}',
  urgency_note text check (urgency_note is null or char_length(urgency_note) <= 500),
  approach_code text not null check (approach_code in ('unknown', 'safe', 'slowly', 'do_not_chase', 'do_not_catch')),
  bite_scratch_kick_risk boolean not null default false,
  approach_note text check (approach_note is null or char_length(approach_note) <= 500),
  contact_in_app boolean not null default true,
  contact_phone boolean not null default false,
  contact_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  constraint missing_detail_time_order check (noticed_missing_at is null or noticed_missing_at >= last_seen_at),
  constraint missing_detail_contact_required check (contact_in_app or contact_phone or contact_whatsapp)
);

-- Only public-facing animal facts belong in a report snapshot. Identifiers,
-- private health notes and ownership evidence must never be copied here.
create table public.report_animal_snapshots (
  report_id uuid primary key references public.reports(id) on delete cascade,
  source_animal_id uuid references public.animals(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (category in ('dog', 'cat', 'bird', 'horse', 'donkey', 'rabbit', 'reptile', 'small_mammal', 'farm_animal', 'other', 'unsure')),
  species text,
  breed text,
  sex text check (sex is null or sex in ('female', 'male', 'unknown')),
  approximate_age_years smallint check (approximate_age_years is null or approximate_age_years between 0 and 100),
  size text check (size is null or size in ('tiny', 'small', 'medium', 'large', 'giant', 'unknown')),
  primary_colours text[] not null default '{}',
  secondary_colours text[] not null default '{}',
  pattern text,
  coat_description text,
  distinctive_features text,
  accessories text,
  current_appearance text,
  created_at timestamptz not null default now()
);

-- Report photos will be independent copies in the private report-photos
-- bucket. Never make source animal-profile Storage paths publicly readable.
create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  source_animal_photo_id uuid references public.animal_photos(id) on delete set null,
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  display_order smallint not null check (display_order between 0 and 2),
  photo_type text not null default 'general' check (photo_type in ('face', 'full_body', 'distinctive_feature', 'general')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  unique (report_id, display_order)
);

-- Exact coordinates are stored only for controlled server-side use. The
-- later missing publication function must reject exact PUBLIC precision and
-- the public read surface must omit the coordinate columns entirely.
create table public.report_locations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  location_type text not null check (location_type in ('last_seen', 'found', 'sighting', 'current_whereabouts', 'transfer_destination', 'search_area', 'reunion')),
  province text not null check (char_length(trim(province)) between 1 and 100),
  city text not null check (char_length(trim(city)) between 1 and 120),
  suburb text not null check (char_length(trim(suburb)) between 1 and 120),
  street_or_landmark text check (street_or_landmark is null or char_length(street_or_landmark) <= 200),
  private_latitude numeric(9,6) check (private_latitude is null or private_latitude between -90 and 90),
  private_longitude numeric(9,6) check (private_longitude is null or private_longitude between -180 and 180),
  accuracy_m numeric(9,2) check (accuracy_m is null or accuracy_m >= 0),
  source text not null check (source in ('manual', 'home_area', 'device', 'map')),
  public_precision text not null check (public_precision in ('suburb', 'approximate', 'exact', 'private')),
  public_label text not null check (char_length(trim(public_label)) between 1 and 350),
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_location_coordinate_pair check ((private_latitude is null) = (private_longitude is null))
);

create unique index report_one_last_seen_location on public.report_locations(report_id)
where location_type = 'last_seen';

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) between 1 and 80),
  actor_id uuid references auth.users(id) on delete set null,
  visibility text not null check (visibility in ('public', 'participants', 'reporter', 'admin')),
  public_message text check (public_message is null or char_length(public_message) <= 1000),
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  previous_status text,
  new_status text,
  occurred_at timestamptz not null default now(),
  constraint private_case_event_has_no_public_message check (visibility = 'public' or public_message is null)
);

create index case_events_report_time_idx on public.case_events(report_id, occurred_at desc);
create index report_photos_report_order_idx on public.report_photos(report_id, display_order);
create index report_locations_area_idx on public.report_locations(province, city, suburb);

alter table public.missing_report_details enable row level security;
alter table public.report_animal_snapshots enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_locations enable row level security;
alter table public.case_events enable row level security;

-- There are intentionally no client policies or grants yet. The service
-- role is reserved for controlled functions and Storage operations.
revoke all on public.missing_report_details, public.report_animal_snapshots,
  public.report_photos, public.report_locations, public.case_events
  from public, anon, authenticated;
grant select, insert, update, delete on public.missing_report_details,
  public.report_animal_snapshots, public.report_photos, public.report_locations,
  public.case_events to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
