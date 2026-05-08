-- Removes exact GPS coordinate storage from BookSome bookstore listings.
-- Run this once in Supabase SQL Editor if marketplace tables already exist.

drop index if exists public.market_listings_location_idx;

alter table public.market_listings
  drop column if exists latitude,
  drop column if exists longitude;

drop policy if exists "Users read their market listings" on public.market_listings;
create policy "Users read their market listings"
on public.market_listings for select
to authenticated
using (seller_id = auth.uid());
