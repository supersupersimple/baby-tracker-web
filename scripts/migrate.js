#!/usr/bin/env node

/**
 * Database migration runner for Drizzle
 * Applies pending migrations to the database
 */

require('dotenv').config();
const { migrate } = require('drizzle-orm/libsql/migrator');
const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const path = require('path');

async function runMigrations() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('❌ Missing required environment variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');

  try {
    // Create database connection
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    const db = drizzle(client);

    // Run migrations
    const migrationsFolder = path.join(__dirname, '..', 'drizzle');

    await migrate(db, { migrationsFolder });

    console.log('✅ All migrations completed successfully!');

    client.close();
  } catch (error) {
    // Check if error is about migrations already applied
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️ Database tables already exist - migrations may already be applied');
      console.log('✅ Migration check completed');
      return;
    }

    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;