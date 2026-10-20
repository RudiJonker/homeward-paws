begin;

-- Supabase Storage upserts require SELECT in addition to INSERT/UPDATE.
drop policy if exists avatar_select_own on storage.objects;
create policy avatar_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Keep Data API access explicit for fresh projects, resets and preview branches.
-- RLS remains the row-level authority; these grants only expose permitted verbs.
revoke all on public.profiles from anon;
revoke all on public.profile_private from anon;

grant select on public.profiles to authenticated;
grant update (display_name, first_name, last_name, avatar_path) on public.profiles to authenticated;
grant select on public.profile_private to authenticated;
grant update (mobile_e164, whatsapp_enabled) on public.profile_private to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.profile_private to service_role;

commit;
