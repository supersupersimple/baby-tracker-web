import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { db } from '../../../lib/database.js';
import { users, babies, activities } from '../../../lib/schema.js';
import { eq, and } from 'drizzle-orm';
import JSZip from 'jszip';

export async function GET(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Get babyId from URL search params
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required for export',
      }, { status: 400 });
    }

    // Find current user
    const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Verify baby ownership - only owners can export data
    const babyResult = await db.select({
      baby: babies,
      owner: users
    })
    .from(babies)
    .leftJoin(users, eq(babies.owner_id, users.id))
    .where(eq(babies.id, parseInt(babyId)))
    .get();
    
    const baby = babyResult ? {
      ...babyResult.baby,
      birthday: new Date(babyResult.baby.birthday * 1000),
      owner: babyResult.owner
    } : null;

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    if (baby.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can export data. You must be the owner of this baby to export activities.',
      }, { status: 403 });
    }

    // Fetch activities for this specific baby only
    const activitiesResult = await db.select()
      .from(activities)
      .where(eq(activities.baby_id, parseInt(babyId)))
      .orderBy(activities.from_date)
      .all();
    
    // Convert unix timestamps to Date objects
    const activitiesWithDates = activitiesResult.map(activity => ({
      ...activity,
      fromDate: new Date(activity.from_date * 1000),
      toDate: activity.to_date ? new Date(activity.to_date * 1000) : null
    }));

    // Convert date format from ISO to "YYYY-MM-DD HH:mm:ss"
    const convertDateFormat = (isoDateStr) => {
      if (!isoDateStr) return null;
      
      const date = new Date(isoDateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Transform activities to match example.json format
    const records = activitiesWithDates.map(activity => {
      const record = {
        type: activity.type,
        subtype: activity.subtype,
        unit: activity.unit || 'NONE',
        category: activity.category || 'NONE',
        amount: activity.amount || 0,
        details: activity.details || '',
        fromDate: convertDateFormat(activity.fromDate)
      };

      // Only include toDate if it exists
      if (activity.toDate) {
        record.toDate = convertDateFormat(activity.toDate);
      }

      return record;
    });

    // Convert birthday to "YYYY-MM-DD" format if it exists
    const formatBirthday = (dateStr) => {
      if (!dateStr) return null; // No default date if not provided
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Create export data matching example.json structure
    const exportData = {
      version: 1,
      name: baby?.baby_name || "baby",
      notes: [],
      records: records,
      gender: baby?.gender?.toUpperCase() || "BOY",
      birthday: formatBirthday(baby?.birthday)
    };

    // Create ZIP file containing the JSON data
    const zip = new JSZip();
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Add JSON file to zip with a standard name
    zip.file('data.json', jsonContent);
    
    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    // Generate filename with baby name and current date
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const safebabyName = (baby?.baby_name || "baby").replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safebabyName}_${dateString}.abt`;

    // Return the zipped data as .abt file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export data: ' + error.message
    }, { status: 500 });
  }
}