"use client";

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that use AdminLayout (with sidebar) don't need the top Navigation
  const adminPages = ['/dashboard', '/companies'];
  const isAdminPage = adminPages.some(page => pathname?.startsWith(page));
  
  if (isAdminPage) {
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


