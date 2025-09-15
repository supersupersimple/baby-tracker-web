// Safety and resource limits configuration
// These can be overridden via environment variables in production

import { sql, count, and, gte, lt, eq, ne } from 'drizzle-orm';
import { users, babies, babyAccess, activities } from './schema.js';

export const LIMITS = {
  // Maximum number of registered accounts (emails)
  MAX_ACCOUNTS: parseInt(process.env.MAX_ACCOUNTS) || 100,
  
  // Maximum babies per user
  MAX_BABIES_PER_USER: parseInt(process.env.MAX_BABIES_PER_USER) || 3,
  
  // Maximum shared users per baby (excluding owner)
  MAX_SHARED_USERS_PER_BABY: parseInt(process.env.MAX_SHARED_USERS_PER_BABY) || 5,
  
  // Maximum activities per day for one baby
  MAX_ACTIVITIES_PER_DAY: parseInt(process.env.MAX_ACTIVITIES_PER_DAY) || 50,
  
  // Maximum total activities for one baby
  MAX_TOTAL_ACTIVITIES_PER_BABY: parseInt(process.env.MAX_TOTAL_ACTIVITIES_PER_BABY) || 100000,
};

// Storage estimation constants (in bytes)
export const STORAGE_ESTIMATES = {
  // Average user record size (email, name, image, timestamps, etc.)
  AVG_USER_SIZE: 500,
  
  // Average baby record size (name, gender, birthday, description, etc.)
  AVG_BABY_SIZE: 800,
  
  // Average baby access record size (userId, babyId, role, timestamps)
  AVG_BABY_ACCESS_SIZE: 200,
  
  // Average activity record size (all fields including details, timestamps, etc.)
  AVG_ACTIVITY_SIZE: 1200,
  
  // Database overhead and indexes (estimated 30% overhead)
  DB_OVERHEAD_MULTIPLIER: 1.3,
};

// Calculate maximum theoretical storage usage
export function calculateMaxStorageUsage() {
  const {
    MAX_ACCOUNTS,
    MAX_BABIES_PER_USER,
    MAX_SHARED_USERS_PER_BABY,
    MAX_TOTAL_ACTIVITIES_PER_BABY,
  } = LIMITS;
  
  const {
    AVG_USER_SIZE,
    AVG_BABY_SIZE,
    AVG_BABY_ACCESS_SIZE,
    AVG_ACTIVITY_SIZE,
    DB_OVERHEAD_MULTIPLIER,
  } = STORAGE_ESTIMATES;
  
  // Maximum users
  const totalUsers = MAX_ACCOUNTS;
  const userStorageBytes = totalUsers * AVG_USER_SIZE;
  
  // Maximum babies (each user has max babies)
  const totalBabies = totalUsers * MAX_BABIES_PER_USER;
  const babyStorageBytes = totalBabies * AVG_BABY_SIZE;
  
  // Maximum baby access records (each baby shared with max users)
  const totalBabyAccess = totalBabies * (MAX_SHARED_USERS_PER_BABY + 1); // +1 for owner
  const babyAccessStorageBytes = totalBabyAccess * AVG_BABY_ACCESS_SIZE;
  
  // Maximum activities (each baby has max activities)
  const totalActivities = totalBabies * MAX_TOTAL_ACTIVITIES_PER_BABY;
  const activityStorageBytes = totalActivities * AVG_ACTIVITY_SIZE;
  
  // Calculate totals
  const rawStorageBytes = userStorageBytes + babyStorageBytes + babyAccessStorageBytes + activityStorageBytes;
  const totalStorageBytes = rawStorageBytes * DB_OVERHEAD_MULTIPLIER;
  
  return {
    breakdown: {
      users: {
        count: totalUsers,
        storageBytes: userStorageBytes,
        storageMB: Math.round(userStorageBytes / 1024 / 1024 * 100) / 100,
      },
      babies: {
        count: totalBabies,
        storageBytes: babyStorageBytes,
        storageMB: Math.round(babyStorageBytes / 1024 / 1024 * 100) / 100,
      },
      babyAccess: {
        count: totalBabyAccess,
        storageBytes: babyAccessStorageBytes,
        storageMB: Math.round(babyAccessStorageBytes / 1024 / 1024 * 100) / 100,
      },
      activities: {
        count: totalActivities,
        storageBytes: activityStorageBytes,
        storageMB: Math.round(activityStorageBytes / 1024 / 1024 * 100) / 100,
        storageGB: Math.round(activityStorageBytes / 1024 / 1024 / 1024 * 100) / 100,
      },
    },
    totals: {
      rawStorageBytes,
      totalStorageBytes,
      rawStorageMB: Math.round(rawStorageBytes / 1024 / 1024 * 100) / 100,
      totalStorageMB: Math.round(totalStorageBytes / 1024 / 1024 * 100) / 100,
      totalStorageGB: Math.round(totalStorageBytes / 1024 / 1024 / 1024 * 100) / 100,
    },
  };
}

// Utility function to check if account creation is allowed
export async function isAccountCreationAllowed(db) {
  const { count } = await db.select({ count: sql`count(*)`.as('count') }).from(users).get();
  return count < LIMITS.MAX_ACCOUNTS;
}

// Utility function to check if user can create more babies
export async function canUserCreateBaby(db, userId) {
  const result = await db.select({ count: sql`count(*)`.as('count') }).from(babies).where(eq(babies.owner_id, userId)).get();
  return result.count < LIMITS.MAX_BABIES_PER_USER;
}

// Utility function to check if baby can be shared with more users
export async function canShareBaby(db, babyId) {
  const result = await db.select({ count: sql`count(*)`.as('count') }).from(babyAccess).where(
    and(
      eq(babyAccess.baby_id, babyId),
      ne(babyAccess.role, 'OWNER')
    )
  ).get();
  return result.count < LIMITS.MAX_SHARED_USERS_PER_BABY;
}

// Utility function to check if user can create more activities today
export async function canCreateActivityToday(db, babyId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const result = await db.select({ count: sql`count(*)`.as('count') }).from(activities).where(
    and(
      eq(activities.baby_id, babyId),
      gte(activities.from_date, Math.floor(today.getTime() / 1000)),
      lt(activities.from_date, Math.floor(tomorrow.getTime() / 1000))
    )
  ).get();
  
  return result.count < LIMITS.MAX_ACTIVITIES_PER_DAY;
}

// Utility function to check if baby can have more total activities
export async function canCreateActivity(db, babyId) {
  const result = await db.select({ count: sql`count(*)`.as('count') }).from(activities).where(eq(activities.baby_id, babyId)).get();
  return result.count < LIMITS.MAX_TOTAL_ACTIVITIES_PER_BABY;
}

// Export current limits for display/debugging
export function getCurrentLimits() {
  return {
    ...LIMITS,
    storageEstimate: calculateMaxStorageUsage(),
  };
}