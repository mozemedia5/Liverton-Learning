import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface Banner {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  linkType: 'internal' | 'external' | 'none';
  link?: string;
  targetRoles: string[];
}

export default function BannerCarousel() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    loadBanners();
  }, [userRole]);

  // Auto-rotation effect (Jumia-style)
  useEffect(() => {
    if (!isAutoPlaying || banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Change banner every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);

  const loadBanners = async () => {
    if (!userRole) return;

    try {
      // Query all active banners, filter client-side
      const q = query(
        collection(db, 'dashboardBanners'),
        where('isActive', '==', true),
        where('isDraft', '==', false),
        orderBy('order', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const allBanners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Banner[];
      
      // Filter banners by targetRoles
      const bannersData = allBanners.filter(banner => 
        banner.targetRoles && 
        Array.isArray(banner.targetRoles) && 
        banner.targetRoles.includes(userRole)
      );
      
      setBanners(bannersData);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    if (!banner.link) return;

    if (banner.linkType === 'internal') {
      navigate(banner.link);
    } else if (banner.linkType === 'external') {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    }
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume after 10s
  };

  if (banners.length === 0) {
    return null; // Don't show anything if no banners
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-lg group">
      {/* Main Banner */}
      <div
        onClick={() => handleBannerClick(currentBanner)}
        className={`relative w-full h-64 md:h-80 lg:h-96 ${
          currentBanner.link ? 'cursor-pointer' : ''
        }`}
        style={{ backgroundColor: currentBanner.backgroundColor }}
      >
        {/* Banner Image */}
        {currentBanner.imageUrl && (
          <img
            src={currentBanner.imageUrl}
            alt={currentBanner.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}

        {/* Gradient Overlay for Text Readability (Jumia-style) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        {/* Banner Content */}
        <div className="absolute inset-0 p-6 md:p-8 lg:p-12 flex flex-col justify-center max-w-2xl">
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 drop-shadow-lg"
            style={{ color: currentBanner.textColor }}
          >
            {currentBanner.title}
          </h2>
          <p
            className="text-sm md:text-base lg:text-lg mb-4 drop-shadow-lg"
            style={{ color: currentBanner.textColor, opacity: 0.95 }}
          >
            {currentBanner.message}
          </p>
          {currentBanner.link && (
            <div
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all w-fit"
              style={{ color: currentBanner.textColor }}
            >
              {currentBanner.linkType === 'external' ? (
                <>
                  <span>Learn More</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              ) : (
                <span>View Details →</span>
              )}
            </div>
          )}
        </div>

        {/* Navigation Arrows (Show on hover - Jumia-style) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Next banner"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Slide Indicators (Jumia-style dots) */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Banner Count Indicator */}
        {banners.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
            {currentIndex + 1} / {banners.length}
          </div>
        )}
      </div>
    </div>
  );
}
