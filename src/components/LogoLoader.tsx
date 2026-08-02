/**
 * LogoLoader Component
 * 
 * A modern, extremely fast loading animation featuring the brand logo
 * with an elegant orbiting glow ring. Replaces the slow, heavy 3D Rubik's Cube.
 */

interface LogoLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoLoader({ message = 'Loading...', size = 'md' }: LogoLoaderProps) {
  // Size configurations
  const sizeClasses = {
    sm: { container: 'h-16 w-16', logo: 'w-10 h-10', text: 'text-xs' },
    md: { container: 'h-24 w-24', logo: 'w-16 h-16', text: 'text-sm' },
    lg: { container: 'h-40 w-40', logo: 'w-28 h-28', text: 'text-base' }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-background transition-colors duration-300">
      <div className="flex flex-col items-center gap-10">
        {/* Animated Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Background glow effect */}
          <div className={`absolute inset-0 ${currentSize.container} bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-2xl animate-pulse`}></div>
          
          {/* Brand Logo with pulse & scale transition */}
          <div className={`${currentSize.logo} relative z-10 transition-transform duration-300 hover:scale-110 flex items-center justify-center`}>
            <img
              src="/logo.png"
              alt="Liverton Learning Logo"
              className="w-full h-full object-contain animate-logo-pulse rounded-2xl"
              onError={(e) => {
                // Fallback if image not loaded yet
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          {/* Orbiting ring */}
          <div className={`absolute ${currentSize.container} border-2 border-dashed border-blue-500/30 dark:border-blue-400/25 rounded-full animate-spin-slow`}></div>
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
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes progress-loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }

        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.4)); }
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-progress-loading {
          animation: progress-loading 2s ease-in-out infinite;
        }

        .animate-logo-pulse {
          animation: logo-pulse 2s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
