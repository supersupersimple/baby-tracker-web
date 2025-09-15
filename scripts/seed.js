import db from '../lib/database.js';
import { users, babies, activities } from '../lib/schema.js';

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: null,
    }).returning();

    console.log('👤 Created user:', user.email);

    // Create test baby
    const birthday = Math.floor(new Date('2023-01-01').getTime() / 1000);
    const [baby] = await db.insert(babies).values({
      ownerId: user.id,
      babyName: 'Test Baby',
      gender: 'BOY',
      birthday: birthday,
      description: 'A test baby for development',
      avatar: null,
      isPublic: false,
      inviteCode: null,
    }).returning();

    console.log('👶 Created baby:', baby.babyName);

    // Create sample activities
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const twoHoursAgo = now - 7200;
    const threeHoursAgo = now - 10800;

    const sampleActivities = [
      {
        ulid: 'test-feeding-1',
        status: 'active',
        babyId: baby.id,
        recorder: user.id,
        type: 'FEEDING',
        subtype: 'BOTTLE',
        fromDate: threeHoursAgo,
        toDate: threeHoursAgo + 900, // 15 minutes
        unit: 'MILLILITRES',
        amount: 120,
        category: 'FORMULA',
        details: 'Good feeding session',
      },
      {
        ulid: 'test-sleep-1',
        status: 'active',
        babyId: baby.id,
        recorder: user.id,
        type: 'SLEEPING',
        subtype: null,
        fromDate: twoHoursAgo,
        toDate: oneHourAgo,
        unit: 'NONE',
        amount: null,
        category: 'NONE',
        details: 'Peaceful sleep',
      },
      {
        ulid: 'test-diaper-1',
        status: 'active',
        babyId: baby.id,
        recorder: user.id,
        type: 'DIAPERING',
        subtype: 'PEE',
        fromDate: oneHourAgo,
        toDate: null,
        unit: 'NONE',
        amount: null,
        category: 'NONE',
        details: 'Wet diaper change',
      },
    ];

    await db.insert(activities).values(sampleActivities);

    console.log('📝 Created sample activities');
    console.log('✅ Database seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });