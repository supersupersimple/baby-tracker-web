import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';
import JSZip from 'jszip';
import { ulid } from 'ulid';

export async function POST(request) {
  try {
    console.log('🔍 Import API called');
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      console.log('❌ No authentication');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Get babyId from query parameters (URL) instead of request body
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    console.log('📋 BabyId from query:', babyId);
    
    if (!babyId) {
      console.log('❌ No babyId provided');
      return NextResponse.json({
        success: false,
        error: 'Baby ID is required as query parameter (?babyId=X)',
      }, { status: 400 });
    }

    // Check if the request contains binary data (for .abt files) or JSON data
    const contentType = request.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);
    let data;

    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('📁 Processing file upload');
      // Handle file upload (.abt files)
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        console.log('❌ No file in FormData');
        return NextResponse.json({
          success: false,
          error: 'No file provided',
        }, { status: 400 });
      }
      
      console.log('📎 File received:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Get file buffer
      const fileBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(fileBuffer);

      try {
        console.log('📦 Attempting to unzip file...');
        // Try to unzip the file (assuming .abt format)
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(buffer);
        
        // Look for data.json file in the zip (try both data.json and baby.json for compatibility)
        let dataFile = zipContents.file('data.json');
        if (!dataFile) {
          dataFile = zipContents.file('baby.json');
        }
        
        if (!dataFile) {
          console.log('❌ Neither data.json nor baby.json found in zip archive');
          console.log('📋 Available files in zip:', Object.keys(zipContents.files));
          return NextResponse.json({
            success: false,
            error: 'Invalid .abt file: data.json or baby.json not found in archive',
          }, { status: 400 });
        }
        
        console.log('✅ Found data file in zip:', dataFile.name);

        // Extract and parse JSON data
        const jsonContent = await dataFile.async('text');
        console.log('📄 JSON content length:', jsonContent.length);
        data = JSON.parse(jsonContent);
        console.log('✅ Successfully parsed ZIP/JSON data');
      } catch (zipError) {
        console.log('⚠️ ZIP parsing failed:', zipError.message);
        // If unzip fails, try to parse as direct JSON (for backward compatibility)
        try {
          const textContent = buffer.toString('utf-8');
          console.log('📄 Trying direct JSON parse, content length:', textContent.length);
          data = JSON.parse(textContent);
          console.log('✅ Successfully parsed direct JSON data');
        } catch (jsonError) {
          console.log('❌ JSON parsing also failed:', jsonError.message);
          return NextResponse.json({
            success: false,
            error: 'Invalid file format. Expected .abt (zipped JSON) or .json file',
          }, { status: 400 });
        }
      }
    } else {
      // Handle direct JSON upload (for backward compatibility)
      try {
        data = await request.json();
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON data',
        }, { status: 400 });
      }
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
    console.log('🔍 Validating data structure. Data keys:', Object.keys(data));
    console.log('📊 Data.records type:', typeof data.records, 'Is array:', Array.isArray(data.records));
    if (data.records) {
      console.log('📊 Records count:', data.records.length);
    }
    
    if (!data.records || !Array.isArray(data.records)) {
      console.log('❌ Invalid data structure - missing or invalid records array');
      return NextResponse.json({
        success: false,
        error: 'Invalid data format: records array is required'
      }, { status: 400 });
    }

    // Convert date format from "YYYY-MM-DD HH:mm:ss" to ISO format
    // Treat input dates as local timezone (not UTC)
    const convertDateFormat = (dateStr) => {
      if (!dateStr) return null;
      
      // If it's already in ISO format, return as is
      if (dateStr.includes('T')) {
        return dateStr;
      }
      
      // Convert from "YYYY-MM-DD HH:mm:ss" to ISO format
      // Do NOT add 'Z' - treat as local timezone
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toISOString();
    };

    const importedActivities = [];
    const skippedActivities = [];
    const errors = [];
    const validActivities = [];

    console.log('📊 Processing', data.records.length, 'records...');

    // Log some sample dates to understand the data
    const sampleDates = data.records.slice(0, 5).map(r => r.fromDate);
    console.log('📅 Sample dates from import:', sampleDates);
    
    const latestDates = data.records.slice(-5).map(r => r.fromDate);
    console.log('📅 Latest dates from import:', latestDates);

    // First pass: Process and validate all records
    for (let i = 0; i < data.records.length; i++) {
      const record = data.records[i];
      
      try {
        // Prepare activity data with field mapping and normalization
        const activityData = {
          babyId: parseInt(babyId), // Use the specified baby ID
          recorder: user.id, // Use the authenticated user ID
          ulid: ulid(), // Generate ULID for sync compatibility
          status: 'active', // Mark as active (not deleted)
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

        validActivities.push(activityData);
      } catch (error) {
        console.error(`Error processing record ${i + 1}:`, error);
        errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }

    console.log('✅ Processed', validActivities.length, 'valid activities');

    // Second pass: Check for existing activities efficiently (avoid large OR queries)
    console.log('🔍 Checking for duplicates...');
    
    // Get ALL existing activities for this baby (more efficient than complex OR queries)
    const existingActivities = await prisma.activity.findMany({
      where: {
        babyId: parseInt(babyId),
        status: 'active' // Only check active activities for duplicates
      },
      select: {
        id: true,
        ulid: true,
        type: true,
        subtype: true,
        fromDate: true,
        amount: true,
        unit: true,
        category: true,
        details: true
      }
    });

    // Helper function to create content hash for comprehensive duplicate detection
    const createContentHash = (activity) => {
      const content = {
        type: activity.type,
        subtype: activity.subtype,
        amount: activity.amount,
        unit: activity.unit,
        category: activity.category,
        details: activity.details?.trim() || ''
      };
      return JSON.stringify(content);
    };

    // Create a more comprehensive duplicate detection system
    // We'll use multiple strategies for better accuracy
    
    // Strategy 1: Exact timestamp + type + subtype matching
    const exactMatchSet = new Set(
      existingActivities.map(activity => 
        `${activity.type}-${activity.subtype}-${activity.fromDate}`
      )
    );
    
    // Strategy 3: Content-based matching (for activities with same time but different details)
    const contentHashMap = new Map();
    existingActivities.forEach(activity => {
      const timestamp = new Date(activity.fromDate).getTime();
      const contentHash = createContentHash(activity);
      const key = `${contentHash}-${Math.floor(timestamp / (5 * 60 * 1000))}`; // 5-minute window
      
      if (!contentHashMap.has(key)) {
        contentHashMap.set(key, []);
      }
      contentHashMap.get(key).push(activity);
    });
    
    // Strategy 2: Near-duplicate detection (within 1 minute window)
    const nearDuplicateMap = new Map();
    existingActivities.forEach(activity => {
      const timestamp = new Date(activity.fromDate).getTime();
      const key = `${activity.type}-${activity.subtype}`;
      
      if (!nearDuplicateMap.has(key)) {
        nearDuplicateMap.set(key, []);
      }
      nearDuplicateMap.get(key).push({
        ...activity,
        timestamp
      });
    });
    
    // Helper function to check for near duplicates (within 1 minute)
    const isNearDuplicate = (activityData) => {
      const timestamp = new Date(activityData.fromDate).getTime();
      const key = `${activityData.type}-${activityData.subtype}`;
      const similarActivities = nearDuplicateMap.get(key) || [];
      
      const ONE_MINUTE = 60 * 1000; // 1 minute in milliseconds
      
      return similarActivities.some(existing => 
        Math.abs(existing.timestamp - timestamp) <= ONE_MINUTE
      );
    };

    console.log('📊 Found', exactMatchSet.size, 'existing activities in database');

    // Also check for duplicates within the import data itself
    const importExactSet = new Set();
    const importNearMap = new Map();
    const activitiesToInsert = [];
    
    validActivities.forEach((activity, index) => {
      const exactKey = `${activity.type}-${activity.subtype}-${activity.fromDate}`;
      const nearKey = `${activity.type}-${activity.subtype}`;
      const timestamp = new Date(activity.fromDate).getTime();
      
      // Check for exact match in database
      if (exactMatchSet.has(exactKey)) {
        skippedActivities.push(`Record ${index + 1}: Exact duplicate (exists in database)`);
        return;
      }
      
      // Check for near duplicate in database (within 1 minute)
      if (isNearDuplicate(activity)) {
        skippedActivities.push(`Record ${index + 1}: Near duplicate (similar activity within 1 minute in database)`);
        return;
      }
      
      // Check for content-based duplicate (same content within 5-minute window)
      const contentHash = createContentHash(activity);
      const contentKey = `${contentHash}-${Math.floor(timestamp / (5 * 60 * 1000))}`;
      if (contentHashMap.has(contentKey)) {
        skippedActivities.push(`Record ${index + 1}: Content duplicate (same activity details within 5 minutes in database)`);
        return;
      }
      
      // Check for exact duplicate within this import file
      if (importExactSet.has(exactKey)) {
        skippedActivities.push(`Record ${index + 1}: Exact duplicate (duplicate within import file)`);
        return;
      }
      
      // Check for near duplicate within this import file
      const importSimilar = importNearMap.get(nearKey) || [];
      const ONE_MINUTE = 60 * 1000;
      const hasNearDuplicateInImport = importSimilar.some(existing => 
        Math.abs(existing.timestamp - timestamp) <= ONE_MINUTE
      );
      
      if (hasNearDuplicateInImport) {
        skippedActivities.push(`Record ${index + 1}: Near duplicate (similar activity within 1 minute in import file)`);
        return;
      }
      
      // It's unique, add to tracking sets and include for insert
      importExactSet.add(exactKey);
      if (!importNearMap.has(nearKey)) {
        importNearMap.set(nearKey, []);
      }
      importNearMap.get(nearKey).push({ timestamp, index });
      
      activitiesToInsert.push(activity);
    });

    console.log('📝 Inserting', activitiesToInsert.length, 'new activities...');

    // Third pass: Batch insert all new activities (debug with smaller test first)
    let totalInserted = 0;
    if (activitiesToInsert.length > 0) {
      // Try just one activity first to see the exact error
      console.log('🧪 Testing with one activity first...');
      const testActivity = activitiesToInsert[0];
      console.log('🧪 Test activity data:', JSON.stringify({
        ...testActivity,
        ulid: testActivity.ulid ? `${testActivity.ulid.substring(0, 8)}...` : null // Show partial ULID for privacy
      }, null, 2));
      
      try {
        const testResult = await prisma.activity.create({
          data: testActivity
        });
        console.log('✅ Test activity created successfully:', testResult.id);
        
        // If successful, proceed with batch insert
        const INSERT_CHUNK_SIZE = 50; // Much smaller chunks for debugging
        
        for (let i = 0; i < activitiesToInsert.length; i += INSERT_CHUNK_SIZE) {
          const chunk = activitiesToInsert.slice(i, i + INSERT_CHUNK_SIZE);
          console.log(`📝 Inserting chunk ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}/${Math.ceil(activitiesToInsert.length / INSERT_CHUNK_SIZE)} (${chunk.length} activities)...`);
          
          try {
            const result = await prisma.activity.createMany({
              data: chunk
            });
            
            totalInserted += result.count;
            console.log(`✅ Chunk inserted: ${result.count} activities`);
            
          } catch (batchError) {
            console.error('❌ Batch insert failed for chunk:', batchError.message);
            errors.push(`Batch insert failed for chunk ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}: ${batchError.message}`);
          }
        }
        
      } catch (testError) {
        console.error('❌ Test activity failed:', testError.message);
        console.error('❌ Full test error:', testError);
        errors.push(`Single activity test failed: ${testError.message}`);
      }
      
      console.log('✅ Total batch insert completed:', totalInserted, 'activities created');
      
      // For response purposes, create a representative array
      importedActivities.push(...activitiesToInsert.slice(0, 10)); // Just show first 10 for response
    }

    const actualImported = totalInserted;
    let message = `Successfully imported ${actualImported} activities`;
    if (skippedActivities.length > 0) {
      message += `, skipped ${skippedActivities.length} duplicates`;
    }

    return NextResponse.json({
      success: true,
      message: message,
      imported: actualImported,
      skipped: skippedActivities.length,
      errors: errors.length > 0 ? errors : null,
      skippedDetails: skippedActivities.length > 0 ? skippedActivities : null,
      data: importedActivities // Just first 10 for response size
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import data: ' + error.message
    }, { status: 500 });
  }
}