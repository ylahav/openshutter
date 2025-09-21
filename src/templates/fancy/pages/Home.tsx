'use client'

import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { useActiveTemplate } from '@/hooks/useTemplate'
import { MultiLangUtils } from '@/types/multi-lang'
import styles from '../styles.module.scss'

interface Album {
  _id: string
  name: string | Record<string, string>
  description?: string | Record<string, string>
  isFeatured?: boolean
  photoCount?: number
}

export default function ElegantHomePage() {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { template: activeTemplate } = useActiveTemplate()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/albums?parentId=root')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAlbums(data.data || [])
          }
        }
      } catch (error) {
        console.error('Error fetching albums:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRootAlbums()
  }, [])

  const getText = (val?: string | Record<string, string>): string => {
    if (!val) return ''
    if (typeof val === 'string') return val
    return MultiLangUtils.getTextValue(val, currentLanguage) || ''
  }

  const categories = ['all', 'wedding', 'portrait', 'commercial', 'fine-art']
  const filteredAlbums = selectedCategory === 'all' 
    ? albums 
    : albums.filter(album => getText(album.name).toLowerCase().includes(selectedCategory))

  return (
    <div className="styles.page">
      <Header />
      <Hero />

      {/* Services Section */}
      {activeTemplate?.pageConfig?.home?.showServices && config?.homePage?.services && (
        <section className="styles.services">
          <div className="styles.container">
            <div className="styles.services-title">
              <h2 className="styles.heading-2">Our Services</h2>
              <div className="styles.divider"></div>
            </div>
            
            <div className="styles.services-grid">
              {config.homePage.services.map((service, index) => (
                <div key={index} className="styles.service-item">
                  <div className="styles.service-number">
                    {service.number}
                  </div>
                  <h3 className="styles.service-title">
                    {MultiLangUtils.getTextValue(service.title, currentLanguage)}
                  </h3>
                  <div 
                    className="styles.service-description"
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

      {/* Gallery Section with Categories */}
      <section className="styles.gallery">
        <div className="styles.container">
          <div className="styles.gallery-title">
            <h2 className="styles.heading-2">Portfolio</h2>
            <div className="styles.divider"></div>
          </div>

          {/* Category Filters */}
          <div className="styles.gallery-filters">
            {categories.map((category) => (
              <button
                key={category}
                className={`styles.filter-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="styles.gallery-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="styles.gallery-item" style={{ background: '#f0f0f0' }}>
                  <div style={{ width: '100%', height: '100%', background: '#e0e0e0' }}></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="styles.gallery-grid">
              {filteredAlbums.slice(0, 6).map((album, index) => (
                <div key={album._id} className="styles.gallery-item">
                  <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }}></div>
                  <div className="styles.gallery-overlay">
                    <div className="styles.gallery-overlay-content">
                      <h3 className="styles.gallery-overlay-title">
                        {getText(album.name)}
                      </h3>
                      <p className="styles.gallery-overlay-subtitle">
                        {album.photoCount || 0} photos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      {activeTemplate?.pageConfig?.home?.showTestimonials && (
        <section className="styles.testimonials">
          <div className="styles.container">
            <div className="styles.testimonials-title">
              <h2 className="styles.heading-2">What Our Clients Say</h2>
              <div className="styles.divider"></div>
            </div>
            
            <div className="styles.testimonials-grid">
              <div className="styles.testimonial-item">
                <p className="styles.testimonial-text">
                  "Absolutely stunning work! The attention to detail and artistic vision exceeded all our expectations. Every photo tells a story."
                </p>
                <div className="styles.testimonial-author">
                  <div className="styles.testimonial-avatar">SJ</div>
                  <div>
                    <div className="styles.testimonial-name">Sarah Johnson</div>
                    <div className="styles.testimonial-role">Wedding Client</div>
                  </div>
                </div>
              </div>
              
              <div className="styles.testimonial-item">
                <p className="styles.testimonial-text">
                  "Professional, creative, and incredibly talented. The final results were beyond what we could have imagined. Highly recommended!"
                </p>
                <div className="styles.testimonial-author">
                  <div className="styles.testimonial-avatar">MR</div>
                  <div>
                    <div className="styles.testimonial-name">Michael Rodriguez</div>
                    <div className="styles.testimonial-role">Corporate Client</div>
                  </div>
                </div>
              </div>
              
              <div className="styles.testimonial-item">
                <p className="styles.testimonial-text">
                  "The photographer captured our special moments with such elegance and grace. These photos will be treasured forever."
                </p>
                <div className="styles.testimonial-author">
                  <div className="styles.testimonial-avatar">EC</div>
                  <div>
                    <div className="styles.testimonial-name">Emma Chen</div>
                    <div className="styles.testimonial-role">Portrait Client</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {activeTemplate?.pageConfig?.home?.showContact && (
        <section className="styles.contact">
          <div className="styles.container">
            <div className="styles.contact-title">
              <h2 className="styles.heading-2">
                {config?.homePage?.contactTitle ? 
                  MultiLangUtils.getTextValue(config.homePage.contactTitle, currentLanguage) : 
                  'Get In Touch'
                }
              </h2>
              <div className="styles.divider"></div>
            </div>
            
            <div className="styles.contact-content">
              <div className="styles.contact-info">
                {config?.contact?.email && (
                  <div className="styles.contact-item">
                    <div className="styles.contact-icon">✉</div>
                    <div className="styles.contact-details">
                      <h4>Email</h4>
                      <p><a href={`mailto:${config.contact.email}`}>{config.contact.email}</a></p>
                    </div>
                  </div>
                )}
                
                {config?.contact?.phone && (
                  <div className="styles.contact-item">
                    <div className="styles.contact-icon">📞</div>
                    <div className="styles.contact-details">
                      <h4>Phone</h4>
                      <p><a href={`tel:${config.contact.phone}`}>{config.contact.phone}</a></p>
                    </div>
                  </div>
                )}
                
                {config?.contact?.address && (
                  <div className="styles.contact-item">
                    <div className="styles.contact-icon">📍</div>
                    <div className="styles.contact-details">
                      <h4>Location</h4>
                      <p>{MultiLangUtils.getTextValue(config.contact.address, currentLanguage)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="styles.contact-form">
                <div className="styles.accent-border">
                  <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Send us a message</h3>
                  <p style={{ textAlign: 'center', color: 'var(--styles.gray)', marginBottom: '2rem' }}>
                    Ready to create something beautiful together? Let's discuss your vision.
                  </p>
                  <a href="/contact" className="styles.cta-button" style={{ display: 'block', textAlign: 'center' }}>
                    Start Your Project
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
