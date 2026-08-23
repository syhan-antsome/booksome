import { apiRequest } from '../lib/api-client';

export type Meetup = {
  id: string;
  hostId: string | null;
  title: string;
  description: string | null;
  startingBookTitle: string | null;
  startingBookAuthor: string | null;
  startingBookPublisher: string | null;
  startingBookTranslator: string | null;
  startingBookIsbn: string | null;
  startingBookCoverUrl: string | null;
  city: string | null;
  status: 'draft' | 'scheduled' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type CreateMeetupInput = {
  hostId: string;
  title: string;
  startingBookTitle?: string | null;
  startingBookAuthor?: string | null;
  startingBookPublisher?: string | null;
  startingBookTranslator?: string | null;
  startingBookIsbn?: string | null;
  startingBookCoverUrl?: string | null;
  city: string;
  description?: string | null;
};

export function listMeetups() {
  return apiRequest<Meetup[]>('/api/meetups', {}, { authenticated: 'optional' });
}

export function createMeetup(input: CreateMeetupInput) {
  return apiRequest<Meetup>('/api/meetups', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title.trim(),
      startingBookTitle: input.startingBookTitle?.trim() || null,
      startingBookAuthor: input.startingBookAuthor?.trim() || null,
      startingBookPublisher: input.startingBookPublisher?.trim() || null,
      startingBookTranslator: input.startingBookTranslator?.trim() || null,
      startingBookIsbn: normalizeIsbn(input.startingBookIsbn ?? ''),
      startingBookCoverUrl: input.startingBookCoverUrl ?? null,
      city: input.city.trim(),
      description: input.description?.trim() || null,
    }),
  });
}

function normalizeIsbn(value: string) {
  const normalizedValue = value.replace(/[^0-9X]/gi, '').toUpperCase();
  return normalizedValue || null;
}
