import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import db from '../../../../lib/database.js';
import { users, babies, babyAccess } from '../../../../lib/schema.js';
import { eq, and } from 'drizzle-orm';
import { canShareBaby, LIMITS } from '../../../../lib/config.js';

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
    const { babyId, email, role = 'EDITOR' } = body;
    
    if (!babyId || !email) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID and email are required',
      }, { status: 400 });
    }

    if (!['VIEWER', 'EDITOR'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role. Must be VIEWER or EDITOR',
      }, { status: 400 });
    }

    // Find current user
    const currentUser = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Find baby and verify ownership
    const baby = await db.select().from(babies).where(eq(babies.id, parseInt(babyId))).get();
    
    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }
    
    // Get baby access records
    const babyAccessRecords = await db.select().from(babyAccess).where(eq(babyAccess.baby_id, baby.id));

    // Check if current user is owner
    if (baby.owner_id !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can share access',
      }, { status: 403 });
    }

    // Check if trying to share with self
    if (email === session.user.email) {
      return NextResponse.json({
        success: false,
        error: 'Cannot share with yourself',
      }, { status: 400 });
    }

    // Find or create the target user
    let targetUser = await db.select().from(users).where(eq(users.email, email)).get();

    if (!targetUser) {
      // Create a placeholder user for the email
      const [newUser] = await db.insert(users).values({
        email,
        name: email.split('@')[0], // Use email prefix as default name
      }).returning();
      targetUser = newUser;
    }

    // Check if already has access
    const existingAccess = babyAccessRecords.find(access => access.user_id === targetUser.id);
    
    if (existingAccess) {
      // Update existing access
      await db.update(babyAccess)
        .set({ role })
        .where(eq(babyAccess.id, existingAccess.id));
      
      return NextResponse.json({
        success: true,
        message: `Updated ${email}'s access to ${role.toLowerCase()}`,
        data: {
          email: targetUser.email,
          name: targetUser.name,
          role
        }
      });
    } else {
      // Check if baby can be shared with more users (max shared users limit)
      const canShare = await canShareBaby(db, baby.id);
      if (!canShare) {
        return NextResponse.json({
          success: false,
          error: `Maximum number of shared users reached. You can share with up to ${LIMITS.MAX_SHARED_USERS_PER_BABY} users per baby.`,
        }, { status: 403 });
      }
      
      // Create new access
      await db.insert(babyAccess).values({
        user_id: targetUser.id,
        baby_id: baby.id,
        role
      });

      return NextResponse.json({
        success: true,
        message: `Shared ${baby.baby_name} with ${email} as ${role.toLowerCase()}`,
        data: {
          email: targetUser.email,
          name: targetUser.name,
          role
        }
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to share baby',
    }, { status: 500 });
  }
}

// Get shared users for a baby
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
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required',
      }, { status: 400 });
    }

    // Find current user
    const currentUser = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Find baby and verify ownership
    const baby = await db.select().from(babies).where(eq(babies.id, parseInt(babyId))).get();

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is owner
    if (baby.owner_id !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can view shared users',
      }, { status: 403 });
    }

    // Get baby owner
    const owner = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, baby.owner_id)).get();
    
    // Get baby access records with user details
    const babyAccessWithUsers = await db.select({
      id: babyAccess.id,
      role: babyAccess.role,
      user_id: babyAccess.user_id,
      userName: users.name,
      userEmail: users.email
    }).from(babyAccess)
      .innerJoin(users, eq(babyAccess.user_id, users.id))
      .where(eq(babyAccess.baby_id, baby.id));

    // Format shared users
    const sharedUsers = babyAccessWithUsers.map(access => ({
      id: access.user_id,
      name: access.userName,
      email: access.userEmail,
      role: access.role,
      accessId: access.id
    }));

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          babyName: baby.baby_name,
          owner: owner
        },
        sharedUsers
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get shared users',
    }, { status: 500 });
  }
}