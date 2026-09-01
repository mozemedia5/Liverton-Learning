import React, { useState } from 'react';
import { Download, Maximize2, X, Eye } from 'lucide-react';
import { type HannaImageResult } from '@/lib/hannaResearch';

interface GeminiMediaGridProps {
  images: HannaImageResult[];
  onPreview?: (image: HannaImageResult) => void;
  onDownload?: (image: HannaImageResult) => void;
  onDelete?: (image: HannaImageResult) => void;
  className?: string;
}

export const GeminiMediaGrid: React.FC<GeminiMediaGridProps> = ({
  images,
  onPreview,
  onDownload,
  onDelete,
  className = '',
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<HannaImageResult | null>(null);

  if (!images || images.length === 0) return null;

  const handlePreview = (img: HannaImageResult) => {
    setFullscreenImage(img);
    onPreview?.(img);
  };

  // Single Image Rendering
  if (images.length === 1) {
    const image = images[0];
    return (
      <div className={`gemini-image-wrapper relative group overflow-hidden rounded-[24px] border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20] w-full max-h-[400px] ${className}`}>
        <img
          src={image.url || image.thumbnailUrl}
          alt={image.title || 'Generated or uploaded visual'}
          className="w-full h-full max-h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Hover/Touch Utility Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-end p-3 gap-2 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => handlePreview(image)}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
            title="Expand image"
            aria-label="Expand image"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(image)}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
              title="Download asset"
              aria-label="Download asset"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(image)}
              className="grid h-9 w-9 place-items-center rounded-full bg-red-600/80 text-white hover:bg-red-600 transition transform hover:scale-110"
              title="Delete item"
              aria-label="Delete item"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dual Images (2)
  if (images.length === 2) {
    return (
      <div className={`gemini-image-wrapper grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-[24px] overflow-hidden ${className}`}>
        {images.map((img, idx) => (
          <div key={img.url || idx} className="relative group overflow-hidden rounded-[20px] border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20] h-52">
            <img
              src={img.url || img.thumbnailUrl}
              alt={img.title || `Media item ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-end p-2.5 gap-2 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => handlePreview(img)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
                aria-label="Expand"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(img)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
                  aria-label="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(img)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-red-600/80 text-white hover:bg-red-600 transition transform hover:scale-110"
                  aria-label="Delete"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Multi-Image Grid (3+ images) & Mobile Swipeable Carousel (<480px)
  return (
    <>
      {/* Mobile Swipeable Carousel (<480px Viewport) */}
      <div className="block min-[480px]:hidden w-full overflow-x-auto snap-x snap-mandatory flex gap-3 pb-2 scrollbar-none">
        {images.map((img, idx) => (
          <div
            key={img.url || idx}
            className="snap-center shrink-0 w-[82vw] max-w-[320px] h-60 relative group rounded-[20px] overflow-hidden border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20]"
          >
            <img
              src={img.url || img.thumbnailUrl}
              alt={img.title || `Visual ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end p-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreview(img)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Expand image"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(img)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                  aria-label="Download asset"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Asymmetrical Mosaic Grid (>=480px Viewport) */}
      <div className={`hidden min-[480px]:grid gemini-image-wrapper grid-cols-3 gap-2.5 rounded-[24px] overflow-hidden ${className}`}>
        {/* Dominant Large Left Image Block */}
        <div className="col-span-2 relative group overflow-hidden rounded-[20px] border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20] h-64">
          <img
            src={images[0].url || images[0].thumbnailUrl}
            alt={images[0].title || 'Primary visual'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-end p-3 gap-2 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => handlePreview(images[0])}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
              aria-label="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(images[0])}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90 transition transform hover:scale-110"
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Vertical Stack of Smaller Square Images */}
        <div className="col-span-1 flex flex-col gap-2.5 h-64">
          {images.slice(1, 3).map((img, idx) => (
            <div key={img.url || idx} className="relative flex-1 group overflow-hidden rounded-[18px] border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20]">
              <img
                src={img.url || img.thumbnailUrl}
                alt={img.title || `Secondary visual ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={() => handlePreview(img)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/90"
                  aria-label="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/15 bg-[#131314] p-2 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2.5 text-white hover:bg-black transition"
              aria-label="Close fullscreen"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="max-h-[78vh] w-full object-contain rounded-[20px]"
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-white truncate max-w-md">
                {fullscreenImage.title || 'Visual Asset'}
              </span>
              {onDownload && (
                <button
                  onClick={() => onDownload(fullscreenImage)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-200 transition"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GeminiMediaGrid;
