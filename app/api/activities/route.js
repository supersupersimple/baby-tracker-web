import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { db } from '../../../lib/database.js';
import { users, babies, activities, babyAccess } from '../../../lib/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { canCreateActivityToday, canCreateActivity, LIMITS } from '../../../lib/config.js';

// Helper function to check user's permission for a baby
async function getUserBabyPermission(userId, babyId) {
  const baby = await db.select().from(babies).where(eq(babies.id, parseInt(babyId))).get();

  if (!baby) return null;
  
  // Owner has ADMIN permission
  if (baby.owner_id === userId) return 'ADMIN';
  
  // Check shared access
  const access = await db.select().from(babyAccess)
    .where(and(eq(babyAccess.baby_id, parseInt(babyId)), eq(babyAccess.user_id, userId)))
    .get();
  
  if (access) {
    return access.role;
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
    const limit = parseInt(searchParams.get('limit')) || 30;
    const offset = (page - 1) * limit;
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'babyId is required',
      }, { status: 400 });
    }

    // Find current user
    const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

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
    let countQuery = db.select({ count: sql`count(*)`.as('count') }).from(activities)
      .where(and(eq(activities.baby_id, parseInt(babyId)), eq(activities.status, 'active')));
    
    if (type) {
      countQuery = countQuery.where(and(eq(activities.baby_id, parseInt(babyId)), eq(activities.status, 'active'), eq(activities.type, type)));
    }
    
    const countResult = await countQuery.get();
    const totalCount = countResult.count;

    // Build query with joins
    let activitiesQuery = db.select({
      activity: activities,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      baby: {
        id: babies.id,
        babyName: babies.baby_name,
        gender: babies.gender
      }
    })
    .from(activities)
    .leftJoin(users, eq(activities.recorder, users.id))
    .leftJoin(babies, eq(activities.baby_id, babies.id))
    .where(and(eq(activities.baby_id, parseInt(babyId)), eq(activities.status, 'active')))
    .orderBy(desc(activities.from_date))
    .limit(limit)
    .offset(offset);
    
    if (type) {
      activitiesQuery = activitiesQuery.where(
        and(
          eq(activities.baby_id, parseInt(babyId)), 
          eq(activities.status, 'active'),
          eq(activities.type, type)
        )
      );
    }
    
    const activitiesResult = await activitiesQuery.all();
    
    
    // Transform the results to match the expected structure
    const activitiesData = activitiesResult.map(row => ({
      ...row.activity,
      // Convert timestamps to Date objects (all timestamps are ISO8601 strings)
      fromDate: new Date(row.activity.from_date),
      toDate: row.activity.to_date ? new Date(row.activity.to_date) : null,
      createdAt: new Date(row.activity.createdAt),
      updatedAt: new Date(row.activity.updatedAt),
      user: row.user,
      baby: row.baby
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    
    return NextResponse.json({
      success: true,
      data: activitiesData,
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
    const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

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
    const canCreateToday = await canCreateActivityToday(db, parseInt(babyId));
    if (!canCreateToday) {
      return NextResponse.json({
        success: false,
        error: `Daily activity limit reached. Maximum ${LIMITS.MAX_ACTIVITIES_PER_DAY} activities per day per baby.`,
      }, { status: 403 });
    }

    const canCreateTotal = await canCreateActivity(db, parseInt(babyId));
    if (!canCreateTotal) {
      return NextResponse.json({
        success: false,
        error: `Total activity limit reached. Maximum ${LIMITS.MAX_TOTAL_ACTIVITIES_PER_BABY.toLocaleString()} activities per baby.`,
      }, { status: 403 });
    }
    
    // Create the activity
    const now = new Date().toISOString();


    const newActivityData = {
      baby_id: parseInt(babyId),
      recorder: user.id, // Use actual logged-in user
      ulid: clientId || null, // Store client ULID for sync
      status: 'active', // Default to active
      type,
      subtype: subtype || null,
      from_date: new Date(activityFromDate).toISOString(), // Store as ISO8601 string
      to_date: activityToDate ? new Date(activityToDate).toISOString() : null,
      unit: unit || null,
      amount: amount ? parseFloat(amount) : null,
      category: category || null,
      details: details || null,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.insert(activities).values(newActivityData).returning();
    const createdActivity = insertResult[0];
    
    // Get the activity with user and baby info
    const activityWithRelations = await db.select({
      activity: activities,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      baby: {
        id: babies.id,
        babyName: babies.baby_name,
        gender: babies.gender
      }
    })
    .from(activities)
    .leftJoin(users, eq(activities.recorder, users.id))
    .leftJoin(babies, eq(activities.baby_id, babies.id))
    .where(eq(activities.id, createdActivity.id))
    .get();
    
    const activity = {
      ...activityWithRelations.activity,
      // Convert ISO8601 strings to Date objects for response
      fromDate: new Date(activityWithRelations.activity.from_date),
      toDate: activityWithRelations.activity.to_date ? new Date(activityWithRelations.activity.to_date) : null,
      createdAt: new Date(activityWithRelations.activity.createdAt),
      updatedAt: new Date(activityWithRelations.activity.updatedAt),
      user: activityWithRelations.user,
      baby: activityWithRelations.baby
    };
    
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