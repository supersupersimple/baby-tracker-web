import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '@/lib/auth'
import { db } from '@/lib/database'
import { babies, activities, babyAccess, users } from '@/lib/schema'
import { eq, and, or } from 'drizzle-orm'
import {
  aggregateFeedingData,
  aggregateSleepData,
  aggregateDiaperingData,
  aggregateGrowthData,
  aggregateLeisureData,
  calculateSummaryStats
} from '@/lib/chart-utils'

export async function GET(request) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const babyId = searchParams.get('babyId')
    const type = searchParams.get('type') || 'feeding'
    const days = parseInt(searchParams.get('days')) || 7

    if (!babyId) {
      return NextResponse.json({ error: 'Baby ID is required' }, { status: 400 })
    }

    const userId = session.user.id

    // Check if user has access to the baby
    const babyQuery = await db
      .select({ baby: babies })
      .from(babies)
      .leftJoin(babyAccess, eq(babies.id, babyAccess.baby_id))
      .where(
        and(
          eq(babies.id, parseInt(babyId)),
          or(
            eq(babies.owner_id, userId),
            and(
              eq(babyAccess.user_id, userId),
              eq(babyAccess.canView, true)
            )
          )
        )
      )
      .get();

    const baby = babyQuery?.baby;

    if (!baby) {
      return NextResponse.json({ error: 'Baby not found or access denied' }, { status: 404 })
    }

    const activitiesResults = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.baby_id, parseInt(babyId)),
          eq(activities.status, 'active')
        )
      )
      .orderBy(activities.from_date)
      .all();

    // Convert date strings to Date objects for chart utilities
    const activitiesWithDates = activitiesResults.map(activity => ({
      ...activity,
      fromDate: new Date(activity.from_date), // from_date is ISO8601 string
      toDate: activity.to_date ? new Date(activity.to_date) : null, // to_date is ISO8601 string
      createdAt: new Date(activity.createdAt), // createdAt is ISO8601 string
      updatedAt: new Date(activity.updatedAt) // updatedAt is ISO8601 string
    }));


    let chartData = []
    let summaryStats = {}

    switch (type) {
      case 'feeding':
        chartData = aggregateFeedingData(activitiesWithDates, days)
        summaryStats = calculateSummaryStats(chartData, 'feeding')
        break

      case 'sleep':
        chartData = aggregateSleepData(activitiesWithDates, days)
        summaryStats = calculateSummaryStats(chartData, 'sleep')
        break

      case 'diapering':
        chartData = aggregateDiaperingData(activitiesWithDates, days)
        summaryStats = calculateSummaryStats(chartData, 'diapering')
        break

      case 'growth':
        chartData = aggregateGrowthData(activitiesWithDates, days)
        summaryStats = calculateSummaryStats(chartData, 'growth')
        break

      case 'leisure':
        chartData = aggregateLeisureData(activitiesWithDates, days)
        summaryStats = calculateSummaryStats(chartData, 'leisure')
        break

      default:
        return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        summaryStats,
        type,
        days,
        babyName: baby.baby_name
      }
    })

  } catch (error) {
    console.error('Charts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}