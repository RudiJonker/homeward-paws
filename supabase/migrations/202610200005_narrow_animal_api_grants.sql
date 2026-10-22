begin;

-- Existing projects created before Supabase changed public-schema defaults can
-- inherit broad authenticated grants. Remove them before applying our allowlist.
revoke all on public.animals, public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos from authenticated;

grant select on public.animals to authenticated;
grant insert (id, owner_id, name, category, species, breed, mixed_breed, sex, birth_date, approximate_age_years, age_estimated_at, size, approximate_weight_kg, relationship, primary_colours, secondary_colours, pattern, coat_description, eye_colour, ears_description, tail_description, distinctive_features, sterilised, microchipped) on public.animals to authenticated;
grant update (name, category, species, breed, mixed_breed, sex, birth_date, approximate_age_years, age_estimated_at, size, approximate_weight_kg, relationship, primary_colours, secondary_colours, pattern, coat_description, eye_colour, ears_description, tail_description, distinctive_features, sterilised, microchipped) on public.animals to authenticated;
grant select, insert, update, delete on public.animal_private_details, public.animal_health_flags, public.animal_behaviour_flags, public.animal_photos to authenticated;

commit;
