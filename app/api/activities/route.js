import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';
import { canCreateActivityToday, canCreateActivity, LIMITS } from '../../../lib/config.js';

// Helper function to check user's permission for a baby
async function getUserBabyPermission(userId, babyId) {
  const baby = await prisma.baby.findUnique({
    where: { id: parseInt(babyId) },
    include: {
      babyAccess: {
        where: { userId },
        select: { role: true }
      }
    }
  });

  if (!baby) return null;
  
  // Owner has ADMIN permission
  if (baby.ownerId === userId) return 'ADMIN';
  
  // Check shared access
  if (baby.babyAccess.length > 0) {
    return baby.babyAccess[0].role;
  }
  
  return null; // No permission
}

export async function GET(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = (page - 1) * limit;
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'babyId is required',
      }, { status: 400 });
    }

    // Find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check permission
    const permission = await getUserBabyPermission(user.id, babyId);
    if (!permission) {
      return NextResponse.json({
        success: false,
        error: 'No access to this baby',
      }, { status: 403 });
    }

    // Get activities with user info
    const whereClause = {
      babyId: parseInt(babyId),
      ...(type && { type })
    };

    // Get total count for pagination info
    const totalCount = await prisma.activity.count({
      where: {
        ...whereClause,
        status: 'active' // Only count active activities
      }
    });

    const activities = await prisma.activity.findMany({
      where: {
        ...whereClause,
        status: 'active' // Only get active activities
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        baby: {
          select: {
            id: true,
            babyName: true,
            gender: true
          }
        }
      },
      orderBy: { fromDate: 'desc' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities',
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const body = await request.json();
    const { babyId, type, subtype, startTime, endTime, fromDate, toDate, unit, amount, category, details, clientId } = body;
    
    // Support both legacy (startTime/endTime) and new (fromDate/toDate) field names
    const activityFromDate = fromDate || startTime;
    const activityToDate = toDate || endTime;
    
    if (!babyId || !type || !activityFromDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: babyId, type, fromDate/startTime',
      }, { status: 400 });
    }

    // Find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check permission - must be EDITOR or ADMIN to create activities
    const permission = await getUserBabyPermission(user.id, babyId);
    console.log(`User ${user.email} has permission: ${permission} for baby ${babyId}`);
    if (!permission || permission === 'VIEWER') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions. Need EDITOR or ADMIN access to add activities.',
      }, { status: 403 });
    }

    // Check activity limits
    const canCreateToday = await canCreateActivityToday(prisma, parseInt(babyId));
    if (!canCreateToday) {
      return NextResponse.json({
        success: false,
        error: `Daily activity limit reached. Maximum ${LIMITS.MAX_ACTIVITIES_PER_DAY} activities per day per baby.`,
      }, { status: 403 });
    }

    const canCreateTotal = await canCreateActivity(prisma, parseInt(babyId));
    if (!canCreateTotal) {
      return NextResponse.json({
        success: false,
        error: `Total activity limit reached. Maximum ${LIMITS.MAX_TOTAL_ACTIVITIES_PER_BABY.toLocaleString()} activities per baby.`,
      }, { status: 403 });
    }
    
    const activity = await prisma.activity.create({
      data: {
        babyId: parseInt(babyId),
        recorder: user.id, // Use actual logged-in user
        ulid: clientId || null, // Store client ULID for sync
        status: 'active', // Default to active
        type,
        subtype: subtype || null,
        fromDate: new Date(activityFromDate),
        toDate: activityToDate ? new Date(activityToDate) : null,
        unit: unit || null,
        amount: amount ? parseFloat(amount) : null,
        category: category || null,
        details: details || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        baby: {
          select: {
            id: true,
            babyName: true,
            gender: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: activity,
    }, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create activity',
    }, { status: 500 });
  }
}
