"use client";

import { syncLocalActivities, syncRemoteToLocal, isOnline, getActivitiesCount } from './offline-storage';

class SyncDaemon {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.networkCheckInterval = null;
    this.wasOffline = false;
    this.onSyncCallback = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.syncIntervalMs = 30000; // 30 seconds
    this.networkCheckMs = 5000; // 5 seconds
  }

  start(onSyncCallback = null) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.onSyncCallback = onSyncCallback;
    this.wasOffline = !isOnline();
    
    console.log('🔄 Sync daemon started');
    
    // Start network monitoring
    this.startNetworkMonitoring();
    
    // Start periodic sync for online mode
    this.startPeriodicSync();
    
    // Listen for visibility changes (when user returns to tab)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    console.log('⏹️ Sync daemon stopped');
  }

  startNetworkMonitoring() {
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Additional network check loop (since browser events can be unreliable)
    this.networkCheckInterval = setInterval(() => {
      const currentOnlineStatus = isOnline();
      
      // If we just came back online
      if (currentOnlineStatus && this.wasOffline) {
        this.handleNetworkRecovery();
      }
      
      this.wasOffline = !currentOnlineStatus;
    }, this.networkCheckMs);
  }

  startPeriodicSync() {
    // Sync periodically if online and has pending data
    this.syncInterval = setInterval(async () => {
      if (!this.isRunning || !isOnline()) return;
      
      const counts = getActivitiesCount();
      if (counts.unsynced > 0) {
        await this.performSync('periodic');
      }
    }, this.syncIntervalMs);
  }

  handleOnline() {
    console.log('📡 Network: Online detected');
    this.handleNetworkRecovery();
  }

  handleOffline() {
    console.log('📵 Network: Offline detected');
    this.wasOffline = true;
    this.retryAttempts = 0; // Reset retry counter when going offline
  }

  handleVisibilityChange() {
    // When user returns to tab and we're online, check for sync
    if (!document.hidden && isOnline()) {
      setTimeout(() => {
        this.performSync('visibility');
      }, 1000); // Small delay to let things settle
    }
  }

  async handleNetworkRecovery() {
    if (!this.isRunning) return;
    
    console.log('🔄 Network recovered - starting auto-sync');
    this.wasOffline = false;
    this.retryAttempts = 0;
    
    // Wait a moment for connection to stabilize
    setTimeout(async () => {
      await this.performFullSync('recovery');
    }, 2000);
  }

  async performFullSync(trigger = 'manual') {
    try {
      console.log(`🔄 Full sync started (${trigger})`);
      
      // First sync remote to local
      const remoteResult = await syncRemoteToLocal();
      if (remoteResult.success && remoteResult.downloaded > 0) {
        console.log(`📥 Downloaded ${remoteResult.downloaded} activities from server`);
      }
      
      // Then sync local to remote
      const localResult = await syncLocalActivities();
      if (localResult.success && localResult.synced > 0) {
        console.log(`📤 Uploaded ${localResult.synced} activities to server`);
      }
      
      // Notify callback
      if (this.onSyncCallback) {
        this.onSyncCallback({
          type: 'full-sync',
          trigger,
          downloaded: remoteResult.downloaded || 0,
          uploaded: localResult.synced || 0
        });
      }
      
      this.retryAttempts = 0; // Reset on success
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      this.handleSyncError(error, trigger);
    }
  }

  async performSync(trigger = 'manual') {
    try {
      console.log(`🔄 Local sync started (${trigger})`);
      
      const result = await syncLocalActivities();
      if (result.success && result.synced > 0) {
        console.log(`📤 Uploaded ${result.synced} activities to server`);
        
        // Notify callback
        if (this.onSyncCallback) {
          this.onSyncCallback({
            type: 'upload-sync',
            trigger,
            uploaded: result.synced
          });
        }
      }
      
      this.retryAttempts = 0; // Reset on success
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.handleSyncError(error, trigger);
    }
  }

  handleSyncError(error, trigger) {
    this.retryAttempts++;
    
    if (this.retryAttempts < this.maxRetries && isOnline()) {
      const retryDelay = Math.min(1000 * Math.pow(2, this.retryAttempts), 30000); // Exponential backoff, max 30s
      console.log(`🔄 Retry sync in ${retryDelay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);
      
      setTimeout(() => {
        if (trigger === 'recovery') {
          this.performFullSync(`retry-${this.retryAttempts}`);
        } else {
          this.performSync(`retry-${this.retryAttempts}`);
        }
      }, retryDelay);
    } else {
      console.log('❌ Max retry attempts reached or offline');
    }
  }

  // Manual sync trigger
  async triggerSync() {
    if (!isOnline()) {
      console.log('📵 Cannot sync - offline');
      return { success: false, error: 'Device is offline' };
    }
    
    await this.performFullSync('manual');
    return { success: true };
  }

  // Get sync status
  getStatus() {
    const counts = getActivitiesCount();
    return {
      running: this.isRunning,
      online: isOnline(),
      pendingSync: counts.unsynced,
      totalActivities: counts.total,
      retryAttempts: this.retryAttempts
    };
  }
}

// Global singleton instance
let syncDaemonInstance = null;

export const getSyncDaemon = () => {
  if (!syncDaemonInstance) {
    syncDaemonInstance = new SyncDaemon();
  }
  return syncDaemonInstance;
};

export const startSyncDaemon = (onSyncCallback) => {
  const daemon = getSyncDaemon();
  daemon.start(onSyncCallback);
  return daemon;
};

export const stopSyncDaemon = () => {
  if (syncDaemonInstance) {
    syncDaemonInstance.stop();
  }
};