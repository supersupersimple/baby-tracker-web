#!/usr/bin/env node

// Storage calculator script to estimate maximum storage usage
// Run with: node scripts/storage-calculator.js

import { calculateMaxStorageUsage, getCurrentLimits } from '../lib/config.js';

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

function displayStorageEstimate() {
  console.log('🗂️  Baby Tracker - Storage Usage Calculator');
  console.log('===========================================\n');
  
  const limits = getCurrentLimits();
  const storage = limits.storageEstimate;
  
  console.log('📊 CONFIGURED LIMITS:');
  console.log(`   Max Accounts: ${limits.MAX_ACCOUNTS.toLocaleString()}`);
  console.log(`   Max Babies per User: ${limits.MAX_BABIES_PER_USER}`);
  console.log(`   Max Shared Users per Baby: ${limits.MAX_SHARED_USERS_PER_BABY}`);
  console.log(`   Max Activities per Day: ${limits.MAX_ACTIVITIES_PER_DAY}`);
  console.log(`   Max Total Activities per Baby: ${limits.MAX_TOTAL_ACTIVITIES_PER_BABY.toLocaleString()}\n`);
  
  console.log('💾 STORAGE BREAKDOWN (at maximum capacity):');
  console.log(`   Users: ${storage.breakdown.users.count.toLocaleString()} records → ${formatBytes(storage.breakdown.users.storageBytes)}`);
  console.log(`   Babies: ${storage.breakdown.babies.count.toLocaleString()} records → ${formatBytes(storage.breakdown.babies.storageBytes)}`);
  console.log(`   Baby Access: ${storage.breakdown.babyAccess.count.toLocaleString()} records → ${formatBytes(storage.breakdown.babyAccess.storageBytes)}`);
  console.log(`   Activities: ${storage.breakdown.activities.count.toLocaleString()} records → ${formatBytes(storage.breakdown.activities.storageBytes)}\n`);
  
  console.log('📈 TOTAL STORAGE ESTIMATE:');
  console.log(`   Raw Data: ${formatBytes(storage.totals.rawStorageBytes)}`);
  console.log(`   With DB Overhead (30%): ${formatBytes(storage.totals.totalStorageBytes)}`);
  console.log(`   Final Estimate: ~${storage.totals.totalStorageGB} GB\n`);
  
  // Cost estimates (approximate)
  console.log('💰 ESTIMATED COSTS (approximate):');
  console.log('   Turso (SQLite)  : ~$25/month for 8GB');
  console.log('   PostgreSQL (AWS): ~$30-50/month for 8GB + compute');
  console.log('   MongoDB Atlas   : ~$57/month for 10GB');
  console.log('   PlanetScale     : ~$29/month for 10GB\n');
  
  // Recommendations
  if (storage.totals.totalStorageGB > 5) {
    console.log('⚠️  RECOMMENDATIONS:');
    console.log('   - Consider reducing limits for production deployment');
    console.log('   - Implement data archiving/cleanup for old activities');
    console.log('   - Monitor storage usage and implement alerts');
    if (storage.totals.totalStorageGB > 10) {
      console.log('   - Current limits may be too high for cost-effective hosting');
    }
  } else {
    console.log('✅ STORAGE ESTIMATE LOOKS REASONABLE for most hosting providers\n');
  }
  
  // Per-user estimates
  console.log('👤 PER-USER ESTIMATES (average):');
  const avgUserStorage = storage.totals.totalStorageBytes / limits.MAX_ACCOUNTS;
  console.log(`   Average storage per user: ${formatBytes(avgUserStorage)}`);
  console.log(`   Cost per user per month: ~$${((storage.totals.totalStorageGB * 3.5) / limits.MAX_ACCOUNTS).toFixed(2)} (estimated)\n`);
}

// Run the calculator
displayStorageEstimate();