import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis

// Use Turso in production or when explicitly set
const useTurso = process.env.NODE_ENV === 'production' || process.env.USE_TURSO === 'true'

// Create Turso client for production use
const turso = useTurso ? createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
}) : null

// Create Prisma client (will use local SQLite for development)
export const prisma = globalForPrisma.prisma || new PrismaClient()

// Export turso client for direct database operations when needed
export const tursoClient = turso

// Function to get the appropriate database client
export function getDbClient() {
  return useTurso ? tursoClient : prisma
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
