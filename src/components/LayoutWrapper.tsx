"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that use AdminLayout (with sidebar) or auth pages don't need the top Navigation
  const pagesWithoutNav = ['/dashboard', '/companies', '/signin', '/signup'];
  const shouldHideNav = pagesWithoutNav.some(page => pathname?.startsWith(page));
  
  useEffect(() => {
    // Mobile dropdown positioning fix
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const handleSelectFocus = (e: FocusEvent) => {
      const select = e.target as HTMLSelectElement;
      if (select.tagName !== 'SELECT') return;
      
      // Add class for CSS overrides
      document.body.classList.add('mobile-select-open');
      
      // Force iOS to recalculate position by scrolling element into view
      setTimeout(() => {
        select.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest' 
        });
        
        // Additional hack: temporarily change and restore the select size
        const originalSize = select.size;
        select.size = 2;
        setTimeout(() => {
          select.size = originalSize || 0;
        }, 0);
      }, 100);
    };

    const handleSelectBlur = (e: FocusEvent) => {
      const select = e.target as HTMLSelectElement;
      if (select.tagName !== 'SELECT') return;
      document.body.classList.remove('mobile-select-open');
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('focus', handleSelectFocus, true);
    document.addEventListener('blur', handleSelectBlur, true);
    
    return () => {
      document.removeEventListener('focus', handleSelectFocus, true);
      document.removeEventListener('blur', handleSelectBlur, true);
      document.body.classList.remove('mobile-select-open');
    };
  }, []);

  if (shouldHideNav) {
    return <>{children}</>;
  }
  
  return (
    <>
      <Navigation />
      <main className="pt-24">
        {children}
      </main>
    </>
  );
}


