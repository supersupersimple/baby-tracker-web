import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';

export async function GET(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Get babies where user is owner or has access
    const babies = await prisma.baby.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          {
            babyAccess: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        babyAccess: {
          where: {
            userId: user.id
          },
          select: {
            role: true
          }
        }
      }
    });

    // Format response with access info
    const formattedBabies = babies.map(baby => ({
      id: baby.id,
      babyName: baby.babyName,
      gender: baby.gender,
      birthday: baby.birthday,
      description: baby.description,
      avatar: baby.avatar,
      isOwner: baby.ownerId === user.id,
      role: baby.ownerId === user.id ? 'ADMIN' : baby.babyAccess[0]?.role || 'VIEWER',
      owner: baby.owner,
      inviteCode: baby.ownerId === user.id ? baby.inviteCode : null
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedBabies,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch babies',
    }, { status: 500 });
  }
}