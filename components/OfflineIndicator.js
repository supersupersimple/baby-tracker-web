"use client";

import { useState, useEffect } from "react";
import { isOnline } from "@/lib/offline-storage";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    setOnline(isOnline());

    // Listen for online/offline events
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show indicator when offline
  if (online) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg shadow-lg p-3 max-w-sm bg-orange-50 border border-orange-200">
        <div className="flex items-center">
          <span className="text-lg mr-2">📵</span>
          <div>
            <p className="text-sm font-medium text-orange-700">
              Offline Mode
            </p>
            <p className="text-xs text-orange-600">
              Activities saved locally
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}