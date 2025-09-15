import { NextResponse } from 'next/server';
import { db } from '../../../../lib/database.js';
import { activities } from '../../../../lib/schema.js';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Get the specific new record to examine timestamp formats
    const records = await db.select().from(activities)
      .where(eq(activities.id, 46211));

    return NextResponse.json({
      success: true,
      data: records.map(record => ({
        id: record.id,
        from_date: record.from_date,
        to_date: record.to_date,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        // Show raw type info
        from_date_type: typeof record.from_date,
        to_date_type: typeof record.to_date,
        createdAt_type: typeof record.createdAt,
        updatedAt_type: typeof record.updatedAt
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}