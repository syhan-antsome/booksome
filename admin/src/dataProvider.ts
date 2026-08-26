import type { DataProvider, Identifier, RaRecord } from 'react-admin';
import { HttpError } from 'react-admin';

import { authorizedRequest } from './api';

type PageResponse<RecordType extends RaRecord = RaRecord> = {
  data: RecordType[];
  total: number;
};

const mutableFields: Record<string, string[]> = {
  users: ['status'],
  rooms: ['visibility'],
  posts: ['moderationStatus', 'visibility'],
  reports: ['resolved'],
  listings: ['status'],
};

function listPath(resource: string, params: { pagination?: { page: number; perPage: number }; sort?: { field: string; order: string }; filter?: Record<string, unknown> }) {
  const search = new URLSearchParams({
    page: String(params.pagination?.page || 1),
    perPage: String(params.pagination?.perPage || 25),
    sort: params.sort?.field || 'createdAt',
    order: params.sort?.order || 'DESC',
  });
  Object.entries(params.filter || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  return `/api/admin/${resource}?${search.toString()}`;
}

const provider = {
  async getList(resource: string, params: any) {
    return authorizedRequest<PageResponse>(listPath(resource, params), { signal: params.signal });
  },

  async getOne(resource: string, params: any) {
    const page = await authorizedRequest<PageResponse>(
      listPath(resource, {
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'createdAt', order: 'DESC' },
        filter: { q: String(params.id) },
      }),
      { signal: params.signal },
    );
    if (!page.data[0]) throw new HttpError('항목을 찾을 수 없습니다.', 404);
    return { data: page.data[0] };
  },

  async getMany(resource: string, params: any) {
    const records = await Promise.all(params.ids.map((id: Identifier) => provider.getOne(resource, { id })));
    return { data: records.map((result) => result.data) };
  },

  async getManyReference(resource: string, params: any) {
    return provider.getList(resource, {
      pagination: params.pagination,
      sort: params.sort,
      filter: { ...params.filter, [params.target]: params.id },
      meta: params.meta,
      signal: params.signal,
    });
  },

  async update(resource: string, params: any) {
    const fields = mutableFields[resource];
    if (!fields) throw new HttpError('이 항목은 콘솔에서 변경할 수 없습니다.', 405);
    const data = Object.fromEntries(fields.filter((field) => field in params.data).map((field) => [field, params.data[field]]));
    const updated = await authorizedRequest<RaRecord>(`/api/admin/${resource}/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return { data: updated };
  },

  async updateMany(resource: string, params: any) {
    const records = await Promise.all(
      params.ids.map((id: Identifier) => provider.update(resource, { id, data: params.data, previousData: {} })),
    );
    return { data: records.map((result) => result.data.id as Identifier) };
  },

  async create(_resource: string, _params: any) {
    throw new HttpError('운영 콘솔에서는 새 항목을 만들 수 없습니다.', 405);
  },

  async delete(_resource: string, _params: any) {
    throw new HttpError('운영 데이터는 삭제 대신 상태를 변경해주세요.', 405);
  },

  async deleteMany(_resource: string, _params: any) {
    throw new HttpError('운영 데이터는 일괄 삭제할 수 없습니다.', 405);
  },
};

export const dataProvider = provider as DataProvider;
