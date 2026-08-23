import { apiRequest } from '../lib/api-client';

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

export type MarketThreadSummary = {
  thread: MarketThread;
  listing: MarketListing | null;
  latestMessage: MarketMessage | null;
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
  imageUrl?: string | null;
  mediaAssetId?: string | null;
};

export type UpdateMarketListingInput = {
  sellerId: string;
  listingId: string;
  type: MarketListingType;
  title: string;
  author?: string | null;
  isbn13?: string | null;
  description?: string | null;
  conditionLabel?: string | null;
  price?: number | null;
  areaLabel: string;
  imageUrl?: string | null;
  mediaAssetId?: string | null;
};

type MarketListingEnvelope = { listing: MarketListing | null };
type MarketThreadEnvelope = { thread: MarketThread | null };

export function listMarketListings(filter: MarketListingFilter = 'all') {
  return apiRequest<MarketListing[]>(
    `/api/market/listings?filter=${encodeURIComponent(filter)}`,
    {},
    { authenticated: 'optional' },
  );
}

export async function listMyMarketListings(profileId: string) {
  void profileId;
  return apiRequest<MarketListing[]>('/api/market/my-listings');
}

export async function getMarketListing(listingId: string) {
  const response = await apiRequest<MarketListingEnvelope>(
    `/api/market/listings/${encodeURIComponent(listingId)}`,
    {},
    { authenticated: 'optional' },
  );
  return response.listing;
}

export async function updateMarketListingStatus(
  profileId: string,
  listingId: string,
  status: MarketListingStatus,
) {
  void profileId;
  return apiRequest<MarketListing>(`/api/market/listings/${encodeURIComponent(listingId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function createMarketListing(input: CreateMarketListingInput) {
  void input.sellerId;
  return apiRequest<MarketListing>('/api/market/listings', {
    method: 'POST',
    body: JSON.stringify(listingPayload(input)),
  });
}

export async function updateMarketListing(input: UpdateMarketListingInput) {
  void input.sellerId;
  return apiRequest<MarketListing>(`/api/market/listings/${encodeURIComponent(input.listingId)}`, {
    method: 'PUT',
    body: JSON.stringify(listingPayload(input)),
  });
}

export async function getOrCreateMarketThread(profileId: string, listing: MarketListing) {
  if (profileId === listing.sellerId) {
    throw new Error('내가 올린 책에는 문의할 수 없습니다.');
  }
  return apiRequest<MarketThread>(
    `/api/market/listings/${encodeURIComponent(listing.id)}/thread`,
    { method: 'POST' },
  );
}

export async function getMarketThread(profileId: string, threadId: string) {
  void profileId;
  const response = await apiRequest<MarketThreadEnvelope>(
    `/api/market/threads/${encodeURIComponent(threadId)}`,
  );
  return response.thread;
}

export async function listMarketThreadSummaries(profileId: string): Promise<MarketThreadSummary[]> {
  void profileId;
  return apiRequest<MarketThreadSummary[]>('/api/market/threads');
}

export async function listMarketMessages(threadId: string) {
  return apiRequest<MarketMessage[]>(
    `/api/market/threads/${encodeURIComponent(threadId)}/messages`,
  );
}

export async function sendMarketMessage(threadId: string, senderId: string, body: string) {
  void senderId;
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error('메시지를 입력해주세요.');
  return apiRequest<MarketMessage>(
    `/api/market/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body: cleanBody }),
    },
  );
}

function listingPayload(input: CreateMarketListingInput | UpdateMarketListingInput) {
  return {
    type: input.type,
    title: input.title.trim(),
    author: input.author?.trim() || null,
    isbn13: normalizeIsbn(input.isbn13 ?? ''),
    description: input.description?.trim() || null,
    conditionLabel: input.conditionLabel?.trim() || null,
    price: input.type === 'offer' ? Math.max(0, Math.round(input.price ?? 0)) : null,
    areaLabel: input.areaLabel.trim(),
    imageUrl: input.imageUrl ?? null,
    mediaAssetId: input.mediaAssetId ?? null,
  };
}

function normalizeIsbn(value: string) {
  const isbn = value.replace(/[^0-9X]/gi, '').toUpperCase();
  return isbn || null;
}
