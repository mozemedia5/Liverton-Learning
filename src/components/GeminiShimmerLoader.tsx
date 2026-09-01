import React from 'react';

interface GeminiShimmerLoaderProps {
  statusText?: string;
  className?: string;
}

/**
 * Gemini Shimmer Skeleton Loader Component
 * Renders multi-layered skeleton text lines with continuous left-to-right color spectrum shifting animations.
 */
export const GeminiShimmerLoader: React.FC<GeminiShimmerLoaderProps> = ({
  statusText,
  className = '',
}) => {
  return (
    <div className={`space-y-3 w-full max-w-2xl py-2 ${className}`}>
      {statusText && (
        <p className="text-xs font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#9B51E0] to-[#EA4335] animate-pulse">
          {statusText}
        </p>
      )}
      <div className="space-y-2.5">
        {/* Skeleton Line 1 (Full Width) */}
        <div
          className="h-3.5 w-full rounded-full animate-[shimmer_2s_infinite_linear]"
          style={{
            background:
              'linear-gradient(90deg, rgba(66, 133, 244, 0.15) 0%, rgba(155, 81, 224, 0.35) 50%, rgba(234, 67, 53, 0.15) 100%)',
            backgroundSize: '200% 100%',
          }}
        />
        {/* Skeleton Line 2 (85% Width) */}
        <div
          className="h-3.5 w-[85%] rounded-full animate-[shimmer_2s_infinite_linear]"
          style={{
            background:
              'linear-gradient(90deg, rgba(155, 81, 224, 0.15) 0%, rgba(234, 67, 53, 0.35) 50%, rgba(66, 133, 244, 0.15) 100%)',
            backgroundSize: '200% 100%',
            animationDelay: '0.2s',
          }}
        />
        {/* Skeleton Line 3 (60% Width) */}
        <div
          className="h-3.5 w-[60%] rounded-full animate-[shimmer_2s_infinite_linear]"
          style={{
            background:
              'linear-gradient(90deg, rgba(234, 67, 53, 0.15) 0%, rgba(66, 133, 244, 0.35) 50%, rgba(155, 81, 224, 0.15) 100%)',
            backgroundSize: '200% 100%',
            animationDelay: '0.4s',
          }}
        />
      </div>
    </div>
  );
};

export default GeminiShimmerLoader;
