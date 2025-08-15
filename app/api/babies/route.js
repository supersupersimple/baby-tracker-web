import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';
import { canUserCreateBaby, LIMITS } from '../../../lib/config.js';

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
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
    const { babyName, gender, birthday, description } = body;
    
    if (!babyName || !gender || !birthday) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: babyName, gender, birthday',
      }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || session.user.email.split('@')[0],
          image: session.user.image
        }
      });
    }

    // Check if user can create more babies (max babies per user limit)
    const canCreate = await canUserCreateBaby(prisma, user.id);
    if (!canCreate) {
      return NextResponse.json({
        success: false,
        error: `Maximum number of babies reached. You can create up to ${LIMITS.MAX_BABIES_PER_USER} babies per account.`,
      }, { status: 403 });
    }

    // Create baby with unique invite code
    let inviteCode = generateInviteCode();
    while (await prisma.baby.findUnique({ where: { inviteCode } })) {
      inviteCode = generateInviteCode();
    }
    
    const baby = await prisma.baby.create({
      data: {
        ownerId: user.id,
        babyName,
        gender,
        birthday: new Date(birthday),
        description: description || '',
        inviteCode
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: baby.id,
        babyName: baby.babyName,
        gender: baby.gender,
        birthday: baby.birthday,
        description: baby.description,
        avatar: baby.avatar,
        isOwner: true,
        role: 'ADMIN',
        owner: baby.owner,
        inviteCode: baby.inviteCode
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create baby',
    }, { status: 500 });
  }
}
