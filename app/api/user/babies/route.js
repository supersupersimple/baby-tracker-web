import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../../lib/auth.js';
import { db } from '../../../../lib/database.js';
import { users, babies, babyAccess } from '../../../../lib/schema.js';
import { eq, or } from 'drizzle-orm';

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
    const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Get babies where user is owner or has access
    const babiesQuery = await db
      .select({
        baby: babies,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email
        },
        access: babyAccess
      })
      .from(babies)
      .leftJoin(users, eq(babies.owner_id, users.id))
      .leftJoin(babyAccess, eq(babies.id, babyAccess.baby_id))
      .where(
        or(
          eq(babies.owner_id, user.id),
          eq(babyAccess.user_id, user.id)
        )
      )
      .all();

    // Group results by baby
    const babiesMap = new Map();
    babiesQuery.forEach(row => {
      const babyId = row.baby.id;
      if (!babiesMap.has(babyId)) {
        babiesMap.set(babyId, {
          ...row.baby,
          owner: row.owner,
          babyAccess: []
        });
      }
      
      if (row.access && row.access.user_id === user.id) {
        babiesMap.get(babyId).babyAccess.push(row.access);
      }
    });
    
    const babiesArray = Array.from(babiesMap.values());

    // Format response with access info
    const formattedBabies = babiesArray.map(baby => ({
      id: baby.id,
      babyName: baby.baby_name,
      gender: baby.gender,
      birthday: new Date(baby.birthday * 1000), // Convert unix timestamp to Date
      description: baby.description,
      avatar: baby.avatar,
      isOwner: baby.owner_id === user.id,
      role: baby.owner_id === user.id ? 'ADMIN' : baby.babyAccess[0]?.role || 'VIEWER',
      owner: baby.owner,
      inviteCode: baby.owner_id === user.id ? baby.inviteCode : null
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