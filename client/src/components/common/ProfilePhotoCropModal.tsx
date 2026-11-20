import React, { useEffect, useRef, useState } from 'react';
import { Crop, Move, RotateCcw, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  OUTPUT_AVATAR_SIZE_PX,
  clampCropOffset,
  computeSourceCropRect,
  getRenderedImageSize,
  type CropOffset,
} from '../../utils/profilePhotoCrop';

interface ProfilePhotoCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  uploading?: boolean;
  onCancel: () => void;
  onSave: (croppedFile: File) => Promise<void> | void;
}

const CROP_VIEWPORT_PX = 272;

export const ProfilePhotoCropModal: React.FC<ProfilePhotoCropModalProps> = ({
  isOpen,
  imageFile,
  uploading = false,
  onCancel,
  onSave,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageFile) {
      setImageUrl('');
      setNaturalSize(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setLoadError(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setLoadError(null);
    return () => URL.revokeObjectURL(url);
  }, [isOpen, imageFile]);

  if (!isOpen || !imageFile) return null;

  const dims = naturalSize
    ? {
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
        viewportSize: CROP_VIEWPORT_PX,
        zoom,
      }
    : null;

  const rendered = dims ? getRenderedImageSize(dims) : null;
  const clampedOffset = dims ? clampCropOffset(offset, dims) : { x: 0, y: 0 };

  const handleZoomChange = (nextZoom: number) => {
    const safeZoom = Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, Number(nextZoom.toFixed(2))));
    setZoom(safeZoom);
    if (naturalSize) {
      setOffset((prev) =>
        clampCropOffset(prev, {
          naturalWidth: naturalSize.width,
          naturalHeight: naturalSize.height,
          viewportSize: CROP_VIEWPORT_PX,
          zoom: safeZoom,
        })
      );
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dims || uploading || processing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: clampedOffset.x,
      startY: clampedOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current || !dims) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    setOffset(
      clampCropOffset(
        { x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy },
        dims
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    setDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(zoom + delta);
  };

  const handleConfirmSave = async () => {
    if (!imgRef.current || !dims) return;
    setProcessing(true);
    setLoadError(null);
    try {
      const rect = computeSourceCropRect(clampedOffset, dims);
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_AVATAR_SIZE_PX;
      canvas.height = OUTPUT_AVATAR_SIZE_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is not supported in this browser.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        imgRef.current,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        OUTPUT_AVATAR_SIZE_PX,
        OUTPUT_AVATAR_SIZE_PX
      );

      const outputMime = imageFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputMime, outputMime === 'image/jpeg' ? 0.88 : undefined)
      );
      if (!blob) throw new Error('Failed to generate cropped profile image.');

      const ext = outputMime === 'image/png' ? 'png' : 'jpg';
      const croppedFile = new File([blob], `profile-avatar.${ext}`, { type: outputMime });
      await onSave(croppedFile);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not process the selected image.');
    } finally {
      setProcessing(false);
    }
  };

  const busy = uploading || processing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile picture"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0D1520] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#168BFF]/15 text-[#168BFF] flex items-center justify-center border border-[#168BFF]/25">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Adjust Profile Picture
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Drag to reposition and use the slider to zoom.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Cancel profile picture crop"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop viewport */}
        <div className="p-5 space-y-4">
          {loadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs font-medium">
              {loadError}
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{ width: CROP_VIEWPORT_PX, height: CROP_VIEWPORT_PX }}
              className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-white/15 select-none touch-none ${
                dragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {imageUrl && (
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Profile crop preview"
                  draggable={false}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setNaturalSize({ width: el.naturalWidth, height: el.naturalHeight });
                  }}
                  onError={() => setLoadError('Could not load this image file. Please choose another JPEG, PNG, or WebP picture.')}
                  style={
                    rendered
                      ? {
                          width: `${rendered.width}px`,
                          height: `${rendered.height}px`,
                          left: `${(CROP_VIEWPORT_PX - rendered.width) / 2 + clampedOffset.x}px`,
                          top: `${(CROP_VIEWPORT_PX - rendered.height) / 2 + clampedOffset.y}px`,
                        }
                      : undefined
                  }
                  className="absolute max-w-none pointer-events-none select-none"
                />
              )}

              {/* Circular crop guide overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.58)]"
              />
            </div>

            <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Move className="w-3.5 h-3.5 text-[#168BFF]" />
              <span>Drag inside the circle to center your photo</span>
            </p>
          </div>

          {/* Zoom & Reset controls */}
          <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Zoom ({Math.round(zoom * 100)}%)</span>
              <button
                type="button"
                disabled={busy}
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[#0878E8] dark:text-[#7CC4FF] hover:underline cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={busy || zoom <= MIN_CROP_ZOOM}
                onClick={() => handleZoomChange(zoom - 0.15)}
                aria-label="Zoom out"
                className="p-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-[#168BFF] cursor-pointer disabled:opacity-40"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                aria-label="Zoom level"
                min={MIN_CROP_ZOOM}
                max={MAX_CROP_ZOOM}
                step={0.05}
                value={zoom}
                disabled={busy}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-[#168BFF] cursor-pointer"
              />
              <button
                type="button"
                disabled={busy || zoom >= MAX_CROP_ZOOM}
                onClick={() => handleZoomChange(zoom + 0.15)}
                aria-label="Zoom in"
                className="p-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-[#168BFF] cursor-pointer disabled:opacity-40"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !naturalSize || Boolean(loadError)}
            onClick={handleConfirmSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] text-white text-always-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Save &amp; Upload Picture</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
