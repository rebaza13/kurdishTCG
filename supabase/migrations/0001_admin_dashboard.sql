-- KurdishTCG — changes the admin dashboard needs on top of
-- frontend/src/lib/supabase/schema.sql.
--
-- Run once in the Supabase SQL editor (or via the Supabase MCP server).
-- Safe to re-run.

-- 1. Dashboard "Settings" page: admins may edit the single settings row.
--    (schema.sql only had a public SELECT policy, so saves silently did nothing.)
drop policy if exists "admins update settings" on public.settings;
create policy "admins update settings"
  on public.settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- 3. SECURITY: stop customers promoting themselves to admin.
--    The "users update their own profile" policy allowed changing any column,
--    including `role`. Only an admin (or the SQL editor / service role, where
--    auth.uid() is null) may change a role.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- 2. "Out for delivery" order status, between confirmed and delivered.
--    ADD VALUE can't run inside a transaction block with other statements that
--    use it, so keep this as its own statement.
alter type public.order_status add value if not exists 'shipped' after 'confirmed';
