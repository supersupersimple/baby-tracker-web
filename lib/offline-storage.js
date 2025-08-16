// Offline-first storage utility for baby tracker activities
const STORAGE_KEY = 'baby-tracker-activities';
const SYNC_QUEUE_KEY = 'baby-tracker-sync-queue';

// Store activity locally (offline-first approach)
export const storeActivityLocally = (activityData) => {
  try {
    const localData = getLocalData();
    const activityWithId = {
      ...activityData,
      tempId: `temp_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      synced: false,
      serverId: null, // Will be filled when synced with server
      // Add baby info if not present (for consistent UI display)
      baby: activityData.baby || {
        id: activityData.babyId,
        babyName: 'Baby',
        gender: 'Unknown'
      }
    };
    
    localData.activities.push(activityWithId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    
    // Add to sync queue for background sync
    addToSyncQueue(activityWithId);
    
    return activityWithId;
  } catch (error) {
    console.error('Error storing activity locally:', error);
    throw error;
  }
};

// Get all local data (both synced and unsynced)
export const getLocalData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { activities: [] };
  } catch (error) {
    console.error('Error getting local data:', error);
    return { activities: [] };
  }
};

// Get only unsynced activities
export const getUnsyncedActivities = () => {
  const localData = getLocalData();
  return localData.activities.filter(activity => !activity.synced);
};

// Get all activities (for display)
export const getAllLocalActivities = () => {
  const localData = getLocalData();
  return localData.activities.sort((a, b) => new Date(b.fromDate || b.timestamp) - new Date(a.fromDate || a.timestamp));
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
export const markActivityAsSynced = (tempId, serverActivity) => {
  try {
    const localData = getLocalData();
    const activityIndex = localData.activities.findIndex(
      activity => activity.tempId === tempId
    );
    
    if (activityIndex !== -1) {
      localData.activities[activityIndex] = {
        ...localData.activities[activityIndex],
        ...serverActivity,
        id: serverActivity.id, // Ensure id is set explicitly
        synced: true,
        serverId: serverActivity.id,
        tempId: tempId // Keep tempId for reference
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    }
  } catch (error) {
    console.error('Error marking activity as synced:', error);
  }
};

// Update local activity (for finish, edit operations)
export const updateLocalActivity = (tempId, updates) => {
  try {
    const localData = getLocalData();
    const activityIndex = localData.activities.findIndex(
      activity => activity.tempId === tempId || activity.id === tempId
    );
    
    if (activityIndex !== -1) {
      localData.activities[activityIndex] = {
        ...localData.activities[activityIndex],
        ...updates,
        synced: false // Mark as unsynced since it was updated
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      
      // Add updated activity to sync queue
      addToSyncQueue(localData.activities[activityIndex]);
      
      return localData.activities[activityIndex];
    }
    return null;
  } catch (error) {
    console.error('Error updating local activity:', error);
    return null;
  }
};

// Remove activity from local storage (for delete operations)
export const removeLocalActivity = (tempId) => {
  try {
    const localData = getLocalData();
    console.log('🗑️ removeLocalActivity searching for:', tempId);
    console.log('🗑️ Available activities before:', localData.activities.map(a => ({ id: a.id, tempId: a.tempId })));
    
    localData.activities = localData.activities.filter(
      activity => activity.tempId !== tempId && activity.id !== tempId
    );
    
    console.log('🗑️ Available activities after:', localData.activities.map(a => ({ id: a.id, tempId: a.tempId })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
  } catch (error) {
    console.error('Error removing local activity:', error);
  }
};

// Get activities count 
export const getActivitiesCount = () => {
  const localData = getLocalData();
  const unsyncedCount = localData.activities.filter(activity => !activity.synced).length;
  return {
    total: localData.activities.length,
    unsynced: unsyncedCount,
    synced: localData.activities.length - unsyncedCount,
    pendingSync: getSyncQueue().length
  };
};

// Check if device is online
export const isOnline = () => {
  return navigator.onLine;
};

// Sync remote activities to local storage (with pagination)
export const syncRemoteToLocal = async (selectedBaby, page = 1, limit = 100) => {
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
    
    for (const remoteActivity of remoteActivities) {
      // Check if this remote activity already exists locally (by server ID)
      const existsLocally = localData.activities.some(
        localActivity => localActivity.serverId === remoteActivity.id
      );
      
      if (!existsLocally) {
        // Add remote activity to local storage as synced
        const localActivity = {
          ...remoteActivity,
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
      }
    }

    // Save updated local data
    if (syncedCount > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    }

    return {
      success: true,
      downloaded: syncedCount,
      total: remoteActivities.length,
      pagination,
      message: `Downloaded ${syncedCount} activities from server`
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
              details: localActivity.details
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
          addLocalActivity({
            ...remoteActivity,
            tempId: `remote_${Date.now()}_${Math.random()}`,
            synced: true
          });
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
      // Remove local-specific fields
      const { tempId, timestamp, synced, serverId, baby, ...activityData } = activity;
      
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
          body: JSON.stringify(activityData),
        });
      }

      if (response.ok) {
        const serverActivity = await response.json();
        syncedCount++;
        // Mark as synced with server data
        markActivityAsSynced(tempId, serverActivity.data);
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
        syncedActivity.tempId === queueActivity.tempId && 
        getLocalData().activities.find(localActivity => 
          localActivity.tempId === syncedActivity.tempId && localActivity.synced
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