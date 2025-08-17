"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { getAllLocalActivities, isOnline, syncRemoteToLocal, updateLocalActivity, removeLocalActivity, syncLocalActivities, getLocalActivity } from "@/lib/offline-storage";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { getSyncService } from "@/lib/sync-service";

// Activity type icons and colors
const getActivityDisplay = (type, subtype) => {
  const normalizedType = type?.toLowerCase();
  
  const displays = {
    feeding: {
      icon: getFeedingIcon(subtype),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      label: "Feeding"
    },
    sleeping: {
      icon: "😴",
      color: "text-purple-600", 
      bgColor: "bg-purple-50",
      label: "Sleep"
    },
    diapering: {
      icon: getDiaperIcon(subtype),
      color: "text-green-600",
      bgColor: "bg-green-50", 
      label: "Diaper"
    },
    growth: {
      icon: getGrowthIcon(subtype),
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      label: "Growth"
    },
    health: {
      icon: getHealthIcon(subtype),
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "Health"
    },
    leisure: {
      icon: getLeisureIcon(subtype),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      label: "Leisure"
    },
    // Legacy support
    measurement: {
      icon: getGrowthIcon(subtype),
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      label: "Growth"
    },
    medicine: {
      icon: getHealthIcon(subtype),
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "Health"
    },
    playing: {
      icon: "🎮",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      label: "Play Time"
    },
    bathing: {
      icon: "🛁",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      label: "Bath"
    },
    milestone: {
      icon: "🎉",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      label: "Milestone"
    },
    tummy_time: {
      icon: "🤸",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      label: "Tummy Time"
    },
    crying: {
      icon: "😢",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      label: "Crying"
    }
  };
  
  return displays[normalizedType] || {
    icon: "📝",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    label: "Activity"
  };
};

// 🔥 NEW: Get sync status icon for activity
const getSyncStatusIcon = (activity) => {
  const status = activity.status || (activity.synced ? 'synced' : 'local');
  
  switch (status) {
    case 'local':
      return (
        <span 
          className="text-xs text-orange-600" 
          title="Pending sync"
        >
          📝
        </span>
      );
    case 'syncing':
      return (
        <span 
          className="text-xs text-blue-600 animate-pulse" 
          title="Syncing..."
        >
          🔄
        </span>
      );
    case 'sync_failed':
      return (
        <span 
          className="text-xs text-red-600" 
          title="Sync failed - will retry"
        >
          ⚠️
        </span>
      );
    case 'synced':
      return (
        <span 
          className="text-xs text-green-600" 
          title="Synced"
        >
          ✅
        </span>
      );
    default:
      return null;
  }
};

const getFeedingIcon = (subtype) => {
  const normalizedSubtype = subtype?.toUpperCase();
  switch (normalizedSubtype) {
    case "BOTTLE": return "🍼";
    case "MEAL": return "🥄";
    case "SNACK": return "🍪";
    case "LEFT_BREAST": return "🤱";
    case "RIGHT_BREAST": return "🤱";
    case "BREAST_MILK": return "🤱";
    case "FORMULA": return "🍼";
    case "WATER": return "💧";
    case "JUICE": return "🧃";
    case "CEREAL": return "🥣";
    case "FRUIT": return "🍎";
    case "VEGETABLE": return "🥕";
    // Legacy support
    case "bottle".toUpperCase(): return "🍼";
    case "meal".toUpperCase(): return "🥄";
    case "left_breast".toUpperCase(): return "🤱";
    case "right_breast".toUpperCase(): return "🤱";
    default: return "🍼";
  }
};

const getDiaperIcon = (subtype) => {
  const normalizedSubtype = subtype?.toUpperCase();
  switch (normalizedSubtype) {
    case "PEE": return "💧";
    case "POO": return "💩";
    case "PEEPOO": return "🌊";
    // Legacy support
    case "both".toUpperCase(): return "🌊";
    default: return "🧻"; // Toilet paper - universally recognized for bathroom/diaper changes
  }
};

