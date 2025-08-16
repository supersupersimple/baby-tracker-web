import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';

export async function POST(request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const data = await request.json();
    
    // Get babyId from query parameters (URL) instead of request body
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    
    if (!babyId) {
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required as query parameter (?babyId=X)',
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

    // Verify baby ownership - only owners can import data
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
        error: 'Only baby owners can import data. You must be the owner of this baby to import activities.',
      }, { status: 403 });
    }
    
    // Validate the import data structure
    if (!data.records || !Array.isArray(data.records)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid data format: records array is required'
      }, { status: 400 });
    }

    // Convert date format from "YYYY-MM-DD HH:mm:ss" to ISO format
    const convertDateFormat = (dateStr) => {
      if (!dateStr) return null;
      
      // If it's already in ISO format, return as is
      if (dateStr.includes('T')) {
        return dateStr;
      }
      
      // Convert from "YYYY-MM-DD HH:mm:ss" to ISO format
      const date = new Date(dateStr.replace(' ', 'T') + 'Z');
      return date.toISOString();
    };

    const importedActivities = [];
    const skippedActivities = [];
    const errors = [];

    // Process each record
    for (let i = 0; i < data.records.length; i++) {
      const record = data.records[i];
      
      try {
        // Prepare activity data with field mapping and normalization
        const activityData = {
          babyId: parseInt(babyId), // Use the specified baby ID
          recorder: user.id, // Use the authenticated user ID
          type: record.type?.toUpperCase() || 'FEEDING',
          subtype: record.subtype?.toUpperCase() || 'BOTTLE',
          fromDate: convertDateFormat(record.fromDate),
          toDate: record.toDate ? convertDateFormat(record.toDate) : null,
          unit: null,
          amount: null,
          category: null,
          details: record.details || ''
        };

        // Normalize unit, amount, and category based on activity type (following our corrected specification)
        if (activityData.type === 'FEEDING' && activityData.subtype === 'BOTTLE') {
          // Only bottle feeding should have unit/amount/category
          activityData.unit = record.unit?.toUpperCase() === 'MILLILITRES' || record.unit?.toUpperCase() === 'OUNCES' ? record.unit.toUpperCase() : 'MILLILITRES';
          activityData.amount = record.amount ? parseFloat(record.amount) : null;
          activityData.category = record.category?.toUpperCase() === 'FORMULA' || record.category?.toUpperCase() === 'BREAST_MILK' ? record.category.toUpperCase() : 'FORMULA';
        } else if (activityData.type === 'GROWTH') {
          // Growth activities have measurements
          activityData.unit = activityData.subtype === 'GROWTH_WEIGHT' ? 'KILOGRAMS' : 'CENTIMETERS';
          activityData.amount = record.amount ? parseFloat(record.amount) : null;
        } else if (activityData.type === 'HEALTH' && activityData.subtype === 'HEALTH_TEMPERATURE') {
          // Only temperature measurements have unit/amount
          activityData.unit = 'CELSIUS';
          activityData.amount = record.amount ? parseFloat(record.amount) : null;
        }
        // All other activities (diapering, medication, sleeping, leisure, etc.) keep null values

        // Validate required fields
        if (!activityData.fromDate) {
          errors.push(`Record ${i + 1}: fromDate is required`);
          continue;
        }

        // Check for duplicate activity (same type, subtype, and fromDate)
        // Using type+subtype+fromDate as unique identifier per your requirement
        const whereCondition = {
          babyId: activityData.babyId,
          type: activityData.type,
          subtype: activityData.subtype,
          fromDate: activityData.fromDate,
        };

        const existingActivity = await prisma.activity.findFirst({
          where: whereCondition
        });

        if (existingActivity) {
          skippedActivities.push(`Record ${i + 1}: Duplicate activity (same type, subtype, fromDate) - ID: ${existingActivity.id}`);
          continue;
        }

        // Create the activity in the database
        const activity = await prisma.activity.create({
          data: activityData
        });

        importedActivities.push(activity);
      } catch (error) {
        console.error(`Error importing record ${i + 1}:`, error);
        errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }

    let message = `Successfully imported ${importedActivities.length} activities`;
    if (skippedActivities.length > 0) {
      message += `, skipped ${skippedActivities.length} duplicates`;
    }

    return NextResponse.json({
      success: true,
      message: message,
      imported: importedActivities.length,
      skipped: skippedActivities.length,
      errors: errors.length > 0 ? errors : null,
      skippedDetails: skippedActivities.length > 0 ? skippedActivities : null,
      data: importedActivities
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import data: ' + error.message
    }, { status: 500 });
  }
}