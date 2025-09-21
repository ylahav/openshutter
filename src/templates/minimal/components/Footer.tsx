import React from 'react';
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useI18n } from '@/hooks/useI18n'
import { Github, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe } from 'lucide-react'

const Footer: React.FC = () => {
  const { config } = useSiteConfig()
  const { t } = useI18n()

  const sm = (config as any)?.contact?.socialMedia || {}
  const socials: Array<{ key: string; url?: string; icon: React.ReactNode; label: string }> = [
    { key: 'facebook', url: sm.facebook, icon: <Facebook className="w-4 h-4" />, label: 'Facebook' },
    { key: 'twitter', url: sm.twitter, icon: <Twitter className="w-4 h-4" />, label: 'Twitter' },
    { key: 'instagram', url: sm.instagram, icon: <Instagram className="w-4 h-4" />, label: 'Instagram' },
    { key: 'linkedin', url: sm.linkedin, icon: <Linkedin className="w-4 h-4" />, label: 'LinkedIn' },
  ]

  const activeSocials = socials.filter(s => typeof s.url === 'string' && s.url)

  return (
    <footer className="minimal-footer">
      <div className="minimal-container">
        <p className="minimal-footer-text">
          © {new Date().getFullYear()} {(config as any)?.siteName || 'OpenShutter'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
