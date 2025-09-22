'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { MultiLangUtils } from '@/types/multi-lang';
import { useLanguage } from '@/contexts/LanguageContext';
import { useI18n } from '@/hooks/useI18n';
import { TemplatePhoto } from '@/types';

const Hero: React.FC = () => {
  const [photos, setPhotos] = useState<TemplatePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { config } = useSiteConfig();
  const { currentLanguage } = useLanguage();
  const { t } = useI18n();

  // Configurable rotation interval (in seconds)
  const ROTATION_INTERVAL = 15;

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos/gallery-leading?limit=10');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setPhotos(data.data);
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchPhotos();
  }, []);

  // Auto-rotate photos
  useEffect(() => {
    if (photos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
      }, ROTATION_INTERVAL * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [photos.length]);

  if (!loading && photos.length === 0) {
    return null;
  }

  // Get title and description from site config or fallback
  const title = config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'Photography';
  const description = config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 'Capturing moments with simplicity and elegance through the art of visual storytelling.';

  return (
    <section className="minimal-hero">
      {/* Background Image */}
      {!loading && photos.length > 0 && (
        <div className="minimal-hero-bg">
          <Image
            key={photos[currentPhotoIndex]._id}
            src={photos[currentPhotoIndex].storage.thumbnailPath || photos[currentPhotoIndex].storage.url || '/placeholder.jpg'}
            alt={typeof photos[currentPhotoIndex].title === 'string' ? photos[currentPhotoIndex].title : MultiLangUtils.getTextValue(photos[currentPhotoIndex].title, currentLanguage)}
            fill
            className="minimal-hero-bg-image"
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Hero Content */}
      <div className="minimal-hero-content">
        <h1 className="minimal-hero-title">
          {title}
        </h1>
        <div 
          className="minimal-hero-description"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {/* Scroll Indicator */}
      <div className="minimal-scroll-indicator">
        <div className="minimal-scroll-line"></div>
      </div>

      {/* Photo indicators */}
      {!loading && photos.length > 1 && (
        <div className="minimal-photo-indicators">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPhotoIndex(index)}
              className={`minimal-photo-indicator ${index === currentPhotoIndex ? 'minimal-photo-indicator-active' : ''}`}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;
