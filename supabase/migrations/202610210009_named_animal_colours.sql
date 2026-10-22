begin;

-- Convert the earlier free-text arrays to stable colour codes. Unknown shades
-- become "other"; their original wording is retained in pattern/markings.
do $$
declare
  animal_record record;
  raw_value text;
  token text;
  original_token text;
  colour_code text;
  primary_codes text[];
  secondary_codes text[];
  unknown_values text[];
begin
  for animal_record in
    select id, primary_colours, secondary_colours, pattern from public.animals
  loop
    primary_codes := '{}';
    secondary_codes := '{}';
    unknown_values := '{}';

    foreach raw_value in array animal_record.primary_colours loop
      foreach token in array regexp_split_to_array(coalesce(raw_value, ''), '(?i)[[:space:]]*(,|/|&|[[:space:]]+and[[:space:]]+)[[:space:]]*') loop
        original_token := trim(token);
        token := lower(original_token);
        if token = '' then continue; end if;
        colour_code := case token
          when 'gray' then 'grey' when 'silver' then 'grey'
          when 'beige' then 'cream' when 'buff' then 'tan'
          when 'blonde' then 'golden' when 'gold' then 'golden'
          when 'rust' then 'ginger' when 'auburn' then 'red'
          when 'black' then 'black' when 'white' then 'white'
          when 'grey' then 'grey' when 'brown' then 'brown'
          when 'tan' then 'tan' when 'cream' then 'cream'
          when 'golden' then 'golden' when 'ginger' then 'ginger'
          when 'red' then 'red' when 'orange' then 'orange'
          when 'yellow' then 'yellow' when 'green' then 'green'
          when 'blue' then 'blue' when 'other' then 'other'
          when 'unsure' then 'unsure' else 'other' end;
        if colour_code = 'other' and token <> 'other' and not (original_token = any(unknown_values)) then
          unknown_values := array_append(unknown_values, original_token);
        end if;
        if not (colour_code = any(primary_codes)) then
          primary_codes := array_append(primary_codes, colour_code);
        end if;
      end loop;
    end loop;

    foreach raw_value in array animal_record.secondary_colours loop
      foreach token in array regexp_split_to_array(coalesce(raw_value, ''), '(?i)[[:space:]]*(,|/|&|[[:space:]]+and[[:space:]]+)[[:space:]]*') loop
        original_token := trim(token);
        token := lower(original_token);
        if token = '' then continue; end if;
        colour_code := case token
          when 'gray' then 'grey' when 'silver' then 'grey'
          when 'beige' then 'cream' when 'buff' then 'tan'
          when 'blonde' then 'golden' when 'gold' then 'golden'
          when 'rust' then 'ginger' when 'auburn' then 'red'
          when 'black' then 'black' when 'white' then 'white'
          when 'grey' then 'grey' when 'brown' then 'brown'
          when 'tan' then 'tan' when 'cream' then 'cream'
          when 'golden' then 'golden' when 'ginger' then 'ginger'
          when 'red' then 'red' when 'orange' then 'orange'
          when 'yellow' then 'yellow' when 'green' then 'green'
          when 'blue' then 'blue' when 'other' then 'other'
          when 'unsure' then 'unsure' else 'other' end;
        if colour_code = 'other' and token <> 'other' and not (original_token = any(unknown_values)) then
          unknown_values := array_append(unknown_values, original_token);
        end if;
        if not (colour_code = any(primary_codes)) and not (colour_code = any(secondary_codes)) then
          secondary_codes := array_append(secondary_codes, colour_code);
        end if;
      end loop;
    end loop;

    if cardinality(primary_codes) > 1 then
      secondary_codes := primary_codes[2:cardinality(primary_codes)] || secondary_codes;
      primary_codes := primary_codes[1:1];
    end if;
    if cardinality(primary_codes) = 0 and 'unsure' = any(secondary_codes) then
      primary_codes := array['unsure'];
    end if;
    secondary_codes := array_remove(secondary_codes, 'unsure');

    update public.animals set
      primary_colours = primary_codes,
      secondary_colours = secondary_codes,
      pattern = case when cardinality(unknown_values) = 0 then pattern
        else concat_ws(' · ', nullif(pattern, ''), 'Other colour description: ' || array_to_string(unknown_values, ', ')) end
    where id = animal_record.id
      and (primary_colours is distinct from primary_codes
        or secondary_colours is distinct from secondary_codes
        or cardinality(unknown_values) > 0);
  end loop;
end;
$$;

alter table public.animals
  add constraint animals_primary_colour_codes check (
    cardinality(primary_colours) <= 1 and
    primary_colours <@ array['black','white','grey','brown','tan','cream','golden','ginger','red','orange','yellow','green','blue','other','unsure']::text[]
  ),
  add constraint animals_secondary_colour_codes check (
    secondary_colours <@ array['black','white','grey','brown','tan','cream','golden','ginger','red','orange','yellow','green','blue','other','unsure']::text[]
  );

commit;
