import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';
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
    const [
      totalUsers,
      totalBabies,
      totalBabyAccess,
      totalActivities,
      activitiesToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.baby.count(),
      prisma.babyAccess.count(),
      prisma.activity.count(),
      prisma.activity.count({
        where: {
          fromDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          }
        }
      })
    ]);

    // Get top babies by activity count
    const topBabies = await prisma.baby.findMany({
      select: {
        id: true,
        babyName: true,
        _count: {
          select: {
            activities: true
          }
        }
      },
      orderBy: {
        activities: {
          _count: 'desc'
        }
      },
      take: 5
    });

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
          name: baby.babyName,
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