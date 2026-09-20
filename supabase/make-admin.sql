-- Make an existing account an admin (dashboard access).
--
-- 1. Create the account first — either:
--      • Supabase dashboard → Authentication → Users → "Add user" → tick "Auto Confirm User", or
--      • sign up on the storefront (/account → "Create one").
-- 2. Put that account's email below and run this in the Supabase SQL editor.
--    (The SQL editor runs as the database owner, so the role-lock trigger allows it.)

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'PUT-YOUR-EMAIL-HERE');

-- Should show 1 row with role = admin:
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
