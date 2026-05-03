import { supabase } from '../lib/supabase';

export type MarketListingType = 'offer' | 'wanted';
export type MarketListingStatus = 'available' | 'reserved' | 'completed' | 'hidden';
export type MarketListingFilter = 'all' | 'sale' | 'free' | 'wanted';

export type MarketListing = {
  id: string;
  sellerId: string;
  type: MarketListingType;
  title: string;
  author: string | null;
  isbn13: string | null;
  description: string | null;
  conditionLabel: string | null;
  price: number | null;
  areaLabel: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  mediaAssetId: string | null;
  status: MarketListingStatus;
  createdAt: string;
  updatedAt: string;
};

export type MarketThread = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type CreateMarketListingInput = {
  sellerId: string;
  type: MarketListingType;
  title: string;
  author?: string | null;
  isbn13?: string | null;
  description?: string | null;
  conditionLabel?: string | null;
  price?: number | null;
  areaLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  mediaAssetId?: string | null;
};

type MarketListingRow = {
  id: string;
  seller_id: string;
  type: MarketListingType;
  title: string;
  author: string | null;
  isbn13: string | null;
  description: string | null;
  condition_label: string | null;
  price: number | null;
  area_label: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  media_asset_id: string | null;
  status: MarketListingStatus;
  created_at: string;
  updated_at: string;
};

type MarketThreadRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
};

type MarketMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const marketListingSelect =
  'id, seller_id, type, title, author, isbn13, description, condition_label, price, area_label, latitude, longitude, image_url, media_asset_id, status, created_at, updated_at';
const marketThreadSelect = 'id, listing_id, buyer_id, seller_id, created_at, updated_at';
const marketMessageSelect = 'id, thread_id, sender_id, body, created_at';

export async function listMarketListings(filter: MarketListingFilter = 'all') {
  let query = supabase
    .from('market_listings')
    .select(marketListingSelect)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(80);

  if (filter === 'wanted') {
    query = query.eq('type', 'wanted');
  } else if (filter === 'free') {
    query = query.eq('type', 'offer').eq('price', 0);
  } else if (filter === 'sale') {
    query = query.eq('type', 'offer').gt('price', 0);
  }

  const { data, error } = await query.returns<MarketListingRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMarketListing);
}

export async function getMarketListing(listingId: string) {
  const { data, error } = await supabase
    .from('market_listings')
    .select(marketListingSelect)
    .eq('id', listingId)
    .maybeSingle<MarketListingRow>();

  if (error) {
    throw error;
  }

  return data ? mapMarketListing(data) : null;
}

export async function createMarketListing(input: CreateMarketListingInput) {
  const payload = {
    seller_id: input.sellerId,
    type: input.type,
    title: input.title.trim(),
    author: input.author?.trim() || null,
    isbn13: normalizeIsbn(input.isbn13 ?? ''),
    description: input.description?.trim() || null,
    condition_label: input.conditionLabel?.trim() || null,
    price: input.type === 'offer' ? Math.max(0, Math.round(input.price ?? 0)) : null,
    area_label: input.areaLabel.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    image_url: input.imageUrl ?? null,
    media_asset_id: input.mediaAssetId ?? null,
  };

  const { data, error } = await supabase
    .from('market_listings')
    .insert(payload)
    .select(marketListingSelect)
    .single<MarketListingRow>();

  if (error) {
    throw error;
  }

  return mapMarketListing(data);
}

export async function getOrCreateMarketThread(profileId: string, listing: MarketListing) {
  if (profileId === listing.sellerId) {
    throw new Error('내가 올린 책에는 문의할 수 없습니다.');
  }

  const existing = await getMarketThreadForListing(profileId, listing.id);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('market_threads')
    .insert({
      listing_id: listing.id,
      buyer_id: profileId,
      seller_id: listing.sellerId,
    })
    .select(marketThreadSelect)
    .single<MarketThreadRow>();

  if (error) {
    if (isUniqueViolation(error)) {
      const retry = await getMarketThreadForListing(profileId, listing.id);
      if (retry) return retry;
    }

    throw error;
  }

  return mapMarketThread(data);
}

export async function getMarketThread(profileId: string, threadId: string) {
  const { data, error } = await supabase
    .from('market_threads')
    .select(marketThreadSelect)
    .eq('id', threadId)
    .or(`buyer_id.eq.${profileId},seller_id.eq.${profileId}`)
    .maybeSingle<MarketThreadRow>();

  if (error) {
    throw error;
  }

  return data ? mapMarketThread(data) : null;
}

export async function listMarketMessages(threadId: string) {
  const { data, error } = await supabase
    .from('market_messages')
    .select(marketMessageSelect)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .returns<MarketMessageRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMarketMessage);
}

export async function sendMarketMessage(threadId: string, senderId: string, body: string) {
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error('메시지를 입력해주세요.');
  }

  const { data, error } = await supabase
    .from('market_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      body: cleanBody,
    })
    .select(marketMessageSelect)
    .single<MarketMessageRow>();

  if (error) {
    throw error;
  }

  await supabase
    .from('market_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return mapMarketMessage(data);
}

async function getMarketThreadForListing(profileId: string, listingId: string) {
  const { data, error } = await supabase
    .from('market_threads')
    .select(marketThreadSelect)
    .eq('listing_id', listingId)
    .eq('buyer_id', profileId)
    .maybeSingle<MarketThreadRow>();

  if (error) {
    throw error;
  }

  return data ? mapMarketThread(data) : null;
}

function mapMarketListing(row: MarketListingRow): MarketListing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    type: row.type,
    title: row.title,
    author: row.author,
    isbn13: row.isbn13,
    description: row.description,
    conditionLabel: row.condition_label,
    price: row.price,
    areaLabel: row.area_label,
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url,
    mediaAssetId: row.media_asset_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketThread(row: MarketThreadRow): MarketThread {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketMessage(row: MarketMessageRow): MarketMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function normalizeIsbn(value: string) {
  const isbn = value.replace(/[^0-9X]/gi, '').toUpperCase();
  return isbn || null;
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
