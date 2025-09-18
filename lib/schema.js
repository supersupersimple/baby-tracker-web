import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Users table  
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').unique().notNull(),
  name: text('name'),
  image: text('image'),
  emailVerified: text('email_verified'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// OAuth accounts table (for NextAuth.js)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => ({
  providerProviderAccountIdIndex: uniqueIndex('accounts_provider_provider_account_id_key').on(
    account.provider,
    account.providerAccountId,
  ),
}));

// User sessions table (for NextAuth.js)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').unique().notNull(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: text('expires').notNull(),
});

// Email verification tokens (for NextAuth.js)
export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').unique().notNull(),
  expires: text('expires').notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// Babies table
export const babies = sqliteTable('babies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner_id: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  baby_name: text('baby_name').notNull(),
  gender: text('gender').notNull(), // 'GIRL', 'BOY', 'OTHER'
  birthday: text('birthday').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  isPublic: integer('isPublic', { mode: 'boolean' }).default(false).notNull(),
  inviteCode: text('inviteCode').unique(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Baby access permissions
export const babyAccess = sqliteTable('baby_access', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  baby_id: integer('baby_id').notNull().references(() => babies.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'ADMIN', 'EDITOR', 'VIEWER'
  canEdit: integer('canEdit', { mode: 'boolean' }).default(true).notNull(),
  canView: integer('canView', { mode: 'boolean' }).default(true).notNull(),
  canInvite: integer('canInvite', { mode: 'boolean' }).default(false).notNull(),
  canManage: integer('canManage', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (ba) => ({
  babyUserIndex: uniqueIndex('baby_access_baby_id_user_id_key').on(ba.baby_id, ba.user_id),
}));

// Activities table
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ulid: text('ulid'),
  status: text('status').default('active').notNull(), // 'active', 'deleted'
  baby_id: integer('baby_id').notNull().references(() => babies.id, { onDelete: 'cascade' }),
  recorder: integer('recorder').notNull().references(() => users.id),
  type: text('type').notNull(), // 'FEEDING', 'SLEEPING', 'DIAPERING', 'MEDICINE'
  subtype: text('subtype'), // 'BOTTLE', 'MEAL', 'PEE', 'POO', 'RIGHT_BREAST', 'LEFT_BREAST'
  from_date: text('from_date').notNull(),
  to_date: text('to_date'),
  unit: text('unit'), // 'MILLILITRES', 'OUNCES', 'NONE'
  amount: real('amount'),
  category: text('category'), // 'FORMULA', 'BREAST_MILK', 'NONE'
  details: text('details'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (activity) => ({
  babyUlidIndex: uniqueIndex('activities_baby_id_ulid_key').on(activity.baby_id, activity.ulid),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  ownedBabies: many(babies),
  activities: many(activities),
  babyAccess: many(babyAccess),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const babiesRelations = relations(babies, ({ one, many }) => ({
  owner: one(users, {
    fields: [babies.owner_id],
    references: [users.id],
  }),
  activities: many(activities),
  babyAccess: many(babyAccess),
}));

export const babyAccessRelations = relations(babyAccess, ({ one }) => ({
  baby: one(babies, {
    fields: [babyAccess.baby_id],
    references: [babies.id],
  }),
  user: one(users, {
    fields: [babyAccess.user_id],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  baby: one(babies, {
    fields: [activities.baby_id],
    references: [babies.id],
  }),
  user: one(users, {
    fields: [activities.recorder],
    references: [users.id],
  }),
}));