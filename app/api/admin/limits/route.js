import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babies, babyAccess, activities } from '../../../../lib/schema.js';
import { eq, gte, lt, sql, desc } from 'drizzle-orm';
import { getCurrentLimits } from '../../../../lib/config.js';

// Admin endpoint to check current limits and usage
export async function GET(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Simple admin check - in production, you'd want proper role-based access
    const isAdmin = process.env.ADMIN_EMAILS?.split(',').includes(session.user.email) || 
                    process.env.NODE_ENV === 'development';

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required',
      }, { status: 403 });
    }

    // Get current usage statistics
    const today = new Date();
    const startOfDay = Math.floor(new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000);
    const endOfDay = Math.floor(new Date(today.setHours(24, 0, 0, 0)).getTime() / 1000);
    
    const [
      totalUsersResult,
      totalBabiesResult,
      totalBabyAccessResult,
      totalActivitiesResult,
      activitiesTodayResult
    ] = await Promise.all([
      db.select({ count: sql`count(*)`.as('count') }).from(users).get(),
      db.select({ count: sql`count(*)`.as('count') }).from(babies).get(),
      db.select({ count: sql`count(*)`.as('count') }).from(babyAccess).get(),
      db.select({ count: sql`count(*)`.as('count') }).from(activities).get(),
      db.select({ count: sql`count(*)`.as('count') })
        .from(activities)
        .where(gte(activities.from_date, startOfDay))
        .get()
    ]);
    
    const totalUsers = totalUsersResult.count;
    const totalBabies = totalBabiesResult.count;
    const totalBabyAccess = totalBabyAccessResult.count;
    const totalActivities = totalActivitiesResult.count;
    const activitiesToday = activitiesTodayResult.count;

    // Get top babies by activity count
    const topBabiesResult = await db
      .select({
        id: babies.id,
        baby_name: babies.baby_name,
        activityCount: sql`count(${activities.id})`.as('activityCount')
      })
      .from(babies)
      .leftJoin(activities, eq(babies.id, activities.baby_id))
      .groupBy(babies.id, babies.baby_name)
      .orderBy(desc(sql`count(${activities.id})`))  
      .limit(5)
      .all();
    
    const topBabies = topBabiesResult.map(baby => ({
      id: baby.id,
      baby_name: baby.baby_name,
      _count: {
        activities: parseInt(baby.activityCount) || 0
      }
    }));

    // Get limits and storage estimates
    const limits = getCurrentLimits();

    return NextResponse.json({
      success: true,
      data: {
        limits: {
          maxAccounts: limits.MAX_ACCOUNTS,
          maxBabiesPerUser: limits.MAX_BABIES_PER_USER,
          maxSharedUsersPerBaby: limits.MAX_SHARED_USERS_PER_BABY,
          maxActivitiesPerDay: limits.MAX_ACTIVITIES_PER_DAY,
          maxTotalActivitiesPerBaby: limits.MAX_TOTAL_ACTIVITIES_PER_BABY,
        },
        currentUsage: {
          users: {
            current: totalUsers,
            max: limits.MAX_ACCOUNTS,
            percentage: Math.round((totalUsers / limits.MAX_ACCOUNTS) * 100)
          },
          babies: {
            current: totalBabies,
            max: totalUsers * limits.MAX_BABIES_PER_USER,
            percentage: Math.round((totalBabies / (totalUsers * limits.MAX_BABIES_PER_USER || 1)) * 100)
          },
          babyAccess: {
            current: totalBabyAccess,
            max: totalBabies * (limits.MAX_SHARED_USERS_PER_BABY + 1),
            percentage: Math.round((totalBabyAccess / (totalBabies * (limits.MAX_SHARED_USERS_PER_BABY + 1) || 1)) * 100)
          },
          activities: {
            current: totalActivities,
            today: activitiesToday,
            max: totalBabies * limits.MAX_TOTAL_ACTIVITIES_PER_BABY,
            percentage: Math.round((totalActivities / (totalBabies * limits.MAX_TOTAL_ACTIVITIES_PER_BABY || 1)) * 100)
          }
        },
        topBabies: topBabies.map(baby => ({
          id: baby.id,
          name: baby.baby_name,
          activityCount: baby._count.activities
        })),
        storageEstimate: limits.storageEstimate
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get limits and usage',
    }, { status: 500 });
  }
}