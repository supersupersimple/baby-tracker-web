"use client";

import { 
  updateLocalActivity,
  markActivityAsSynced,
  getLocalActivity,
  getActivitiesByStatus,
  isOnline,
  updateStorageMetadata,
  cleanupOrphanedActivities
} from './offline-storage';

// Sync service class for managing background synchronization
class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.retryQueue = new Set();
    this.syncCallbacks = new Set();
    this.retryAttempts = new Map(); // Track retry attempts per activity
    this.maxRetries = 3;
    this.retryDelays = [1000, 3000, 10000]; // Exponential backoff delays
    
    // Bind methods to preserve context
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    
    this.init();
  }

  init() {
    // Listen for network status changes
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Start periodic sync check
    this.startPeriodicSync();
    
    console.log('🔄 Sync service initialized');
  }

  // Add callback for sync events
  addSyncCallback(callback) {
    this.syncCallbacks.add(callback);
  }

  // Remove sync callback
  removeSyncCallback(callback) {
    this.syncCallbacks.delete(callback);
  }

  // Notify all callbacks of sync events
  notifyCallbacks(event) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  // Handle network coming online
  handleOnline() {
    console.log('📡 Network: Online detected');
    this.isOnline = true;
    this.handleNetworkRecovery();
  }

  // Handle network going offline
  handleOffline() {
    console.log('📵 Network: Offline detected');
    this.isOnline = false;
    this.syncInProgress = false;
    this.retryQueue.clear();
  }

  // Handle page becoming visible
  handleVisibilityChange() {
    if (!document.hidden && this.isOnline) {
      console.log('👀 Page visible - checking for pending sync');
      setTimeout(() => {
        this.performBatchSync('visibility');
      }, 1000);
    }
  }

  // Handle network recovery
  async handleNetworkRecovery() {
    console.log('🔄 Network recovered - starting full sync');
    
    // Wait a moment for connection to stabilize
    setTimeout(() => {
      this.performBatchSync('recovery');
    }, 2000);
  }

  // Start periodic sync checking
  startPeriodicSync() {
    // Check for pending activities every 30 seconds
    setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        const pendingActivities = getActivitiesByStatus('local');
        if (pendingActivities.length > 0) {
          await this.performBatchSync('periodic');
        }
      }
    }, 30000);
    
    // Clean up orphaned activities every 5 minutes
    setInterval(() => {
      if (this.isOnline) {
        const cleanedCount = cleanupOrphanedActivities();
        if (cleanedCount > 0) {
          this.notifyCallbacks({
            type: 'cleanup_completed',
            cleanedCount: cleanedCount
          });
        }
      }
    }, 300000); // 5 minutes
  }

  // Schedule sync for a single activity
  async scheduleSync(activityId) {
    if (!this.isOnline) {
      console.log(`📵 Offline - queuing activity ${activityId} for later sync`);
      return { success: false, reason: 'offline' };
    }

    if (this.syncInProgress) {
      console.log(`🔄 Sync in progress - queuing activity ${activityId}`);
      this.retryQueue.add(activityId);
      return { success: false, reason: 'sync_in_progress' };
    }

    try {
      await this.syncSingleActivity(activityId);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to sync activity ${activityId}:`, error);
      this.retryQueue.add(activityId);
      this.scheduleRetry(activityId);
      return { success: false, reason: 'sync_failed', error: error.message };
    }
  }

  // Sync a single activity
  async syncSingleActivity(activityId) {
    const activity = getLocalActivity(activityId);
    if (!activity || activity.status === 'synced') {
      console.log(`⏭️ Activity ${activityId} already synced or not found`);
      return;
    }

    console.log(`🔄 Syncing activity ${activityId}...`);

    // Mark as syncing
    updateLocalActivity(activityId, { status: 'syncing' });
    
    this.notifyCallbacks({
      type: 'sync_start',
      activityId: activityId,
      activity: activity
    });

    try {
      // Prepare activity data for server
      const activityData = this.prepareActivityForServer(activity);
      
      let response;
      
      if (activity.serverId) {
        // Update existing server activity
        response = await fetch(`/api/activities/${activity.serverId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromDate: activityData.fromDate,
            toDate: activityData.toDate,
            amount: activityData.amount,
            details: activityData.details,
            unit: activityData.unit,
            category: activityData.category,
            clientVersion: activity.version
          }),
        });
        
        // Handle case where server activity no longer exists
        if (response.status === 404) {
          console.warn(`⚠️ Server activity ${activity.serverId} not found, creating new activity instead`);
          
          // Clear the serverId and create as new activity
          updateLocalActivity(activityId, { serverId: null });
          
          // Create new server activity instead
          response = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...activityData,
              clientId: activity.id,
              clientVersion: activity.version
            }),
          });
        }
      } else {
        // Create new server activity
        response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activityData,
            clientId: activity.id,
            clientVersion: activity.version
          }),
        });
      }

      if (response.ok) {
        const serverActivity = await response.json();
        
        // Mark as successfully synced
        markActivityAsSynced(activityId, serverActivity.data);
        
        // Clear retry attempts
        this.retryAttempts.delete(activityId);
        this.retryQueue.delete(activityId);
        
        console.log(`✅ Activity ${activityId} synced successfully`);
        
        this.notifyCallbacks({
          type: 'sync_success',
          activityId: activityId,
          serverActivity: serverActivity.data
        });
        
        return serverActivity.data;
      } else {
        const errorData = await response.json();
        
        if (response.status === 409) {
          // Conflict detected - handle appropriately
          console.warn(`⚠️ Conflict detected for activity ${activityId}`);
          this.handleSyncConflict(activityId, errorData.serverRecord);
          return;
        }
        
        if (response.status === 404) {
          // Activity not found on server - this should have been handled above
          console.error(`❌ Activity ${activityId} not found on server and fallback failed`);
          updateLocalActivity(activityId, { status: 'sync_failed', serverId: null });
          throw new Error(`Activity not found on server: ${activityId}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Mark as sync failed
      updateLocalActivity(activityId, { status: 'sync_failed' });
      
      this.notifyCallbacks({
        type: 'sync_error',
        activityId: activityId,
        error: error.message
      });
      
      throw error;
    }
  }

  // Prepare activity data for server (remove client-specific fields)
  prepareActivityForServer(activity) {
    const { 
      id, tempId, timestamp, synced, serverId, baby, 
      version, status, lastModified, contentHash, 
      ...serverData 
    } = activity;
    
    return serverData;
  }

  // Handle sync conflicts
  async handleSyncConflict(activityId, serverRecord) {
    console.log(`🔀 Handling conflict for activity ${activityId}`);
    
    const localActivity = getLocalActivity(activityId);
    
    // Simple conflict resolution: Local wins (Last-Write-Wins)
    if (localActivity.lastModified > serverRecord.lastModified) {
      console.log('📝 Local version is newer - updating server');
      // Force update server with local data
      try {
        const response = await fetch(`/api/activities/${serverRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...this.prepareActivityForServer(localActivity),
            forceUpdate: true,
            clientVersion: localActivity.version + 1
          }),
        });
        
        if (response.ok) {
          const updatedActivity = await response.json();
          markActivityAsSynced(activityId, updatedActivity.data);
          
          this.notifyCallbacks({
            type: 'conflict_resolved',
            activityId: activityId,
            resolution: 'local_wins'
          });
        }
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
        updateLocalActivity(activityId, { status: 'sync_failed' });
      }
    } else {
      console.log('🌐 Server version is newer - updating local');
      // Server wins - update local with server data
      markActivityAsSynced(activityId, serverRecord);
      
      this.notifyCallbacks({
        type: 'conflict_resolved',
        activityId: activityId,
        resolution: 'server_wins'
      });
    }
  }

  // Schedule retry for failed sync
  scheduleRetry(activityId) {
    const attempts = this.retryAttempts.get(activityId) || 0;
    
    if (attempts >= this.maxRetries) {
      console.log(`❌ Max retry attempts reached for activity ${activityId}`);
      updateLocalActivity(activityId, { status: 'sync_failed' });
      this.retryAttempts.delete(activityId);
      this.retryQueue.delete(activityId);
      return;
    }

    const delay = this.retryDelays[attempts] || this.retryDelays[this.retryDelays.length - 1];
    this.retryAttempts.set(activityId, attempts + 1);
    
    console.log(`🔄 Scheduling retry ${attempts + 1}/${this.maxRetries} for activity ${activityId} in ${delay}ms`);
    
    setTimeout(async () => {
      if (this.isOnline && !this.syncInProgress) {
        try {
          await this.syncSingleActivity(activityId);
        } catch (error) {
          this.scheduleRetry(activityId); // Recursive retry
        }
      }
    }, delay);
  }

  // Perform batch sync of all pending activities
  async performBatchSync(trigger = 'manual') {
    if (this.syncInProgress || !this.isOnline) {
      console.log('⏭️ Sync already in progress or offline');
      return { success: false, reason: 'unavailable' };
    }

    const pendingActivities = getActivitiesByStatus('local');
    const failedActivities = getActivitiesByStatus('sync_failed');
    const allPendingActivities = [...pendingActivities, ...failedActivities];

    if (allPendingActivities.length === 0) {
      console.log('✅ No activities to sync');
      return { success: true, synced: 0, message: 'No activities to sync' };
    }

    this.syncInProgress = true;
    let syncedCount = 0;
    let errors = [];

    console.log(`🔄 Starting batch sync (${trigger}) - ${allPendingActivities.length} activities`);

    this.notifyCallbacks({
      type: 'batch_sync_start',
      trigger: trigger,
      totalCount: allPendingActivities.length
    });

    try {
      // Process activities in small batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < allPendingActivities.length; i += batchSize) {
        const batch = allPendingActivities.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (activity) => {
          try {
            await this.syncSingleActivity(activity.id);
            syncedCount++;
          } catch (error) {
            errors.push(`Activity ${activity.id}: ${error.message}`);
          }
        });

        // Wait for current batch to complete before processing next
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches
        if (i + batchSize < allPendingActivities.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update sync metadata
      updateStorageMetadata({
        lastSyncTime: new Date().toISOString(),
        lastSyncTrigger: trigger,
        lastSyncResult: {
          synced: syncedCount,
          total: allPendingActivities.length,
          errors: errors.length
        }
      });

      console.log(`✅ Batch sync completed - ${syncedCount}/${allPendingActivities.length} synced`);

      this.notifyCallbacks({
        type: 'batch_sync_complete',
        trigger: trigger,
        synced: syncedCount,
        total: allPendingActivities.length,
        errors: errors
      });

      return {
        success: syncedCount > 0,
        synced: syncedCount,
        total: allPendingActivities.length,
        errors: errors.length > 0 ? errors : null
      };

    } finally {
      this.syncInProgress = false;
    }
  }

  // Get sync status
  getSyncStatus() {
    const pendingCount = getActivitiesByStatus('local').length;
    const syncingCount = getActivitiesByStatus('syncing').length;
    const failedCount = getActivitiesByStatus('sync_failed').length;

    return {
      online: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingSync: pendingCount,
      syncing: syncingCount,
      failed: failedCount,
      retryQueue: this.retryQueue.size
    };
  }

  // Force sync all activities (manual trigger)
  async forceSyncAll() {
    return await this.performBatchSync('manual');
  }

  // Clean up event listeners
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.syncCallbacks.clear();
    this.retryQueue.clear();
    this.retryAttempts.clear();
    
    console.log('🛑 Sync service destroyed');
  }
}

// Global singleton instance
let syncServiceInstance = null;

// Get or create sync service instance
export const getSyncService = () => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
};

// Initialize sync service (call once at app startup)
export const initSyncService = () => {
  return getSyncService();
};

// Destroy sync service (for cleanup)
export const destroySyncService = () => {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
};