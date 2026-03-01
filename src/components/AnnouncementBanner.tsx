/**
 * Dashboard Announcement Banner Component
 * Auto-sliding promotional banner with image, video, and text support
 * Features: Auto-transition, click tracking, responsive design
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardAnnouncement } from '@/types/announcement';
import { updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AnnouncementBannerProps {
  announcements: DashboardAnnouncement[];
  autoSlideInterval?: number; // milliseconds, default 5000
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Auto-sliding announcement banner component
 * Supports images, videos, and text announcements
 */
export function AnnouncementBanner({
  announcements,
  autoSlideInterval = 5000,
  onClose,
  showCloseButton = false,
}: AnnouncementBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Filter active announcements
  const activeAnnouncements = announcements.filter(
    (ann) => ann.isActive && ann.status === 'active'
  );

  // Auto-slide functionality
  useEffect(() => {
    if (activeAnnouncements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [activeAnnouncements.length, autoSlideInterval, isPaused]);

  // Track view when announcement is displayed
  useEffect(() => {
    if (activeAnnouncements.length > 0) {
      const currentAnnouncement = activeAnnouncements[currentIndex];
      trackView(currentAnnouncement.id);
    }
  }, [currentIndex, activeAnnouncements]);

  // Play video when it becomes visible
  useEffect(() => {
    if (videoRef.current && activeAnnouncements[currentIndex]?.type === 'video') {
      videoRef.current.play().catch(() => {
        // Auto-play blocked, user will need to click
      });
    }
  }, [currentIndex, activeAnnouncements]);

  if (activeAnnouncements.length === 0) return null;

  const currentAnnouncement = activeAnnouncements[currentIndex];

  // Track view (increment view count)
  const trackView = async (announcementId: string) => {
    try {
      await updateDoc(doc(db, 'dashboardAnnouncements', announcementId), {
        views: increment(1),
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Handle announcement click
  const handleAnnouncementClick = async () => {
    if (!currentAnnouncement.redirectUrl) return;

    // Track click
    try {
      await updateDoc(doc(db, 'dashboardAnnouncements', currentAnnouncement.id), {
        clicks: increment(1),
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }

    // Redirect
    if (currentAnnouncement.openInNewTab) {
      window.open(currentAnnouncement.redirectUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = currentAnnouncement.redirectUrl;
    }
  };

  // Navigate to previous announcement
  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? activeAnnouncements.length - 1 : prev - 1
    );
  };

  // Navigate to next announcement
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  // Render announcement content based on type
  const renderAnnouncementContent = () => {
    switch (currentAnnouncement.type) {
      case 'image':
        return (
          <div
            className="w-full h-full cursor-pointer group relative overflow-hidden"
            onClick={handleAnnouncementClick}
          >
            <img
              src={currentAnnouncement.imageUrl}
              alt={currentAnnouncement.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {currentAnnouncement.redirectUrl && (
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ExternalLink className="w-5 h-5 text-gray-800" />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              src={currentAnnouncement.videoUrl}
              className="w-full h-full object-cover"
              controls
              muted
              loop
              playsInline
            />
            {currentAnnouncement.redirectUrl && (
              <button
                onClick={handleAnnouncementClick}
                className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all hover:scale-105"
              >
                Learn More
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        );

      case 'text':
        return (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: currentAnnouncement.backgroundColor || '#3B82F6',
              color: currentAnnouncement.textColor || '#FFFFFF',
            }}
            onClick={handleAnnouncementClick}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              {currentAnnouncement.title}
            </h2>
            {currentAnnouncement.description && (
              <p className="text-base sm:text-lg md:text-xl text-center max-w-3xl opacity-90">
                {currentAnnouncement.description}
              </p>
            )}
            {currentAnnouncement.content && (
              <div className="mt-6 text-sm sm:text-base text-center max-w-2xl opacity-80">
                {currentAnnouncement.content}
              </div>
            )}
            {currentAnnouncement.redirectUrl && (
              <Button
                className="mt-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
                size="lg"
              >
                Learn More
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl bg-gray-100 dark:bg-gray-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Announcement Content */}
      <div className="w-full h-full">
        {renderAnnouncementContent()}
      </div>

      {/* Title Overlay (for image and video types) */}
      {(currentAnnouncement.type === 'image' || currentAnnouncement.type === 'video') && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 sm:p-6">
          <h3 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-1">
            {currentAnnouncement.title}
          </h3>
          {currentAnnouncement.description && (
            <p className="text-white/90 text-sm sm:text-base line-clamp-2">
              {currentAnnouncement.description}
            </p>
          )}
        </div>
      )}

      {/* Navigation Arrows */}
      {activeAnnouncements.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 shadow-lg transition-all hover:scale-110 opacity-0 hover:opacity-100 group-hover:opacity-100"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 shadow-lg transition-all hover:scale-110 opacity-0 hover:opacity-100 group-hover:opacity-100"
            aria-label="Next announcement"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {activeAnnouncements.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {activeAnnouncements.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to announcement ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Close Button */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-full p-1.5 sm:p-2 shadow-lg transition-all hover:scale-110"
          aria-label="Close announcements"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Progress Bar (for auto-slide) */}
      {activeAnnouncements.length > 1 && !isPaused && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all"
            style={{
              width: '100%',
              animation: `progress ${autoSlideInterval}ms linear`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
