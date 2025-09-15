import { activityService, babyService } from '../../../lib/services.js'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../lib/auth.js'
import { db } from '../../../lib/database.js'
import { users } from '../../../lib/schema.js'
import { eq } from 'drizzle-orm'

export async function GET(request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 })
    }

    // Find current user
    const user = await db.select().from(users).where(eq(users.email, session.user.email)).get()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 })
    }

    const babies = await babyService.getBabiesByUserId(user.id)
    
    if (!babies || babies.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No babies found for user'
      })
    }

    // Get recent activities for all babies of this user
    const allActivities = []
    for (const baby of babies) {
      const activities = await activityService.getActivitiesByBabyId(baby.id, 10)
      // Add baby info to each activity
      const activitiesWithBaby = activities.map(activity => ({
        ...activity,
        baby: {
          id: baby.id,
          babyName: baby.baby_name,
          gender: baby.gender
        }
      }))
      allActivities.push(...activitiesWithBaby)
    }

    // Sort all activities by start time (most recent first)
    allActivities.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate))

    // Take only the most recent 20 activities
    const recentActivities = allActivities.slice(0, 20)

    return NextResponse.json({
      success: true,
      data: recentActivities
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent activities'
    }, { status: 500 })
  }
}
