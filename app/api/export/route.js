import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';

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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Verify baby ownership - only owners can export data
    const baby = await prisma.baby.findUnique({
      where: { id: parseInt(babyId) },
      include: {
        owner: true
      }
    });

    if (!baby) {
      return NextResponse.json({
        success: false,
        error: 'Baby not found',
      }, { status: 404 });
    }

    if (baby.ownerId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only baby owners can export data. You must be the owner of this baby to export activities.',
      }, { status: 403 });
    }

    // Fetch activities for this specific baby only
    const activities = await prisma.activity.findMany({
      where: { babyId: parseInt(babyId) },
      orderBy: {
        fromDate: 'asc'
      }
    });

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
    const records = activities.map(activity => {
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
      if (!dateStr) return "2022-12-19"; // Default fallback
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Create export data matching example.json structure
    const exportData = {
      version: 1,
      name: baby?.babyName || "baby",
      notes: [],
      records: records,
      gender: baby?.gender?.toUpperCase() || "BOY",
      birthday: formatBirthday(baby?.birthday)
    };

    // Generate filename with current date
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `baby-tracker-export-${dateString}.json`;

    // Return the JSON data as a downloadable file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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