import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';

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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

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
      existingActivity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          baby: {
            select: {
              id: true,
              babyName: true,
              ownerId: true
            }
          }
        }
      });
    } else {
      // Try to find by ULID
      existingActivity = await prisma.activity.findUnique({
        where: { ulid: id },
        include: {
          baby: {
            select: {
              id: true,
              babyName: true,
              ownerId: true
            }
          }
        }
      });
    }

    // If not found by server ID, this might be a local ULID that needs to be synced first
    if (!existingActivity) {
      console.log(`Activity ${id} not found on server - this appears to be a local-only activity that needs syncing`);
      
      // For local activities, we need to create them on the server first
      // Extract the baby ID from the request body or use a default
      const babyId = body.babyId || (await prisma.baby.findFirst({
        where: {
          OR: [
            { ownerId: user.id },
            { babyAccess: { some: { userId: user.id } } }
          ]
        },
        select: { id: true }
      }))?.id;

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

      const newActivity = await prisma.activity.create({
        data: {
          ...createData,
          ulid: id, // Store the client ULID
          status: 'active'
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

      console.log(`✅ Created new activity ${newActivity.id} on server for local ULID ${id}`);

      return NextResponse.json({
        success: true,
        data: newActivity,
        message: 'Local activity synced and updated on server'
      });
    }

    // Check permission - must be EDITOR or ADMIN to edit activities
    const permission = await getUserBabyPermission(user.id, existingActivity.babyId);
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
      updateData.toDate = new Date(body.endTime);
    } else if (body.toDate) {
      updateData.toDate = new Date(body.toDate);
    }
    
    // Handle other field updates  
    if (body.amount !== undefined) updateData.amount = body.amount ? parseFloat(body.amount) : null;
    if (body.details !== undefined) updateData.details = body.details;
    if (body.unit !== undefined) updateData.unit = body.unit?.toUpperCase();
    if (body.type !== undefined) updateData.type = body.type?.toUpperCase();
    if (body.subtype !== undefined) updateData.subtype = body.subtype?.toUpperCase();
    if (body.category !== undefined) updateData.category = body.category?.toUpperCase();
    if (body.fromDate !== undefined) updateData.fromDate = new Date(body.fromDate);

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
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
      data: updatedActivity
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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check if activity exists and get baby info (try by ID first, then by ULID)
    let existingActivity = null;
    if (!isNaN(activityId)) {
      existingActivity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          baby: {
            select: {
              id: true,
              babyName: true,
              ownerId: true
            }
          }
        }
      });
    }
    
    // If not found by ID, try by ULID
    if (!existingActivity) {
      existingActivity = await prisma.activity.findUnique({
        where: { ulid: id },
        include: {
          baby: {
            select: {
              id: true,
              babyName: true,
              ownerId: true
            }
          }
        }
      });
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
    await prisma.activity.update({
      where: { id: existingActivity.id },
      data: { 
        status: 'deleted',
        updatedAt: new Date()
      }
    });

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
