import { Platform } from 'react-native';

import { apiRequest, getApiBaseUrl } from '../lib/api-client';

export type MediaUploadKind = 'avatar' | 'room-cover' | 'meetup-photo' | 'post-media';

type UploadImageAssetInput = {
  kind: MediaUploadKind;
  entityId: string;
  uri: string;
  ownerId: string;
  roomId?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
};

export type UploadedMediaAsset = {
  id: string;
  bucket: string;
  objectPath: string;
  mediaUrl: string;
};

type ReactNativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export async function uploadImageAsset(input: UploadImageAssetInput): Promise<UploadedMediaAsset> {
  const extension = getExtension(input.fileName ?? input.uri);
  const mimeType = input.mimeType ?? getMimeType(extension);
  const fileName = normalizeFileName(input.fileName, extension);
  const formData = new FormData();

  formData.append('kind', input.kind);
  if (typeof input.width === 'number' && input.width > 0) {
    formData.append('width', String(Math.round(input.width)));
  }
  if (typeof input.height === 'number' && input.height > 0) {
    formData.append('height', String(Math.round(input.height)));
  }

  if (Platform.OS === 'web') {
    const imageResponse = await fetch(input.uri);
    if (!imageResponse.ok) {
      throw new Error('선택한 이미지를 읽을 수 없습니다.');
    }
    formData.append('file', await imageResponse.blob(), fileName);
  } else {
    const nativeFile: ReactNativeUploadFile = {
      uri: input.uri,
      name: fileName,
      type: mimeType,
    };
    formData.append('file', nativeFile as unknown as Blob);
  }

  return apiRequest<UploadedMediaAsset>('/api/media/images', {
    method: 'POST',
    body: formData,
  });
}

export function getMediaUrl(objectPath: string) {
  if (/^https?:\/\//i.test(objectPath)) {
    return objectPath;
  }
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${getApiBaseUrl()}/api/media/${encodedPath}`;
}

function normalizeFileName(fileName: string | null | undefined, extension: string) {
  const cleanName = fileName?.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '-') ?? '';
  return cleanName || `booksome-upload.${extension}`;
}

function getExtension(value: string) {
  const cleanValue = value.split('?')[0] ?? value;
  const match = cleanValue.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();

  if (extension === 'jpeg') return 'jpg';
  if (extension && ['jpg', 'png', 'webp'].includes(extension)) return extension;
  return 'jpg';
}

function getMimeType(extension: string) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}
