import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import PWAConfig from '@/components/PWAConfig';
import PWAOfflineIndicator from '@/components/PWAOfflineIndicator';

export const metadata = {
  title: 'Baby Tracker',
  description: 'Track your baby\'s activities with ease - feeding, sleeping, diaper changes and more',
  keywords: ['baby tracker', 'feeding', 'sleep', 'diaper', 'baby care', 'parenting'],
  authors: [{ name: 'Baby Tracker Team' }],
  creator: 'Baby Tracker',
  publisher: 'Baby Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Baby Tracker',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Baby Tracker" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="shortcut icon" href="/icon-192x192.png" />
      </head>
      <body>
        <SessionProvider>
          <div className="min-h-[100dvh] bg-gray-50">
            <PWAConfig />
            <PWAOfflineIndicator />
            {/* Content will include header */}
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
