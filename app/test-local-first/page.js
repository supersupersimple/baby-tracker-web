"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  storeActivityLocally, 
  getActivitiesCount,
  getAllLocalActivities,
  isOnline,
  clearAllLocalData,
  getStorageMetadata,
  cleanupOrphanedActivities
} from '@/lib/offline-storage';
import { getSyncService } from '@/lib/sync-service';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { BatchSyncButton } from '@/components/BatchSyncButton';

export default function TestLocalFirstPage() {
  const [testResults, setTestResults] = useState([]);
  const [activities, setActivities] = useState([]);
  const [syncStats, setSyncStats] = useState({});
  const [metadata, setMetadata] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, { 
      test, 
      success, 
      message, 
      data, 
      timestamp: new Date().toISOString() 
    }]);
  };

  const refreshData = () => {
    setActivities(getAllLocalActivities());
    setSyncStats(getActivitiesCount());
    setMetadata(getStorageMetadata());
  };

  useEffect(() => {
    refreshData();
    
    // Listen for sync events
    const syncService = getSyncService();
    const handleSyncEvent = (event) => {
      addResult('Sync Event', true, `${event.type}: ${JSON.stringify(event)}`);
      refreshData();
    };
    
    syncService.addSyncCallback(handleSyncEvent);
    
    // Refresh data every 2 seconds
    const interval = setInterval(refreshData, 2000);

    return () => {
      clearInterval(interval);
      syncService.removeSyncCallback(handleSyncEvent);
    };
  }, []);

  const runLocalFirstTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addResult('Test Start', true, 'Starting local-first workflow tests...');

      // Test 1: Clear and setup
      addResult('Setup', true, 'Clearing existing data for clean test...');
      clearAllLocalData();
      refreshData();

      // Test 2: Create activities with instant local storage
      addResult('Local Storage Test', true, 'Creating test activities...');
      
      const testActivities = [
        {
          babyId: 1,
          type: 'FEEDING',
          subtype: 'BOTTLE',
          fromDate: new Date().toISOString(),
          amount: 150,
          unit: 'MILLILITRES',
          category: 'FORMULA',
          details: 'Test bottle feeding'
        },
        {
          babyId: 1,
          type: 'SLEEPING',
          subtype: 'SLEEP',
          fromDate: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          details: 'Test sleep activity'
        },
        {
          babyId: 1,
          type: 'DIAPERING',
          subtype: 'PEE',
          fromDate: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          details: 'Test diaper change'
        }
      ];

      // Store activities locally (should be instant)
      const startTime = Date.now();
      const storedActivities = [];
      
      for (const activityData of testActivities) {
        const stored = storeActivityLocally(activityData);
        storedActivities.push(stored);
      }
      
      const storageTime = Date.now() - startTime;
      addResult('Storage Speed', storageTime < 100, 
        `Stored ${testActivities.length} activities in ${storageTime}ms (should be < 100ms)`);

      refreshData();

      // Test 3: Verify local storage structure
      addResult('Storage Structure', true, 'Verifying enhanced storage structure...');
      
      const hasNewFields = storedActivities.every(activity => 
        activity.id && 
        activity.version && 
        activity.status === 'local' && 
        activity.lastModified &&
        activity.contentHash
      );
      
      addResult('New Fields', hasNewFields, 
        `All activities have new fields: ${hasNewFields ? 'Yes' : 'No'}`);

      // Test 4: ULID uniqueness
      const uniqueIds = new Set(storedActivities.map(a => a.id));
      addResult('ULID Uniqueness', uniqueIds.size === storedActivities.length,
        `All IDs unique: ${uniqueIds.size}/${storedActivities.length}`);

      // Test 5: Status tracking
      addResult('Status Tracking', true, 'Testing activity status...');
      const statusCounts = getActivitiesCount();
      addResult('Local Status', statusCounts.local === testActivities.length,
        `Local activities: ${statusCounts.local}/${testActivities.length}`);

      // Test 6: Background sync (if online)
      if (isOnline()) {
        addResult('Network Sync Test', true, 'Testing background sync...');
        
        try {
          const syncService = getSyncService();
          // Schedule sync for one activity
          const syncResult = await syncService.scheduleSync(storedActivities[0].id);
          addResult('Sync Scheduling', syncResult.success, 
            `Sync scheduled: ${syncResult.success ? 'Success' : syncResult.reason}`);
          
          // Wait a moment for sync to potentially complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          refreshData();
          
        } catch (error) {
          addResult('Sync Error', false, `Sync test failed: ${error.message}`);
        }
      } else {
        addResult('Offline Mode', true, 'Device is offline - sync tests skipped');
      }

      // Test 7: Data integrity
      addResult('Data Integrity', true, 'Verifying data integrity...');
      const currentActivities = getAllLocalActivities();
      const dataIntact = currentActivities.length >= testActivities.length;
      addResult('Data Preservation', dataIntact,
        `Activities preserved: ${currentActivities.length} >= ${testActivities.length}`);

      // Test 8: Performance metrics
      addResult('Performance', true, 'Performance summary...');
      addResult('Instant Feedback', storageTime < 100,
        `User sees instant response: ${storageTime}ms storage time`);

      addResult('Test Complete', true, '🎉 Local-first workflow tests completed!');

    } catch (error) {
      addResult('Test Error', false, `Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
      refreshData();
    }
  };

  const createTestActivity = () => {
    const activity = {
      babyId: 1,
      type: 'FEEDING',
      subtype: 'BOTTLE',
      fromDate: new Date().toISOString(),
      amount: Math.floor(Math.random() * 200) + 50, // 50-250ml
      unit: 'MILLILITRES',
      category: 'FORMULA',
      details: `Manual test activity - ${new Date().toLocaleTimeString()}`
    };

    const stored = storeActivityLocally(activity);
    addResult('Manual Activity', true, `Created activity with ID: ${stored.id}`);
    refreshData();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Local-First Workflow Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-2">
              <Button 
                onClick={runLocalFirstTests}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? 'Running Tests...' : 'Run Local-First Tests'}
              </Button>
              
              <Button 
                onClick={createTestActivity}
                variant="outline"
                className="w-full"
              >
                Create Test Activity
              </Button>
              
              <Button 
                onClick={() => {
                  const cleaned = cleanupOrphanedActivities();
                  addResult('Cleanup', true, `Cleaned up ${cleaned} orphaned activities`);
                  refreshData();
                }}
                variant="outline"
                className="w-full"
              >
                🧹 Cleanup Orphaned
              </Button>
              
              <Button 
                onClick={() => {
                  clearAllLocalData();
                  setTestResults([]);
                  refreshData();
                }}
                variant="destructive"
                className="w-full"
              >
                Clear All Data
              </Button>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Sync Status</h3>
            <SyncStatusIndicator />
            <div className="mt-3">
              <BatchSyncButton className="w-full" />
            </div>
          </div>

          {/* Current Stats */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Current Stats</h3>
            <div className="space-y-2 text-sm">
              <div>Total Activities: {syncStats.total || 0}</div>
              <div>Local (Pending): {syncStats.local || 0}</div>
              <div>Syncing: {syncStats.syncing || 0}</div>
              <div>Synced: {syncStats.synced || 0}</div>
              <div>Failed: {syncStats.sync_failed || 0}</div>
              <div>Network: {isOnline() ? '🟢 Online' : '🔴 Offline'}</div>
            </div>
          </div>

          {/* Storage Metadata */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Storage Info</h3>
            <div className="space-y-1 text-xs">
              <div>Schema: {metadata.schemaVersion}</div>
              <div>Last Sync: {metadata.lastSyncTime ? new Date(metadata.lastSyncTime).toLocaleString() : 'Never'}</div>
              <div>Created: {metadata.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'Unknown'}</div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded border-l-4 text-sm ${
                    result.success 
                      ? 'bg-green-50 border-green-500 text-green-800' 
                      : 'bg-red-50 border-red-500 text-red-800'
                  }`}
                >
                  <div className="font-semibold">
                    {result.success ? '✅' : '❌'} {result.test}
                  </div>
                  <div className="mt-1">{result.message}</div>
                  {result.data && (
                    <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activities List */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Local Activities ({activities.length})</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activities.map((activity, index) => (
                <div key={activity.id} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{activity.type}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      activity.status === 'local' ? 'bg-orange-100 text-orange-800' :
                      activity.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                      activity.status === 'synced' ? 'bg-green-100 text-green-800' :
                      activity.status === 'sync_failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status || (activity.synced ? 'synced' : 'local')}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    ID: {activity.id?.substring(0, 8)}...
                  </div>
                  <div className="text-gray-600">
                    Version: {activity.version} | {activity.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}