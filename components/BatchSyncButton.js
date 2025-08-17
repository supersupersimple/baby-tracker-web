"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getActivitiesCount, isOnline } from '@/lib/offline-storage';
import { getSyncService } from '@/lib/sync-service';

export function BatchSyncButton({ className = "", onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ local: 0, sync_failed: 0 });
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const updateStats = () => {
    const stats = getActivitiesCount();
    setSyncStats(stats);
  };

  const handleSyncEvent = (event) => {
    switch (event.type) {
      case 'batch_sync_start':
        setSyncing(true);
        setLastSyncResult(null);
        break;
        
      case 'batch_sync_complete':
        setSyncing(false);
        setLastSyncResult({
          success: event.synced > 0,
          synced: event.synced,
          total: event.total,
          errors: event.errors
        });
        updateStats();
        
        // Clear result message after 5 seconds
        setTimeout(() => setLastSyncResult(null), 5000);
        
        // Notify parent component
        if (onSyncComplete) {
          onSyncComplete(event);
        }
        break;
        
      default:
        updateStats();
    }
  };

  useEffect(() => {
    updateStats();
    
    const syncService = getSyncService();
    syncService.addSyncCallback(handleSyncEvent);

    // Update stats every 10 seconds
    const interval = setInterval(updateStats, 10000);

    return () => {
      clearInterval(interval);
      syncService.removeSyncCallback(handleSyncEvent);
    };
  }, []);

  const handleBatchSync = async () => {
    if (!isOnline() || syncing) return;

    try {
      const syncService = getSyncService();
      await syncService.forceSyncAll();
    } catch (error) {
      console.error('Manual batch sync failed:', error);
      setLastSyncResult({
        success: false,
        error: error.message
      });
      setTimeout(() => setLastSyncResult(null), 5000);
    }
  };

  const pendingCount = syncStats.local + syncStats.sync_failed;
  const hasFailures = syncStats.sync_failed > 0;

  // Don't show if no pending activities
  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <Button
        onClick={handleBatchSync}
        disabled={syncing || !isOnline()}
        variant={hasFailures ? "destructive" : "outline"}
        size="sm"
        className="flex items-center space-x-2"
      >
        {syncing ? (
          <>
            <span className="animate-spin">🔄</span>
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <span>{hasFailures ? '⚠️' : '🔄'}</span>
            <span>
              Sync {pendingCount} activities
            </span>
          </>
        )}
      </Button>

      {/* Sync result message */}
      {lastSyncResult && (
        <div className={`text-xs px-2 py-1 rounded ${
          lastSyncResult.success 
            ? 'text-green-700 bg-green-50 border border-green-200' 
            : 'text-red-700 bg-red-50 border border-red-200'
        }`}>
          {lastSyncResult.success 
            ? `✅ Synced ${lastSyncResult.synced}/${lastSyncResult.total} activities`
            : `❌ Sync failed: ${lastSyncResult.error || 'Unknown error'}`
          }
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline() && (
        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
          📵 Offline - will sync when online
        </div>
      )}
    </div>
  );
}