const getGrowthIcon = (subtype) => {
  const normalizedSubtype = subtype?.toUpperCase();
  switch (normalizedSubtype) {
    case "GROWTH_WEIGHT": return "⚖️";
    case "GROWTH_HEIGHT": return "📏";
    case "GROWTH_HEAD": return "🧠";
    // Legacy support
    case "weight".toUpperCase(): return "⚖️";
    case "height".toUpperCase(): return "📏";
    case "head".toUpperCase(): return "🧠";
    default: return "📏";
  }
};

const getHealthIcon = (subtype) => {
  const normalizedSubtype = subtype?.toUpperCase();
  switch (normalizedSubtype) {
    case "HEALTH_MEDICATIONS": return "💊";
    case "HEALTH_TEMPERATURE": return "🌡️";
    case "HEALTH_VACCINATIONS": return "💉";
    // Legacy support
    case "medication".toUpperCase(): return "💊";
    case "temperature".toUpperCase(): return "🌡️";
    case "vaccination".toUpperCase(): return "💉";
    default: return "🏥";
  }
};

const getLeisureIcon = (subtype) => {
  const normalizedSubtype = subtype?.toUpperCase();
  switch (normalizedSubtype) {
    case "LEISURE_TUMMY": return "🤸";
    case "LEISURE_BATH": return "🛁";
    case "LEISURE_WALK": return "🚶";
    default: return "🎉";
  }
};

const getDisplayUnit = (activity) => {
  const activityType = activity.type?.toLowerCase();
  const subtype = activity.subtype?.toUpperCase();
  
  // Handle GROWTH activities
  if (activityType === 'growth' || activityType === 'measurement') {
    switch (subtype) {
      case "GROWTH_WEIGHT": return "kg";
      case "GROWTH_HEIGHT": return "cm";
      case "GROWTH_HEAD": return "cm";
      // Legacy support
      case "WEIGHT": return "kg";
      case "HEIGHT": return "cm";
      case "HEAD": return "cm";
      default: return activity.unit || 'units';
    }
  }
  
  // Handle HEALTH activities
  if (activityType === 'health' || activityType === 'medicine') {
    switch (subtype) {
      case "HEALTH_TEMPERATURE": return "°C";
      // Legacy support
      case "TEMPERATURE": return "°C";
      default: return activity.unit || 'units';
    }
  }
  
  // For other activity types, use the original unit logic
  if (activity.unit === "MILLILITRES") return "ml";
  if (activity.unit === "OUNCES") return "oz";
  return activity.unit?.toLowerCase() || 'units';
};

const getSubtypeLabel = (type, subtype) => {
  const normalizedType = type?.toLowerCase();
  const normalizedSubtype = subtype?.toUpperCase();
  
  if (normalizedType === "feeding") {
    switch (normalizedSubtype) {
      case "BOTTLE": return "Bottle";
      case "MEAL": return "Meal";
      case "LEFT_BREAST": return "Left Breast";
      case "RIGHT_BREAST": return "Right Breast";
      case "BREAST_MILK": return "Breast Milk";
      case "FORMULA": return "Formula";
      // Legacy support
      case "bottle".toUpperCase(): return "Bottle";
      case "meal".toUpperCase(): return "Meal";
      case "left_breast".toUpperCase(): return "Left Breast";
      case "right_breast".toUpperCase(): return "Right Breast";
      default: return subtype;
    }
  }
  
  if (normalizedType === "growth" || normalizedType === "measurement") {
    switch (normalizedSubtype) {
      case "GROWTH_WEIGHT": return "Weight";
      case "GROWTH_HEIGHT": return "Height";
      case "GROWTH_HEAD": return "Head Circumference";
      // Legacy support
      case "WEIGHT": return "Weight";
      case "HEIGHT": return "Height";
      case "HEAD": return "Head Circumference";
      default: return subtype;
    }
  }
  
  if (normalizedType === "health" || normalizedType === "medicine") {
    switch (normalizedSubtype) {
      case "HEALTH_MEDICATIONS": return "Medication";
      case "HEALTH_TEMPERATURE": return "Temperature";
      case "HEALTH_VACCINATIONS": return "Vaccination";
      // Legacy support
      case "MEDICATION": return "Medication";
      case "TEMPERATURE": return "Temperature";
      case "VACCINATION": return "Vaccination";
      default: return subtype;
    }
  }
  
  if (normalizedType === "diapering") {
    switch (normalizedSubtype) {
      case "PEE": return "Pee";
      case "POO": return "Poo";
      case "PEEPOO": return "Pee & Poo";
      // Legacy support
      case "BOTH": return "Pee & Poo";
      default: return subtype;
    }
  }
  
  if (normalizedType === "leisure") {
    switch (normalizedSubtype) {
      case "LEISURE_TUMMY": return "Tummy Time";
      case "LEISURE_BATH": return "Bath";
      case "LEISURE_WALK": return "Walk";
      default: return subtype;
    }
  }
  
  return subtype;
};

