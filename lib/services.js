import { prisma } from './db.js'

// User operations
export const userService = {
  async createUser(email) {
    return await prisma.user.create({
      data: { email },
    })
  },

  async getUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        ownedBabies: true,
      },
    })
  },

  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        ownedBabies: true,
      },
    })
  },
}

// Baby operations
export const babyService = {
  async createBaby(ownerId, babyName, gender, birthday) {
    return await prisma.baby.create({
      data: {
        ownerId,
        babyName,
        gender,
        birthday: new Date(birthday),
      },
    })
  },

  async getBabiesByUserId(userId) {
    return await prisma.baby.findMany({
      where: { ownerId: userId },
      include: {
        activities: {
          orderBy: { fromDate: 'desc' },
          take: 10, // Last 10 activities
        },
      },
    })
  },

  async getBabyById(id) {
    return await prisma.baby.findUnique({
      where: { id },
      include: {
        owner: true,
        activities: {
          orderBy: { fromDate: 'desc' },
        },
      },
    })
  },
}

// Activity operations
export const activityService = {
  async createActivity(data) {
    const { babyId, recorder, type, subtype, fromDate, toDate, unit, amount, category, details } = data
    
    return await prisma.activity.create({
      data: {
        babyId,
        recorder,
        type: type?.toUpperCase(),
        subtype: subtype?.toUpperCase(),
        fromDate: new Date(fromDate),
        toDate: toDate ? new Date(toDate) : null,
        unit: unit?.toUpperCase() || 'NONE',
        amount,
        category: category?.toUpperCase() || 'NONE',
        details,
      },
    })
  },

  async getActivitiesByBabyId(babyId, limit = 50) {
    return await prisma.activity.findMany({
      where: { babyId },
      orderBy: { fromDate: 'desc' },
      take: limit,
      include: {
        baby: true,
        user: true,
      },
    })
  },

  async getActivitiesByType(babyId, type, limit = 20) {
    return await prisma.activity.findMany({
      where: { 
        babyId,
        type,
      },
      orderBy: { fromDate: 'desc' },
      take: limit,
    })
  },

  async getActivitiesInDateRange(babyId, startDate, endDate) {
    return await prisma.activity.findMany({
      where: {
        babyId,
        fromDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { fromDate: 'asc' },
    })
  },

  async updateActivity(id, data) {
    const updateData = { ...data }
    if (updateData.fromDate) updateData.fromDate = new Date(updateData.fromDate)
    if (updateData.toDate) updateData.toDate = new Date(updateData.toDate)
    if (updateData.endTime) updateData.toDate = new Date(updateData.endTime) // Support legacy field name
    if (updateData.type) updateData.type = updateData.type.toUpperCase()
    if (updateData.subtype) updateData.subtype = updateData.subtype.toUpperCase()
    if (updateData.unit) updateData.unit = updateData.unit.toUpperCase()
    if (updateData.category) updateData.category = updateData.category.toUpperCase()
    
    return await prisma.activity.update({
      where: { id },
      data: updateData,
      include: {
        baby: {
          select: {
            id: true,
            babyName: true
          }
        }
      }
    })
  },

  async deleteActivity(id) {
    return await prisma.activity.delete({
      where: { id },
    })
  },

  // Get feeding summary for a specific date
  async getFeedingSummary(babyId, date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return await prisma.activity.findMany({
      where: {
        babyId,
        type: 'feeding',
        fromDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { fromDate: 'asc' },
    })
  },

  // Get sleep summary for a specific date
  async getSleepSummary(babyId, date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return await prisma.activity.findMany({
      where: {
        babyId,
        type: 'sleeping',
        fromDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { fromDate: 'asc' },
    })
  },
}
