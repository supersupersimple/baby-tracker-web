import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babies, babyAccess } from '../../../../lib/schema.js';
import { eq, and } from 'drizzle-orm';

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
    let user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!user) {
      user = await db.insert(users).values({
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        image: session.user.image
      }).returning().get();
    }

    // Find baby by invite code
    const baby = await db.select({
      id: babies.id,
      baby_name: babies.baby_name,
      gender: babies.gender,
      birthday: babies.birthday,
      description: babies.description,
      avatar: babies.avatar,
      owner_id: babies.owner_id,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.inviteCode, inviteCode))
    .get();
    
    let babyWithAccess = null;
    if (baby) {
      // Get all access records for this baby
      const accessRecords = await db.select().from(babyAccess).where(eq(babyAccess.baby_id, baby.id));
      babyWithAccess = { ...baby, babyAccess: accessRecords };
    }

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Invalid invite code',
      }, { status: 404 });
    }

    // Check if user is already owner or has access
    if (babyWithAccess.owner_id === user.id) {
      return NextResponse.json({
        success: false,
        error: 'You are already the owner of this baby',
      }, { status: 400 });
    }

    const existingAccess = babyWithAccess.babyAccess.find(access => access.user_id === user.id);
    if (existingAccess) {
      return NextResponse.json({
        success: false,
        error: 'You already have access to this baby',
      }, { status: 400 });
    }

    // Grant VIEWER access by default
    await db.insert(babyAccess).values({
      user_id: user.id,
      baby_id: babyWithAccess.id,
      role: 'VIEWER'
    });

    return NextResponse.json({
      success: true,
      data: {
        id: babyWithAccess.id,
        babyName: babyWithAccess.baby_name,
        gender: babyWithAccess.gender,
        birthday: new Date(babyWithAccess.birthday * 1000),
        description: babyWithAccess.description,
        avatar: babyWithAccess.avatar,
        isOwner: false,
        role: 'VIEWER',
        owner: babyWithAccess.owner,
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