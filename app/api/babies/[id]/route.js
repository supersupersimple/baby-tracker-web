import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babies, activities, babyAccess } from '../../../../lib/schema.js';
import { eq, and } from 'drizzle-orm';

export async function PUT(request, { params }) {
  try {
    // Await params for NextJS 15 compatibility
    const { id } = await params;
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const babyId = parseInt(id);
    const body = await request.json();
    const { babyName, gender, birthday, description } = body;
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required',
      }, { status: 400 });
    }

    if (!babyName || !gender || !birthday) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: babyName, gender, birthday',
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

    // Check if baby exists and verify ownership
    const baby = await db.select({
      id: babies.id,
      baby_name: babies.baby_name,
      owner_id: babies.owner_id,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.id, babyId))
    .get();

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is the owner (only owners can edit baby details)
    if (baby.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can edit baby details',
      }, { status: 403 });
    }

    // Update the baby
    await db.update(babies)
      .set({
        babyName,
        gender,
        birthday: Math.floor(new Date(birthday).getTime() / 1000),
        description: description || '',
      })
      .where(eq(babies.id, babyId));
      
    // Fetch the updated baby with owner info
    const updatedBaby = await db.select({
      id: babies.id,
      baby_name: babies.baby_name,
      gender: babies.gender,
      birthday: babies.birthday,
      description: babies.description,
      avatar: babies.avatar,
      inviteCode: babies.inviteCode,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.id, babyId))
    .get();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBaby.id,
        babyName: updatedBaby.baby_name,
        gender: updatedBaby.gender,
        birthday: new Date(updatedBaby.birthday * 1000),
        description: updatedBaby.description,
        avatar: updatedBaby.avatar,
        isOwner: true,
        role: 'ADMIN',
        owner: updatedBaby.owner,
        inviteCode: updatedBaby.inviteCode
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update baby',
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // Await params for NextJS 15 compatibility
    const { id } = await params;
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const babyId = parseInt(id);
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required',
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

    // Check if baby exists and verify ownership with detailed logging
    const baby = await db.select({
      id: babies.id,
      baby_name: babies.baby_name,
      owner_id: babies.owner_id,
      owner: {
        id: users.id,
        email: users.email,
        name: users.name
      }
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.id, babyId))
    .get();

    if (baby) {
      // Get counts for activities and access records
      const activitiesCount = await db.select({ count: activities.id })
        .from(activities)
        .where(eq(activities.baby_id, babyId));
      
      const accessCount = await db.select({ count: babyAccess.id })
        .from(babyAccess)
        .where(eq(babyAccess.baby_id, babyId));

      baby._count = {
        activities: activitiesCount.length,
        babyAccess: accessCount.length
      };
    }

    if (!baby) {
      console.log(`Delete attempt failed: Baby ${babyId} not found`);
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is the owner (only owners can delete)
    if (baby.owner_id !== user.id) {
      console.log(`Delete attempt denied: User ${user.email} (ID: ${user.id}) tried to delete baby ${baby.babyName} (ID: ${babyId}) owned by ${baby.owner.email} (ID: ${baby.ownerId})`);
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can delete babies. This action has been logged.',
      }, { status: 403 });
    }

    console.log(`Delete authorized: User ${user.email} (owner) deleting baby ${baby.babyName} with ${baby._count.activities} activities and ${baby._count.babyAccess} access records`);

    // Delete all related records in proper order
    await db.transaction(async (tx) => {
      // Delete all activities for this baby
      await tx.delete(activities).where(eq(activities.baby_id, babyId));

      // Delete all access records (shares) for this baby
      await tx.delete(babyAccess).where(eq(babyAccess.baby_id, babyId));

      // Finally delete the baby
      await tx.delete(babies).where(eq(babies.id, babyId));
    });

    return NextResponse.json({
      success: true,
      message: `Baby and ${baby._count.activities} activities deleted successfully`,
      deletedCounts: {
        activities: baby._count.activities,
        accesses: baby._count.babyAccess
      }
    });
  } catch (error) {
    console.error('Database error during baby deletion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete baby',
    }, { status: 500 });
  }
}