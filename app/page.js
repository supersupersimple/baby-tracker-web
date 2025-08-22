"use client";

import { useSession } from "next-auth/react";
import { QuickActions } from "@/components/QuickActions";
import RecentActivities from "@/components/RecentActivities";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AppHeader } from "@/components/AppHeader";
import { AuthButton } from "@/components/AuthButton";
import { useState, useEffect } from "react";
import { startSyncDaemon, stopSyncDaemon } from "@/lib/sync-daemon";

export default function Home() {
  const { data: session, status } = useSession();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedBaby, setSelectedBaby] = useState(null);
  const [quickActionsSettings, setQuickActionsSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quickActionsSettings');
      return saved ? JSON.parse(saved) : {
        feeding: true,
        sleeping: true,
        diapering: true,
        growth: true,
        health: true,
        leisure: true
      };
    }
    return {
      feeding: true,
      sleeping: true,
      diapering: true,
      growth: true,
      health: true,
      leisure: true
    };
  });

  const handleActivityAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBabyChange = (baby) => {
    setSelectedBaby(baby);
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for settings changes from localStorage and custom events
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('quickActionsSettings');
      if (saved) {
        setQuickActionsSettings(JSON.parse(saved));
      }
    };

    const handleCustomSettingsChange = (event) => {
      setQuickActionsSettings(event.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('quickActionsSettingsChanged', handleCustomSettingsChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quickActionsSettingsChanged', handleCustomSettingsChange);
    };
  }, []);

  // Start sync daemon on component mount
  useEffect(() => {
    const handleSyncEvent = (syncData) => {
      console.log('🔄 Sync event:', syncData);
      // Refresh UI when sync completes
      setRefreshTrigger(prev => prev + 1);
    };

    // Start the sync daemon
    startSyncDaemon(handleSyncEvent);
    
    // Cleanup on unmount
    return () => {
      stopSyncDaemon();
    };
  }, []);


  // Show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">👶</div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with Baby Selector */}
      <AppHeader 
        selectedBaby={selectedBaby} 
        onBabyChange={handleBabyChange} 
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto py-3 px-2 sm:px-4 lg:px-6 pb-8 sm:pb-6 flex flex-col overflow-hidden min-w-0">
        {!session ? (
          // Show login prompt if not authenticated
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">👶</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Baby Tracker
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Track your baby&apos;s activities, share with family, and keep everyone connected.
              </p>
              <AuthButton />
            </div>
          </div>
        ) : !selectedBaby ? (
          // Show baby selection prompt
          <div className="text-center py-16 px-4">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Select your baby</h3>
            <p className="text-lg text-gray-500 mb-6 max-w-md mx-auto">
              Choose a baby from the dropdown above to start tracking activities, or create a new baby profile.
            </p>
            <div className="inline-flex items-center text-base text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              <span className="mr-2">💡</span>
              Tip: Use the menu to create a new baby
            </div>
          </div>
        ) : (
          // Show main content when baby is selected
          <div className="flex flex-col h-full space-y-2 overflow-hidden min-w-0 max-w-full">
            {/* Quick Actions Section */}
            <QuickActions 
              onActivityAdded={handleActivityAdded}
              selectedBaby={selectedBaby}
              quickActionsSettings={quickActionsSettings}
            />
            
            {/* Recent Activities Section - Fill remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <RecentActivities 
                refreshTrigger={refreshTrigger}
                selectedBaby={selectedBaby}
              />
            </div>
          </div>
        )}
      </main>
      
      {/* Offline indicator */}
      <OfflineIndicator />
      
    </div>
  );
}
