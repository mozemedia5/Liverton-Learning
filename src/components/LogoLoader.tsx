/**
 * LogoLoader Component
 * 
 * A modern loading animation featuring the app logo with a spinning effect
 * similar to Qwen AI, where the logo itself rotates.
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-background">
      <div className="flex flex-col items-center gap-8">
        {/* Animated Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Background glow effect */}
          <div className={`absolute inset-0 ${currentSize.container} bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-2xl animate-pulse`}></div>
          
          {/* Rotating Logo */}
          <div className={`${currentSize.logo} relative z-10 animate-spin-3d`}>
            <img 
              src="/icons/icon-512x512.png" 
              alt="Loading" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
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
        @keyframes spin-3d {
          from {
            transform: rotateY(0deg);
          }
          to {
            transform: rotateY(360deg);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes progress-loading {
          0% {
            width: 0%;
            transform: translateX(-100%);
          }
          50% {
            width: 100%;
            transform: translateX(0%);
          }
          100% {
            width: 0%;
            transform: translateX(100%);
          }
        }

        .animate-spin-3d {
          animation: spin-3d 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          perspective: 1000px;
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
