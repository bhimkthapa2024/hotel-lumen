import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import CursorEffect from '@/components/CursorEffect';
import { AlertProvider } from '@/components/AlertContext';
import { UserProvider } from '@/components/UserContext';

import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'Lumen Accounting',
  description: 'Luxury Supplier Management',
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
            <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{ 
              width: '280px', 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              height: '100vh',
              padding: '2rem 1.5rem',
              zIndex: 50
            }}>
              <Navigation />
            </div>

            <main style={{ 
              marginLeft: '280px', 
              flex: 1, 
              padding: '2rem 3rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ width: '100%' }}>
                {children}
              </div>
            </main>
          </div>
          </AuthGuard>
        </AlertProvider>
        </UserProvider>
      </body>
    </html>
  );
}
