export type ReadingImageCropTarget = 'photo' | 'highlight';

export type ReadingImageCropAsset = {
  fileName?: string | null;
  height?: number | null;
  mimeType?: string | null;
  uri: string;
  width?: number | null;
};

export type ReadingImageCropRequest = {
  asset: ReadingImageCropAsset;
  bookId: string;
  shouldReplace: boolean;
  target: ReadingImageCropTarget;
  token: string;
};

export type ReadingImageCropResult = {
  asset: ReadingImageCropAsset;
  shouldReplace: boolean;
  target: ReadingImageCropTarget;
  token: string;
};

let currentRequest: ReadingImageCropRequest | null = null;
let currentResult: ReadingImageCropResult | null = null;

export function createReadingImageCropRequest(
  input: Omit<ReadingImageCropRequest, 'token'>,
): ReadingImageCropRequest {
  const token = `reading-crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  currentRequest = {
    ...input,
    token,
  };
  currentResult = null;
  return currentRequest;
}

export function getReadingImageCropRequest(token?: string | null) {
  if (!token || currentRequest?.token !== token) return null;
  return currentRequest;
}

export function completeReadingImageCrop(result: ReadingImageCropResult) {
  currentResult = result;
  currentRequest = null;
}

export function consumeReadingImageCropResult(token?: string | null) {
  if (!currentResult) return null;
  if (token && currentResult.token !== token) return null;

  const result = currentResult;
  currentResult = null;
  return result;
}

export function clearReadingImageCropRequest(token?: string | null) {
  if (!token || currentRequest?.token === token) {
    currentRequest = null;
  }
}
