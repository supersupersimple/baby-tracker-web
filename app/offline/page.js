"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getAllLocalActivities, getActivitiesCount, isOnline } from "@/lib/offline-storage";

export default function OfflinePage() {
  const [localStats, setLocalStats] = useState(null);
  const [isOnlineStatus, setIsOnlineStatus] = useState(false);

  useEffect(() => {
    // Get local data statistics
    const stats = getActivitiesCount();
    const localActivities = getAllLocalActivities();
    setLocalStats({
      ...stats,
      recentActivities: localActivities.slice(0, 3)
    });

    // Check online status
    setIsOnlineStatus(isOnline());

    // Listen for online/offline events
    const handleOnline = () => setIsOnlineStatus(true);
    const handleOffline = () => setIsOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline()) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="text-6xl mb-6">
          {isOnlineStatus ? "🌐" : "📱"}
        </div>
        
        {/* Status Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {isOnlineStatus ? "Back Online!" : "You're Offline"}
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {isOnlineStatus 
            ? "Great! Your internet connection has been restored. You can now sync your data."
            : "No internet connection detected. Don't worry - your baby tracking data is safely stored locally and will sync when you're back online."
          }
        </p>

        {/* Local Data Summary */}
        {localStats && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-800 mb-3">Local Data Available:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Total Activities:</span>
                <span className="font-medium">{localStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Synced:</span>
                <span className="font-medium text-green-600">{localStats.synced}</span>
              </div>
              {localStats.unsynced > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Pending Sync:</span>
                  <span className="font-medium text-orange-600">{localStats.unsynced}</span>
                </div>
              )}
            </div>

            {/* Recent Activities */}
            {localStats.recentActivities && localStats.recentActivities.length > 0 && (
              <div className="mt-4 pt-3 border-t border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Recent Activities:</h4>
                <div className="space-y-1">
                  {localStats.recentActivities.map((activity, index) => (
                    <div key={activity.id || index} className="text-xs text-blue-700 flex justify-between">
                      <span>{activity.type?.toLowerCase()}</span>
                      <span>{new Date(activity.fromDate || activity.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isOnlineStatus ? "Go to App" : "Retry Connection"}
          </Button>
          
          {!isOnlineStatus && (
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Continue Offline
            </Button>
          )}
        </div>

        {/* PWA Installation Hint */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Install this app on your device for the best offline experience
          </p>
        </div>
      </div>
    </div>
  );
}