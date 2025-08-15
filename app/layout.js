import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata = {
  title: 'Baby Tracker',
  description: 'Track your baby\'s activities with ease',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="min-h-[100dvh] bg-gray-50">
            {/* Content will include header */}
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