const formatDuration = (startTime, endTime) => {
  if (!endTime) return null;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

export default function RecentActivities({ refreshTrigger, selectedBaby }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [finishingActivity, setFinishingActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [deletingActivity, setDeletingActivity] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [syncStatusVisible, setSyncStatusVisible] = useState(false);

  const fetchRecentActivities = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setHasMore(true);
      }
      setError(null);
      
      // 🚀 LOCAL-FIRST: Always load from localStorage first with sync status
      const localActivities = getAllLocalActivities();
      // Filter activities for selected baby
      const filteredActivities = selectedBaby ? 
        localActivities.filter(activity => activity.babyId === selectedBaby.id || activity.baby?.id === selectedBaby.id) : 
        localActivities;
      
      if (reset) {
        setActivities(filteredActivities);
        setLoading(false);
        // Show sync status if there are local activities
        setSyncStatusVisible(filteredActivities.length > 0);
      }
      
      // Then sync with remote if online
      if (isOnline()) {
        try {
          // Sync remote data to local storage (first page only for initial load)
          const syncResult = await syncRemoteToLocal(selectedBaby, 1, 100);
          
          if (syncResult.success && syncResult.pagination) {
            setTotalCount(syncResult.pagination.totalCount);
            setHasMore(syncResult.pagination.hasMore);
          }
          
          // Reload from localStorage after sync
          const updatedLocalActivities = getAllLocalActivities();
          // Filter activities for selected baby
          const filteredUpdatedActivities = selectedBaby ? 
            updatedLocalActivities.filter(activity => activity.babyId === selectedBaby.id || activity.baby?.id === selectedBaby.id) : 
            updatedLocalActivities;
          
          if (reset) {
            setActivities(filteredUpdatedActivities);
          }
        } catch (syncError) {
          console.log('Background sync failed:', syncError);
          // Don't show error since we have local data
        }
      }
      
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('Failed to load activities');
      if (reset) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRecentActivities();
  }, [refreshTrigger, selectedBaby]);

  const loadMoreActivities = async () => {
    if (!hasMore || loadingMore || !isOnline()) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      // Sync next page of remote data to local storage
      const syncResult = await syncRemoteToLocal(selectedBaby, nextPage, 100);
      
      if (syncResult.success) {
        setCurrentPage(nextPage);
        
        if (syncResult.pagination) {
          setHasMore(syncResult.pagination.hasMore);
        }
        
        // Reload from localStorage after sync
        const updatedLocalActivities = getAllLocalActivities();
        const filteredUpdatedActivities = selectedBaby ? 
          updatedLocalActivities.filter(activity => activity.babyId === selectedBaby.id || activity.baby?.id === selectedBaby.id) : 
          updatedLocalActivities;
        
        setActivities(filteredUpdatedActivities);
      }
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFinishActivity = async (activityTempId) => {
    try {
      setFinishingActivity(activityTempId);
      
      // OFFLINE-FIRST: Update locally first
      const updatedActivity = updateLocalActivity(activityTempId, {
        toDate: new Date().toISOString()
      });
      
      if (updatedActivity) {
        // Refresh the activities list immediately
        await fetchRecentActivities();
        
        // Then try to sync to server in background
        if (isOnline()) {
          try {
            await syncLocalActivities();
          } catch (syncError) {
            console.log('Background sync failed, will retry later:', syncError);
            // Don't show error since local update was successful
          }
        }
      } else {
        setError('Failed to finish activity');
      }
    } catch (error) {
      console.error('Error finishing activity:', error);
      setError('Failed to finish activity');
    } finally {
      setFinishingActivity(null);
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    
    // For bottle feeding, separate category from details if they were combined
    let cleanDetails = activity.details || "";
    let activityCategory = activity.category || "";
    
    if (activity.type?.toLowerCase() === 'feeding' && activity.subtype?.toUpperCase() === 'BOTTLE' && activity.details) {
      // Check if details contains "Formula - " or "Breast Milk - " pattern
      if (activity.details.startsWith("Formula - ")) {
        cleanDetails = activity.details.replace("Formula - ", "");
        activityCategory = "FORMULA";
      } else if (activity.details.startsWith("Breast Milk - ")) {
        cleanDetails = activity.details.replace("Breast Milk - ", "");
        activityCategory = "BREAST_MILK";
      } else if (activity.details === "Formula") {
        cleanDetails = "";
        activityCategory = "FORMULA";
      } else if (activity.details === "Breast Milk") {
        cleanDetails = "";
        activityCategory = "BREAST_MILK";
      }
    }
    
    setEditFormData({
      fromDateTime: new Date(activity.fromDate),
      toDateTime: activity.toDate ? new Date(activity.toDate) : null,
      amount: activity.amount || "",
      details: cleanDetails,
      unit: activity.unit || "",
      subtype: activity.subtype || "",
      category: activityCategory
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      // For bottle feeding, combine category and details like in QuickActions
      let finalDetails = editFormData.details;
      if (editingActivity.type?.toLowerCase() === 'feeding' && editFormData.subtype === 'BOTTLE' && editFormData.category) {
        const categoryText = editFormData.category === "FORMULA" ? "Formula" : "Breast Milk";
        finalDetails = editFormData.details 
          ? `${categoryText} - ${editFormData.details}`
          : categoryText;
      }
      
      // Convert Date objects to ISO strings
      const fromDateTime = editFormData.fromDateTime 
        ? editFormData.fromDateTime.toISOString()
        : null;
      
      const toDateTime = editFormData.toDateTime 
        ? editFormData.toDateTime.toISOString()
        : null;

      const updateData = {
        fromDate: fromDateTime,
        toDate: toDateTime,
        amount: editFormData.amount ? parseFloat(editFormData.amount) : null,
        details: finalDetails,
        unit: editFormData.unit,
        subtype: editFormData.subtype,
        category: editFormData.category
      };

      // OFFLINE-FIRST: Always update local storage first
      const updatedActivity = updateLocalActivity(editingActivity.tempId || editingActivity.id, updateData);
      
      if (updatedActivity) {
        // Refresh the activities list immediately from local storage
        const localActivities = getAllLocalActivities();
        const filteredActivities = selectedBaby ? 
          localActivities.filter(activity => activity.babyId === selectedBaby.id || activity.baby?.id === selectedBaby.id) : 
          localActivities;
        setActivities(filteredActivities);
        
        setIsEditDialogOpen(false);
        setEditingActivity(null);

        // Then try to sync to server if online
        if (isOnline()) {
          try {
            // Use the correct ID - prefer serverId for synced activities, fallback to id
            const activityId = editingActivity.serverId || editingActivity.id;
            if (!activityId) {
              console.warn('No valid activity ID found for server sync');
              return;
            }

            const response = await fetch(`/api/activities/${activityId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });

            const result = await response.json();
            
            if (!result.success) {
              console.warn('Server sync failed for activity update:', result.error);
              // Don't show error since local update was successful
              // The sync service will retry this later
            }
          } catch (serverError) {
            console.warn('Server sync failed for activity update:', serverError);
            // Don't show error since local update was successful
            // The sync service will retry this later
          }
        } else {
          console.log('Offline - activity updated locally, will sync when online');
        }
      } else {
        setError('Failed to update activity locally');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      setError('Failed to update activity');
    }
  };

  const handleDeleteActivity = (activityId) => {
    setActivityToDelete(activityId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const activityId = activityToDelete;

    try {
      setDeletingActivity(activityId);
      console.log('🗑️ Deleting activity:', activityId);
      
      // OFFLINE-FIRST: Remove from local storage first
      const activity = activities.find(a => a.id === activityId || a.tempId === activityId);
      if (activity) {
        removeLocalActivity(activity.tempId || activity.id);
        
        // Refresh from local storage immediately
        const localActivities = getAllLocalActivities();
        setActivities(localActivities);
      }
      
      // Then try to delete from remote
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('🗑️ Delete response:', result);
      
      if (result.success) {
        // Close edit dialog if it's open for the deleted activity
        if (editingActivity && (editingActivity.id === activityId || editingActivity.tempId === activityId)) {
          setIsEditDialogOpen(false);
          setEditingActivity(null);
        }
      } else {
        console.error('Failed to delete from remote:', result.error);
        setError(result.error || 'Failed to delete activity from server');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      setError('Failed to delete activity: ' + error.message);
    } finally {
      setDeletingActivity(null);
      setShowDeleteConfirm(false);
      setActivityToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setActivityToDelete(null);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="pb-0 pt-2 px-2">
          <h2 className="text-lg sm:text-xl flex items-center font-semibold">
            <span className="mr-2">📋</span>
            Recent Activities
          </h2>
        </div>
        <div className="pt-2 px-2 pb-2 flex-1 min-h-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="pb-0 pt-2 px-2">
          <h2 className="text-lg sm:text-xl flex items-center font-semibold">
            <span className="mr-2">📋</span>
            Recent Activities
          </h2>
        </div>
        <div className="pt-2 px-2 pb-2 flex-1 min-h-0">
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-red-600 mb-4 text-sm">{error}</p>
            <button 
              onClick={fetchRecentActivities}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">🔄</span>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full h-full flex flex-col overflow-hidden max-w-full">
      <div className="pb-0 pt-2 px-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl flex items-center font-semibold">
            <span className="mr-2">📋</span>
            Recent Activities
          </h2>
          {/* 🔥 NEW: Sync status indicator */}
          {syncStatusVisible && (
            <SyncStatusIndicator className="ml-2" />
          )}
        </div>
      </div>
      <div className="pt-2 px-2 pb-2 flex-1 min-h-0">
        {activities.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No activities yet</h3>
            <p className="text-gray-500 mb-4">
              Start tracking your baby&apos;s daily activities using the quick actions above.
            </p>
            <div className="flex items-center justify-center space-x-4 text-2xl">
              <span>🍼</span>
              <span>😴</span>
              <span>👶</span>
              <span>📏</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 h-full overflow-y-auto overflow-x-hidden w-full max-w-full">
            {activities.map((activity) => {
              const display = getActivityDisplay(activity.type, activity.subtype);
              const startTime = new Date(activity.fromDate);
              const timeAgo = formatDistanceToNow(startTime, { addSuffix: true });
              const duration = formatDuration(activity.fromDate, activity.toDate);

              return (
                <div key={activity.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 border border-gray-100 w-full max-w-full activity-item">
                  {/* Activity Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 activity-icon ${display.bgColor}`}>
                    <span className="text-xl sm:text-2xl">{display.icon}</span>
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0 max-w-full overflow-hidden activity-content">
                    {/* Header Row with Type and Time */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h4 className={`font-medium text-base ${display.color} activity-text`}>
                          {display.label}{activity.subtype && `(${getSubtypeLabel(activity.type, activity.subtype)})`}
                        </h4>
                        {/* 🔥 NEW: Sync status indicator */}
                        {getSyncStatusIcon(activity)}
                        <span className="text-xs text-gray-400">
                          {timeAgo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Edit Icon */}
                        <button
                          onClick={() => handleEditActivity(activity)}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors flex-shrink-0"
                          title="Edit activity"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                    
                    {/* Details Row */}
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center flex-wrap gap-1 mb-1">
                        <span>{format(startTime, 'h:mm a')}</span>
                        {duration && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-green-600">{duration}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Amount and Details on same line */}
                      <div className="mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {activity.amount && (
                            <span className="text-blue-600 font-medium text-sm">
                              {activity.amount} {getDisplayUnit(activity)}
                            </span>
                          )}
                          
                          {activity.details && (
                            <span className="text-gray-500 text-sm">
                              {activity.details}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Finish Button for ongoing activities */}
                      {!activity.toDate && !(activity.type?.toLowerCase() === 'feeding' && (activity.subtype?.toUpperCase() === 'MEAL' || activity.subtype?.toLowerCase() === 'meal')) && (activity.type?.toLowerCase() !== 'diapering') && activity.type?.toLowerCase() !== 'growth' && !(activity.type?.toLowerCase() === 'health' && (activity.subtype?.toUpperCase() === 'HEALTH_MEDICATIONS' || activity.subtype?.toLowerCase() === 'medication' || activity.subtype?.toUpperCase() === 'HEALTH_VACCINATIONS' || activity.subtype?.toLowerCase() === 'vaccination' || activity.subtype?.toUpperCase() === 'HEALTH_TEMPERATURE' || activity.subtype?.toLowerCase() === 'temperature')) && (
                        <div className="flex justify-end mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFinishActivity(activity.tempId)}
                            disabled={finishingActivity === activity.tempId}
                            className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300"
                          >
                            {finishingActivity === activity.tempId ? "..." : "Finish"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Load More Button */}
            {isOnline() && hasMore && (
              <div className="flex justify-center pt-4 pb-2">
                <Button
                  onClick={loadMoreActivities}
                  disabled={loadingMore}
                  variant="outline"
                  className="text-sm"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📄</span>
                      Load More ({totalCount - activities.length} remaining)
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Offline indicator */}
            {!isOnline() && hasMore && (
              <div className="text-center py-4 text-sm text-gray-500">
                <span className="mr-2">📱</span>
                Go online to load more activities
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Edit Dialog */}
    {editingActivity && (
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="text-2xl mr-2">{getActivityDisplay(editingActivity.type, editingActivity.subtype).icon}</span>
              Edit {getActivityDisplay(editingActivity.type, editingActivity.subtype).label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Start Time - Always shown */}
            <div>
              <Label>Start Time</Label>
              <DateTimePicker
                value={editFormData.fromDateTime}
                onChange={(dateTime) => setEditFormData(prev => ({ ...prev, fromDateTime: dateTime }))}
                placeholder="Select start date and time"
                className="mt-2"
              />
            </div>

            {/* End Time - Only for activities that can have duration: feeding (non-meal), sleeping, leisure activities */}
            {!(editingActivity.type?.toLowerCase() === 'feeding' && editFormData.subtype === 'MEAL') && editingActivity.type?.toLowerCase() !== 'diapering' && editingActivity.type?.toLowerCase() !== 'growth' && !(editingActivity.type?.toLowerCase() === 'health' && (editFormData.subtype === 'HEALTH_MEDICATIONS' || editFormData.subtype === 'HEALTH_VACCINATIONS' || editFormData.subtype === 'HEALTH_TEMPERATURE')) && (
              <div>
                <Label>End Time (optional)</Label>
                <DateTimePicker
                  value={editFormData.toDateTime}
                  onChange={(dateTime) => setEditFormData(prev => ({ ...prev, toDateTime: dateTime }))}
                  placeholder="Select end date and time"
                  className="mt-2"
                />
              </div>
            )}

            {/* Feeding with amounts - bottle, breast milk, and formula */}
            {editingActivity.type?.toLowerCase() === 'feeding' && (editFormData.subtype === 'BOTTLE' || editFormData.subtype === 'LEFT_BREAST' || editFormData.subtype === 'RIGHT_BREAST' || editFormData.subtype === 'BREAST_MILK' || editFormData.subtype === 'FORMULA') && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={editFormData.unit === "MILLILITRES" ? "default" : "outline"}
                        onClick={() => setEditFormData(prev => ({ ...prev, unit: "MILLILITRES" }))}
                        className="text-xs"
                      >
                        ML
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editFormData.unit === "OUNCES" ? "default" : "outline"}
                        onClick={() => setEditFormData(prev => ({ ...prev, unit: "OUNCES" }))}
                        className="text-xs"
                      >
                        OZ
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Category selection - only for bottle feeding */}
                {editFormData.subtype === 'BOTTLE' && (
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Button
                        type="button"
                        variant={editFormData.category === "FORMULA" ? "default" : "outline"}
                        onClick={() => setEditFormData(prev => ({ ...prev, category: "FORMULA" }))}
                        className="text-xs"
                      >
                        🍼 Formula
                      </Button>
                      <Button
                        type="button"
                        variant={editFormData.category === "BREAST_MILK" ? "default" : "outline"}
                        onClick={() => setEditFormData(prev => ({ ...prev, category: "BREAST_MILK" }))}
                        className="text-xs"
                      >
                        🤱 Breast Milk
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Health measurements - only for health activities */}
            {editingActivity.type?.toLowerCase() === 'health' && (
              <div>
                {(editFormData.subtype === 'HEALTH_TEMPERATURE' || editFormData.subtype === 'TEMPERATURE') && (
                  <div>
                    <Label htmlFor="amount">Temperature (°C)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.1"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter temperature in °C"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Growth measurements - only for growth activities */}
            {editingActivity.type?.toLowerCase() === 'growth' && (
              <div>
                {(editFormData.subtype === 'GROWTH_WEIGHT' || editFormData.subtype === 'WEIGHT') && (
                  <div>
                    <Label htmlFor="amount">Weight (kg)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter weight in kg"
                      required
                    />
                  </div>
                )}
                {(editFormData.subtype === 'GROWTH_HEIGHT' || editFormData.subtype === 'HEIGHT') && (
                  <div>
                    <Label htmlFor="amount">Height (cm)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.1"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter height in cm"
                      required
                    />
                  </div>
                )}
                {(editFormData.subtype === 'GROWTH_HEAD' || editFormData.subtype === 'HEAD') && (
                  <div>
                    <Label htmlFor="amount">Head Circumference (cm)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.1"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter head circumference in cm"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Details - Always shown */}
            <div>
              <Label htmlFor="details">
                {editingActivity.type?.toLowerCase() === 'feeding' && editFormData.subtype === 'MEAL' 
                  ? "Meal Details" 
                  : "Notes (optional)"}
              </Label>
              <Input
                id="details"
                value={editFormData.details}
                onChange={(e) => setEditFormData(prev => ({ ...prev, details: e.target.value }))}
                placeholder={
                  editingActivity.type?.toLowerCase() === 'feeding' && editFormData.subtype === 'MEAL'
                    ? "What did baby eat?"
                    : "Add any notes..."
                }
                required={editingActivity.type?.toLowerCase() === 'feeding' && editFormData.subtype === 'MEAL'}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteActivity(editingActivity.serverId || editingActivity.id)}
                disabled={deletingActivity === (editingActivity.serverId || editingActivity.id)}
                className="px-3"
                title="Delete activity"
              >
                {deletingActivity === (editingActivity.serverId || editingActivity.id) ? "⏳" : "🗑️"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="text-2xl mr-2">🗑️</span>
            Delete Activity
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600">
            Are you sure you want to delete this activity? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={cancelDelete}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            disabled={deletingActivity === activityToDelete}
            className="flex-1"
          >
            {deletingActivity === activityToDelete ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
