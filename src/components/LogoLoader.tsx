/**
 * LogoLoader Component
 * 
 * A modern loading animation featuring the app logo with smooth pulse and rotate effects.
 * Displays while the app is initializing or loading content.
 */

interface LogoLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoLoader({ message = 'Loading...', size = 'md' }: LogoLoaderProps) {
  // Size configurations
  const sizeClasses = {
    sm: { container: 'h-12 w-12', text: 'text-xs' },
    md: { container: 'h-20 w-20', text: 'text-sm' },
    lg: { container: 'h-32 w-32', text: 'text-base' }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo Container */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className={`${currentSize.container} rounded-full border-4 border-gray-200 dark:border-gray-800 animate-spin-slow`}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rounded-full"></div>
          </div>
          
          {/* Middle pulsing ring */}
          <div className={`absolute inset-0 ${currentSize.container} rounded-full border-2 border-gray-300 dark:border-gray-700 animate-pulse`}></div>
          
          {/* Logo with pulse effect */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse-scale">
            <img 
              src="/icons/icon-192x192.png" 
              alt="Loading" 
              className="w-3/4 h-3/4 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Loading Message */}
        <div className="flex flex-col items-center gap-2">
          <p className={`${currentSize.text} font-medium text-gray-900 dark:text-white`}>
            {message}
          </p>
          
          {/* Animated dots */}
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-scale {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.95;
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
