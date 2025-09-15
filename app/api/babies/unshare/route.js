import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babyAccess, babies } from '../../../../lib/schema.js';
import { eq } from 'drizzle-orm';

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
    const currentUser = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Find access record and verify ownership
    const access = await db.select({
      id: babyAccess.id,
      user_id: babyAccess.user_id,
      baby_id: babyAccess.baby_id,
      role: babyAccess.role,
      baby: {
        id: babies.id,
        baby_name: babies.baby_name,
        owner_id: babies.owner_id
      },
      user: {
        email: users.email,
        name: users.name
      }
    })
    .from(babyAccess)
    .leftJoin(babies, eq(babyAccess.baby_id, babies.id))
    .leftJoin(users, eq(babyAccess.user_id, users.id))
    .where(eq(babyAccess.id, parseInt(accessId)))
    .get();

    if (!access) {
      return NextResponse.json({
        success: false,
        error: 'Access record not found',
      }, { status: 404 });
    }

    // Check if current user is baby owner
    if (access.baby.owner_id !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can remove access',
      }, { status: 403 });
    }

    // Delete access
    await db.delete(babyAccess).where(eq(babyAccess.id, parseInt(accessId)));

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