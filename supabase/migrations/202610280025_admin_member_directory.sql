begin;

-- The private beta dashboard needs a narrow account list. Only an active
-- administrator may call this function; member email addresses stay out of
-- the public Data API and the regular profile read surface.
create function public.admin_member_directory()
returns table (
  first_name text,
  email text,
  created_at timestamptz,
  email_confirmed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
    select profile.first_name,
           account.email::text,
           account.created_at,
           account.email_confirmed_at is not null
    from auth.users as account
    left join public.profiles as profile on profile.id = account.id
    where account.deleted_at is null
    order by account.created_at desc;
end;
$$;

revoke all on function public.admin_member_directory() from public, anon;
grant execute on function public.admin_member_directory() to authenticated, service_role;

commit;
