"use client";

import { useState, useEffect } from 'react';
import { isOnline, getActivitiesCount } from '@/lib/offline-storage';

export default function PWAOfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [localStats, setLocalStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initial status
    setOnline(isOnline());
    updateLocalStats();

    // Listen for online/offline events
    const handleOnline = () => {
      setOnline(true);
      updateLocalStats();
    };
    
    const handleOffline = () => {
      setOnline(false);
      updateLocalStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update stats periodically
    const interval = setInterval(updateLocalStats, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateLocalStats = () => {
    try {
      const stats = getActivitiesCount();
      setLocalStats(stats);
    } catch (error) {
      console.error('Failed to get local stats:', error);
    }
  };

  if (online && (!localStats || localStats.unsynced === 0)) {
    return null; // Don't show anything when online and everything is synced
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div 
        className={`rounded-lg shadow-lg cursor-pointer transition-all duration-200 ${
          online 
            ? 'bg-blue-50 border border-blue-200 text-blue-800' 
            : 'bg-orange-50 border border-orange-200 text-orange-800'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Status Bar */}
        <div className="px-3 py-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            online ? 'bg-blue-500' : 'bg-orange-500'
          }`} />
          <span className="text-sm font-medium">
            {online ? (
              localStats?.unsynced > 0 ? `${localStats.unsynced} pending sync` : 'Online'
            ) : (
              'Offline'
            )}
          </span>
          <span className="text-xs">
            {showDetails ? '▼' : '▶'}
          </span>
        </div>

        {/* Details Panel */}
        {showDetails && localStats && (
          <div className="border-t border-current/20 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Total activities:</span>
              <span className="font-medium">{localStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Synced:</span>
              <span className="font-medium text-green-600">{localStats.synced}</span>
            </div>
            {localStats.unsynced > 0 && (
              <div className="flex justify-between">
                <span>Pending sync:</span>
                <span className="font-medium text-orange-600">{localStats.unsynced}</span>
              </div>
            )}
            {localStats.sync_failed > 0 && (
              <div className="flex justify-between">
                <span>Failed sync:</span>
                <span className="font-medium text-red-600">{localStats.sync_failed}</span>
              </div>
            )}
            <div className="pt-1 border-t border-current/20">
              <span className="text-current/70">
                {online ? 'Will sync automatically' : 'Will sync when online'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}