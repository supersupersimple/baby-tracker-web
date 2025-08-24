// Offline-first storage utility for baby tracker activities
import { ulid } from 'ulid';

const STORAGE_KEY = 'baby-tracker-activities';
const SYNC_QUEUE_KEY = 'baby-tracker-sync-queue';
const METADATA_KEY = 'baby-tracker-metadata';
const STORAGE_VERSION = '2.0';

// Storage schema definition
const DEFAULT_STORAGE_SCHEMA = {
  activities: [],
  syncQueue: [],
  metadata: {
    lastSyncTime: null,
    conflictLog: [],
    schemaVersion: STORAGE_VERSION,
    createdAt: new Date().toISOString()
  }
};

// Generate ULID for unique, sortable IDs
const generateULID = () => {
  return ulid();
};

// Content hash generator for deduplication
const generateContentHash = (record) => {
  const content = {
    babyId: record.babyId,
    type: record.type,
    subtype: record.subtype,
    fromDate: record.fromDate,
    amount: record.amount,
    details: record.details,
    category: record.category,
    unit: record.unit,
    // Add millisecond precision to ensure different activities have different hashes
    timestamp: new Date(record.fromDate).getTime()
  };
  // Simple hash function for content comparison
  return btoa(JSON.stringify(content)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
};

// Store activity locally (offline-first approach)
export const storeActivityLocally = (activityData) => {
  try {
    const localData = getLocalData();
    const currentTime = new Date().toISOString();
    
    // Generate content hash for deduplication
    const contentHash = generateContentHash(activityData);
    
    // Duplicate detection completely removed to fix consecutive activity creation issue
    
    const activityWithId = {
      ...activityData,
      id: generateULID(), // Primary ULID identifier
      version: 1, // Version for conflict resolution
      status: 'local', // Status: local, syncing, synced, sync_failed
      lastModified: currentTime,
      contentHash: contentHash,
      // Legacy compatibility fields
      tempId: `ulid_${generateULID()}`, // Keep for backward compatibility
      timestamp: currentTime,
      synced: false,
      serverId: null, // Will be filled when synced with server
      // Add baby info if not present (for consistent UI display)
      baby: activityData.baby || {
        id: activityData.babyId,
        babyName: 'Baby',
        gender: 'Unknown'
      }
    };
    
    console.log(`💾 Storing new activity locally (no duplicate check):`, {
      id: activityWithId.id,
      type: activityData.type,
      babyId: activityData.babyId,
      fromDate: activityData.fromDate,
      contentHash: contentHash,
      status: 'local'
    });
    
    localData.activities.push(activityWithId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    
    // Add to sync queue for background sync
    addToSyncQueue(activityWithId);
    
    // Dispatch custom event to notify other components (like RecentActivities) that storage changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('localStorageChanged', {
        detail: { type: 'activity-added', activity: activityWithId }
      }));
    }
    
    console.log(`✅ Activity stored locally with ID ${activityWithId.id}, total activities: ${localData.activities.length}`);
    return activityWithId;
  } catch (error) {
    console.error('Error storing activity locally:', error);
    throw error;
  }
};

// Migration helper for legacy data
const migrateLegacyData = (data) => {
  if (!data.metadata || data.metadata.schemaVersion !== STORAGE_VERSION) {
    console.log('Migrating legacy data to new schema...');
    
    // Migrate activities to new format
    const migratedActivities = (data.activities || []).map(activity => {
      if (!activity.id && activity.tempId) {
        // Legacy activity - add new fields
        return {
          ...activity,
          id: activity.tempId.startsWith('ulid_') ? activity.tempId.substring(5) : generateULID(),
          version: 1,
          status: activity.synced ? 'synced' : 'local',
          lastModified: activity.timestamp || new Date().toISOString(),
          contentHash: generateContentHash(activity)
        };
      }
      return activity;
    });
    
    return {
      ...DEFAULT_STORAGE_SCHEMA,
      activities: migratedActivities,
      metadata: {
        ...DEFAULT_STORAGE_SCHEMA.metadata,
        migratedAt: new Date().toISOString(),
        legacyDataFound: true
      }
    };
  }
  return data;
};

