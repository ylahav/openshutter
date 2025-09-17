"use client";
import React from 'react';
import Link from 'next/link';
import LanguageSelector from '../../../components/LanguageSelector';

const Header: React.FC = () => {
  return (
    <header className="navbar bg-base-100 fixed top-0 left-0 right-0 z-[1000] shadow-sm border-b border-base-200">
      <div className="navbar-start px-2">
        <Link href="/" className="btn btn-ghost text-xl">OpenShutter</Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/portfolio">Portfolio</Link></li>
          <li><Link href="/contact">Contact</Link></li>
        </ul>
      </div>
      <div className="navbar-end gap-2 pr-2">
        <LanguageSelector />
      </div>
    </header>
  );
}

export default Header;


