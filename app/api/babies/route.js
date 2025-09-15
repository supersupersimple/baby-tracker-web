import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { db } from '../../../lib/database.js';
import { users, babies } from '../../../lib/schema.js';
import { eq } from 'drizzle-orm';
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
    let user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!user) {
      const newUser = await db.insert(users).values({
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        image: session.user.image
      }).returning();
      user = newUser[0];
    }

    // Check if user can create more babies (max babies per user limit)
    const canCreate = await canUserCreateBaby(db, user.id);
    if (!canCreate) {
      return NextResponse.json({
        success: false,
        error: `Maximum number of babies reached. You can create up to ${LIMITS.MAX_BABIES_PER_USER} babies per account.`,
      }, { status: 403 });
    }

    // Create baby with unique invite code
    let inviteCode = generateInviteCode();
    while (await db.select().from(babies).where(eq(babies.inviteCode, inviteCode)).get()) {
      inviteCode = generateInviteCode();
    }
    
    const newBabyData = {
      owner_id: user.id,
      baby_name: babyName,
      gender,
      birthday: Math.floor(new Date(birthday).getTime() / 1000), // Convert to unix timestamp
      description: description || '',
      inviteCode
    };
    
    const insertResult = await db.insert(babies).values(newBabyData).returning();
    const createdBaby = insertResult[0];
    
    // Get the baby with owner info
    const babyWithOwner = await db.select({
      baby: babies,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.id, createdBaby.id))
    .get();
    
    const baby = {
      ...babyWithOwner.baby,
      birthday: new Date(babyWithOwner.baby.birthday * 1000), // Convert back to Date for response
      owner: babyWithOwner.owner
    };

    return NextResponse.json({
      success: true,
      data: {
        id: baby.id,
        babyName: baby.baby_name,
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