// Check for duplicate activities within time window
const checkForDuplicate = (activities, contentHash, fromDate, timeWindowMs = 10 * 1000) => {
  const targetTime = new Date(fromDate).getTime();
  const startTime = targetTime - timeWindowMs;
  const endTime = targetTime + timeWindowMs;
  
  return activities.find(activity => {
    if (activity.contentHash !== contentHash) return false;
    
    const activityTime = new Date(activity.fromDate).getTime();
    return activityTime >= startTime && activityTime <= endTime;
  });
};

// Get all local data (both synced and unsynced)
export const getLocalData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsedData = data ? JSON.parse(data) : DEFAULT_STORAGE_SCHEMA;
    
    // Migrate legacy data if needed
    const migratedData = migrateLegacyData(parsedData);
    
    // Save migrated data back if migration occurred
    if (migratedData !== parsedData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
    }
    
    return migratedData;
  } catch (error) {
    console.error('Error getting local data:', error);
    return DEFAULT_STORAGE_SCHEMA;
  }
};

// Get only unsynced activities
export const getUnsyncedActivities = () => {
  const localData = getLocalData();
  return localData.activities.filter(activity => 
    activity.status === 'local' || activity.status === 'sync_failed' || !activity.synced
  );
};

// Get activities by status
export const getActivitiesByStatus = (status) => {
  const localData = getLocalData();
  return localData.activities.filter(activity => activity.status === status);
};

// Get activity by ID (supports both new ID and legacy tempId)
export const getLocalActivity = (id) => {
  const localData = getLocalData();
  return localData.activities.find(activity => 
    activity.id === id || activity.tempId === id
  );
};

// Add a new activity to local storage (helper function)
export const addLocalActivity = (activityData) => {
  try {
    const localData = getLocalData();
    
    // Ensure the activity has required new fields
    const activity = {
      ...activityData,
      id: activityData.id || generateULID(),
      version: activityData.version || 1,
      status: activityData.status || 'local',
      lastModified: activityData.lastModified || new Date().toISOString(),
      contentHash: activityData.contentHash || generateContentHash(activityData)
    };
    
    localData.activities.push(activity);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    
    return activity;
  } catch (error) {
    console.error('Error adding local activity:', error);
    throw error;
  }
};

// Export ULID generator for external use
export const generateActivityId = generateULID;

// Get storage metadata
export const getStorageMetadata = () => {
  const localData = getLocalData();
  return localData.metadata;
};

// Update storage metadata
export const updateStorageMetadata = (updates) => {
  try {
    const localData = getLocalData();
    localData.metadata = {
      ...localData.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
  } catch (error) {
    console.error('Error updating storage metadata:', error);
  }
};

// Clear all local data (for testing/reset purposes)
export const clearAllLocalData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    localStorage.removeItem(METADATA_KEY);
    console.log('All local data cleared');
  } catch (error) {
    console.error('Error clearing local data:', error);
  }
};

