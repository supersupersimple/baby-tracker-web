import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';
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
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Find baby and verify ownership
    const baby = await prisma.baby.findUnique({
      where: { id: parseInt(babyId) },
      include: {
        owner: true,
        babyAccess: true
      }
    });

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is owner
    if (baby.ownerId !== currentUser.id) {
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
    let targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      // Create a placeholder user for the email
      targetUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as default name
        }
      });
    }

    // Check if already has access
    const existingAccess = baby.babyAccess.find(access => access.userId === targetUser.id);
    
    if (existingAccess) {
      // Update existing access
      await prisma.babyAccess.update({
        where: { id: existingAccess.id },
        data: { role }
      });
      
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
      const canShare = await canShareBaby(prisma, baby.id);
      if (!canShare) {
        return NextResponse.json({
          success: false,
          error: `Maximum number of shared users reached. You can share with up to ${LIMITS.MAX_SHARED_USERS_PER_BABY} users per baby.`,
        }, { status: 403 });
      }
      
      // Create new access
      await prisma.babyAccess.create({
        data: {
          userId: targetUser.id,
          babyId: baby.id,
          role
        }
      });

      return NextResponse.json({
        success: true,
        message: `Shared ${baby.babyName} with ${email} as ${role.toLowerCase()}`,
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
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Find baby and verify ownership
    const baby = await prisma.baby.findUnique({
      where: { id: parseInt(babyId) },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        babyAccess: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is owner
    if (baby.ownerId !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can view shared users',
      }, { status: 403 });
    }

    // Format shared users
    const sharedUsers = baby.babyAccess.map(access => ({
      id: access.user.id,
      name: access.user.name,
      email: access.user.email,
      role: access.role,
      accessId: access.id
    }));

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          babyName: baby.babyName,
          owner: baby.owner
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