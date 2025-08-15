import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/prisma.js';

export async function DELETE(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const body = await request.json();
    const { accessId } = body;
    
    if (!accessId) {
      return NextResponse.json({
        success: false,
        error: 'Access ID is required',
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

    // Find access record and verify ownership
    const access = await prisma.babyAccess.findUnique({
      where: { id: parseInt(accessId) },
      include: {
        baby: {
          select: {
            id: true,
            babyName: true,
            ownerId: true
          }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!access) {
      return NextResponse.json({
        success: false,
        error: 'Access record not found',
      }, { status: 404 });
    }

    // Check if current user is baby owner
    if (access.baby.ownerId !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can remove access',
      }, { status: 403 });
    }

    // Delete access
    await prisma.babyAccess.delete({
      where: { id: parseInt(accessId) }
    });

    return NextResponse.json({
      success: true,
      message: `Removed access for ${access.user.email}`,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove access',
    }, { status: 500 });
  }
}