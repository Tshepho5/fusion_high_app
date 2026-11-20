export const ALLOWED_PROFILE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB raw upload cap
export const OUTPUT_AVATAR_SIZE_PX = 400;
export const MIN_CROP_ZOOM = 1;
export const MAX_CROP_ZOOM = 3;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProfileImageFile(file: { type?: string; size?: number; name?: string } | null | undefined): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }
  const mime = String(file.type || '').trim().toLowerCase();
  if (!ALLOWED_PROFILE_IMAGE_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPEG, PNG, or WebP picture.',
    };
  }
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, error: 'The selected image file is empty.' };
  }
  if (size > MAX_PROFILE_IMAGE_BYTES) {
    return { valid: false, error: 'Picture must be smaller than 5 MB.' };
  }
  return { valid: true };
}

export interface CropDimensions {
  naturalWidth: number;
  naturalHeight: number;
  viewportSize: number;
  zoom: number;
}

export interface CropOffset {
  x: number;
  y: number;
}

export function getRenderedImageSize({ naturalWidth, naturalHeight, viewportSize, zoom }: CropDimensions) {
  const safeW = Math.max(1, naturalWidth);
  const safeH = Math.max(1, naturalHeight);
  const clampedZoom = Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, zoom));
  // Base cover scale fills the entire square crop viewport
  const baseScale = Math.max(viewportSize / safeW, viewportSize / safeH);
  const scale = baseScale * clampedZoom;
  return {
    width: safeW * scale,
    height: safeH * scale,
    scale,
  };
}

export function clampCropOffset(offset: CropOffset, dims: CropDimensions): CropOffset {
  const { width, height } = getRenderedImageSize(dims);
  const maxX = Math.max(0, (width - dims.viewportSize) / 2);
  const maxY = Math.max(0, (height - dims.viewportSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)) + 0,
    y: Math.min(maxY, Math.max(-maxY, offset.y)) + 0,
  };
}

export function computeSourceCropRect(offset: CropOffset, dims: CropDimensions) {
  const clamped = clampCropOffset(offset, dims);
  const { width, height, scale } = getRenderedImageSize(dims);
  const imgLeftInViewport = (dims.viewportSize - width) / 2 + clamped.x;
  const imgTopInViewport = (dims.viewportSize - height) / 2 + clamped.y;

  const sx = Math.max(0, -imgLeftInViewport / scale);
  const sy = Math.max(0, -imgTopInViewport / scale);
  const sSize = dims.viewportSize / scale;

  return {
    sx: Math.min(dims.naturalWidth - 1, sx),
    sy: Math.min(dims.naturalHeight - 1, sy),
    sw: Math.min(dims.naturalWidth - sx, sSize),
    sh: Math.min(dims.naturalHeight - sy, sSize),
  };
}
