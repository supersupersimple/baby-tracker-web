import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';

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
    const { inviteCode } = body;
    
    if (!inviteCode) {
      return NextResponse.json({
        success: false,
        error: 'Invite code is required',
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

    // Find baby by invite code
    const baby = await prisma.baby.findUnique({
      where: { inviteCode },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        babyAccess: true
      }
    });

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Invalid invite code',
      }, { status: 404 });
    }

    // Check if user is already owner or has access
    if (baby.ownerId === user.id) {
      return NextResponse.json({
        success: false,
        error: 'You are already the owner of this baby',
      }, { status: 400 });
    }

    const existingAccess = baby.babyAccess.find(access => access.userId === user.id);
    if (existingAccess) {
      return NextResponse.json({
        success: false,
        error: 'You already have access to this baby',
      }, { status: 400 });
    }

    // Grant VIEWER access by default
    await prisma.babyAccess.create({
      data: {
        userId: user.id,
        babyId: baby.id,
        role: 'VIEWER'
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
        isOwner: false,
        role: 'VIEWER',
        owner: baby.owner,
        inviteCode: null // Don't show invite code to non-owners
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join baby',
    }, { status: 500 });
  }
}