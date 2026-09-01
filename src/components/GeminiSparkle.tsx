import React from 'react';

interface GeminiSparkleProps {
  size?: number;
  className?: string;
  animating?: boolean;
  alt?: string;
}

/**
 * Official 4-pointed Gemini Sparkle component.
 * Features a continuous animated gradient loop (blue #4285F4 -> purple #9B51E0 -> pink #EA4335).
 */
export const GeminiSparkle: React.FC<GeminiSparkleProps> = ({
  size = 24,
  className = '',
  animating = true,
  alt = 'Gemini',
}) => {
  const gradientId = React.useId();

  return (
    <div
      aria-label={alt}
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full ${animating ? 'animate-pulse' : ''}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4">
              {animating && (
                <animate
                  attributeName="stop-color"
                  values="#4285F4;#9B51E0;#EA4335;#4285F4"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </stop>
            <stop offset="50%" stopColor="#9B51E0">
              {animating && (
                <animate
                  attributeName="stop-color"
                  values="#9B51E0;#EA4335;#4285F4;#9B51E0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </stop>
            <stop offset="100%" stopColor="#EA4335">
              {animating && (
                <animate
                  attributeName="stop-color"
                  values="#EA4335;#4285F4;#9B51E0;#EA4335"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </stop>
          </linearGradient>
        </defs>
        {/* 4-pointed sparkle curve path */}
        <path
          d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z"
          fill={`url(#${gradientId})`}
        />
      </svg>
    </div>
  );
};

export default GeminiSparkle;
