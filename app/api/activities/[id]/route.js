import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babies, activities, babyAccess } from '../../../../lib/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

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

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Activity ID is required' 
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

    // Try parsing as integer first (server ID)
    const activityId = parseInt(id);
    let existingActivity = null;

    if (!isNaN(activityId)) {
      // Check if activity exists with server ID
      existingActivity = await db.select({
        id: activities.id,
        babyId: activities.baby_id,
        ulid: activities.ulid,
        type: activities.type,
        subtype: activities.subtype,
        fromDate: activities.from_date,
        toDate: activities.to_date,
        amount: activities.amount,
        unit: activities.unit,
        category: activities.category,
        details: activities.details,
        status: activities.status,
        recorder: activities.recorder,
        baby: {
          id: babies.id,
          babyName: babies.baby_name,
          ownerId: babies.owner_id
        }
      })
      .from(activities)
      .leftJoin(babies, eq(activities.baby_id, babies.id))
      .where(eq(activities.id, activityId))
      .get();
    } else {
      // Try to find by ULID - since ULID now requires babyId in composite constraint,
      // we need to search across all babies the user has access to
      const ownedBabies = await db.select({ id: babies.id })
        .from(babies)
        .where(eq(babies.owner_id, user.id));
      
      const accessBabies = await db.select({ babyId: babyAccess.baby_id })
        .from(babyAccess)
        .where(eq(babyAccess.user_id, user.id));
      
      const userBabies = [
        ...ownedBabies.map(b => ({ id: b.id })),
        ...accessBabies.map(b => ({ id: b.babyId }))
      ];

      // Search for activity with matching ULID across user's accessible babies
      if (userBabies.length > 0) {
        existingActivity = await db.select({
          id: activities.id,
          babyId: activities.baby_id,
          ulid: activities.ulid,
          type: activities.type,
          subtype: activities.subtype,
          fromDate: activities.from_date,
          toDate: activities.to_date,
          amount: activities.amount,
          unit: activities.unit,
          category: activities.category,
          details: activities.details,
          status: activities.status,
          recorder: activities.recorder,
          baby: {
            id: babies.id,
            babyName: babies.baby_name,
            ownerId: babies.owner_id
          }
        })
        .from(activities)
        .leftJoin(babies, eq(activities.baby_id, babies.id))
        .where(and(
          eq(activities.ulid, id),
          inArray(activities.baby_id, userBabies.map(baby => baby.id))
        ))
        .get();
      }
    }

    // If not found by server ID, this might be a local ULID that needs to be synced first
    if (!existingActivity) {
      console.log(`Activity ${id} not found on server - this appears to be a local-only activity that needs syncing`);
      
      // For local activities, we need to create them on the server first
      // Extract the baby ID from the request body or use a default
      let babyId = body.babyId;
      if (!babyId) {
        const defaultBaby = await db.select({ id: babies.id })
          .from(babies)
          .where(eq(babies.owner_id, user.id))
          .get();
        
        if (!defaultBaby) {
          // Try to find a baby from access permissions
          const accessBaby = await db.select({ babyId: babyAccess.baby_id })
            .from(babyAccess)
            .where(eq(babyAccess.user_id, user.id))
            .get();
          babyId = accessBaby?.babyId;
        } else {
          babyId = defaultBaby.id;
        }
      }

      if (!babyId) {
        return NextResponse.json({
          success: false,
          error: 'No accessible baby found for this user',
        }, { status: 400 });
      }

      // Check permission for the baby
      const permission = await getUserBabyPermission(user.id, babyId);
      if (!permission || permission === 'VIEWER') {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions. Need EDITOR or ADMIN access to create activities.',
        }, { status: 403 });
      }

      // Create the activity on server first with the update data
      const createData = {
        babyId: parseInt(babyId),
        recorder: user.id,
        type: body.type || 'FEEDING',
        subtype: body.subtype || 'MEAL',
        fromDate: body.fromDate ? new Date(body.fromDate) : new Date(),
        toDate: body.toDate || body.endTime ? new Date(body.toDate || body.endTime) : null,
        amount: body.amount ? parseFloat(body.amount) : null,
        details: body.details || null,
        unit: body.unit?.toUpperCase() || null,
        category: body.category?.toUpperCase() || null,
      };

      // Convert dates to ISO8601 strings for Drizzle
      const now = new Date().toISOString();
      const createDataForDrizzle = {
        baby_id: parseInt(babyId),
        recorder: user.id,
        ulid: id, // Store the client ULID
        status: 'active',
        type: body.type || 'FEEDING',
        subtype: body.subtype || 'MEAL',
        from_date: createData.fromDate.toISOString(),
        to_date: createData.toDate ? createData.toDate.toISOString() : null,
        amount: body.amount ? parseFloat(body.amount) : null,
        unit: body.unit?.toUpperCase() || null,
        category: body.category?.toUpperCase() || null,
        details: body.details || null,
        createdAt: now,
        updatedAt: now,
      };
      
      const newActivity = await db.insert(activities).values(createDataForDrizzle).returning().get();
      
      // Fetch the complete activity with related data
      const completeActivity = await db.select({
        id: activities.id,
        babyId: activities.baby_id,
        ulid: activities.ulid,
        type: activities.type,
        subtype: activities.subtype,
        fromDate: activities.from_date,
        toDate: activities.to_date,
        amount: activities.amount,
        unit: activities.unit,
        category: activities.category,
        details: activities.details,
        status: activities.status,
        recorder: activities.recorder,
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
      .where(eq(activities.id, newActivity.id))
      .get();
      
      // Convert ISO8601 strings back to Date objects for response
      const activityForResponse = {
        ...completeActivity,
        fromDate: new Date(completeActivity.fromDate),
        toDate: completeActivity.toDate ? new Date(completeActivity.toDate) : null
      };

      console.log(`✅ Created new activity ${newActivity.id} on server for local ULID ${id}`);

      return NextResponse.json({
        success: true,
        data: activityForResponse,
        message: 'Local activity synced and updated on server'
      });
    }

    // If activity still not found, return 404
    if (!existingActivity) {
      return NextResponse.json({ 
        success: false, 
        error: 'Activity not found' 
      }, { status: 404 });
    }

    // Convert ISO8601 strings back to Date objects for consistency with existing logic
    const existingActivityWithDates = {
      ...existingActivity,
      fromDate: existingActivity.fromDate ? new Date(existingActivity.fromDate) : null,
      toDate: existingActivity.toDate ? new Date(existingActivity.toDate) : null
    };

    // Check permission - must be EDITOR or ADMIN to edit activities
    const permission = await getUserBabyPermission(user.id, existingActivityWithDates.babyId);
    if (!permission || permission === 'VIEWER') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions. Need EDITOR or ADMIN access to edit activities.',
      }, { status: 403 });
    }

    // Update the activity - support both legacy (endTime) and new (toDate) field names
    const updateData = {};
    
    // Handle end time / to date field (support both legacy and new field names)
    if (body.endTime) {
      updateData.to_date = new Date(body.endTime).toISOString();
    } else if (body.toDate) {
      updateData.to_date = new Date(body.toDate).toISOString();
    }
    
    // Handle other field updates  
    if (body.amount !== undefined) updateData.amount = body.amount ? parseFloat(body.amount) : null;
    if (body.details !== undefined) updateData.details = body.details;
    if (body.unit !== undefined) updateData.unit = body.unit?.toUpperCase();
    if (body.type !== undefined) updateData.type = body.type?.toUpperCase();
    if (body.subtype !== undefined) updateData.subtype = body.subtype?.toUpperCase();
    if (body.category !== undefined) updateData.category = body.category?.toUpperCase();
    if (body.fromDate !== undefined) updateData.from_date = new Date(body.fromDate).toISOString();

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    await db.update(activities).set(updateData).where(eq(activities.id, existingActivityWithDates.id));
    
    // Fetch the updated activity with related data
    const updatedActivity = await db.select({
      id: activities.id,
      babyId: activities.baby_id,
      ulid: activities.ulid,
      type: activities.type,
      subtype: activities.subtype,
      fromDate: activities.from_date,
      toDate: activities.to_date,
      amount: activities.amount,
      unit: activities.unit,
      category: activities.category,
      details: activities.details,
      status: activities.status,
      recorder: activities.recorder,
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
    .where(eq(activities.id, existingActivityWithDates.id))
    .get();
    
    // Convert ISO8601 strings back to Date objects for response
    const updatedActivityForResponse = {
      ...updatedActivity,
      fromDate: new Date(updatedActivity.fromDate),
      toDate: updatedActivity.toDate ? new Date(updatedActivity.toDate) : null
    };

    return NextResponse.json({
      success: true,
      data: updatedActivityForResponse
    });

  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update activity' 
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const { id } = await params;
    const activityId = parseInt(id);
    
    if (!activityId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Activity ID is required' 
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

    // Check if activity exists and get baby info (try by ID first, then by ULID)
    let existingActivity = null;
    if (!isNaN(activityId)) {
      existingActivity = await db.select({
        id: activities.id,
        babyId: activities.baby_id,
        ulid: activities.ulid,
        status: activities.status,
        baby: {
          id: babies.id,
          babyName: babies.baby_name,
          ownerId: babies.owner_id
        }
      })
      .from(activities)
      .leftJoin(babies, eq(activities.baby_id, babies.id))
      .where(eq(activities.id, activityId))
      .get();
    }
    
    // If not found by ID, try by ULID across user's accessible babies
    if (!existingActivity) {
      const ownedBabies = await db.select({ id: babies.id })
        .from(babies)
        .where(eq(babies.owner_id, user.id));
      
      const accessBabies = await db.select({ babyId: babyAccess.baby_id })
        .from(babyAccess)
        .where(eq(babyAccess.user_id, user.id));
      
      const userBabies = [
        ...ownedBabies.map(b => ({ id: b.id })),
        ...accessBabies.map(b => ({ id: b.babyId }))
      ];

      if (userBabies.length > 0) {
        existingActivity = await db.select({
          id: activities.id,
          babyId: activities.baby_id,
          ulid: activities.ulid,
          status: activities.status,
          baby: {
            id: babies.id,
            babyName: babies.baby_name,
            ownerId: babies.owner_id
          }
        })
        .from(activities)
        .leftJoin(babies, eq(activities.baby_id, babies.id))
        .where(and(
          eq(activities.ulid, id),
          inArray(activities.baby_id, userBabies.map(baby => baby.id))
        ))
        .get();
      }
    }

    if (!existingActivity) {
      return NextResponse.json({ 
        success: false, 
        error: 'Activity not found' 
      }, { status: 404 });
    }

    // Check permission - must be EDITOR or ADMIN to delete activities
    const permission = await getUserBabyPermission(user.id, existingActivity.babyId);
    if (!permission || permission === 'VIEWER') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions. Need EDITOR or ADMIN access to delete activities.',
      }, { status: 403 });
    }

    // Soft delete the activity
    await db.update(activities)
      .set({ 
        status: 'deleted',
        updatedAt: new Date().toISOString()
      })
      .where(eq(activities.id, existingActivity.id));

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete activity' 
    }, { status: 500 });
  }
}
