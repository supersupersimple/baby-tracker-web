import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const babyId = parseInt(params.id);
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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check if baby exists and verify ownership
    const baby = await prisma.baby.findUnique({
      where: { id: babyId },
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

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    // Check if current user is the owner (only owners can edit baby details)
    if (baby.ownerId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can edit baby details',
      }, { status: 403 });
    }

    // Update the baby
    const updatedBaby = await prisma.baby.update({
      where: { id: babyId },
      data: {
        babyName,
        gender,
        birthday: new Date(birthday),
        description: description || '',
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
        id: updatedBaby.id,
        babyName: updatedBaby.babyName,
        gender: updatedBaby.gender,
        birthday: updatedBaby.birthday,
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