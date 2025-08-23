"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PWAConfig() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);
          console.log('SW scope:', registration.scope);
          
          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to reload
                  if (confirm('A new version of Baby Tracker is available. Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    } else {
      console.warn('⚠️ Service Workers not supported in this browser');
    }

    // Handle PWA installation prompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 PWA install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Handle successful installation
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed successfully');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('📱 App is already installed and running in standalone mode');
      setIsInstalled(true);
    } else {
      console.log('🌐 App is running in browser mode');
    }

    // Log PWA status for debugging
    console.log('PWA initialized:', {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      isStandalone: window.matchMedia('(display-mode: standalone)').matches
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Show install button when PWA is installable
  if (isInstallable && !isInstalled) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button 
          onClick={handleInstallClick}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          📱 Install App
        </Button>
      </div>
    );
  }

  return null;
}