"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LanguageSelector from '../../../components/LanguageSelector';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { MultiLangUtils } from '@/types/multi-lang';
import { useLanguage } from '@/contexts/LanguageContext';

type Theme = 'light' | 'dark';

const Header: React.FC = () => {
  const { config } = useSiteConfig();
  const { currentLanguage } = useLanguage();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem('os-theme') as Theme)) || 'light';
    setTheme(saved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('os-theme', next);
    }
  };

  return (
    <header className="navbar bg-base-100 fixed top-0 left-0 right-0 z-[1000] shadow-sm border-b border-base-200">
      <div className="navbar-start px-2">
        <Link href="/" className="btn btn-ghost text-xl">
          <div className="flex items-center gap-2">
            {config?.logo ? (
              <img
                src={config.logo}
                alt={MultiLangUtils.getTextValue(config?.title, currentLanguage) || 'OpenShutter'}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <span className="font-semibold">OpenShutter</span>
            )}
            <span>{config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}</span>
          </div>
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/albums">Albums</Link></li>
          <li><Link href="/contact">Contact</Link></li>
        </ul>
      </div>
      <div className="navbar-end gap-2 pr-2">
        <button aria-label="Toggle theme" className="btn btn-ghost btn-square" onClick={toggleTheme}>
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M5.64 17l-.71.71a1 1 0 001.41 1.41l.71-.71A8 8 0 105.64 17z"></path></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm10-9h-2v3h2V4zm7.04 1.46l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM17 11a5 5 0 11-5-5 5 5 0 015 5zm3 2v-2h3v2h-3zm-7 7h-2v3h2v-3zm6.24-1.84l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM4.22 18.36l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42z"></path></svg>
          )}
        </button>
        <LanguageSelector />
      </div>
    </header>
  );
}

export default Header;


