-- Bug found live 2026-09-22: footer newsletter signup gets 42501 (RLS
-- violation) on every submit, even though schema.sql already defines an
-- "anyone can subscribe" insert policy with check(true). The deployed
-- database doesn't have it (or has an older/stricter version) — same class
-- of drift as 0005. Reasserts the intended policy.
drop policy if exists "anyone can subscribe" on public.newsletter_signups;
create policy "anyone can subscribe"
  on public.newsletter_signups for insert
  with check (true);
