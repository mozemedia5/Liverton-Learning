import React from 'react';

interface AskHannaIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
}

/**
 * AskHannaIcon Component
 * Custom high-fidelity icon styled EXACTLY like the user-provided image
 * but utilizing SALAF theme colors (emerald/gold) instead of blue.
 * Includes a beautiful rounded-square black container, "Ask Hanna" text on top,
 * and a glowing neon organic ring below.
 */
export const AskHannaIcon: React.FC<AskHannaIconProps> = ({
  size = 40,
  showText = true,
  className = '',
  ...props
}) => {
  // Compute appropriate font size and layout based on the size prop
  const textFontSize = Math.max(8, Math.floor(size * 0.12));
  const textY = Math.floor(size * 0.25);

  // Dynamically center and scale the glowing circle if the text is hidden
  const circleCenterY = showText ? Math.floor(size * 0.62) : Math.floor(size * 0.5);
  const circleRadius = showText ? Math.floor(size * 0.22) : Math.floor(size * 0.32);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      {...props}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={size * 0.04} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={size * 0.03} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradients */}
        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Main black rounded squircle/container */}
      <rect
        width={size}
        height={size}
        rx={size * 0.24}
        fill="#000000"
      />

      {/* "Ask Hanna" text placed beautifully at the top */}
      {showText && (
        <text
          x="50%"
          y={textY}
          fill="#FFFFFF"
          textAnchor="middle"
          fontWeight="bold"
          fontSize={textFontSize}
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.02em"
        >
          Ask Hanna
        </text>
      )}

      {/* Glowing Neon Ring/Orb - Multi-layered organic filaments (exactly like the image) */}
      <g filter="url(#emeraldGlow)">
        {/* Primary Emerald Ring */}
        <circle
          cx="50%"
          cy={circleCenterY}
          r={circleRadius}
          stroke="url(#emeraldGrad)"
          strokeWidth={Math.max(1.5, size * 0.02)}
          fill="none"
          opacity="0.95"
        />

        {/* Outer thicker glowing halo */}
        <circle
          cx="50%"
          cy={circleCenterY}
          r={circleRadius}
          stroke="#10b981"
          strokeWidth={Math.max(1, size * 0.015)}
          fill="none"
          opacity="0.4"
        />
      </g>

      <g filter="url(#goldGlow)">
        {/* First gold overlay filament (slightly offset for organic/hand-drawn look) */}
        <ellipse
          cx={size * 0.49}
          cy={circleCenterY}
          rx={circleRadius * 1.02}
          ry={circleRadius * 0.98}
          stroke="url(#goldGrad)"
          strokeWidth={Math.max(0.8, size * 0.012)}
          fill="none"
          transform={`rotate(15, ${size * 0.5}, ${circleCenterY})`}
          opacity="0.85"
        />

        {/* Second emerald/gold filament crossing over */}
        <ellipse
          cx={size * 0.51}
          cy={circleCenterY * 0.99}
          rx={circleRadius * 0.97}
          ry={circleRadius * 1.03}
          stroke="#10b981"
          strokeWidth={Math.max(0.6, size * 0.01)}
          fill="none"
          transform={`rotate(-25, ${size * 0.5}, ${circleCenterY})`}
          opacity="0.75"
        />

        {/* Dynamic bright highlight filament */}
        <path
          d={`
            M ${size * 0.5 - circleRadius} ${circleCenterY}
            A ${circleRadius * 0.99} ${circleRadius * 1.01} 0 0 1 ${size * 0.5 + circleRadius} ${circleCenterY}
          `}
          stroke="#FFFFFF"
          strokeWidth={Math.max(0.5, size * 0.008)}
          fill="none"
          opacity="0.9"
        />
      </g>
    </svg>
  );
};

export default AskHannaIcon;
