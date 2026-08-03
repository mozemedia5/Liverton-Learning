import { useState } from 'react';
import { cn } from '@/lib/utils';
import { optimizeCloudinaryUrl } from '@/services/cloudinaryService';

interface CloudinaryImageProps {
  /** Media URL (any URL works; Cloudinary URLs are auto-optimized) */
  src?: string;
  alt: string;
  /** CSS aspect-ratio of the reserved box, e.g. '16/9', '1/1', '3/1'. Prevents layout shift. */
  aspect?: string;
  /** Responsive widths to generate in the srcSet */
  widths?: number[];
  /** sizes attribute for the browser to pick the right srcSet candidate */
  sizes?: string;
  /** Classes applied to the <img> element */
  className?: string;
  /** Classes applied to the reserving wrapper element */
  wrapperClassName?: string;
  /** Rendered when no src is provided or the image fails to load */
  fallback?: React.ReactNode;
  /** Load eagerly (for above-the-fold hero images). Default: lazy. */
  eager?: boolean;
  crop?: 'fill' | 'limit' | 'fit' | 'scale' | 'thumb';
  gravity?: string;
}

const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1600];

/**
 * Professional image display component:
 * optimized delivery, responsive srcSet, lazy loading, and a reserved
 * aspect-ratio box so content never jumps while images load.
 */
export function CloudinaryImage({
  src,
  alt,
  aspect,
  widths = DEFAULT_WIDTHS,
  sizes,
  className,
  wrapperClassName,
  fallback,
  eager = false,
  crop = 'fill',
  gravity = 'auto',
}: CloudinaryImageProps) {
  const [failed, setFailed] = useState(false);

  const showFallback = !src || failed;

  const largest = Math.max(...widths);
  const optimizedSrc = src ? optimizeCloudinaryUrl(src, { width: largest, crop, gravity }) : '';
  const srcSet = src
    ? widths
        .map(w => `${optimizeCloudinaryUrl(src, { width: w, crop, gravity })} ${w}w`)
        .join(', ')
    : undefined;

  const image = showFallback ? (
    <>{fallback ?? null}</>
  ) : (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('w-full h-full object-cover', className)}
    />
  );

  if (!aspect) {
    return image;
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden', wrapperClassName)}
      style={{ aspectRatio: aspect }}
    >
      {image}
    </div>
  );
}