// Clean up orphaned activities (those with serverId but not found on server)
export const cleanupOrphanedActivities = () => {
  try {
    const localData = getLocalData();
    let cleanedCount = 0;
    
    localData.activities = localData.activities.map(activity => {
      // If activity has serverId but sync failed, clear the serverId
      if (activity.serverId && activity.status === 'sync_failed') {
        console.log(`🧹 Cleaning orphaned activity ${activity.id} - removing serverId ${activity.serverId}`);
        cleanedCount++;
        return {
          ...activity,
          serverId: null,
          status: 'local', // Reset to local so it can be synced as new
          version: (activity.version || 1) + 1 // Increment version
        };
      }
      return activity;
    });
    
    if (cleanedCount > 0) {
      localData.metadata.lastCleanup = new Date().toISOString();
      localData.metadata.cleanedActivities = (localData.metadata.cleanedActivities || 0) + cleanedCount;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      console.log(`✅ Cleaned up ${cleanedCount} orphaned activities`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned activities:', error);
    return 0;
  }
};

// Get all activities (for display) - with pagination support
export const getAllLocalActivities = (babyId = null, page = null, limit = null) => {
  const localData = getLocalData();
  let activities = localData.activities;
  
  // Filter by baby if specified
  if (babyId) {
    activities = activities.filter(activity => 
      activity.babyId === babyId || activity.baby?.id === babyId
    );
  }
  
  // Sort by date (newest first)
  activities = activities.sort((a, b) => 
    new Date(b.fromDate || b.timestamp) - new Date(a.fromDate || a.timestamp)
  );
  
  // Apply pagination if page and limit are provided
  if (page && limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);
    
    return {
      activities: paginatedActivities,
      totalCount: activities.length,
      currentPage: page,
      totalPages: Math.ceil(activities.length / limit),
      hasMore: endIndex < activities.length,
      itemsPerPage: limit
    };
  }
  
  // Return all activities if no pagination requested (for backward compatibility)
  return activities;
};

// Add activity to sync queue
export const addToSyncQueue = (activity) => {
  try {
    const syncQueue = getSyncQueue();
    syncQueue.push(activity);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
};

// Get sync queue
export const getSyncQueue = () => {
  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
};

// Clear sync queue
export const clearSyncQueue = () => {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.error('Error clearing sync queue:', error);
  }
};

// Mark activity as synced and update with server data
export const markActivityAsSynced = (activityId, serverActivity) => {
  try {
    if (!activityId) {
      console.error('markActivityAsSynced: activityId is required');
      return false;
    }
    
    if (!serverActivity || !serverActivity.id) {
      console.error('markActivityAsSynced: serverActivity with id is required');
      return false;
    }
    
    const localData = getLocalData();
    const activityIndex = localData.activities.findIndex(
      activity => activity.id === activityId || activity.tempId === activityId
    );
    
    if (activityIndex !== -1) {
      const currentActivity = localData.activities[activityIndex];
      
      // Preserve important local data while updating with server data
      localData.activities[activityIndex] = {
        ...currentActivity,
        ...serverActivity,
        id: currentActivity.id, // Keep our ULID as primary identifier
        version: Math.max(currentActivity.version || 1, serverActivity.version || 1), // Use higher version
        status: 'synced',
        lastModified: new Date().toISOString(),
        contentHash: currentActivity.contentHash, // Keep our content hash
        // Legacy compatibility
        synced: true,
        serverId: serverActivity.id,
        tempId: currentActivity.tempId // Keep tempId for reference
      };
      
      // Update metadata
      localData.metadata.lastSyncTime = new Date().toISOString();
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      
      console.log(`✅ Activity ${activityId} marked as synced with server ID ${serverActivity.id}`);
      return true;
    } else {
      console.warn(`⚠️ Activity ${activityId} not found in local storage for sync marking`);
      return false;
    }
  } catch (error) {
    console.error('Error marking activity as synced:', error);
    return false;
  }
};

// Update local activity (for finish, edit operations)
export const updateLocalActivity = (activityId, updates) => {
  try {
    const localData = getLocalData();
    const activityIndex = localData.activities.findIndex(
      activity => activity.id === activityId || activity.tempId === activityId
    );
    
    if (activityIndex !== -1) {
      const currentActivity = localData.activities[activityIndex];
      const updatedActivity = {
        ...currentActivity,
        ...updates,
        version: (currentActivity.version || 1) + 1, // Increment version
        status: updates.status || 'local', // Mark as needing sync unless explicitly set
        lastModified: new Date().toISOString(),
        // Update content hash if data changed
        contentHash: updates.babyId || updates.type || updates.fromDate ? 
          generateContentHash({...currentActivity, ...updates}) : currentActivity.contentHash,
        // Legacy compatibility
        synced: updates.status === 'synced' || false
      };
      
      localData.activities[activityIndex] = updatedActivity;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      
      // Add updated activity to sync queue if not already synced
      if (updatedActivity.status !== 'synced') {
        addToSyncQueue(updatedActivity);
      }
      
      return updatedActivity;
    }
    return null;
  } catch (error) {
    console.error('Error updating local activity:', error);
    return null;
  }
};

// Remove activity from local storage (for delete operations)
export const removeLocalActivity = (activityId) => {
  try {
    const localData = getLocalData();
    console.log('🗑️ removeLocalActivity searching for:', activityId);
    console.log('🗑️ Available activities before:', localData.activities.map(a => ({ id: a.id, tempId: a.tempId })));
    
    const activityToRemove = localData.activities.find(
      activity => 
        activity.id === activityId || 
        activity.tempId === activityId ||
        activity.serverId === activityId ||
        String(activity.serverId) === String(activityId)
    );
    
    if (activityToRemove) {
      console.log('🗑️ Found activity to remove:', {
        id: activityToRemove.id,
        tempId: activityToRemove.tempId,
        serverId: activityToRemove.serverId,
        status: activityToRemove.status
      });
      
      // Log the removal for conflict resolution
      if (!localData.metadata.conflictLog) {
        localData.metadata.conflictLog = [];
      }
      localData.metadata.conflictLog.push({
        type: 'delete',
        activityId: activityToRemove.id,
        serverId: activityToRemove.serverId,
        timestamp: new Date().toISOString()
      });
      
      // Remove from activities using the found activity's identifiers
      const activityToRemoveId = activityToRemove.id;
      const activityToRemoveTempId = activityToRemove.tempId;
      const activityToRemoveServerId = activityToRemove.serverId;
      
      localData.activities = localData.activities.filter(
        activity => 
          activity.id !== activityToRemoveId && 
          activity.tempId !== activityToRemoveTempId &&
          (activityToRemoveServerId ? activity.serverId !== activityToRemoveServerId : true)
      );
      
      // Remove from sync queue if present
      const syncQueue = getSyncQueue();
      const updatedQueue = syncQueue.filter(
        queueActivity => 
          queueActivity.id !== activityToRemoveId && 
          queueActivity.tempId !== activityToRemoveTempId &&
          (activityToRemoveServerId ? queueActivity.serverId !== activityToRemoveServerId : true)
      );
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
      
      console.log('✅ Activity removed successfully from local storage');
    } else {
      console.log('⚠️ Activity not found in local storage for removal:', activityId);
    }
    
    console.log('🗑️ Available activities after:', localData.activities.map(a => ({ id: a.id, tempId: a.tempId })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
  } catch (error) {
    console.error('Error removing local activity:', error);
  }
};

// Get activities count with enhanced status tracking
export const getActivitiesCount = () => {
  const localData = getLocalData();
  const statusCounts = localData.activities.reduce((counts, activity) => {
    const status = activity.status || (activity.synced ? 'synced' : 'local');
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  
  return {
    total: localData.activities.length,
    local: statusCounts.local || 0,
    syncing: statusCounts.syncing || 0,
    synced: statusCounts.synced || 0,
    sync_failed: statusCounts.sync_failed || 0,
    // Legacy compatibility
    unsynced: (statusCounts.local || 0) + (statusCounts.sync_failed || 0),
    pendingSync: getSyncQueue().length
  };
};

// Check if device is online
export const isOnline = () => {
  return navigator.onLine;
};

// Sync remote activities to local storage (with pagination)
export const syncRemoteToLocal = async (selectedBaby, page = 1, limit = 30) => {
  if (!isOnline()) {
    return { success: false, error: 'Device is offline' };
  }

  // If no selectedBaby, skip sync
  if (!selectedBaby || !selectedBaby.id) {
    return { success: false, error: 'No baby selected for sync' };
  }

  try {
    const response = await fetch(`/api/activities?babyId=${selectedBaby.id}&page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch remote activities');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch activities');
    }

    const remoteActivities = result.data || [];
    const pagination = result.pagination || {};
    const localData = getLocalData();
    
    // Merge remote activities with local activities
    let syncedCount = 0;
    let removedCount = 0;
    
    // Create a set of remote activity IDs for fast lookup
    const remoteActivityIds = new Set(remoteActivities.map(a => a.id));
    console.log(`🔄 Sync starting: Found ${remoteActivities.length} remote activities for baby ${selectedBaby?.id}`);
    console.log(`🔄 Remote activity IDs:`, Array.from(remoteActivityIds));
    
    // Log current local activities before sync
    const currentLocalActivities = localData.activities.filter(a => 
      a.babyId === selectedBaby?.id || a.baby?.id === selectedBaby?.id
    );
    console.log(`🔄 Current local activities (${currentLocalActivities.length}):`, 
      currentLocalActivities.map(a => ({
        id: a.id,
        serverId: a.serverId,
        type: a.type,
        status: a.status,
        fromDate: a.fromDate
      }))
    );
    
    // First, identify and remove local activities that no longer exist on remote
    // Only remove synced activities (don't remove local-only activities)
    // Add grace period for recently synced activities to handle race conditions
    const activitiesToRemove = [];
    const now = Date.now();
    const GRACE_PERIOD_MS = 30000; // 30 seconds grace period for newly synced activities
    
    localData.activities.forEach((localActivity, index) => {
      // Only consider removing activities that were previously synced with the server
      if (localActivity.serverId && localActivity.status === 'synced') {
        // If this synced activity no longer exists on the remote server
        if (!remoteActivityIds.has(localActivity.serverId)) {
          // Check if this activity was recently synced (within grace period)
          const lastModified = new Date(localActivity.lastModified).getTime();
          const timeSinceSync = now - lastModified;
          
          if (timeSinceSync < GRACE_PERIOD_MS) {
            console.log(`⏰ Activity ${localActivity.serverId} not found on remote but within grace period (${Math.round(timeSinceSync/1000)}s ago) - keeping for now`);
          } else {
            console.log(`🗑️ Activity ${localActivity.serverId} exists locally but not on remote - removing from local storage`);
            console.log(`🗑️ Activity details:`, {
              id: localActivity.id,
              serverId: localActivity.serverId,
              type: localActivity.type,
              fromDate: localActivity.fromDate,
              status: localActivity.status,
              lastModified: localActivity.lastModified,
              timeSinceSync: Math.round(timeSinceSync/1000) + 's'
            });
            activitiesToRemove.push(index);
            removedCount++;
          }
        }
      }
    });
    
    // Remove activities in reverse order to maintain correct indices
    activitiesToRemove.reverse().forEach(index => {
      const removedActivity = localData.activities[index];
      // Log the removal for conflict resolution
      if (!localData.metadata.conflictLog) {
        localData.metadata.conflictLog = [];
      }
      localData.metadata.conflictLog.push({
        type: 'remote_delete_sync',
        activityId: removedActivity.id,
        serverId: removedActivity.serverId,
        timestamp: new Date().toISOString()
      });
      localData.activities.splice(index, 1);
    });
    
    // Then, add new remote activities that don't exist locally
    for (const remoteActivity of remoteActivities) {
      // Check if this remote activity already exists locally
      // Priority: 1) serverId match, 2) content hash match, 3) exact field match for recent activities
      let existsLocally = false;
      
      const existingActivity = localData.activities.find(localActivity => {
        // 1. ULID match (most reliable for new system)
        if (remoteActivity.ulid && localActivity.id === remoteActivity.ulid) {
          console.log(`🔗 Found ULID match: local ${localActivity.id} <-> remote ${remoteActivity.id}`);
          return true;
        }
        
        // 2. Direct server ID match (legacy compatibility)
        if (localActivity.serverId === remoteActivity.id) {
          console.log(`🔗 Found server ID match: local ${localActivity.id} <-> remote ${remoteActivity.id}`);
          return true;
        }
        
        // 3. Temporarily disable other matching to force fresh sync
        // This will ensure all remote activities are added to local storage
        
        return false;
      });
      
      if (existingActivity) {
        existsLocally = true;
        
        // If we found a match by content/time but the local activity doesn't have a serverId,
        // update it with the server ID to prevent future duplicates
        if (!existingActivity.serverId && existingActivity.id) {
          console.log(`🔗 Linking local activity ${existingActivity.id} with server ID ${remoteActivity.id}`);
          console.log(`🔗 Match details:`, {
            localId: existingActivity.id,
            localFromDate: existingActivity.fromDate,
            remoteId: remoteActivity.id,
            remoteFromDate: remoteActivity.fromDate,
            matchType: 'content/time'
          });
          const activityIndex = localData.activities.findIndex(a => a.id === existingActivity.id);
          if (activityIndex !== -1) {
            localData.activities[activityIndex] = {
              ...localData.activities[activityIndex],
              serverId: remoteActivity.id,
              status: 'synced',
              synced: true,
              lastModified: new Date().toISOString()
            };
            console.log(`✅ Successfully linked activity ${existingActivity.id} -> server ID ${remoteActivity.id}`);
          }
        } else if (existingActivity.serverId) {
          console.log(`✅ Activity already linked: ${existingActivity.id} -> server ID ${existingActivity.serverId}`);
        }
      }
      
      if (!existsLocally) {
        console.log(`📥 Adding new remote activity ${remoteActivity.id} to local storage`);
        console.log(`📥 Remote activity details:`, {
          id: remoteActivity.id,
          ulid: remoteActivity.ulid,
          type: remoteActivity.type,
          fromDate: remoteActivity.fromDate,
          babyId: remoteActivity.babyId
        });
        
        // Add remote activity to local storage as synced
        const localActivity = {
          ...remoteActivity,
          id: generateULID(), // Generate new ULID for local tracking
          version: remoteActivity.version || 1,
          status: 'synced',
          lastModified: remoteActivity.lastModified || new Date().toISOString(),
          contentHash: generateContentHash(remoteActivity),
          // Legacy compatibility
          tempId: `remote_${remoteActivity.id}_${Date.now()}`,
          timestamp: remoteActivity.fromDate || remoteActivity.createdAt,
          synced: true,
          serverId: remoteActivity.id,
          // Ensure baby info is present
          baby: remoteActivity.baby || {
            id: remoteActivity.babyId,
            babyName: 'Baby',
            gender: 'Unknown'
          }
        };
        
        localData.activities.push(localActivity);
        syncedCount++;
        console.log(`✅ Added remote activity to local storage with local ID ${localActivity.id}`);
      }
    }

    // Save updated local data and update metadata
    if (syncedCount > 0 || removedCount > 0) {
      localData.metadata.lastSyncTime = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    }

    const message = `Downloaded ${syncedCount} activities, removed ${removedCount} deleted activities`;
    console.log(`✅ Sync complete: ${message}`);

    return {
      success: true,
      downloaded: syncedCount,
      removed: removedCount,
      total: remoteActivities.length,
      pagination,
      message
    };
  } catch (error) {
    console.error('Error syncing remote to local:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Manual sync function to reconcile differences between local and remote
export const manualSyncActivities = async (selectedBaby) => {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  try {
    console.log('🔄 Starting manual sync...');
    
    // Get local activities
    const localActivities = getAllLocalActivities(selectedBaby?.id);
    
    // Get remote activities
    const response = await fetch(`/api/activities?babyId=${selectedBaby?.id || ''}`);
    if (!response.ok) {
      throw new Error('Failed to fetch remote activities');
    }
    const remoteResult = await response.json();
    const remoteActivities = remoteResult.success ? remoteResult.data : [];
    
    console.log(`📊 Found ${localActivities.length} local and ${remoteActivities.length} remote activities`);
    
    const syncResults = {
      localToRemote: 0,    // Local activities pushed to remote
      remoteToLocal: 0,    // Remote activities added to local
      conflicts: 0,        // Conflicts resolved (local wins)
      errors: []
    };
    
    // Create maps for faster lookup
    const localMap = new Map();
    const remoteMap = new Map();
    
    localActivities.forEach(activity => {
      // Use both tempId and id for lookup
      if (activity.tempId) localMap.set(activity.tempId, activity);
      if (activity.id) localMap.set(activity.id, activity);
    });
    
    remoteActivities.forEach(activity => {
      remoteMap.set(activity.id, activity);
    });
    
    // 1. Push local-only activities to remote
    for (const localActivity of localActivities) {
      const remoteExists = remoteMap.has(localActivity.id);
      
      if (!remoteExists && localActivity.tempId) {
        try {
          // This is a local-only activity, push to remote
          const response = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              babyId: selectedBaby?.id,
              type: localActivity.type,
              subtype: localActivity.subtype,
              fromDate: localActivity.fromDate,
              toDate: localActivity.toDate,
              unit: localActivity.unit,
              amount: localActivity.amount,
              category: localActivity.category,
              details: localActivity.details,
              clientId: localActivity.id // Send ULID for proper matching
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              // Update local activity with remote ID
              updateLocalActivity(localActivity.tempId, {
                id: result.data.id,
                synced: true
              });
              syncResults.localToRemote++;
            }
          }
        } catch (error) {
          syncResults.errors.push(`Failed to push local activity: ${error.message}`);
        }
      }
    }
    
    // 2. Pull remote-only activities to local
    for (const remoteActivity of remoteActivities) {
      const localExists = localMap.has(remoteActivity.id);
      
      if (!localExists) {
        try {
          // This is a remote-only activity, add to local
          const localActivity = {
            ...remoteActivity,
            id: generateULID(),
            version: remoteActivity.version || 1,
            status: 'synced',
            lastModified: remoteActivity.lastModified || new Date().toISOString(),
            contentHash: generateContentHash(remoteActivity),
            // Legacy compatibility
            tempId: `remote_${Date.now()}_${Math.random()}`,
            synced: true
          };
          localData.activities.push(localActivity);
          syncResults.remoteToLocal++;
        } catch (error) {
          syncResults.errors.push(`Failed to pull remote activity: ${error.message}`);
        }
      }
    }
    
    // 3. Handle conflicts - local wins, update remote
    for (const localActivity of localActivities) {
      if (localActivity.id && remoteMap.has(localActivity.id)) {
        const remoteActivity = remoteMap.get(localActivity.id);
        
        // Check if there are differences
        const hasConflict = (
          localActivity.fromDate !== remoteActivity.fromDate ||
          localActivity.toDate !== remoteActivity.toDate ||
          localActivity.amount !== remoteActivity.amount ||
          localActivity.details !== remoteActivity.details ||
          localActivity.unit !== remoteActivity.unit ||
          localActivity.subtype !== remoteActivity.subtype ||
          localActivity.category !== remoteActivity.category
        );
        
        if (hasConflict && !localActivity.synced) {
          try {
            // Local wins - update remote with local data
            const response = await fetch(`/api/activities/${localActivity.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fromDate: localActivity.fromDate,
                toDate: localActivity.toDate,
                amount: localActivity.amount,
                details: localActivity.details,
                unit: localActivity.unit,
                subtype: localActivity.subtype,
                category: localActivity.category
              })
            });
            
            if (response.ok) {
              // Mark as synced
              updateLocalActivity(localActivity.tempId || localActivity.id, {
                synced: true
              });
              syncResults.conflicts++;
            }
          } catch (error) {
            syncResults.errors.push(`Failed to resolve conflict: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Manual sync completed:', syncResults);
    return syncResults;
    
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    throw error;
  }
};

// Sync local activities to server
export const syncLocalActivities = async () => {
  if (!isOnline()) {
    return { success: false, error: 'Device is offline' };
  }

  const unsyncedActivities = getUnsyncedActivities();
  if (unsyncedActivities.length === 0) {
    return { success: true, synced: 0, message: 'No activities to sync' };
  }

  let syncedCount = 0;
  let errors = [];

  for (const activity of unsyncedActivities) {
    try {
      // Remove local-specific fields - keep business data only
      const { id, tempId, timestamp, synced, serverId, baby, version, status, lastModified, contentHash, ...activityData } = activity;
      
      let response;
      
      if (serverId) {
        // This is an update to an existing server activity
        response = await fetch(`/api/activities/${serverId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toDate: activityData.toDate,
            fromDate: activityData.fromDate,
            amount: activityData.amount,
            details: activityData.details,
            unit: activityData.unit,
            category: activityData.category
          }),
        });
      } else {
        // This is a new activity to create
        response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activityData,
            clientId: id, // Send our ULID as client identifier
            clientVersion: version
          }),
        });
      }

      if (response.ok) {
        const serverActivity = await response.json();
        syncedCount++;
        // Mark as synced with server data using activity ID
        markActivityAsSynced(activity.id, serverActivity.data);
      } else {
        const errorData = await response.json();
        errors.push(`Failed to sync activity: ${errorData.error}`);
      }
    } catch (error) {
      errors.push(`Sync error: ${error.message}`);
    }
  }

  // Clear sync queue items that were successfully synced
  if (syncedCount > 0) {
    const remainingQueue = getSyncQueue().filter(queueActivity => {
      return !unsyncedActivities.some(syncedActivity => 
        (syncedActivity.id === queueActivity.id || syncedActivity.tempId === queueActivity.tempId) && 
        getLocalData().activities.find(localActivity => 
          (localActivity.id === syncedActivity.id || localActivity.tempId === syncedActivity.tempId) && 
          (localActivity.synced || localActivity.status === 'synced')
        )
      );
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
  }

  return {
    success: syncedCount > 0,
    synced: syncedCount,
    total: unsyncedActivities.length,
    errors: errors.length > 0 ? errors : null
  };
};