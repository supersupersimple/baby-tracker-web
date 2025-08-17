"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getActivitiesCount, isOnline } from '@/lib/offline-storage';
import { getSyncService } from '@/lib/sync-service';

export function SyncStatusIndicator({ className = "" }) {
  const [syncStats, setSyncStats] = useState({
    local: 0,
    syncing: 0,
    synced: 0,
    sync_failed: 0,
    total: 0
  });
  const [networkStatus, setNetworkStatus] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Update stats from storage
  const updateStats = () => {
    const stats = getActivitiesCount();
    setSyncStats(stats);
    setNetworkStatus(isOnline());
  };

  // Handle sync events
  const handleSyncEvent = (event) => {
    switch (event.type) {
      case 'batch_sync_start':
        setIsSyncing(true);
        setSyncMessage(`Syncing ${event.totalCount} activities...`);
        break;
        
      case 'batch_sync_complete':
        setIsSyncing(false);
        setLastSyncTime(new Date());
        if (event.synced > 0) {
          setSyncMessage(`✅ Synced ${event.synced} activities`);
        } else {
          setSyncMessage('✅ All up to date');
        }
        // Clear message after 3 seconds
        setTimeout(() => setSyncMessage(''), 3000);
        updateStats();
        break;
        
      case 'sync_success':
        updateStats();
        break;
        
      case 'sync_error':
        updateStats();
        break;
        
      case 'conflict_resolved':
        setSyncMessage(`🔀 Conflict resolved for activity`);
        setTimeout(() => setSyncMessage(''), 3000);
        updateStats();
        break;
        
      default:
        updateStats();
    }
  };

  useEffect(() => {
    // Initial stats load
    updateStats();

    // Set up sync service callbacks
    const syncService = getSyncService();
    syncService.addSyncCallback(handleSyncEvent);

    // Update stats periodically
    const statsInterval = setInterval(updateStats, 5000);

    // Listen for network changes
    const handleOnline = () => {
      setNetworkStatus(true);
      updateStats();
    };
    
    const handleOffline = () => {
      setNetworkStatus(false);
      setIsSyncing(false);
      updateStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(statsInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.removeSyncCallback(handleSyncEvent);
    };
  }, []);

  // Manual sync trigger
  const handleManualSync = async () => {
    if (!networkStatus || isSyncing) return;

    try {
      const syncService = getSyncService();
      await syncService.forceSyncAll();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncMessage('❌ Sync failed');
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  // Determine display status and style
  const getStatusDisplay = () => {
    if (!networkStatus) {
      return {
        icon: '📵',
        text: 'Offline',
        description: `${syncStats.local + syncStats.sync_failed} pending sync`,
        style: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        showButton: false
      };
    }

    if (isSyncing) {
      return {
        icon: '🔄',
        text: 'Syncing...',
        description: syncMessage,
        style: 'text-blue-600 bg-blue-50 border-blue-200',
        showButton: false
      };
    }

    if (syncStats.sync_failed > 0) {
      return {
        icon: '⚠️',
        text: 'Sync Issues',
        description: `${syncStats.sync_failed} failed, ${syncStats.local} pending`,
        style: 'text-red-600 bg-red-50 border-red-200',
        showButton: true
      };
    }

    if (syncStats.local > 0) {
      return {
        icon: '📝',
        text: 'Pending Sync',
        description: `${syncStats.local} activities to sync`,
        style: 'text-orange-600 bg-orange-50 border-orange-200',
        showButton: true
      };
    }

    return {
      icon: '✅',
      text: 'Synced',
      description: lastSyncTime 
        ? `Last sync: ${lastSyncTime.toLocaleTimeString()}`
        : 'All activities synced',
      style: 'text-green-600 bg-green-50 border-green-200',
      showButton: false
    };
  };

  const status = getStatusDisplay();

  // Don't show if no activities
  if (syncStats.total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status indicator */}
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-md border text-sm ${status.style}`}>
        <span className="text-base">{status.icon}</span>
        <div className="flex flex-col">
          <span className="font-medium">{status.text}</span>
          {status.description && (
            <span className="text-xs opacity-75">{status.description}</span>
          )}
        </div>
      </div>

      {/* Manual sync button */}
      {status.showButton && networkStatus && (
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          variant="outline"
          size="sm"
          className="text-xs px-2 py-1 h-auto"
        >
          {isSyncing ? '🔄' : '🔄 Sync'}
        </Button>
      )}

      {/* Sync message overlay */}
      {syncMessage && (
        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {syncMessage}
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function CompactSyncStatus({ className = "" }) {
  const [syncStats, setSyncStats] = useState({ local: 0, sync_failed: 0 });
  const [networkStatus, setNetworkStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateStats = () => {
    const stats = getActivitiesCount();
    setSyncStats(stats);
    setNetworkStatus(isOnline());
  };

  const handleSyncEvent = (event) => {
    if (event.type === 'batch_sync_start') {
      setIsSyncing(true);
    } else if (event.type === 'batch_sync_complete') {
      setIsSyncing(false);
    }
    updateStats();
  };

  useEffect(() => {
    updateStats();
    
    const syncService = getSyncService();
    syncService.addSyncCallback(handleSyncEvent);
    
    const interval = setInterval(updateStats, 10000);

    return () => {
      clearInterval(interval);
      syncService.removeSyncCallback(handleSyncEvent);
    };
  }, []);

  const pendingCount = syncStats.local + syncStats.sync_failed;

  if (pendingCount === 0 && networkStatus) {
    return (
      <span className={`text-green-600 text-sm ${className}`}>
        ✅
      </span>
    );
  }

  if (!networkStatus) {
    return (
      <span className={`text-yellow-600 text-sm ${className}`} title={`Offline - ${pendingCount} pending`}>
        📵 {pendingCount > 0 && pendingCount}
      </span>
    );
  }

  if (isSyncing) {
    return (
      <span className={`text-blue-600 text-sm ${className}`} title="Syncing...">
        🔄
      </span>
    );
  }

  return (
    <span 
      className={`text-orange-600 text-sm ${className}`} 
      title={`${pendingCount} activities pending sync`}
    >
      📝 {pendingCount}
    </span>
  );
}