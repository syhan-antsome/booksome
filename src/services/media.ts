import { supabase } from '../lib/supabase';

export type MediaUploadKind = 'avatar' | 'room-cover' | 'meetup-photo' | 'post-media';

type UploadRequestResponse = {
  kind: MediaUploadKind;
  entityId: string;
  objectKey: string;
  maxBytes: number;
  uploadUrl: string;
  acceptedMimeTypes: string[];
};

type UploadBlobResponse = {
  ok: true;
  objectKey: string;
  bucket: string;
  mediaUrl: string;
};

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

const mediaApiUrl = process.env.EXPO_PUBLIC_MEDIA_API_URL;

export async function uploadImageAsset(input: UploadImageAssetInput): Promise<UploadedMediaAsset> {
  if (!mediaApiUrl) {
    throw new Error('Missing EXPO_PUBLIC_MEDIA_API_URL');
  }

  const extension = getExtension(input.fileName ?? input.uri);
  const mimeType = input.mimeType ?? getMimeType(extension);

  const uploadRequest = await requestUpload({
    kind: input.kind,
    entityId: input.entityId,
    extension,
    mimeType,
  });

  const imageResponse = await fetch(input.uri);
  const blob = await imageResponse.blob();

  if (blob.size > uploadRequest.maxBytes) {
    throw new Error('선택한 이미지가 업로드 허용 용량을 초과했습니다.');
  }

  const uploaded = await uploadBlob(uploadRequest.uploadUrl, blob, mimeType);

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      owner_id: input.ownerId,
      room_id: input.roomId ?? null,
      bucket: uploaded.bucket,
      object_path: uploaded.objectKey,
      mime_type: mimeType,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .select('id, bucket, object_path')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    bucket: data.bucket,
    objectPath: data.object_path,
    mediaUrl: getMediaUrl(data.object_path),
  };
}

export function getMediaUrl(objectPath: string) {
  if (!mediaApiUrl) {
    throw new Error('Missing EXPO_PUBLIC_MEDIA_API_URL');
  }

  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${mediaApiUrl.replace(/\/$/, '')}/v1/media/${encodedPath}`;
}

async function requestUpload(payload: {
  kind: MediaUploadKind;
  entityId: string;
  extension: string;
  mimeType: string;
}) {
  const response = await fetch(`${mediaApiUrl}/v1/uploads/request`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`업로드 요청 생성에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as UploadRequestResponse;
}

async function uploadBlob(uploadUrl: string, blob: Blob, mimeType: string) {
  const targetUrl = uploadUrl.startsWith('http')
    ? uploadUrl
    : `${mediaApiUrl?.replace(/\/$/, '')}${uploadUrl}`;

  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      'content-type': mimeType,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`이미지 업로드에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as UploadBlobResponse;
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
