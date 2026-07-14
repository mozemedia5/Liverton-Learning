/**
 * LogoLoader Component
 * 
 * A modern loading animation featuring a 3D Rubik's Cube that starts jumbled
 * and solves itself into Red, Green, and Blue observable sides within 1 second.
 */

interface LogoLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoLoader({ message = 'Loading...', size = 'md' }: LogoLoaderProps) {
  // Size configurations
  const sizeClasses = {
    sm: { container: 'h-16 w-16', cube: 'w-10 h-10', text: 'text-xs', offset: '20px' },
    md: { container: 'h-24 w-24', cube: 'w-16 h-16', text: 'text-sm', offset: '32px' },
    lg: { container: 'h-40 w-40', cube: 'w-28 h-28', text: 'text-base', offset: '56px' }
  };

  const currentSize = sizeClasses[size];

  // Colors mapping
  const colors: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    orange: '#f97316',
    white: '#ffffff'
  };

  // Helper to generate 9 stickers for a face
  const renderStickers = (targetColorKey: string, faceIndex: number) => {
    return Array(9).fill(0).map((_, i) => {
      const colorKeys = Object.keys(colors);
      // Initial jumbled color
      const initialColorKey = colorKeys[(faceIndex + i + Math.floor(Math.random() * 6)) % colorKeys.length];

      return (
        <div
          key={i}
          className="w-full h-full border-[0.5px] border-black/30 rounded-[1px] animate-solve-cube"
          style={{
            '--initial-color': colors[initialColorKey],
            '--target-color': colors[targetColorKey],
            animationDelay: `${Math.random() * 0.2}s`
          } as any}
        />
      );
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-background">
      <div className="flex flex-col items-center gap-8">
        {/* Animated Cube Container */}
        <div className="relative flex items-center justify-center">
          {/* Background glow effect */}
          <div className={`absolute inset-0 ${currentSize.container} bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-2xl animate-pulse`}></div>
          
          {/* 3D Rubik's Cube */}
          <div className={`${currentSize.cube} relative z-10 preserve-3d animate-cube-rotate`}>
            {/* Front - Red */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateY(0deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('red', 0)}
            </div>
            {/* Back - Orange */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateY(180deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('orange', 1)}
            </div>
            {/* Right - Blue */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateY(90deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('blue', 2)}
            </div>
            {/* Left - White */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateY(-90deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('white', 3)}
            </div>
            {/* Top - Green (observable side) */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateX(90deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('green', 4)}
            </div>
            {/* Bottom - Yellow */}
            <div className="cube-face grid grid-cols-3 gap-[1px] p-[1px] bg-black/20"
                 style={{ transform: `rotateX(-90deg) translateZ(${currentSize.offset})` }}>
              {renderStickers('yellow', 5)}
            </div>
          </div>
          
          {/* Orbiting ring */}
          <div className={`absolute ${currentSize.container} border-2 border-dashed border-blue-500/20 dark:border-blue-400/10 rounded-full animate-spin-slow`}></div>
        </div>

        {/* Loading Message */}
        <div className="flex flex-col items-center gap-3">
          <p className={`${currentSize.text} font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400 animate-pulse`}>
            {message}
          </p>
          
          {/* Progress bar style loader */}
          <div className="w-32 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full animate-progress-loading"></div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .preserve-3d {
          transform-style: preserve-3d;
        }

        .cube-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: visible;
        }

        @keyframes cube-rotate {
          0% { transform: rotateX(-25deg) rotateY(45deg); }
          100% { transform: rotateX(-25deg) rotateY(405deg); }
        }

        @keyframes solve-cube {
          0% {
            background-color: var(--initial-color);
            transform: scale(1);
          }
          50% {
            transform: scale(0.9);
          }
          100% {
            background-color: var(--target-color);
            transform: scale(1);
          }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes progress-loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }

        .animate-cube-rotate {
          animation: cube-rotate 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .animate-solve-cube {
          animation: solve-cube 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-progress-loading {
          animation: progress-loading 2s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
