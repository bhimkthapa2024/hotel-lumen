"use client";

import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        {isMobileMenuOpen ? <X size={24} color="var(--color-primary)" /> : <Menu size={24} color="var(--color-primary)" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`desktop-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
        style={{ 
          width: '280px', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          height: '100vh',
          padding: '1rem',
          zIndex: 50
        }}
      >
        <Navigation />
      </div>

      {/* Main Content */}
      <main 
        className="main-content"
        style={{ 
          marginLeft: '280px', 
          flex: 1, 
          padding: '2rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
        <div style={{ width: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
