import { db } from './database.js';
import { users, babies, activities } from './schema.js';
import { eq, desc, gte, lte, and } from 'drizzle-orm';

// User operations
export const userService = {
  async createUser(email) {
    const result = await db.insert(users).values({ email }).returning();
    return result[0];
  },

  async getUserByEmail(email) {
    const result = await db.select({
      user: users,
      ownedBabies: babies
    })
    .from(users)
    .leftJoin(babies, eq(users.id, babies.ownerId))
    .where(eq(users.email, email))
    .all();

    if (result.length === 0) return null;
    
    const user = result[0].user;
    const ownedBabies = result.filter(row => row.ownedBabies).map(row => ({
      ...row.ownedBabies,
      birthday: new Date(row.ownedBabies.birthday )
    }));
    
    return { ...user, ownedBabies };
  },

  async getUserById(id) {
    const result = await db.select({
      user: users,
      ownedBabies: babies
    })
    .from(users)
    .leftJoin(babies, eq(users.id, babies.ownerId))
    .where(eq(users.id, id))
    .all();

    if (result.length === 0) return null;
    
    const user = result[0].user;
    const ownedBabies = result.filter(row => row.ownedBabies).map(row => ({
      ...row.ownedBabies,
      birthday: new Date(row.ownedBabies.birthday )
    }));
    
    return { ...user, ownedBabies };
  },
}

// Baby operations
export const babyService = {
  async createBaby(ownerId, babyName, gender, birthday) {
    const result = await db.insert(babies).values({
      ownerId,
      babyName,
      gender,
      birthday: new Date(birthday).toISOString(), // Convert to ISO8601 string
    }).returning();
    
    const baby = result[0];
    return {
      ...baby,
      birthday: new Date(baby.birthday ) // Convert back to Date
    };
  },

  async getBabiesByUserId(userId) {
    const result = await db.select({
      baby: babies,
      activity: activities
    })
    .from(babies)
    .leftJoin(activities, and(
      eq(babies.id, activities.babyId),
      eq(activities.status, 'active')
    ))
    .where(eq(babies.ownerId, userId))
    .orderBy(desc(activities.fromDate))
    .all();

    // Group by baby and take only first 10 activities per baby
    const babiesMap = new Map();
    
    result.forEach(row => {
      const babyId = row.baby.id;
      if (!babiesMap.has(babyId)) {
        babiesMap.set(babyId, {
          ...row.baby,
          birthday: new Date(row.baby.birthday ),
          activities: []
        });
      }
      
      if (row.activity && babiesMap.get(babyId).activities.length < 10) {
        babiesMap.get(babyId).activities.push({
          ...row.activity,
          fromDate: new Date(row.activity.fromDate ),
          toDate: row.activity.toDate ? new Date(row.activity.toDate ) : null,
          createdAt: new Date(row.activity.createdAt ),
          updatedAt: new Date(row.activity.updatedAt )
        });
      }
    });
    
    return Array.from(babiesMap.values());
  },

  async getBabyById(id) {
    const result = await db.select({
      baby: babies,
      owner: users,
      activity: activities
    })
    .from(babies)
    .leftJoin(users, eq(babies.ownerId, users.id))
    .leftJoin(activities, and(
      eq(babies.id, activities.babyId),
      eq(activities.status, 'active')
    ))
    .where(eq(babies.id, id))
    .orderBy(desc(activities.fromDate))
    .all();

    if (result.length === 0) return null;
    
    const baby = {
      ...result[0].baby,
      birthday: new Date(result[0].baby.birthday ),
      owner: result[0].owner,
      activities: result
        .filter(row => row.activity)
        .map(row => ({
          ...row.activity,
          fromDate: new Date(row.activity.fromDate ),
          toDate: row.activity.toDate ? new Date(row.activity.toDate ) : null,
          createdAt: new Date(row.activity.createdAt ),
          updatedAt: new Date(row.activity.updatedAt )
        }))
    };
    
    return baby;
  },
}

