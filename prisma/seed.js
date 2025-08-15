const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create test users
  const user1 = await prisma.user.create({
    data: {
      email: 'parent1@example.com',
      name: 'Sarah Johnson',
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'parent2@example.com',
      name: 'Mike Chen',
    },
  })

  console.log('Created users:', { user1, user2 })

  // Create test babies
  const baby1 = await prisma.baby.create({
    data: {
      ownerId: user1.id,
      babyName: 'Emma',
      gender: 'GIRL',
      birthday: new Date('2024-01-15'),
    },
  })

  const baby2 = await prisma.baby.create({
    data: {
      ownerId: user2.id,
      babyName: 'Oliver',
      gender: 'BOY',
      birthday: new Date('2024-03-22'),
    },
  })

  console.log('Created babies:', { baby1, baby2 })

  // Create test activities
  const activities = await prisma.activity.createMany({
    data: [
      // Feeding activities
      {
        babyId: baby1.id,
        recorder: user1.id,
        type: 'FEEDING',
        subtype: 'BOTTLE',
        fromDate: new Date('2024-07-29T08:00:00Z'),
        toDate: new Date('2024-07-29T08:20:00Z'),
        unit: 'MILLILITRES',
        amount: 120.0,
        category: 'FORMULA',
        details: 'Morning feeding - good appetite',
      },
      {
        babyId: baby1.id,
        recorder: user1.id,
        type: 'FEEDING',
        subtype: 'MEAL',
        fromDate: new Date('2024-07-29T12:00:00Z'),
        toDate: new Date('2024-07-29T12:15:00Z'),
        unit: 'NONE',
        amount: 0,
        category: 'NONE',
        details: 'Pureed carrots and sweet potato',
      },
      // Sleeping activities
      {
        babyId: baby1.id,
        recorder: user1.id,
        type: 'SLEEPING',
        subtype: 'NAP',
        fromDate: new Date('2024-07-29T09:00:00Z'),
        toDate: new Date('2024-07-29T10:30:00Z'),
        unit: 'NONE',
        amount: 0,
        category: 'NONE',
        details: 'Morning nap in crib',
      },
      // Diapering activities
      {
        babyId: baby1.id,
        recorder: user1.id,
        type: 'DIAPERING',
        subtype: 'PEE',
        fromDate: new Date('2024-07-29T08:25:00Z'),
        unit: 'NONE',
        amount: 0,
        category: 'NONE',
        details: 'After feeding',
      },
      {
        babyId: baby1.id,
        recorder: user1.id,
        type: 'DIAPERING',
        subtype: 'POO',
        fromDate: new Date('2024-07-29T14:00:00Z'),
        unit: 'NONE',
        amount: 0,
        category: 'NONE',
        details: 'Normal consistency',
      },
      // Activities for second baby
      {
        babyId: baby2.id,
        recorder: user2.id,
        type: 'FEEDING',
        subtype: 'BOTTLE',
        fromDate: new Date('2024-07-29T07:30:00Z'),
        toDate: new Date('2024-07-29T07:50:00Z'),
        unit: 'MILLILITRES',
        amount: 150.0,
        category: 'FORMULA',
        details: 'Early morning feeding',
      },
      {
        babyId: baby2.id,
        recorder: user2.id,
        type: 'MEDICINE',
        subtype: 'VITAMIN',
        fromDate: new Date('2024-07-29T08:00:00Z'),
        unit: 'NONE',
        amount: 0,
        category: 'NONE',
        details: 'Daily vitamin D drops',
      },
    ],
  })

  console.log(`Created ${activities.count} activities`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
