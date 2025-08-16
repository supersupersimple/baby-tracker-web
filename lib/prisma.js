import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Global is used here to prevent multiple instances of PrismaClient in development
const globalForPrisma = global;

// Create Prisma client with Turso adapter when USE_TURSO is enabled
function createPrismaClient() {
  if (process.env.USE_TURSO === 'true') {
    if (!process.env.TURSO_DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
      throw new Error('TURSO_DATABASE_URL and DATABASE_AUTH_TOKEN are required when USE_TURSO is true');
    }
    
    console.log('🔥 Using Turso database:', process.env.TURSO_DATABASE_URL);
    
    // Use Turso with Prisma adapter - no fallback, let errors propagate
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    
    return new PrismaClient({ adapter });
  } else {
    console.log('📁 Using local SQLite database');
    // Use local SQLite
    return new PrismaClient();
  }
}

// Disable global caching in development for Turso to always use fresh tokens
export const prisma = process.env.NODE_ENV !== 'production' && process.env.USE_TURSO === 'true'
  ? createPrismaClient()
  : (globalForPrisma.prisma || createPrismaClient());

if (process.env.NODE_ENV !== 'production' && process.env.USE_TURSO !== 'true') {
  globalForPrisma.prisma = prisma;
}