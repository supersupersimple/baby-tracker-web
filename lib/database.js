import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

const globalForDatabase = globalThis;

function createDrizzleClient() {
  console.log('🔥 Creating Turso Drizzle client');
  console.log('🌍 TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
  console.log('🔑 TURSO_AUTH_TOKEN length:', process.env.TURSO_AUTH_TOKEN?.length || 0);
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
  }
  
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    const db = drizzle(client, { schema });
    
    console.log('✅ Turso Drizzle client created successfully');
    
    return db;
  } catch (error) {
    console.error('❌ Error creating Turso Drizzle client:', error);
    throw error;
  }
}

// Export Drizzle database instance (with global caching in development)
export const db = globalForDatabase.drizzleDb || createDrizzleClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.drizzleDb = db;
}

export default db;