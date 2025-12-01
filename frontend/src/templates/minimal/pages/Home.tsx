"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import styles from '../styles.module.scss'
import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { MultiLangUtils } from '@/types/multi-lang';
import { useMultipleAlbumCoverImages } from '@/hooks/useAlbumCoverImage';
import { useI18n } from '@/hooks/useI18n';
import { useActiveTemplate } from '@/hooks/useTemplate';

type Album = {
  _id: string;
  alias?: string;
  name: string | Record<string, string>;
  description?: string | Record<string, string>;
  isFeatured?: boolean;
  photoCount?: number;
};

const MinimalHomePage: React.FC = () => {
  const { config } = useSiteConfig();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentLanguage } = useLanguage();
  const { t } = useI18n();
  const { template: activeTemplate } = useActiveTemplate();

  const getText = (val?: string | Record<string,string>): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    return MultiLangUtils.getTextValue(val, currentLanguage) || undefined;
  };

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        const res = await fetch('/api/albums?parentId=root');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAlbums(data.data || []);
          }
        }
      } catch {}
      finally {
        setLoading(false);
      }
    };
    fetchRootAlbums();
  }, []);

  // Leading/cover images for albums
  const albumIds = useMemo(() => albums.map(a => a._id), [albums]);
  const { coverImages, loading: coversLoading } = useMultipleAlbumCoverImages(albumIds);

  return (
    <main className="minimal-page">
      <Header />
      <Hero />

      {/* Gallery Section */}
      <section className="minimal-gallery">
        <div className="minimal-container">
          {loading ? (
            <div className="minimal-gallery-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="minimal-gallery-item minimal-gallery-loading"></div>
              ))}
            </div>
          ) : albums.length > 0 ? (
            <div className="minimal-gallery-grid">
              {albums.slice(0, 9).map((album, index) => {
                const tile = (
                  <div 
                    key={album._id} 
                    className={`minimal-gallery-item ${index === 3 ? 'minimal-gallery-item-wide' : ''}`}
                  >
                    {coverImages[album._id] ? (
                      <Image
                        src={coverImages[album._id]}
                        alt={getText(album.name) || 'Album cover'}
                        width={800}
                        height={600}
                        className="minimal-gallery-image"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ aspectRatio: '4 / 3', background: 'var(--minimal-hover)' }} />
                    )}
                    <div className="minimal-gallery-overlay"></div>
                    <div className="minimal-gallery-caption">
                      <div className="minimal-gallery-caption-title">{getText(album.name) || 'Untitled Album'}</div>
                      <div className="minimal-gallery-caption-meta">{album.photoCount || 0} photos</div>
                    </div>
                  </div>
                )
                return album.alias ? (
                  <Link key={album._id} href={`/albums/${album.alias}`}>{tile}</Link>
                ) : tile
              })}
            </div>
          ) : (
            <div className="minimal-gallery-empty">
              <p>No albums yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      {activeTemplate?.pageConfig?.home?.showServices && (
        <section className="minimal-services">
          <div className="minimal-container">
            <h2 className="minimal-services-title">
              Services
            </h2>
            <div className="minimal-services-grid">
              {config?.homePage?.services?.map((service, index) => (
                <div key={index} className="minimal-service-item">
                  <div className="minimal-service-number">
                    {service.number}
                  </div>
                  <h3 className="minimal-service-title">
                    {MultiLangUtils.getTextValue(service.title, currentLanguage)}
                  </h3>
                  <div 
                    className="minimal-service-description"
                    dangerouslySetInnerHTML={{ 
                      __html: MultiLangUtils.getHTMLValue(service.description, currentLanguage) || '' 
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {activeTemplate?.pageConfig?.home?.showContact && (
        <section className="minimal-contact">
          <div className="minimal-container">
            <h2 className="minimal-contact-title">
              {config?.homePage?.contactTitle ? MultiLangUtils.getTextValue(config.homePage.contactTitle, currentLanguage) : 'Get In Touch'}
            </h2>
            <div className="minimal-contact-info">
              {config?.contact?.email && (
                <div className="minimal-contact-item">
                  <h3 className="minimal-contact-label">
                    Email
                  </h3>
                  <p className="minimal-contact-value">
                    <a href={`mailto:${config.contact.email}`} className="minimal-contact-link">
                      {config.contact.email}
                    </a>
                  </p>
                </div>
              )}
              {config?.contact?.phone && (
                <div className="minimal-contact-item">
                  <h3 className="minimal-contact-label">
                    Phone
                  </h3>
                  <p className="minimal-contact-value">
                    <a href={`tel:${config.contact.phone}`} className="minimal-contact-link">
                      {config.contact.phone}
                    </a>
                  </p>
                </div>
              )}
              {config?.contact?.address && (
                <div className="minimal-contact-item">
                  <h3 className="minimal-contact-label">
                    Location
                  </h3>
                  <p className="minimal-contact-value">
                    {MultiLangUtils.getTextValue(config.contact.address, currentLanguage)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
};

export default MinimalHomePage;
