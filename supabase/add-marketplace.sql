-- Adds BookSome bookstore listings and direct inquiry chat.
-- Run this once in Supabase SQL Editor.

do $$ begin
  create type public.market_listing_type as enum ('offer', 'wanted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.market_listing_status as enum ('available', 'reserved', 'completed', 'hidden');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  type public.market_listing_type not null default 'offer',
  title text not null,
  author text,
  isbn13 text,
  description text,
  condition_label text,
  price integer,
  area_label text not null,
  image_url text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  status public.market_listing_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_listings_price_check
    check (price is null or price >= 0),
  constraint market_listings_offer_price_check
    check (type <> 'offer' or price is not null)
);

create table if not exists public.market_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_threads_unique_listing_buyer unique (listing_id, buyer_id),
  constraint market_threads_not_self_check check (buyer_id <> seller_id)
);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.market_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists market_listings_status_created_at_idx
on public.market_listings(status, created_at desc);

create index if not exists market_listings_seller_id_created_at_idx
on public.market_listings(seller_id, created_at desc);

create index if not exists market_threads_participants_idx
on public.market_threads(buyer_id, seller_id, updated_at desc);

create index if not exists market_messages_thread_id_created_at_idx
on public.market_messages(thread_id, created_at asc);

alter table public.market_listings enable row level security;
alter table public.market_threads enable row level security;
alter table public.market_messages enable row level security;

drop policy if exists "Market listings are publicly readable" on public.market_listings;
create policy "Market listings are publicly readable"
on public.market_listings for select
using (status <> 'hidden');

drop policy if exists "Users create their market listings" on public.market_listings;
create policy "Users create their market listings"
on public.market_listings for insert
to authenticated
with check (seller_id = auth.uid());

drop policy if exists "Users update their market listings" on public.market_listings;
create policy "Users update their market listings"
on public.market_listings for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists "Users delete their market listings" on public.market_listings;
create policy "Users delete their market listings"
on public.market_listings for delete
to authenticated
using (seller_id = auth.uid());

drop policy if exists "Market thread participants can read" on public.market_threads;
create policy "Market thread participants can read"
on public.market_threads for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "Buyers create market threads" on public.market_threads;
create policy "Buyers create market threads"
on public.market_threads for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and exists (
    select 1
    from public.market_listings listing
    where listing.id = market_threads.listing_id
      and listing.seller_id = market_threads.seller_id
      and listing.seller_id <> auth.uid()
      and listing.status = 'available'
  )
);

drop policy if exists "Market thread participants can update" on public.market_threads;
create policy "Market thread participants can update"
on public.market_threads for update
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid())
with check (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "Market message participants can read" on public.market_messages;
create policy "Market message participants can read"
on public.market_messages for select
to authenticated
using (
  exists (
    select 1
    from public.market_threads thread
    where thread.id = market_messages.thread_id
      and (thread.buyer_id = auth.uid() or thread.seller_id = auth.uid())
  )
);

drop policy if exists "Market message participants can create" on public.market_messages;
create policy "Market message participants can create"
on public.market_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.market_threads thread
    where thread.id = market_messages.thread_id
      and (thread.buyer_id = auth.uid() or thread.seller_id = auth.uid())
  )
);
