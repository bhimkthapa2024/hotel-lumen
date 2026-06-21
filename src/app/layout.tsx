
import './globals.css';
import MainLayout from '@/components/MainLayout';
import CursorEffect from '@/components/CursorEffect';
import { AlertProvider } from '@/components/AlertContext';
import { UserProvider } from '@/components/UserContext';

import AuthGuard from '@/components/AuthGuard';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Lumen Accounting',
  description: 'Luxury Supplier Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lumen',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
        <AlertProvider>
          <AuthGuard>
            <CursorEffect />
            <MainLayout>
              {children}
            </MainLayout>
          </AuthGuard>
        </AlertProvider>
        </UserProvider>
      </body>
    </html>
  );
}
