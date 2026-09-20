-- KurdishTCG sells in Iraqi dinars (IQD) only, in whole dinars.
--
-- Existing product prices were entered as USD (3.75, 24.00, …). This converts
-- them ONCE and flips the shop currency to IQD. It only runs while
-- settings.currency is still 'USD', so re-running it will not convert twice.
--
-- >>> EDIT `rate` (IQD per 1 USD) BEFORE RUNNING. <<<
-- Prices are rounded to the nearest 250 IQD (the smallest banknote).
-- Run in the Supabase SQL editor. Past orders keep the currency they were made in.

do $$
declare
  rate constant numeric := 1500;
begin
  if (select currency from public.settings where id) = 'USD' then
    update public.products
    set price = case
      when price = 0 then 0
      else greatest(250, round(price * rate / 250) * 250)
    end;

    update public.settings set currency = 'IQD', updated_at = now() where id;
  end if;
end $$;

-- New orders default to IQD (the storefront also sends it explicitly).
alter table public.orders alter column currency set default 'IQD';
alter table public.settings alter column currency set default 'IQD';