// Activity operations
export const activityService = {
  async createActivity(data) {
    const { babyId, recorder, type, subtype, fromDate, toDate, unit, amount, category, details } = data
    
    const activityData = {
      babyId,
      recorder,
      type: type?.toUpperCase(),
      subtype: subtype?.toUpperCase(),
      fromDate: new Date(fromDate).toISOString(),
      toDate: toDate ? new Date(toDate).toISOString() : null,
      unit: unit?.toUpperCase() || 'NONE',
      amount,
      category: category?.toUpperCase() || 'NONE',
      details,
    };
    
    const result = await db.insert(activities).values(activityData).returning();
    const activity = result[0];
    
    return {
      ...activity,
      fromDate: new Date(activity.fromDate ),
      toDate: activity.toDate ? new Date(activity.toDate ) : null,
      createdAt: new Date(activity.createdAt ),
      updatedAt: new Date(activity.updatedAt )
    };
  },

  async getActivitiesByBabyId(babyId, limit = 50) {
    const result = await db.select({
      activity: activities,
      baby: babies,
      user: users
    })
    .from(activities)
    .leftJoin(babies, eq(activities.babyId, babies.id))
    .leftJoin(users, eq(activities.recorder, users.id))
    .where(and(eq(activities.babyId, babyId), eq(activities.status, 'active')))
    .orderBy(desc(activities.fromDate))
    .limit(limit)
    .all();
    
    return result.map(row => ({
      ...row.activity,
      fromDate: new Date(row.activity.fromDate ),
      toDate: row.activity.toDate ? new Date(row.activity.toDate ) : null,
      createdAt: new Date(row.activity.createdAt ),
      updatedAt: new Date(row.activity.updatedAt ),
      baby: row.baby ? {
        ...row.baby,
        birthday: new Date(row.baby.birthday )
      } : null,
      user: row.user
    }));
  },

  async getActivitiesByType(babyId, type, limit = 20) {
    const result = await db.select()
      .from(activities)
      .where(and(
        eq(activities.babyId, babyId),
        eq(activities.type, type),
        eq(activities.status, 'active')
      ))
      .orderBy(desc(activities.fromDate))
      .limit(limit)
      .all();
    
    return result.map(activity => ({
      ...activity,
      fromDate: new Date(activity.fromDate ),
      toDate: activity.toDate ? new Date(activity.toDate ) : null,
      createdAt: new Date(activity.createdAt ),
      updatedAt: new Date(activity.updatedAt )
    }));
  },

  async getActivitiesInDateRange(babyId, startDate, endDate) {
    const startTimestamp = new Date(startDate).toISOString();
    const endTimestamp = new Date(endDate).toISOString();
    
    const result = await db.select()
      .from(activities)
      .where(and(
        eq(activities.babyId, babyId),
        eq(activities.status, 'active'),
        gte(activities.fromDate, startTimestamp),
        lte(activities.fromDate, endTimestamp)
      ))
      .orderBy(activities.fromDate)
      .all();
    
    return result.map(activity => ({
      ...activity,
      fromDate: new Date(activity.fromDate ),
      toDate: activity.toDate ? new Date(activity.toDate ) : null,
      createdAt: new Date(activity.createdAt ),
      updatedAt: new Date(activity.updatedAt )
    }));
  },

  async updateActivity(id, data) {
    const updateData = { ...data };
    if (updateData.fromDate) updateData.fromDate = new Date(updateData.fromDate).toISOString();
    if (updateData.toDate) updateData.toDate = new Date(updateData.toDate).toISOString();
    if (updateData.endTime) updateData.toDate = new Date(updateData.endTime).toISOString(); // Support legacy field name
    if (updateData.type) updateData.type = updateData.type.toUpperCase();
    if (updateData.subtype) updateData.subtype = updateData.subtype.toUpperCase();
    if (updateData.unit) updateData.unit = updateData.unit.toUpperCase();
    if (updateData.category) updateData.category = updateData.category.toUpperCase();
    
    const result = await db.update(activities)
      .set(updateData)
      .where(eq(activities.id, id))
      .returning();
    
    const updatedActivity = result[0];
    
    // Get baby info
    const baby = await db.select({
      id: babies.id,
      babyName: babies.babyName
    })
    .from(babies)
    .where(eq(babies.id, updatedActivity.babyId))
    .get();
    
    return {
      ...updatedActivity,
      fromDate: new Date(updatedActivity.fromDate ),
      toDate: updatedActivity.toDate ? new Date(updatedActivity.toDate ) : null,
      createdAt: new Date(updatedActivity.createdAt ),
      updatedAt: new Date(updatedActivity.updatedAt ),
      baby
    };
  },

  async deleteActivity(id) {
    const result = await db.delete(activities).where(eq(activities.id, id)).returning();
    const deletedActivity = result[0];
    
    return {
      ...deletedActivity,
      fromDate: new Date(deletedActivity.fromDate ),
      toDate: deletedActivity.toDate ? new Date(deletedActivity.toDate ) : null,
      createdAt: new Date(deletedActivity.createdAt ),
      updatedAt: new Date(deletedActivity.updatedAt )
    };
  },

  // Get feeding summary for a specific date
  async getFeedingSummary(babyId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.toISOString();
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = endOfDay.toISOString();

    const result = await db.select()
      .from(activities)
      .where(and(
        eq(activities.babyId, babyId),
        eq(activities.type, 'feeding'),
        eq(activities.status, 'active'),
        gte(activities.fromDate, startTimestamp),
        lte(activities.fromDate, endTimestamp)
      ))
      .orderBy(activities.fromDate)
      .all();
    
    return result.map(activity => ({
      ...activity,
      fromDate: new Date(activity.fromDate ),
      toDate: activity.toDate ? new Date(activity.toDate ) : null,
      createdAt: new Date(activity.createdAt ),
      updatedAt: new Date(activity.updatedAt )
    }));
  },

  // Get sleep summary for a specific date
  async getSleepSummary(babyId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.toISOString();
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = endOfDay.toISOString();

    const result = await db.select()
      .from(activities)
      .where(and(
        eq(activities.babyId, babyId),
        eq(activities.type, 'sleeping'),
        eq(activities.status, 'active'),
        gte(activities.fromDate, startTimestamp),
        lte(activities.fromDate, endTimestamp)
      ))
      .orderBy(activities.fromDate)
      .all();
    
    return result.map(activity => ({
      ...activity,
      fromDate: new Date(activity.fromDate ),
      toDate: activity.toDate ? new Date(activity.toDate ) : null,
      createdAt: new Date(activity.createdAt ),
      updatedAt: new Date(activity.updatedAt )
    }));
  },
}
