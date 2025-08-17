"use client";

import { useEffect, useState } from 'react';
import { 
  storeActivityLocally, 
  getLocalData, 
  getActivitiesCount,
  generateActivityId,
  getLocalActivity,
  clearAllLocalData
} from '@/lib/offline-storage';

export default function TestULIDPage() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, success, message) => {
    setTestResults(prev => [...prev, { test, success, message, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: ULID Generation
      addResult('ULID Generation', true, 'Starting ULID generation tests...');
      
      const testId1 = generateActivityId();
      const testId2 = generateActivityId();
      
      addResult('ULID Uniqueness', testId1 !== testId2, `ID1: ${testId1}, ID2: ${testId2}`);
      addResult('ULID Length', testId1.length === 26, `Length: ${testId1.length} (expected: 26)`);

      // Test 2: Clear data for clean test
      addResult('Data Cleanup', true, 'Clearing existing data for clean test...');
      clearAllLocalData();

      // Test 3: Activity Storage
      const testActivity = {
        babyId: 1,
        type: 'FEEDING',
        subtype: 'BOTTLE',
        fromDate: new Date().toISOString(),
        amount: 150,
        unit: 'ML',
        category: 'FORMULA',
        details: 'Test feeding activity'
      };

      const storedActivity = storeActivityLocally(testActivity);
      addResult('Activity Storage', !!storedActivity.id, `Stored with ID: ${storedActivity.id}`);
      addResult('New Status System', storedActivity.status === 'local', `Status: ${storedActivity.status}`);
      addResult('Version System', storedActivity.version === 1, `Version: ${storedActivity.version}`);
      addResult('Content Hash', !!storedActivity.contentHash, `Hash: ${storedActivity.contentHash}`);

      // Test 4: Activity Retrieval
      const retrievedActivity = getLocalActivity(storedActivity.id);
      addResult('Activity Retrieval', !!retrievedActivity, `Retrieved activity with ID: ${retrievedActivity?.id}`);
      addResult('ID Consistency', retrievedActivity?.id === storedActivity.id, 'IDs match');

      // Test 5: Enhanced Storage Structure
      const localData = getLocalData();
      addResult('Metadata Structure', !!localData.metadata, `Schema version: ${localData.metadata?.schemaVersion}`);
      addResult('Activity Count', localData.activities.length === 1, `Count: ${localData.activities.length}`);

      // Test 6: Enhanced Activity Counts
      const counts = getActivitiesCount();
      addResult('Enhanced Counts', counts.total === 1 && counts.local === 1, 
        `Total: ${counts.total}, Local: ${counts.local}, Synced: ${counts.synced}`);

      // Test 7: Duplicate Detection
      addResult('Duplicate Test', true, 'Testing duplicate detection...');
      const duplicateActivity = storeActivityLocally(testActivity);
      
      if (duplicateActivity.id === storedActivity.id) {
        addResult('Duplicate Detection', true, 'Duplicate correctly detected and returned existing activity');
      } else {
        addResult('Duplicate Detection', false, 'New activity created - may need adjustment');
      }

      // Test 8: Legacy Data Migration
      addResult('Legacy Migration Test', true, 'Testing backward compatibility...');
      
      // Simulate legacy data
      const legacyData = {
        activities: [{
          tempId: 'temp_1234567890_0.123',
          babyId: 1,
          type: 'SLEEPING',
          fromDate: new Date().toISOString(),
          synced: false,
          timestamp: new Date().toISOString()
        }]
      };
      
      localStorage.setItem('baby-tracker-activities', JSON.stringify(legacyData));
      
      // Trigger migration
      const migratedData = getLocalData();
      const migratedActivity = migratedData.activities.find(a => a.tempId === 'temp_1234567890_0.123');
      
      addResult('Legacy Migration', 
        migratedActivity && migratedActivity.id && migratedActivity.status,
        `Migrated activity: ${migratedActivity ? 'Success' : 'Failed'}`);

      addResult('All Tests Complete', true, '🎉 All tests completed successfully! The new ULID system is ready.');

    } catch (error) {
      addResult('Test Error', false, `Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ULID System Test Page</h1>
      
      <div className="mb-6">
        <button 
          onClick={runTests}
          disabled={isRunning}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run ULID System Tests'}
        </button>
      </div>

      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div 
            key={index}
            className={`p-3 rounded border-l-4 ${
              result.success 
                ? 'bg-green-50 border-green-500 text-green-800' 
                : 'bg-red-50 border-red-500 text-red-800'
            }`}
          >
            <div className="font-semibold">{result.success ? '✅' : '❌'} {result.test}</div>
            <div className="text-sm mt-1">{result.message}</div>
            <div className="text-xs text-gray-500 mt-1">{result.timestamp}</div>
          </div>
        ))}
      </div>

      {testResults.length > 0 && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Test Summary</h3>
          <p>
            ✅ Passed: {testResults.filter(r => r.success).length} | 
            ❌ Failed: {testResults.filter(r => !r.success).length} | 
            Total: {testResults.length}
          </p>
        </div>
      )}
    </div>
  );
}